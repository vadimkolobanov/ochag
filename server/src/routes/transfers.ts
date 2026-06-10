import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const user = z.enum(['him', 'her']);

const bodySchema = z
  .object({
    fromUser: user,
    toUser: user,
    date: dateStr,
    amount: z.number().int().positive('Сумма должна быть больше нуля'),
    comment: z.string().optional(),
  })
  .refine((b) => b.fromUser !== b.toUser, { message: 'Перевод самому себе невозможен' });

export const transfersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/transfers', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    const b = parsed.data;
    const [{ id }] = await app.db<[{ id: number }]>`
      INSERT INTO transfers (from_user, to_user, date, amount, comment)
      VALUES (${b.fromUser}, ${b.toUser}, ${b.date}, ${b.amount}, ${b.comment ?? null})
      RETURNING id`;
    return reply.code(201).send({ id });
  });

  app.delete('/api/transfers/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const result = await app.db`DELETE FROM transfers WHERE id = ${id.data}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Перевод не найден' });
    return { ok: true };
  });
};
