import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  dailyBalance,
  perDay,
  arcFill,
  nextPayday,
  isPaydayToday,
  billStatus,
  savingsBalances,
  type DailyData,
  type SavingsTxRow,
  type IncomeRow,
  type TransferRow,
  type ExpenseRow,
} from '../core/logic.js';
import { readSettings } from './settings.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const user = z.enum(['him', 'her']);

interface ObligationRow {
  id: number;
  name: string;
  default_amount: number;
  due_day: number;
}

export const stateRoutes: FastifyPluginAsync = async (app) => {
  // Агрегат для экрана «Сегодня» (ТЗ §8).
  app.get('/api/state', async (req, reply) => {
    const q = z.object({ user, today: dateStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { user: u, today } = q.data;

    const settings = readSettings(app.db);
    const paydays = u === 'him' ? settings.paydayHim : settings.paydayHer;

    const data: DailyData = {
      incomes: app.db.prepare('SELECT user, date, source, amount, to_daily, to_bills, to_savings FROM incomes').all() as IncomeRow[],
      transfers: app.db.prepare('SELECT from_user, to_user, date, amount FROM transfers').all() as TransferRow[],
      expenses: app.db.prepare('SELECT user, date, amount FROM expenses').all() as ExpenseRow[],
    };

    const balance = dailyBalance(u, data);
    const payday = nextPayday(paydays, today);
    const savingsRows = app.db.prepare('SELECT type, date, amount, currency FROM savings_tx').all() as SavingsTxRow[];

    // Ближайшие неоплаченные платежи текущего месяца (≤3).
    const month = today.slice(0, 7);
    const obligations = app.db
      .prepare('SELECT id, name, default_amount, due_day FROM obligations WHERE is_active = 1 ORDER BY due_day, id')
      .all() as ObligationRow[];
    const paidIds = new Set(
      (app.db.prepare('SELECT obligation_id FROM obligation_payments WHERE month = ?').all(month) as {
        obligation_id: number;
      }[]).map((r) => r.obligation_id),
    );
    const upcomingBills = obligations
      .filter((o) => !paidIds.has(o.id))
      .map((o) => ({
        id: o.id,
        name: o.name,
        dueDay: o.due_day,
        amount: o.default_amount,
        status: billStatus({ dueDay: o.due_day, month, today, hasPayment: false }),
      }))
      .slice(0, 3);

    const recentExpenses = app.db
      .prepare(
        `SELECT e.id, e.date, e.amount, e.comment, c.name AS category, c.icon
         FROM expenses e JOIN categories c ON c.id = e.category_id
         WHERE e.user = ? ORDER BY e.date DESC, e.id DESC LIMIT 5`,
      )
      .all(u);

    return {
      user: u,
      currency: settings.currencySymbol,
      dailyBalance: balance,
      perDay: perDay(balance, payday.daysLeft),
      payday,
      arcFill: arcFill(u, today, data),
      upcomingBills,
      recentExpenses,
      savingsBalances: savingsBalances(savingsRows),
      isPaydayToday: isPaydayToday(paydays, today),
    };
  });
};
