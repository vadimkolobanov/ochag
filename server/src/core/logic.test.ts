import { describe, it, expect } from 'vitest';
import {
  creditCalc,
  nextPayday,
  isPaydayToday,
  dailyBalance,
  perDay,
  arcFill,
  billStatus,
  savingsBalance,
  billsSummary,
  type DailyData,
} from './logic.js';

// Проверенные по календарю 2026 факты (UTC):
//   2026-09-19 — суббота, 2026-09-18 — пятница
//   2026-04-19 — воскресенье, 2026-04-17 — пятница
//   2026-06-19 — пятница, 2026-07-19 — воскресенье (→ 2026-07-17 пятница)
//   2026-06-10 — среда, 2026-06-25 — четверг

describe('§7.1 nextPayday', () => {
  it('19-е = суббота → 18-е (пятница)', () => {
    expect(nextPayday([19], '2026-09-01')).toEqual({ date: '2026-09-18', daysLeft: 17 });
  });

  it('19-е = воскресенье → 17-е (пятница)', () => {
    expect(nextPayday([19], '2026-04-01')).toEqual({ date: '2026-04-17', daysLeft: 16 });
  });

  it('перенос через границу месяца + сдвиг выходных', () => {
    // today = пятница-зарплата 19 июня; следующая 19 июля = вс → 17 июля (пт)
    expect(nextPayday([19], '2026-06-19')).toEqual({ date: '2026-07-17', daysLeft: 28 });
  });

  it('paydays=[10,25] — ближайший будний день', () => {
    expect(nextPayday([10, 25], '2026-06-09')).toEqual({ date: '2026-06-10', daysLeft: 1 });
  });

  it('сегодня = день зарплаты → следующая дата, не сегодня', () => {
    // today = 10 июня (зарплата); ожидаем следующую — 25 июня
    expect(nextPayday([10, 25], '2026-06-10')).toEqual({ date: '2026-06-25', daysLeft: 15 });
  });

  it('день больше длины месяца → последний день месяца (с учётом выходных)', () => {
    // payday 31, февраль 2026 (28 дней): 2026-02-28 — суббота → 2026-02-27 (пт)
    expect(nextPayday([31], '2026-02-01')).toEqual({ date: '2026-02-27', daysLeft: 26 });
  });
});

describe('isPaydayToday', () => {
  it('будний день зарплаты → true', () => {
    expect(isPaydayToday([10, 25], '2026-06-10')).toBe(true); // 10 июня — среда
  });
  it('не день зарплаты → false', () => {
    expect(isPaydayToday([19], '2026-06-10')).toBe(false);
  });
  it('зарплата 19-е попадает на сб → день зарплаты сдвинут на пт 18-е', () => {
    expect(isPaydayToday([19], '2026-09-19')).toBe(false); // суббота — не день
    expect(isPaydayToday([19], '2026-09-18')).toBe(true); // пятница — день
  });
});

describe('§7.2 dailyBalance / §11 п.7 перевод', () => {
  const data: DailyData = {
    incomes: [
      { user: 'him', date: '2026-06-01', source: 'salary', amount: 200000, to_daily: 200000, to_savings: 0, to_bills: 0 },
    ],
    transfers: [{ from_user: 'him', to_user: 'her', date: '2026-06-02', amount: 100000 }],
    expenses: [{ user: 'him', date: '2026-06-03', amount: 30000 }],
  };

  it('перевод 100000 уменьшает у Него и увеличивает у Неё ровно на 100000', () => {
    // him: 200000 − 100000 (перевод) − 30000 (трата) = 70000
    expect(dailyBalance('him', data)).toBe(70000);
    // her: +100000 (получила перевод)
    expect(dailyBalance('her', data)).toBe(100000);
  });

  it('может уйти в минус', () => {
    const d: DailyData = { incomes: [], transfers: [], expenses: [{ user: 'her', date: '2026-06-01', amount: 500 }] };
    expect(dailyBalance('her', d)).toBe(-500);
  });
});

describe('§7.3 perDay', () => {
  it('округление вниз', () => {
    expect(perDay(10000, 7)).toBe(1428); // 10000/7 = 1428.57…
  });
  it('отрицательный остаток → 0', () => {
    expect(perDay(-500, 5)).toBe(0);
  });
});

