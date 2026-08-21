import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";
import { USER_ROLE } from "@nexodesk/shared";

export const users = sqliteTable("users", {
  id: idColumn(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLE }).notNull().default("owner"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

/**
 * Fine-grained permission overrides, additive to `role` defaults.
 * Empty for the single-Owner setup phase; wired for future multi-user RBAC (spec §59).
 */
export const permissions = sqliteTable("permissions", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  ...timestamps,
});
