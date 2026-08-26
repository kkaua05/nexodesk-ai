import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida");
}

const { db, pool } = createDatabase(databaseUrl);

async function main() {
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log(`[database] migrations applied → ${databaseUrl}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
