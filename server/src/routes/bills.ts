import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { billStatus, billsSummary, type BillItem } from '../core/logic.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Неверный месяц');
const user = z.enum(['him', 'her']);

const idParam = (params: unknown) =>
  z.coerce.number().int().positive().safeParse((params as { id: string }).id);

export const billsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/bills', async (req, reply) => {
    const q = z.object({ month: monthStr, today: dateStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { month, today } = q.data;

    const obligations = await app.db<{
      id: number; name: string; kind: string; default_amount: number;
      due_day: number; owner: string; is_active: number;
    }[]>`SELECT * FROM obligations WHERE is_active = 1 ORDER BY due_day, id`;

    const payments = await app.db<{ obligation_id: number; paid_date: string; amount: number }[]>`
      SELECT obligation_id, paid_date, amount FROM obligation_payments WHERE month = ${month}`;
    const payByObl = new Map(payments.map((p) => [p.obligation_id, p]));

    const items = obligations.map((o) => {
      const payment = payByObl.get(o.id) ?? null;
      return {
        ...o,
        status: billStatus({ dueDay: o.due_day, month, today, hasPayment: payment != null }),
        payment: payment ? { paidDate: payment.paid_date, amount: payment.amount } : null,
      };
    });

    const reserved = (await app.db<{ to_bills: number }[]>`
      SELECT to_bills FROM incomes WHERE LEFT(date, 7) = ${month}`).map((r) => r.to_bills);

    const summaryItems: BillItem[] = items.map((i) => ({
      defaultAmount: i.default_amount,
      payment: i.payment ? { amount: i.payment.amount } : null,
    }));

    return { summary: billsSummary(summaryItems, reserved), items };
  });

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
    const [{ id }] = await app.db<[{ id: number }]>`
      INSERT INTO obligations (name, kind, default_amount, due_day, owner)
      VALUES (${b.name}, ${b.kind}, ${b.defaultAmount}, ${b.dueDay}, ${b.owner})
      RETURNING id`;
    return reply.code(201).send({ id });
  });

  app.patch('/api/obligations/:id', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = oblBody.partial().extend({ isActive: z.boolean().optional() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;

    const updates: Record<string, unknown> = {};
    if (b.name !== undefined) updates.name = b.name;
    if (b.kind !== undefined) updates.kind = b.kind;
    if (b.defaultAmount !== undefined) updates.default_amount = b.defaultAmount;
    if (b.dueDay !== undefined) updates.due_day = b.dueDay;
    if (b.owner !== undefined) updates.owner = b.owner;
    if (b.isActive !== undefined) updates.is_active = b.isActive ? 1 : 0;
    if (Object.keys(updates).length === 0) return reply.code(400).send({ error: 'Нечего обновлять' });

    const result = await app.db`UPDATE obligations SET ${app.db(updates)} WHERE id = ${id.data}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Обязательство не найдено' });
    return { ok: true };
  });

  const payBody = z.object({ month: monthStr, paidDate: dateStr, amount: z.number().int().positive() });

  app.post('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = payBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const exists = await app.db`
      SELECT 1 FROM obligation_payments WHERE obligation_id = ${id.data} AND month = ${b.month}`;
    if (exists.length > 0) return reply.code(400).send({ error: 'Платёж за этот месяц уже отмечен' });
    const [{ id: payId }] = await app.db<[{ id: number }]>`
      INSERT INTO obligation_payments (obligation_id, month, paid_date, amount)
      VALUES (${id.data}, ${b.month}, ${b.paidDate}, ${b.amount}) RETURNING id`;
    return reply.code(201).send({ id: payId });
  });

  app.patch('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = payBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const result = await app.db`
      UPDATE obligation_payments SET paid_date = ${b.paidDate}, amount = ${b.amount}
      WHERE obligation_id = ${id.data} AND month = ${b.month}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Оплата не найдена' });
    return { ok: true };
  });

  app.delete('/api/obligations/:id/pay', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const q = z.object({ month: monthStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const result = await app.db`
      DELETE FROM obligation_payments WHERE obligation_id = ${id.data} AND month = ${q.data.month}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Оплата не найдена' });
    return { ok: true };
  });
};
