import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db.js';
import { expensesRoutes } from './routes/expenses.js';
import { incomesRoutes } from './routes/incomes.js';
import { transfersRoutes } from './routes/transfers.js';
import { savingsRoutes } from './routes/savings.js';
import { billsRoutes } from './routes/bills.js';
import { stateRoutes } from './routes/state.js';
import { settingsRoutes } from './routes/settings.js';
import { categoriesRoutes } from './routes/categories.js';
import { historyRoutes } from './routes/history.js';
import { dataRoutes } from './routes/data.js';
import { creditsRoutes } from './routes/credits.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Sql;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function buildApp(opts: { db: Sql; code: string }): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate('db', opts.db);

  await app.register(rateLimit, { global: false });

  app.addHook('onRequest', async (req, reply) => {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/') || url === '/api/auth/check') return;
    const header = req.headers['x-ochag-code'];
    const provided = (Array.isArray(header) ? header[0] : header) ?? '';
    if (!safeEqual(provided, opts.code)) {
      return reply.code(401).send({ error: 'Нужен семейный код' });
    }
  });

  app.post(
    '/api/auth/check',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = z.object({ code: z.string() }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Неверный запрос' });
      if (!safeEqual(parsed.data.code, opts.code)) {
        return reply.code(401).send({ error: 'Код не подходит' });
      }
      return { ok: true };
    },
  );

  await app.register(expensesRoutes);
  await app.register(incomesRoutes);
  await app.register(transfersRoutes);
  await app.register(savingsRoutes);
  await app.register(billsRoutes);
  await app.register(stateRoutes);
  await app.register(settingsRoutes);
  await app.register(categoriesRoutes);
  await app.register(historyRoutes);
  await app.register(dataRoutes);
  await app.register(creditsRoutes);

  return app;
}
