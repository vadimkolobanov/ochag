import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

interface CategoryRow {
  id: number;
  name: string;
  icon: string;
  sort: number;
  is_active: number;
}

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/categories', async () => {
    return app.db
      .prepare('SELECT id, name, icon, sort, is_active FROM categories WHERE is_active = 1 ORDER BY sort, id')
      .all() as CategoryRow[];
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
    const sort =
      b.sort ??
      ((app.db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories').get() as { n: number }).n);
    const info = app.db
      .prepare('INSERT INTO categories (name, icon, sort) VALUES (?, ?, ?)')
      .run(b.name, b.icon, sort);
    return reply.code(201).send({ id: Number(info.lastInsertRowid) });
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

    const sets: string[] = [];
    const vals: unknown[] = [];
    if (b.name !== undefined) { sets.push('name = ?'); vals.push(b.name); }
    if (b.icon !== undefined) { sets.push('icon = ?'); vals.push(b.icon); }
    if (b.sort !== undefined) { sets.push('sort = ?'); vals.push(b.sort); }
    if (b.isActive !== undefined) { sets.push('is_active = ?'); vals.push(b.isActive ? 1 : 0); }
    if (sets.length === 0) return reply.code(400).send({ error: 'Нечего обновлять' });

    vals.push(id.data);
    const info = app.db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    if (info.changes === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { ok: true };
  });
};
