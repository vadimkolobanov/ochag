import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const user = z.enum(['him', 'her']);

const bodySchema = z.object({
  user,
  date: dateStr,
  amount: z.number().int().positive('Сумма должна быть больше нуля'),
  categoryId: z.number().int().positive(),
  comment: z.string().optional(),
});

export const expensesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/expenses', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    const b = parsed.data;
    const cat = await app.db`SELECT id FROM categories WHERE id = ${b.categoryId} AND is_active = 1`;
    if (cat.length === 0) return reply.code(400).send({ error: 'Категория не найдена' });
    const [{ id }] = await app.db<[{ id: number }]>`
      INSERT INTO expenses ("user", date, amount, category_id, comment)
      VALUES (${b.user}, ${b.date}, ${b.amount}, ${b.categoryId}, ${b.comment ?? null})
      RETURNING id`;
    return reply.code(201).send({ id });
  });

  app.delete('/api/expenses/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const result = await app.db`DELETE FROM expenses WHERE id = ${id.data}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Трата не найдена' });
    return { ok: true };
  });
};
