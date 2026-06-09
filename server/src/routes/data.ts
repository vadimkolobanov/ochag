import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Порядок вставки безопасен по внешним ключам (родители раньше детей).
const INSERT_ORDER = [
  'settings',
  'categories',
  'obligations',
  'incomes',
  'expenses',
  'transfers',
  'savings_tx',
  'obligation_payments',
] as const;

const DATA_DIR = process.env.OCHAG_DATA_DIR ?? 'data';

export const dataRoutes: FastifyPluginAsync = async (app) => {
  function dumpAll(): Record<string, unknown[]> {
    const dump: Record<string, unknown[]> = {};
    for (const t of INSERT_ORDER) dump[t] = app.db.prepare(`SELECT * FROM ${t}`).all();
    return dump;
  }

  // Полный экспорт всех таблиц одним JSON (ТЗ §8).
  app.get('/api/export', async (_req, reply) => {
    const date = new Date().toISOString().slice(0, 10); // только для имени файла (ТЗ §4)
    reply
      .header('Content-Disposition', `attachment; filename="ochag-backup-${date}.json"`)
      .type('application/json');
    return { version: 1, exportedAt: new Date().toISOString(), data: dumpAll() };
  });

  // Импорт: полностью замещает данные в одной транзакции; перед заменой пишет автокопию (ТЗ §8).
  app.post('/api/import', async (req, reply) => {
    const parsed = z.object({ data: z.record(z.array(z.record(z.any()))) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Неверный формат резервной копии' });
    const incoming = parsed.data.data;

    // Автокопия текущего состояния перед заменой.
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(path.join(DATA_DIR, `pre-import-${stamp}.json`), JSON.stringify(dumpAll()), 'utf8');
    } catch (e) {
      app.log?.error?.(e);
    }

    try {
      app.db.transaction(() => {
        for (const t of [...INSERT_ORDER].reverse()) app.db.prepare(`DELETE FROM ${t}`).run();
        for (const t of INSERT_ORDER) {
          const rows = incoming[t];
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            const cols = Object.keys(row);
            if (cols.length === 0) continue;
            const sql = `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`;
            app.db.prepare(sql).run(row as Record<string, unknown>);
          }
        }
      })();
    } catch (e) {
      return reply.code(400).send({ error: 'Не удалось импортировать: данные несовместимы' });
    }

    return { ok: true };
  });
};
