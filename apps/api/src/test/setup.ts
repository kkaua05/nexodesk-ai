import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDbDir = mkdtempSync(path.join(tmpdir(), "nexodesk-test-"));
process.env.DATABASE_URL = `file:${path.join(testDbDir, "test.sqlite").replace(/\\/g, "/")}`;
process.env.JWT_SECRET = "test-secret-at-least-16-chars";
process.env.NODE_ENV = "test";
process.env.OLLAMA_URL = "http://localhost:1";
process.env.OLLAMA_TIMEOUT_MS = "500";

const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
const { createDatabase } = await import("@nexodesk/database");

const { db, sqlite } = createDatabase(process.env.DATABASE_URL);
migrate(db, { migrationsFolder: path.resolve(__dirname, "../../../../packages/database/migrations") });
sqlite.close();
