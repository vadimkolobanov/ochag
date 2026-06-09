// Точка входа Fastify: регистрация роутов, хук семейного кода (§7.6), раздача dist/ (ТЗ §3).
// Реализуется на этапе B.

const code = process.env.OCHAG_CODE;
if (!code) {
  console.error('OCHAG_CODE не задан — контейнер не может стартовать (ТЗ §7.6).');
  process.exit(1);
}

export {};
