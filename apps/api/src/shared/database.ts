import { createDatabase } from "@nexodesk/database";
import { env } from "./env.js";

export const { db, pool } = createDatabase(env.DATABASE_URL);
