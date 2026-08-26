import type { FastifyInstance } from "fastify";
import { z } from "zod";
import argon2 from "argon2";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { USER_ROLE } from "@nexodesk/shared";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(USER_ROLE).default("atendimento"),
});

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/users", async () => {
    const users = (await (db.select().from(schema.users)));
    return users.map(({ passwordHash: _passwordHash, ...safe }) => safe);
  });

  app.post("/users", { onRequest: [app.authenticate, app.requireRole("owner")] }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const passwordHash = await argon2.hash(body.password);
    const user = (await (db
          .insert(schema.users)
          .values({ name: body.name, email: body.email, passwordHash, role: body.role })
          .returning()))[0]!;
    const { passwordHash: _hash, ...safe } = user;
    return reply.status(201).send(safe);
  });
}
