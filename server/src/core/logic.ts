// Чистые функции расчётов «Очаг» (ТЗ §7). Без I/O — покрываются тестами vitest.
// Все суммы — целые числа в минимальных единицах (копейках). Даты — 'YYYY-MM-DD'.
// Запрещено использовать new Date() без аргументов: «сегодня» приходит от клиента (ТЗ §4).

export type User = 'him' | 'her';
export type IncomeSource = 'salary' | 'advance' | 'nails' | 'other';

export interface IncomeRow {
  user: User;
  date: string;
  source: IncomeSource;
  amount: number;
  to_daily: number;
  to_savings: number;
  to_bills: number;
}

export interface TransferRow {
  from_user: User;
  to_user: User;
  date: string;
  amount: number;
}

export interface ExpenseRow {
  user: User;
  date: string;
  amount: number;
}

export type SavingsCurrency = 'RUB' | 'EUR' | 'USD';

export interface SavingsTxRow {
  type: 'deposit' | 'withdrawal';
  date: string;
  amount: number;
  currency?: SavingsCurrency; // optional: старые записи без поля считаются RUB
}

export interface SavingsBalances {
  RUB: number;
  EUR: number;
  USD: number;
}

/** Записи движения денег, нужные для остатка повседневных одного пользователя. */
export interface DailyData {
  incomes: IncomeRow[];
  transfers: TransferRow[];
  expenses: ExpenseRow[];
}

// ── Помощники по датам (детерминированные, без «текущего времени») ──────────

function toEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Целое число суток b − a. */
function daysBetween(a: string, b: string): number {
  return Math.round((toEpoch(b) - toEpoch(a)) / 86_400_000);
}

/** День недели: 0 = воскресенье … 6 = суббота. */
function dayOfWeek(date: string): number {
  return new Date(toEpoch(date)).getUTCDay();
}

