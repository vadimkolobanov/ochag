import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { billStatus, billsSummary, type BillItem } from '../core/logic.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Неверный месяц');
const user = z.enum(['him', 'her']);

interface ObligationRow {
  id: number;
  name: string;
  kind: string;
  default_amount: number;
  due_day: number;
  owner: string;
  is_active: number;
}
interface PaymentRow {
  obligation_id: number;
  paid_date: string;
  amount: number;
}

const idParam = (params: unknown) =>
  z.coerce.number().int().positive().safeParse((params as { id: string }).id);

export const billsRoutes: FastifyPluginAsync = async (app) => {
  // Чек-лист месяца со статусами и сводкой (ТЗ §7.4, §7.5, §8).
  app.get('/api/bills', async (req, reply) => {
    const q = z.object({ month: monthStr, today: dateStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { month, today } = q.data;

    const obligations = app.db
      .prepare('SELECT * FROM obligations WHERE is_active = 1 ORDER BY due_day, id')
      .all() as ObligationRow[];
    const payments = app.db
      .prepare('SELECT obligation_id, paid_date, amount FROM obligation_payments WHERE month = ?')
      .all(month) as PaymentRow[];
    const payByObl = new Map(payments.map((p) => [p.obligation_id, p]));

    const items = obligations.map((o) => {
      const payment = payByObl.get(o.id) ?? null;
      return {
        ...o,
        status: billStatus({ dueDay: o.due_day, month, today, hasPayment: payment != null }),
        payment: payment ? { paidDate: payment.paid_date, amount: payment.amount } : null,
      };
    });

    const reserved = (
      app.db
        .prepare("SELECT to_bills FROM incomes WHERE substr(date,1,7) = ?")
        .all(month) as { to_bills: number }[]
    ).map((r) => r.to_bills);

    const summaryItems: BillItem[] = items.map((i) => ({
      defaultAmount: i.default_amount,
      payment: i.payment ? { amount: i.payment.amount } : null,
    }));

    return { summary: billsSummary(summaryItems, reserved), items };
  });

  // Управление обязательствами (ТЗ §8).
  const oblBody = z.object({
    name: z.string().min(1, 'Укажите название'),
    kind: z.enum(['credit', 'utilities', 'mobile', 'internet', 'other']),
    defaultAmount: z.number().int().nonnegative(),
    dueDay: z.number().int().min(1).max(28),
    owner: user.default('him'),
  });

  app.post('/api/obligations', async (req, reply) => {
    const p = oblBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const info = app.db
      .prepare(
        'INSERT INTO obligations (name, kind, default_amount, due_day, owner) VALUES (?, ?, ?, ?, ?)',
      )
      .run(b.name, b.kind, b.defaultAmount, b.dueDay, b.owner);
    return reply.code(201).send({ id: Number(info.lastInsertRowid) });
  });

  app.patch('/api/obligations/:id', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = oblBody.partial().extend({ isActive: z.boolean().optional() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;

    const sets: string[] = [];
    const vals: unknown[] = [];
    const map: Record<string, string> = {
      name: 'name',
      kind: 'kind',
      defaultAmount: 'default_amount',
      dueDay: 'due_day',
      owner: 'owner',
    };
    for (const [key, col] of Object.entries(map)) {
      const v = (b as Record<string, unknown>)[key];
      if (v !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(v);
      }
    }
    if (b.isActive !== undefined) {
      sets.push('is_active = ?');
      vals.push(b.isActive ? 1 : 0);
    }
    if (sets.length === 0) return reply.code(400).send({ error: 'Нечего обновлять' });

    vals.push(id.data);
    const info = app.db.prepare(`UPDATE obligations SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    if (info.changes === 0) return reply.code(404).send({ error: 'Обязательство не найдено' });
    return { ok: true };
  });

  // Отметка оплаты / правка / снятие (ТЗ §8).
  const payBody = z.object({ month: monthStr, paidDate: dateStr, amount: z.number().int().positive() });

  app.post('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = payBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const exists = app.db
      .prepare('SELECT 1 FROM obligation_payments WHERE obligation_id = ? AND month = ?')
      .get(id.data, b.month);
    if (exists) return reply.code(400).send({ error: 'Платёж за этот месяц уже отмечен' });
    const info = app.db
      .prepare(
        'INSERT INTO obligation_payments (obligation_id, month, paid_date, amount) VALUES (?, ?, ?, ?)',
      )
      .run(id.data, b.month, b.paidDate, b.amount);
    return reply.code(201).send({ id: Number(info.lastInsertRowid) });
  });

  app.patch('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = payBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const info = app.db
      .prepare('UPDATE obligation_payments SET paid_date = ?, amount = ? WHERE obligation_id = ? AND month = ?')
      .run(b.paidDate, b.amount, id.data, b.month);
    if (info.changes === 0) return reply.code(404).send({ error: 'Оплата не найдена' });
    return { ok: true };
  });

  app.delete('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const q = z.object({ month: monthStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const info = app.db
      .prepare('DELETE FROM obligation_payments WHERE obligation_id = ? AND month = ?')
      .run(id.data, q.data.month);
    if (info.changes === 0) return reply.code(404).send({ error: 'Оплата не найдена' });
    return { ok: true };
  });
};
