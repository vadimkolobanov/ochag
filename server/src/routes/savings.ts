import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { savingsBalances, type SavingsTxRow, type SavingsCurrency } from '../core/logic.js';

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

interface SavingsItem extends SavingsTxRow {
  id: number;
  user: string;
  purpose: string | null;
  income_id: number | null;
  currency: SavingsCurrency;
}

export const savingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/savings', async () => {
    const items = app.db
      .prepare('SELECT id, type, user, date, amount, purpose, income_id, currency FROM savings_tx ORDER BY date DESC, id DESC')
      .all() as SavingsItem[];
    return { balances: savingsBalances(items), items };
  });

  app.post('/api/savings/tx', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    const b = parsed.data;
    const info = app.db
      .prepare('INSERT INTO savings_tx (type, user, date, amount, currency, purpose) VALUES (?, ?, ?, ?, ?, ?)')
      .run(b.type, b.user, b.date, b.amount, b.currency, b.purpose ?? null);
    return reply.code(201).send({ id: Number(info.lastInsertRowid) });
  });

  app.delete('/api/savings/tx/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const row = app.db.prepare('SELECT income_id FROM savings_tx WHERE id = ?').get(id.data) as
      | { income_id: number | null }
      | undefined;
    if (!row) return reply.code(404).send({ error: 'Операция не найдена' });
    // Депозиты из распределения зарплаты удаляются только удалением дохода (ТЗ §9.4).
    if (row.income_id != null) {
      return reply.code(400).send({ error: 'Запись создана распределением зарплаты — удалите доход' });
    }
    app.db.prepare('DELETE FROM savings_tx WHERE id = ?').run(id.data);
    return { ok: true };
  });
};
