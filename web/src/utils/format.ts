/** Thin space (U+202F) — разделитель разрядов §7.3 */
const THIN_SP = '\u202F';

/**
 * Форматирует сумму в копейках в строку «4\u202F500» (без знака валюты).
 * Копейки добавляются только если ненулевые.
 */
export function formatAmount(kopecks: number): { whole: string; frac?: string; negative: boolean } {
  const neg = kopecks < 0;
  const abs = Math.abs(kopecks);
  const rubles = Math.floor(abs / 100);
  const cents = abs % 100;

  // Разбиваем рубли на группы по 3 с тонким пробелом
  const whole = rubles
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SP);

  return {
    whole,
    frac: cents > 0 ? cents.toString().padStart(2, '0') : undefined,
    negative: neg,
  };
}

/** Краткий форматированный текст, напр. «−4 500 ₽» */
export function fmtMoney(kopecks: number, currency: string): string {
  const { whole, frac, negative } = formatAmount(kopecks);
  const sign = negative ? '−' : '';
  const fracPart = frac ? `,${frac}` : '';
  return `${sign}${whole}${fracPart}\u00A0${currency}`;
}

/** YYYY-MM-DD для текущего локального дня (клиент — хозяин «сегодня» §4) */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM для текущего локального месяца */
export function monthStr(): string {
  return todayStr().slice(0, 7);
}

/** «19 июня» — краткая дата */
export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** «Июнь 2026» — название месяца */
export function fmtMonthName(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

/** Предыдущий месяц в формате YYYY-MM */
export function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Следующий месяц в формате YYYY-MM */
export function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
