import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { UnauthorizedError } from "@nexodesk/shared";
import type { LoginInput } from "./auth.schema.js";

export async function authenticateUser({ email, password }: LoginInput) {
  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user || !user.isActive) throw new UnauthorizedError("Credenciais inválidas");

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw new UnauthorizedError("Credenciais inválidas");

  db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id)).run();

  return user;
}

export function getUserById(id: string) {
  return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
}