/** Число дней в месяце (month1 — 1..12). */
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function fmt(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Если дата — суббота/воскресенье, сдвинуть назад на ближайшую пятницу (ТЗ §7.1). */
function shiftBackToWeekday(date: string): string {
  const dow = dayOfWeek(date);
  const shift = dow === 6 ? 1 : dow === 0 ? 2 : 0; // сб → −1, вс → −2
  if (shift === 0) return date;
  const d = new Date(toEpoch(date) - shift * 86_400_000);
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ── §7.1 nextPayday ─────────────────────────────────────────────────────────

export function nextPayday(
  paydays: number[],
  today: string,
): { date: string; daysLeft: number } {
  const [ty, tm] = today.split('-').map(Number);
  const candidates: string[] = [];

  // Текущий, следующий и +2 месяц: запас на случай сдвига выходных через границу.
  for (const offset of [0, 1, 2]) {
    let y = ty;
    let m = tm + offset;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const dim = daysInMonth(y, m);
    for (const d of paydays) {
      const day = Math.min(d, dim); // день больше длины месяца → последний день
      candidates.push(shiftBackToWeekday(fmt(y, m, day)));
    }
  }

  // Минимальная скорректированная дата строго больше today.
  const future = candidates.filter((c) => c > today).sort();
  const date = future[0];
  const daysLeft = Math.max(1, daysBetween(today, date));
  return { date, daysLeft };
}

/** Является ли today днём зарплаты пользователя (с учётом сдвига выходных). */
export function isPaydayToday(paydays: number[], today: string): boolean {
  const [ty, tm] = today.split('-').map(Number);
  const dim = daysInMonth(ty, tm);
  return paydays.some((d) => shiftBackToWeekday(fmt(ty, tm, Math.min(d, dim))) === today);
}

// ── §7.2 dailyBalance ────────────────────────────────────────────────────────

export function dailyBalance(user: User, data: DailyData): number {
  let balance = 0;
  for (const i of data.incomes) if (i.user === user) balance += i.to_daily;
  for (const t of data.transfers) {
    if (t.to_user === user) balance += t.amount;
    if (t.from_user === user) balance -= t.amount;
  }
  for (const e of data.expenses) if (e.user === user) balance -= e.amount;
  return balance; // может уйти в минус — это допустимо (ТЗ §7.2)
}

// ── §7.3 perDay и arcFill ────────────────────────────────────────────────────

/** Сколько можно тратить в день: max(balance,0) / daysLeft, округление вниз. */
export function perDay(balance: number, daysLeft: number): number {
  return Math.floor(Math.max(balance, 0) / Math.max(daysLeft, 1));
}

/** Заливка дуги прогресса 0..1 (ТЗ §7.3). */
export function arcFill(user: User, today: string, data: DailyData): number {
  const current = dailyBalance(user, data);

  // P — дата последнего дохода пользователя с источником salary|advance.
  const periodDates = data.incomes
    .filter((i) => i.user === user && (i.source === 'salary' || i.source === 'advance'))
    .map((i) => i.date)
    .sort();

  if (periodDates.length === 0) return current > 0 ? 1 : 0;
  const P = periodDates[periodDates.length - 1];

  // B0 — остаток по всем записям с датой ≤ P (день P включается целиком).
  const upToP: DailyData = {
    incomes: data.incomes.filter((i) => i.date <= P),
    transfers: data.transfers.filter((t) => t.date <= P),
    expenses: data.expenses.filter((e) => e.date <= P),
  };
  const B0 = dailyBalance(user, upToP);
  if (B0 <= 0) return current > 0 ? 1 : 0;

  return clamp(current / B0, 0, 1);
}

// ── §7.4 статус платежа ───────────────────────────────────────────────────────

export type BillStatus = 'paid' | 'overdue' | 'due_soon' | 'upcoming';

export function billStatus(args: {
  dueDay: number;
  month: string; // 'YYYY-MM' — месяц чек-листа
  today: string; // 'YYYY-MM-DD'
  hasPayment: boolean;
}): BillStatus {
  if (args.hasPayment) return 'paid';
  const todayMonth = args.today.slice(0, 7);
  if (args.month < todayMonth) return 'overdue'; // прошлый месяц без оплаты
  if (args.month > todayMonth) return 'upcoming'; // будущий месяц
  const todayDay = Number(args.today.slice(8, 10));
  if (args.dueDay < todayDay) return 'overdue';
  if (args.dueDay - todayDay <= 3) return 'due_soon';
  return 'upcoming';
}

// ── §7.5 прочее ───────────────────────────────────────────────────────────────

export function savingsBalances(txs: SavingsTxRow[]): SavingsBalances {
  const bal: SavingsBalances = { RUB: 0, EUR: 0, USD: 0 };
  for (const t of txs) {
    const cur: SavingsCurrency = t.currency ?? 'RUB';
    bal[cur] += t.type === 'deposit' ? t.amount : -t.amount;
  }
  return bal;
}

/** @deprecated Используй savingsBalances(). Оставлено для совместимости с тестами. */
export function savingsBalance(txs: SavingsTxRow[]): number {
  return savingsBalances(txs).RUB;
}

/** Курс одной валюты к белорусскому рублю (лучший в Бресте). */
export interface CurrencyRate {
  buy: number; // сколько BYN банк даёт за `unit` единиц валюты (курс покупки)
  sell: number; // сколько BYN банк берёт за `unit` единиц валюты (курс продажи)
  unit: number; // номинал котировки: 1 для USD/EUR, 100 для RUB
}

export interface BrestRates {
  USD: CurrencyRate;
  EUR: CurrencyRate;
  RUB: CurrencyRate;
}

/**
 * Конвертирует остатки копилки в белорусские рубли по курсу покупки.
 * Все суммы — в минимальных единицах (копейках). Возвращает копейки BYN.
 */
export function bynTotal(balances: SavingsBalances, rates: BrestRates): number {
  const conv = (amount: number, r: CurrencyRate) => Math.round((amount * r.buy) / r.unit);
  return conv(balances.USD, rates.USD) + conv(balances.EUR, rates.EUR) + conv(balances.RUB, rates.RUB);
}

/** Элемент чек-листа месяца: плановая сумма обязательства + факт оплаты (если есть). */
export interface BillItem {
  defaultAmount: number;
  payment?: { amount: number } | null;
}

export interface BillsSummary {
  paidCount: number;
  totalCount: number;
  paidSum: number;
  plannedSum: number;
  reservedSum: number;
}

// ── §v1.1 Кредиты ────────────────────────────────────────────────────────────

/** Сдвинуть месяц 'YYYY-MM' на n месяцев вперёд (без new Date() без аргументов). */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ry = Math.floor(total / 12);
  const rm = (total % 12) + 1;
  return `${ry}-${String(rm).padStart(2, '0')}`;
}

export interface CreditInfo {
  monthly: number;         // default_amount обязательства (копейки)
  principal: number;       // тело кредита (копейки)
  totalPayout: number;     // всего вернуть по договору (копейки)
  monthsTotal: number;     // плановый срок в платежах
  paymentsBefore: number;  // платежей внесено до начала учёта в «Очаге»
  paidTx: number[];        // суммы obligation_payments (копейки); текущий месяц включён если уже оплачен
  paidThisMonth: boolean;  // оплачен ли платёж текущего месяца (нужен для правильного closeMonth)
}

export interface CreditCalc {
  paymentsMade: number;      // paymentsBefore + paidTx.length
  paymentsLeft: number;      // max(0, monthsTotal − paymentsMade)
  paidSum: number;           // paymentsBefore*monthly + Σ paidTx (по фактическим суммам)
  leftToPay: number;         // max(0, totalPayout − paidSum)
  overpay: number;           // totalPayout − principal
  progress: number;          // clamp(paymentsMade / monthsTotal, 0, 1)
  closeMonth: string | null; // 'YYYY-MM' последнего платежа; null если paymentsLeft = 0
}

export function creditCalc(c: CreditInfo, todayMonth: string): CreditCalc {
  const paymentsMade = c.paymentsBefore + c.paidTx.length;
  const paymentsLeft = Math.max(0, c.monthsTotal - paymentsMade);
  const paidSum = c.paymentsBefore * c.monthly + c.paidTx.reduce((s, x) => s + x, 0);
  const leftToPay = Math.max(0, c.totalPayout - paidSum);
  const overpay = c.totalPayout - c.principal;
  const progress = c.monthsTotal > 0 ? clamp(paymentsMade / c.monthsTotal, 0, 1) : 1;

  let closeMonth: string | null = null;
  if (paymentsLeft > 0) {
    // Если текущий месяц НЕ оплачен — он считается первым из оставшихся,
    // последний платёж = todayMonth + (paymentsLeft − 1) месяцев.
    // Если уже оплачен — осталось ещё paymentsLeft месяцев от todayMonth.
    const offset = c.paidThisMonth ? paymentsLeft : paymentsLeft - 1;
    closeMonth = addMonths(todayMonth, offset);
  }

  return { paymentsMade, paymentsLeft, paidSum, leftToPay, overpay, progress, closeMonth };
}

/**
 * Сводка «Платежи месяца» (ТЗ §7.5).
 * reservedSum — Σ incomes.to_bills доходов с датой в месяце M; никуда не переносится (информационно).
 */
export function billsSummary(items: BillItem[], incomesToBills: number[]): BillsSummary {
  const paid = items.filter((i) => i.payment != null);
  return {
    totalCount: items.length,
    paidCount: paid.length,
    paidSum: paid.reduce((s, i) => s + (i.payment as { amount: number }).amount, 0),
    plannedSum: items.reduce((s, i) => s + i.defaultAmount, 0),
    reservedSum: incomesToBills.reduce((s, x) => s + x, 0),
  };
}
