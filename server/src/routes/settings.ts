import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Sql } from '../db.js';

export interface AppSettings {
  currencySymbol: string;
  paydayHim: number[];
  paydayHer: number[];
}

export async function readSettings(sql: Sql): Promise<AppSettings> {
  const rows = await sql<{ key: string; value: string }[]>`SELECT key, value FROM settings`;
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
    await app.db.begin(async (sql) => {
      await sql`INSERT INTO settings (key, value) VALUES ('currency_symbol', ${b.currencySymbol})
        ON CONFLICT (key) DO UPDATE SET value = excluded.value`;
      await sql`INSERT INTO settings (key, value) VALUES ('payday_him', ${JSON.stringify(b.paydayHim)})
        ON CONFLICT (key) DO UPDATE SET value = excluded.value`;
      await sql`INSERT INTO settings (key, value) VALUES ('payday_her', ${JSON.stringify(b.paydayHer)})
        ON CONFLICT (key) DO UPDATE SET value = excluded.value`;
    });
    return readSettings(app.db);
  });
};