describe('§7.3 arcFill', () => {
  it('обычный период: остаток / B0', () => {
    const data: DailyData = {
      incomes: [{ user: 'him', date: '2026-06-01', source: 'salary', amount: 10000, to_daily: 10000, to_savings: 0, to_bills: 0 }],
      transfers: [],
      expenses: [{ user: 'him', date: '2026-06-05', amount: 4000 }],
    };
    expect(arcFill('him', '2026-06-10', data)).toBeCloseTo(0.6, 5);
  });

  it('пополнение переводом после P → clamp до 1', () => {
    const data: DailyData = {
      incomes: [{ user: 'him', date: '2026-06-01', source: 'salary', amount: 10000, to_daily: 10000, to_savings: 0, to_bills: 0 }],
      transfers: [{ from_user: 'her', to_user: 'him', date: '2026-06-10', amount: 5000 }],
      expenses: [],
    };
    expect(arcFill('him', '2026-06-15', data)).toBe(1);
  });

  it('B0 = 0 (вся зарплата мимо повседневных) → 1 при положительном остатке', () => {
    const data: DailyData = {
      incomes: [{ user: 'him', date: '2026-06-01', source: 'salary', amount: 10000, to_daily: 0, to_savings: 10000, to_bills: 0 }],
      transfers: [{ from_user: 'her', to_user: 'him', date: '2026-06-05', amount: 3000 }],
      expenses: [],
    };
    expect(arcFill('him', '2026-06-10', data)).toBe(1);
  });

  it('пользователь без зарплат: 1 при положительном, 0 при неположительном', () => {
    const positive: DailyData = {
      incomes: [],
      transfers: [{ from_user: 'her', to_user: 'him', date: '2026-06-05', amount: 3000 }],
      expenses: [],
    };
    expect(arcFill('him', '2026-06-10', positive)).toBe(1);

    const nonpositive: DailyData = {
      incomes: [],
      transfers: [],
      expenses: [{ user: 'him', date: '2026-06-05', amount: 3000 }],
    };
    expect(arcFill('him', '2026-06-10', nonpositive)).toBe(0);
  });
});

describe('§7.4 billStatus', () => {
  const base = { month: '2026-06', today: '2026-06-10' as const };
  it('оплачено', () => {
    expect(billStatus({ dueDay: 5, hasPayment: true, ...base })).toBe('paid');
  });
  it('просрочен (due_day < сегодня)', () => {
    expect(billStatus({ dueDay: 5, hasPayment: false, ...base })).toBe('overdue');
  });
  it('скоро срок (≤3 дня, включая сегодня)', () => {
    expect(billStatus({ dueDay: 12, hasPayment: false, ...base })).toBe('due_soon');
    expect(billStatus({ dueDay: 10, hasPayment: false, ...base })).toBe('due_soon');
  });
  it('предстоит', () => {
    expect(billStatus({ dueDay: 25, hasPayment: false, ...base })).toBe('upcoming');
  });
  it('прошлый месяц без оплаты → просрочен', () => {
    expect(billStatus({ dueDay: 25, hasPayment: false, month: '2026-05', today: '2026-06-10' })).toBe('overdue');
  });
  it('будущий месяц → предстоит', () => {
    expect(billStatus({ dueDay: 1, hasPayment: false, month: '2026-07', today: '2026-06-10' })).toBe('upcoming');
  });
});

describe('§7.5 billsSummary', () => {
  it('считает оплачено/всего, суммы и отложено', () => {
    const items = [
      { defaultAmount: 200000, payment: { amount: 210000 } }, // оплачен фактической суммой
      { defaultAmount: 80000, payment: null }, // не оплачен
      { defaultAmount: 150000, payment: { amount: 150000 } },
    ];
    expect(billsSummary(items, [240000, 10000])).toEqual({
      totalCount: 3,
      paidCount: 2,
      paidSum: 360000, // 210000 + 150000
      plannedSum: 430000, // 200000 + 80000 + 150000
      reservedSum: 250000, // Σ to_bills доходов месяца
    });
  });
});

