import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema/index";

function resolveDatabaseFile(databaseUrl: string): string {
  return databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
}

export function createDatabase(databaseUrl: string) {
  const filePath = resolveDatabaseFile(databaseUrl);
  mkdirSync(dirname(filePath), { recursive: true });

  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return { db: drizzle(sqlite, { schema }), sqlite };
}

export type Database_ = ReturnType<typeof createDatabase>["db"];
export { schema };
