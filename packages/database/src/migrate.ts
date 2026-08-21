import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDatabase } from "./client";

const databaseUrl = process.env.DATABASE_URL ?? "file:../../apps/api/data/database.sqlite";
const { db, sqlite } = createDatabase(databaseUrl);

migrate(db, { migrationsFolder: "./migrations" });
console.log(`[database] migrations applied → ${databaseUrl}`);
sqlite.close();
