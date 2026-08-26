import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error("DATABASE_URL não definida — necessária para rodar os testes contra um banco Postgres real (Neon)");
}

/**
 * Tests never run against the app's real database — that would truncate the
 * owner's actual data. Instead we derive a sibling database (same Neon project,
 * name suffixed with `_test`) and point everything at that.
 */
const testUrl = new URL(baseUrl);
const prodDbName = testUrl.pathname.replace(/^\//, "");
const testDbName = `${prodDbName}_test`;
testUrl.pathname = `/${testDbName}`;

const adminClient = new Client({ connectionString: baseUrl });
await adminClient.connect();
const exists = await adminClient.query("select 1 from pg_database where datname = $1", [testDbName]);
if (exists.rowCount === 0) {
  await adminClient.query(`create database "${testDbName}"`);
}
await adminClient.end();

process.env.DATABASE_URL = testUrl.toString();
process.env.JWT_SECRET = "test-secret-at-least-16-chars";
process.env.NODE_ENV = "test";
process.env.OLLAMA_URL = "http://localhost:1";
process.env.OLLAMA_TIMEOUT_MS = "500";

const { migrate } = await import("drizzle-orm/node-postgres/migrator");
const { createDatabase } = await import("@nexodesk/database");

const { db, pool } = createDatabase(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../../../packages/database/migrations") });

// Fresh slate for this test run — truncate every app table (drizzle's own
// migration-tracking table lives in a separate "drizzle" schema, untouched).
const { rows } = await pool.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public'`);
if (rows.length > 0) {
  const tableList = rows.map((r) => `"${r.tablename}"`).join(", ");
  await pool.query(`truncate table ${tableList} restart identity cascade`);
}

await pool.end();
