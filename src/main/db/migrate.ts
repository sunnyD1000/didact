import * as fs from "fs";
import * as path from "path";
import { getDb, DB_VERSION } from "./index";

export function migrateDb(): void {
  const db = getDb();

  // Create version table if missing
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  const row = db.prepare("SELECT version FROM schema_version").get() as
    | { version: number }
    | undefined;
  const currentVersion = row?.version ?? 0;

  if (currentVersion >= DB_VERSION) return;

  // Run the full schema (all CREATE TABLE IF NOT EXISTS — idempotent)
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(sql);

  if (currentVersion === 0) {
    db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
      DB_VERSION
    );
  } else {
    db.prepare("UPDATE schema_version SET version = ?").run(DB_VERSION);
  }

  console.log(`[db] Migrated to schema version ${DB_VERSION}`);
}
