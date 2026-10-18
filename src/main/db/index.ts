import Database from "better-sqlite3";
import * as path from "path";
import { app } from "electron";
import * as fs from "fs";

const DB_VERSION = 1;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbDir = app.getPath("userData");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "didact.db");
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export { DB_VERSION };
