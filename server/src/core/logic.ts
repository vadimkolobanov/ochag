// Чистые функции расчётов «Очаг» (ТЗ §7). Без I/O — покрываются тестами vitest.
// Все суммы — целые числа в минимальных единицах (копейках). Даты — 'YYYY-MM-DD'.

export type User = 'him' | 'her';

// §7.1 nextPayday — реализуется на этапе A.
export function nextPayday(
  _paydays: number[],
  _today: string,
): { date: string; daysLeft: number } {
  throw new Error('Not implemented yet (ТЗ §7.1)');
}

// §7.4 статус платежа в месяце.
export type BillStatus = 'paid' | 'overdue' | 'due_soon' | 'upcoming';
