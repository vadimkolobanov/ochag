import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');
const user = z.enum(['him', 'her']);

const bodySchema = z
  .object({
    user,
    date: dateStr,
    source: z.enum(['salary', 'advance', 'nails', 'other']),
    amount: z.number().int().positive('Сумма должна быть больше нуля'),
    toDaily: z.number().int().nonnegative(),
    toSavings: z.number().int().nonnegative(),
    toBills: z.number().int().nonnegative(),
    comment: z.string().optional(),
  })
  .refine((b) => b.toDaily + b.toSavings + b.toBills === b.amount, {
    message: 'Сумма распределения не сходится с доходом',
  });

export const incomesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/incomes', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    const b = parsed.data;

    const id = await app.db.begin(async (sql) => {
      const [{ id: incomeId }] = await sql<[{ id: number }]>`
        INSERT INTO incomes ("user", date, source, amount, to_daily, to_savings, to_bills, comment)
        VALUES (${b.user}, ${b.date}, ${b.source}, ${b.amount}, ${b.toDaily}, ${b.toSavings}, ${b.toBills}, ${b.comment ?? null})
        RETURNING id`;
      if (b.toSavings > 0) {
        await sql`
          INSERT INTO savings_tx (type, "user", date, amount, purpose, income_id)
          VALUES ('deposit', ${b.user}, ${b.date}, ${b.toSavings}, null, ${incomeId})`;
      }
      return incomeId;
    });

    return reply.code(201).send({ id });
  });

  app.delete('/api/incomes/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const result = await app.db`DELETE FROM incomes WHERE id = ${id.data}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Доход не найден' });
    return { ok: true };
  });
};
