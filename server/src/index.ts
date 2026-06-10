import path from 'node:path';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import { initDb } from './db.js';
import { buildApp } from './app.js';

const code = process.env.OCHAG_CODE;
if (!code) {
  console.error('OCHAG_CODE не задан — приложение не может стартовать.');
  process.exit(1);
}

const db = await initDb();
const app = await buildApp({ db, code });

const webDist = path.resolve('web/dist');
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Не найдено' });
    return reply.sendFile('index.html');
  });
}

const port = Number(process.env.PORT ?? 8088);
try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Очаг слушает на :${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
