// better-sqlite3: подключение, миграция (ТЗ §5), сиды (ТЗ §5 «Сиды»).
// Миграция идемпотентна (CREATE TABLE IF NOT EXISTS); сиды вставляются только в пустые таблицы.
import Database from 'better-sqlite3';

export type Db = Database.Database;

export const DB_PATH = process.env.OCHAG_DB ?? 'data/ochag.sqlite';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL );

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, icon TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1 );

CREATE TABLE IF NOT EXISTS incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL CHECK (user IN ('him','her')),
  date TEXT NOT NULL, source TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  to_daily INTEGER NOT NULL DEFAULT 0,
  to_savings INTEGER NOT NULL DEFAULT 0,
  to_bills INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  CHECK (to_daily + to_savings + to_bills = amount) );

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL CHECK (user IN ('him','her')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  comment TEXT );

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user TEXT NOT NULL CHECK (from_user IN ('him','her')),
  to_user TEXT NOT NULL CHECK (to_user IN ('him','her')),
  date TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  comment TEXT, CHECK (from_user <> to_user) );

CREATE TABLE IF NOT EXISTS savings_tx (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  user TEXT NOT NULL CHECK (user IN ('him','her')),
  date TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  purpose TEXT,
  income_id INTEGER REFERENCES incomes(id) ON DELETE CASCADE );

CREATE TABLE IF NOT EXISTS obligations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit','utilities','mobile','internet','other')),
  default_amount INTEGER NOT NULL CHECK (default_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  owner TEXT NOT NULL DEFAULT 'him' CHECK (owner IN ('him','her')),
  is_active INTEGER NOT NULL DEFAULT 1 );

CREATE TABLE IF NOT EXISTS obligation_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation_id INTEGER NOT NULL REFERENCES obligations(id),
  month TEXT NOT NULL,
  paid_date TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  UNIQUE (obligation_id, month) );

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_savings_date ON savings_tx(date);
`;

// Сиды категорий (ТЗ §5): имя / имя иконки lucide.
const CATEGORY_SEEDS: ReadonlyArray<{ name: string; icon: string }> = [
  { name: 'Продукты', icon: 'shopping-basket' },
  { name: 'Транспорт', icon: 'bus' },
  { name: 'Кафе', icon: 'coffee' },
  { name: 'Дом', icon: 'home' },
  { name: 'Здоровье', icon: 'heart-pulse' },
  { name: 'Одежда', icon: 'shirt' },
  { name: 'Материалы (работа)', icon: 'paintbrush' },
  { name: 'Другое', icon: 'circle-ellipsis' },
];

const SETTINGS_SEEDS: ReadonlyArray<[string, string]> = [
  ['currency_symbol', '₽'],
  ['payday_him', '[19]'],
  ['payday_her', '[10,25]'],
];

export function openDb(path: string = DB_PATH): Db {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function migrate(db: Db): void {
  db.exec(MIGRATION);
}

/** Вставляет сиды только если соответствующая таблица пуста. Демо-обязательство НЕ создаётся. */
export function seed(db: Db): void {
  const count = (table: string): number =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

  if (count('settings') === 0) {
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
      for (const [k, v] of SETTINGS_SEEDS) ins.run(k, v);
    })();
  }

  if (count('categories') === 0) {
    const ins = db.prepare('INSERT INTO categories (name, icon, sort) VALUES (?, ?, ?)');
    db.transaction(() => {
      CATEGORY_SEEDS.forEach((c, i) => ins.run(c.name, c.icon, i));
    })();
  }
}

/** Открыть БД, применить миграцию и сиды. Файл и схема создаются при первом старте. */
export function initDb(path: string = DB_PATH): Db {
  const db = openDb(path);
  migrate(db);
  seed(db);
  return db;
}
