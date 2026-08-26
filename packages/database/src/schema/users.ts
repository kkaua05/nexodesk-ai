import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { USER_ROLE } from "@nexodesk/shared";

export const users = pgTable("users", {
  id: idColumn(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLE }).notNull().default("owner"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  ...timestamps,
});

/**
 * Fine-grained permission overrides, additive to `role` defaults.
 * Empty for the single-Owner setup phase; wired for future multi-user RBAC (spec §59).
 */
export const permissions = pgTable("permissions", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  ...timestamps,
});
