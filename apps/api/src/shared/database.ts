import { createDatabase } from "@nexodesk/database";
import { env } from "./env.js";

export const { db, sqlite } = createDatabase(env.DATABASE_URL);
