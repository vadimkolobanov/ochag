import postgres from 'postgres';

export type Sql = ReturnType<typeof postgres>;

const MIGRATION = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  "user" TEXT NOT NULL CHECK ("user" IN ('him','her')),
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  to_daily INTEGER NOT NULL DEFAULT 0,
  to_savings INTEGER NOT NULL DEFAULT 0,
  to_bills INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  CHECK (to_daily + to_savings + to_bills = amount)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  "user" TEXT NOT NULL CHECK ("user" IN ('him','her')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  comment TEXT
);

CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  from_user TEXT NOT NULL CHECK (from_user IN ('him','her')),
  to_user TEXT NOT NULL CHECK (to_user IN ('him','her')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  comment TEXT,
  CHECK (from_user <> to_user)
);

CREATE TABLE IF NOT EXISTS savings_tx (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  "user" TEXT NOT NULL CHECK ("user" IN ('him','her')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'RUB',
  purpose TEXT,
  income_id INTEGER REFERENCES incomes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS obligations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit','utilities','mobile','internet','other')),
  default_amount INTEGER NOT NULL CHECK (default_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  owner TEXT NOT NULL DEFAULT 'him' CHECK (owner IN ('him','her')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS obligation_payments (
  id SERIAL PRIMARY KEY,
  obligation_id INTEGER NOT NULL REFERENCES obligations(id),
  month TEXT NOT NULL,
  paid_date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  UNIQUE (obligation_id, month)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_savings_date ON savings_tx(date);
`;

const CATEGORY_SEEDS = [
  { name: 'Продукты', icon: 'shopping-basket' },
  { name: 'Транспорт', icon: 'bus' },
  { name: 'Кафе', icon: 'coffee' },
  { name: 'Дом', icon: 'home' },
  { name: 'Здоровье', icon: 'heart-pulse' },
  { name: 'Одежда', icon: 'shirt' },
  { name: 'Материалы (работа)', icon: 'paintbrush' },
  { name: 'Другое', icon: 'circle-ellipsis' },
];

const SETTINGS_SEEDS: [string, string][] = [
  ['currency_symbol', '₽'],
  ['payday_him', '[19]'],
  ['payday_her', '[10,25]'],
];

export function openDb(url?: string): Sql {
  return postgres(url ?? process.env.DATABASE_URL ?? 'postgresql://ochag:ochag_db_2024@127.0.0.1:5432/ochag', {
    max: 10,
    idle_timeout: 30,
  });
}

export async function migrate(sql: Sql): Promise<void> {
  await sql.unsafe(MIGRATION);
}

export async function seed(sql: Sql): Promise<void> {
  const [{ n: settingsCount }] = await sql<[{ n: string }]>`SELECT COUNT(*)::text AS n FROM settings`;
  if (Number(settingsCount) === 0) {
    await sql.begin(async (sql) => {
      for (const [k, v] of SETTINGS_SEEDS) {
        await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v})`;
      }
    });
  }

  const [{ n: catCount }] = await sql<[{ n: string }]>`SELECT COUNT(*)::text AS n FROM categories`;
  if (Number(catCount) === 0) {
    await sql.begin(async (sql) => {
      for (let i = 0; i < CATEGORY_SEEDS.length; i++) {
        const c = CATEGORY_SEEDS[i];
        await sql`INSERT INTO categories (name, icon, sort) VALUES (${c.name}, ${c.icon}, ${i})`;
      }
    });
  }
}

export async function initDb(url?: string): Promise<Sql> {
  const sql = openDb(url);
  await migrate(sql);
  await seed(sql);
  return sql;
}
