import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { billsSummary, savingsBalances, type BillItem, type SavingsTxRow } from '../core/logic.js';

const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Неверный месяц');

export const historyRoutes: FastifyPluginAsync = async (app) => {
  // Данные для экрана «Итоги» за месяц (ТЗ §8, §9.5).
  app.get('/api/history', async (req, reply) => {
    const q = z.object({ month: monthStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const month = q.data.month;
    const M = (col = 'date') => ({ p: `substr(${col},1,7) = ?` });

    // Траты по категориям (по убыванию, с суммой и долей).
    const cats = app.db
      .prepare(
        `SELECT c.id AS categoryId, c.name, c.icon, SUM(e.amount) AS total, COUNT(*) AS count
         FROM expenses e JOIN categories c ON c.id = e.category_id
         WHERE ${M('e.date').p} GROUP BY c.id ORDER BY total DESC`,
      )
      .all(month) as { categoryId: number; name: string; icon: string; total: number; count: number }[];
    const expensesTotal = cats.reduce((s, c) => s + c.total, 0);
    const expensesByCategory = cats.map((c) => ({
      ...c,
      share: expensesTotal ? c.total / expensesTotal : 0,
    }));

    // Доходы по источникам (отдельно видна строка «Маникюр» = nails).
    const incomesBySource = app.db
      .prepare(
        `SELECT source, SUM(amount) AS total, COUNT(*) AS count FROM incomes
         WHERE ${M().p} GROUP BY source ORDER BY total DESC`,
      )
      .all(month) as { source: string; total: number; count: number }[];

    // Движение копилки за месяц + итоговый остаток (всё время).
    const savRows = app.db.prepare('SELECT type, date, amount, currency FROM savings_tx').all() as SavingsTxRow[];
    const monthSav = savRows.filter((r) => r.date.slice(0, 7) === month);
    const deposited = monthSav.filter((r) => r.type === 'deposit').reduce((s, r) => s + r.amount, 0);
    const withdrawn = monthSav.filter((r) => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0);

    // Сводка платежей месяца (§7.5).
    const obligations = app.db
      .prepare('SELECT id, default_amount FROM obligations WHERE is_active = 1')
      .all() as { id: number; default_amount: number }[];
    const payByObl = new Map(
      (app.db.prepare('SELECT obligation_id, amount FROM obligation_payments WHERE month = ?').all(month) as {
        obligation_id: number;
        amount: number;
      }[]).map((p) => [p.obligation_id, p]),
    );
    const billItems: BillItem[] = obligations.map((o) => ({
      defaultAmount: o.default_amount,
      payment: payByObl.get(o.id) ? { amount: payByObl.get(o.id)!.amount } : null,
    }));
    const reserved = (
      app.db.prepare(`SELECT to_bills FROM incomes WHERE ${M().p}`).all(month) as { to_bills: number }[]
    ).map((r) => r.to_bills);

    // Хронологическая лента всех операций месяца.
    const operations: Array<Record<string, unknown>> = [];
    for (const e of app.db
      .prepare(
        `SELECT e.id, e.date, e.amount, e.user, e.comment, c.name AS category, c.icon
         FROM expenses e JOIN categories c ON c.id = e.category_id WHERE ${M('e.date').p}`,
      )
      .all(month) as any[])
      operations.push({ type: 'expense', ...e });
    for (const i of app.db.prepare(`SELECT id, date, amount, user, source, comment FROM incomes WHERE ${M().p}`).all(month) as any[])
      operations.push({ type: 'income', ...i });
    for (const t of app.db
      .prepare(`SELECT id, date, amount, from_user AS fromUser, to_user AS toUser, comment FROM transfers WHERE ${M().p}`)
      .all(month) as any[])
      operations.push({ type: 'transfer', ...t });
    for (const s of app.db
      .prepare(`SELECT id, date, amount, currency, type AS savingsType, user, purpose, income_id AS incomeId FROM savings_tx WHERE ${M().p}`)
      .all(month) as any[])
      operations.push({ type: 'savings', ...s });
    operations.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return {
      month,
      expensesTotal,
      expensesByCategory,
      incomesBySource,
      savings: { deposited, withdrawn, balances: savingsBalances(savRows) },
      bills: billsSummary(billItems, reserved),
      operations,
    };
  });
};
