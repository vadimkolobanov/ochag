import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { billsSummary, savingsBalances, type BillItem, type SavingsTxRow } from '../core/logic.js';

const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Неверный месяц');

export const historyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/history', async (req, reply) => {
    const q = z.object({ month: monthStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { month } = q.data;

    const cats = await app.db<{ categoryId: number; name: string; icon: string; total: number; count: number }[]>`
      SELECT c.id AS "categoryId", c.name, c.icon, SUM(e.amount) AS total, COUNT(*) AS count
      FROM expenses e JOIN categories c ON c.id = e.category_id
      WHERE LEFT(e.date, 7) = ${month} GROUP BY c.id ORDER BY total DESC`;
    const expensesTotal = cats.reduce((s, c) => s + Number(c.total), 0);
    const expensesByCategory = cats.map((c) => ({
      ...c, total: Number(c.total), count: Number(c.count),
      share: expensesTotal ? Number(c.total) / expensesTotal : 0,
    }));

    const incomesBySource = await app.db<{ source: string; total: number; count: number }[]>`
      SELECT source, SUM(amount) AS total, COUNT(*) AS count FROM incomes
      WHERE LEFT(date, 7) = ${month} GROUP BY source ORDER BY total DESC`;

    const savRows = await app.db<SavingsTxRow[]>`SELECT type, date, amount, currency FROM savings_tx`;
    const monthSav = savRows.filter((r) => r.date.slice(0, 7) === month);
    const deposited = monthSav.filter((r) => r.type === 'deposit').reduce((s, r) => s + r.amount, 0);
    const withdrawn = monthSav.filter((r) => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0);

    const obligations = await app.db<{ id: number; default_amount: number }[]>`
      SELECT id, default_amount FROM obligations WHERE is_active = 1`;
    const payRows = await app.db<{ obligation_id: number; amount: number }[]>`
      SELECT obligation_id, amount FROM obligation_payments WHERE month = ${month}`;
    const payByObl = new Map(payRows.map((p) => [p.obligation_id, p]));
    const billItems: BillItem[] = obligations.map((o) => ({
      defaultAmount: o.default_amount,
      payment: payByObl.has(o.id) ? { amount: payByObl.get(o.id)!.amount } : null,
    }));
    const reserved = (await app.db<{ to_bills: number }[]>`
      SELECT to_bills FROM incomes WHERE LEFT(date, 7) = ${month}`).map((r) => r.to_bills);

    const operations: Record<string, unknown>[] = [];
    for (const e of await app.db`
      SELECT e.id, e.date, e.amount, e."user", e.comment, c.name AS category, c.icon
      FROM expenses e JOIN categories c ON c.id = e.category_id WHERE LEFT(e.date, 7) = ${month}`)
      operations.push({ type: 'expense', ...e });
    for (const i of await app.db`
      SELECT id, date, amount, "user", source, comment FROM incomes WHERE LEFT(date, 7) = ${month}`)
      operations.push({ type: 'income', ...i });
    for (const t of await app.db`
      SELECT id, date, amount, from_user AS "fromUser", to_user AS "toUser", comment
      FROM transfers WHERE LEFT(date, 7) = ${month}`)
      operations.push({ type: 'transfer', ...t });
    for (const s of await app.db`
      SELECT id, date, amount, currency, type AS "savingsType", "user", purpose, income_id AS "incomeId"
      FROM savings_tx WHERE LEFT(date, 7) = ${month}`)
      operations.push({ type: 'savings', ...s });
    operations.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return {
      month, expensesTotal, expensesByCategory,
      incomesBySource: incomesBySource.map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) })),
      savings: { deposited, withdrawn, balances: savingsBalances(savRows) },
      bills: billsSummary(billItems, reserved),
      operations,
    };
  });
};
