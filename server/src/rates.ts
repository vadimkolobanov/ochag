// Курсы валют «лучшие в Бресте» с myfin.by. Содержит I/O (fetch + БД).
// Чистый разбор HTML вынесен в parseBrestPage() — покрывается тестами.
import type { Sql } from './db.js';
import type { BrestRates, CurrencyRate } from './core/logic.js';

interface PageSpec {
  cur: keyof BrestRates;
  url: string;
  unit: number;
}

const PAGES: PageSpec[] = [
  { cur: 'USD', url: 'https://myfin.by/currency/usd/brest', unit: 1 },
  { cur: 'EUR', url: 'https://myfin.by/currency/eur/brest', unit: 1 },
  { cur: 'RUB', url: 'https://myfin.by/currency/rub/brest', unit: 100 },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const FETCH_TIMEOUT_MS = 8000;
const TTL_MS = 6 * 60 * 60 * 1000; // обновляем не чаще раза в 6 часов

/**
 * Разбирает страницу одной валюты myfin.by/currency/<cur>/brest.
 * В таблице банков первые две колонки строки — курс покупки и продажи в BYN
 * (остальные — кросс-курсы, их игнорируем). Лучший курс покупки = максимум,
 * лучший курс продажи = минимум.
 */
export function parseBrestPage(html: string): { buy: number; sell: number } {
  const bodyStart = html.indexOf('sort_body');
  if (bodyStart < 0) throw new Error('таблица курсов не найдена');
  const bodyEnd = html.indexOf('</tbody>', bodyStart);
  const body = html.slice(bodyStart, bodyEnd > 0 ? bodyEnd : html.length);

  const rows = body.split('<tr').slice(1);
  const buys: number[] = [];
  const sells: number[] = [];
  for (const row of rows) {
    const cells = row.split('currencies-courses__currency-cell').slice(1);
    if (cells.length < 2) continue;
    const buyM = cells[0].match(/>\s*(\d+\.\d{2,4})\s*</);
    const sellM = cells[1].match(/>\s*(\d+\.\d{2,4})\s*</);
    if (buyM) buys.push(parseFloat(buyM[1]));
    if (sellM) sells.push(parseFloat(sellM[1]));
  }
  if (buys.length === 0 || sells.length === 0) throw new Error('курсы не распознаны');
  return { buy: Math.max(...buys), sell: Math.min(...sells) };
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBrestRates(): Promise<BrestRates> {
  const entries = await Promise.all(
    PAGES.map(async (p): Promise<[keyof BrestRates, CurrencyRate]> => {
      const html = await fetchText(p.url);
      const { buy, sell } = parseBrestPage(html);
      return [p.cur, { buy, sell, unit: p.unit }];
    }),
  );
  return Object.fromEntries(entries) as BrestRates;
}

async function persist(db: Sql, rates: BrestRates, updatedAt: string): Promise<void> {
  for (const cur of ['USD', 'EUR', 'RUB'] as const) {
    const r = rates[cur];
    await db`
      INSERT INTO rates (currency, buy, sell, unit, updated_at)
      VALUES (${cur}, ${r.buy}, ${r.sell}, ${r.unit}, ${updatedAt})
      ON CONFLICT (currency) DO UPDATE
      SET buy = ${r.buy}, sell = ${r.sell}, unit = ${r.unit}, updated_at = ${updatedAt}`;
  }
}

async function loadFromDb(db: Sql): Promise<{ rates: BrestRates; updatedAt: string } | null> {
  const rows = await db<
    { currency: string; buy: number; sell: number; unit: number; updated_at: string }[]
  >`SELECT currency, buy, sell, unit, updated_at FROM rates`;
  const map: Partial<Record<keyof BrestRates, CurrencyRate>> = {};
  let updatedAt = '';
  for (const row of rows) {
    map[row.currency as keyof BrestRates] = { buy: row.buy, sell: row.sell, unit: row.unit };
    if (row.updated_at > updatedAt) updatedAt = row.updated_at;
  }
  if (!map.USD || !map.EUR || !map.RUB) return null;
  return { rates: { USD: map.USD, EUR: map.EUR, RUB: map.RUB }, updatedAt };
}

let mem: { rates: BrestRates; updatedAt: string } | null = null;
let refreshing = false;

async function refresh(db: Sql): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const rates = await fetchBrestRates();
    const updatedAt = new Date().toISOString();
    mem = { rates, updatedAt };
    await persist(db, rates, updatedAt);
  } catch {
    // сеть/парсинг упали — оставляем прежние значения
  } finally {
    refreshing = false;
  }
}

export interface RatesInfo {
  rates: BrestRates;
  updatedAt: string;
  stale: boolean;
}

/**
 * Возвращает курсы для копилки. Стратегия stale-while-revalidate:
 * отдаём кэш/БД мгновенно, а устаревшие значения обновляем в фоне.
 * Синхронно ждём загрузку только когда курсов нет нигде (первый запуск).
 */
export async function getSavingsRates(db: Sql): Promise<RatesInfo | null> {
  if (!mem) {
    const fromDb = await loadFromDb(db);
    if (fromDb) mem = fromDb;
  }
  if (!mem) {
    await refresh(db);
    return mem ? { rates: mem.rates, updatedAt: mem.updatedAt, stale: false } : null;
  }
  const stale = Date.now() - Date.parse(mem.updatedAt) > TTL_MS;
  if (stale) void refresh(db);
  return { rates: mem.rates, updatedAt: mem.updatedAt, stale };
}
