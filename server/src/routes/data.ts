import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const TABLES = [
  'settings', 'categories', 'obligations', 'incomes',
  'expenses', 'transfers', 'savings_tx', 'obligation_payments',
] as const;

export const dataRoutes: FastifyPluginAsync = async (app) => {
  async function dumpAll(): Promise<Record<string, unknown[]>> {
    const dump: Record<string, unknown[]> = {};
    for (const t of TABLES) dump[t] = [...await app.db`SELECT * FROM ${app.db(t)}`];
    return dump;
  }

  app.get('/api/export', async (_req, reply) => {
    const date = new Date().toISOString().slice(0, 10);
    reply
      .header('Content-Disposition', `attachment; filename="ochag-backup-${date}.json"`)
      .type('application/json');
    return { version: 1, exportedAt: new Date().toISOString(), data: await dumpAll() };
  });

  app.post('/api/import', async (req, reply) => {
    const parsed = z.object({ data: z.record(z.array(z.record(z.any()))) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Неверный формат резервной копии' });
    const incoming = parsed.data.data;

    try {
      await app.db.begin(async (sql) => {
        // Очистить в обратном порядке (от дочерних к родительским)
        for (const t of [...TABLES].reverse()) {
          await sql.unsafe(`DELETE FROM ${t}`);
        }
        // Вставить данные
        for (const t of TABLES) {
          const rows = incoming[t];
          if (!Array.isArray(rows) || rows.length === 0) continue;
          for (const row of rows) {
            const cols = Object.keys(row);
            if (cols.length === 0) continue;
            const vals = Object.values(row);
            const colList = cols.map((c) => `"${c}"`).join(', ');
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            await sql.unsafe(`INSERT INTO ${t} (${colList}) VALUES (${placeholders})`, vals);
          }
          // Сбросить sequence чтобы следующий INSERT не конфликтовал
          if (t !== 'settings') {
            await sql.unsafe(
              `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${t}`,
            );
          }
        }
      });
    } catch (e) {
      return reply.code(400).send({ error: 'Не удалось импортировать: данные несовместимы' });
    }

    return { ok: true };
  });
};
