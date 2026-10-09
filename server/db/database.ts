import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Schema migrations, applied in order. `PRAGMA user_version` stores how many ran.
 * Never edit a released migration — append a new one.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE quotes (
    id          TEXT PRIMARY KEY,
    request     TEXT NOT NULL,          -- CheckoutRequest (JSON)
    quote       TEXT NOT NULL,          -- CheckoutQuote (JSON), priced by the server
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );

  CREATE TABLE orders (
    id          TEXT PRIMARY KEY,
    quote_id    TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    location_id TEXT NOT NULL,
    status      TEXT NOT NULL,
    total       INTEGER NOT NULL CHECK (total >= 0),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    data        TEXT NOT NULL           -- Order (JSON); status/total columns mirror it for queries
  );
  CREATE INDEX orders_by_location_status ON orders (location_id, status, created_at);

  CREATE TABLE promo_codes (
    code            TEXT PRIMARY KEY,   -- normalized (trimmed, upper case)
    type            TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value           INTEGER NOT NULL CHECK (value >= 0),
    min_order_value INTEGER,
    expires_at      TEXT,
    usage_limit     INTEGER,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    active          INTEGER NOT NULL DEFAULT 1,
    visibility      TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'personal')),
    customer_id     TEXT,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE reviews (
    id             TEXT PRIMARY KEY,
    order_id       TEXT NOT NULL UNIQUE REFERENCES orders(id),
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    food_rating    INTEGER CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
    speed_rating   INTEGER CHECK (speed_rating BETWEEN 1 AND 5),
    comment        TEXT,
    status         TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'published', 'rejected')),
    created_at     TEXT NOT NULL
  );

  -- The menu itself lives in the repository (src/data/menu, verbatim from sushiriga.lv).
  -- Staff-managed changes (sold out, price change) are stored as overrides.
  CREATE TABLE product_overrides (
    product_id  TEXT PRIMARY KEY,
    available   INTEGER,
    price       INTEGER CHECK (price >= 0),
    updated_at  TEXT NOT NULL
  );
  `,
];

export type Database = DatabaseSync;

export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
  }
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  for (let version = current; version < MIGRATIONS.length; version++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[version]!);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/** Runs `work` in a write transaction; rolls back if it throws. */
export function transaction<T>(db: Database, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