describe('§7.5 savingsBalance', () => {
  it('депозиты минус снятия', () => {
    expect(
      savingsBalance([
        { type: 'deposit', date: '2026-06-01', amount: 50000 },
        { type: 'withdrawal', date: '2026-06-05', amount: 8000 },
        { type: 'deposit', date: '2026-06-10', amount: 2000 },
      ]),
    ).toBe(44000);
  });
});

// ── §v1.1 creditCalc ─────────────────────────────────────────────────────────
// Базовые числа: взяли 300 000 ₽ = 30_000_000 коп, вернуть 390 000 ₽ = 39_000_000 коп,
// 36 платежей по 10 833 ₽ = 1_083_300 коп.

const BASE = {
  monthly: 1_083_300,
  principal: 30_000_000,
  totalPayout: 39_000_000,
  monthsTotal: 36,
};

describe('§v1.1 creditCalc', () => {
  it('обычный кредит в середине срока (10 оплачено, текущий ещё не оплачен)', () => {
    const paidTx = Array(10).fill(1_083_300);
    const r = creditCalc({ ...BASE, paymentsBefore: 0, paidTx, paidThisMonth: false }, '2026-06');
    expect(r.paymentsMade).toBe(10);
    expect(r.paymentsLeft).toBe(26);
    expect(r.paidSum).toBe(10 * 1_083_300);
    expect(r.leftToPay).toBe(39_000_000 - 10 * 1_083_300);
    expect(r.overpay).toBe(9_000_000);
    expect(r.progress).toBeCloseTo(10 / 36, 5);
    // текущий месяц не оплачен → он первый из оставшихся, последний = 2026-06 + 25 = 2028-07
    expect(r.closeMonth).toBe('2028-07');
  });

  it('кредит с payments_before > 0', () => {
    const paidTx = Array(4).fill(1_083_300);
    const r = creditCalc({ ...BASE, paymentsBefore: 10, paidTx, paidThisMonth: false }, '2026-06');
    expect(r.paymentsMade).toBe(14);
    expect(r.paymentsLeft).toBe(22);
    expect(r.paidSum).toBe(14 * 1_083_300);
    // последний платёж = 2026-06 + 21 месяц = 2028-03
    expect(r.closeMonth).toBe('2028-03');
  });

  it('полностью выплаченный кредит: paymentsLeft = 0, progress = 1, closeMonth = null', () => {
    const paidTx = Array(36).fill(1_083_300);
    const r = creditCalc({ ...BASE, paymentsBefore: 0, paidTx, paidThisMonth: true }, '2026-06');
    expect(r.paymentsMade).toBe(36);
    expect(r.paymentsLeft).toBe(0);
    expect(r.progress).toBe(1);
    expect(r.closeMonth).toBeNull();
  });

  it('фактические оплаты отличаются от плановой суммы → paidSum по фактам', () => {
    const paidTx = [1_100_000, 950_000]; // не кратно monthly
    const r = creditCalc({ ...BASE, paymentsBefore: 0, paidTx, paidThisMonth: false }, '2026-06');
    expect(r.paidSum).toBe(1_100_000 + 950_000); // 2 050 000, не 2*1_083_300
    expect(r.leftToPay).toBe(39_000_000 - (1_100_000 + 950_000));
  });

  it('текущий месяц ещё не оплачен vs уже оплачен → closeMonth совпадает', () => {
    // Семантически одинаковая картина: всего внесено 11 платежей, осталось 25
    const notPaid = creditCalc(
      { ...BASE, paymentsBefore: 0, paidTx: Array(10).fill(1_083_300), paidThisMonth: false },
      '2026-06',
    );
    const paid = creditCalc(
      { ...BASE, paymentsBefore: 0, paidTx: Array(11).fill(1_083_300), paidThisMonth: true },
      '2026-06',
    );
    // Оба случая: кредит закрывается в одном и том же месяце
    expect(notPaid.closeMonth).toBe(paid.closeMonth);
    expect(notPaid.closeMonth).toBe('2028-07');
  });

  it('переплата 0: total_payout = principal', () => {
    const r = creditCalc(
      { ...BASE, totalPayout: 30_000_000, principal: 30_000_000,
        paymentsBefore: 0, paidTx: [], paidThisMonth: false },
      '2026-06',
    );
    expect(r.overpay).toBe(0);
  });
});
