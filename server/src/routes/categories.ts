import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/categories', async () => {
    return app.db`
      SELECT id, name, icon, sort, is_active
      FROM categories WHERE is_active = 1 ORDER BY sort, id`;
  });

  const createBody = z.object({
    name: z.string().min(1, 'Укажите название'),
    icon: z.string().min(1),
    sort: z.number().int().optional(),
  });

  app.post('/api/categories', async (req, reply) => {
    const p = createBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const sort = b.sort ?? (
      await app.db<[{ n: number }]>`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories`
    )[0].n;
    const [{ id }] = await app.db<[{ id: number }]>`
      INSERT INTO categories (name, icon, sort) VALUES (${b.name}, ${b.icon}, ${sort}) RETURNING id`;
    return reply.code(201).send({ id });
  });

  const patchBody = z.object({
    name: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    sort: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  app.patch('/api/categories/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });
    const p = patchBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;

    const updates: Record<string, unknown> = {};
    if (b.name !== undefined) updates.name = b.name;
    if (b.icon !== undefined) updates.icon = b.icon;
    if (b.sort !== undefined) updates.sort = b.sort;
    if (b.isActive !== undefined) updates.is_active = b.isActive ? 1 : 0;
    if (Object.keys(updates).length === 0) return reply.code(400).send({ error: 'Нечего обновлять' });

    const result = await app.db`UPDATE categories SET ${app.db(updates)} WHERE id = ${id.data}`;
    if (result.count === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { ok: true };
  });
};
