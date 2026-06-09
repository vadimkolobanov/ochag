import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';

export interface AppSettings {
  currencySymbol: string;
  paydayHim: number[];
  paydayHer: number[];
}

/** Читает настройки из таблицы settings (ТЗ §5). */
export function readSettings(db: Db): AppSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    currencySymbol: map.currency_symbol ?? '₽',
    paydayHim: JSON.parse(map.payday_him ?? '[]') as number[],
    paydayHer: JSON.parse(map.payday_her ?? '[]') as number[],
  };
}

const days = z.array(z.number().int().min(1).max(28)).min(1, 'Нужен хотя бы один день зарплаты');

const bodySchema = z.object({
  currencySymbol: z.string().min(1).max(3),
  paydayHim: days,
  paydayHer: days,
});

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/settings', async () => readSettings(app.db));

  app.put('/api/settings', async (req, reply) => {
    const p = bodySchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;
    const upsert = app.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    app.db.transaction(() => {
      upsert.run('currency_symbol', b.currencySymbol);
      upsert.run('payday_him', JSON.stringify(b.paydayHim));
      upsert.run('payday_her', JSON.stringify(b.paydayHer));
    })();
    return readSettings(app.db);
  });
};
