// better-sqlite3: подключение, миграция (ТЗ §5), сиды. Реализуется на этапе A.
// PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;

export const DB_PATH = process.env.OCHAG_DB ?? 'data/ochag.sqlite';

export {};
