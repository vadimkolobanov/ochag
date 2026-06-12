import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { savingsBalances, bynTotal, type SavingsTxRow } from '../core/logic.js';
import { getSavingsRates } from '../rates.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const user = z.enum(['him', 'her']);

const bodySchema = z
  .object({
    type: z.enum(['deposit', 'withdrawal']),
    user,
    date: dateStr,
    amount: z.number().int().positive('Сумма должна быть больше нуля'),
    currency: z.enum(['RUB', 'EUR', 'USD']).optional().default('RUB'),
    purpose: z.string().optional(),
  })
  .refine((b) => b.type !== 'withdrawal' || (b.purpose != null && b.purpose.trim() !== ''), {
    message: 'Укажите цель снятия',
  });

export const savingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/savings', async () => {
    const items = await app.db<SavingsTxRow[]>`
      SELECT id, type, "user", date, amount, currency, purpose, income_id
      FROM savings_tx ORDER BY date DESC, id DESC`;
    const balances = savingsBalances(items);
    const rateInfo = await getSavingsRates(app.db);
    const byn = rateInfo
      ? {
          total: bynTotal(balances, rateInfo.rates),
          rates: rateInfo.rates,
          updatedAt: rateInfo.updatedAt,
          stale: rateInfo.stale,
        }
      : null;
    return { balances, items, byn };
  });

  app.post('/api/savings/tx', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    const b = parsed.data;
    const [{ id }] = await app.db<[{ id: number }]>`
      INSERT INTO savings_tx (type, "user", date, amount, currency, purpose)
      VALUES (${b.type}, ${b.user}, ${b.date}, ${b.amount}, ${b.currency}, ${b.purpose ?? null})
      RETURNING id`;
    return reply.code(201).send({ id });
  });

  app.delete('/api/savings/tx/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const [row] = await app.db<[{ income_id: number | null }?]>`
      SELECT income_id FROM savings_tx WHERE id = ${id.data}`;
    if (!row) return reply.code(404).send({ error: 'Операция не найдена' });
    if (row.income_id != null) {
      return reply.code(400).send({ error: 'Запись создана распределением зарплаты — удалите доход' });
    }
    await app.db`DELETE FROM savings_tx WHERE id = ${id.data}`;
    return { ok: true };
  });
};
