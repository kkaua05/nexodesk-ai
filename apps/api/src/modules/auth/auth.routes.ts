import type { FastifyInstance } from "fastify";
import { loginSchema } from "./auth.schema.js";
import { authenticateUser, getUserById } from "./auth.service.js";
import { NotFoundError } from "@nexodesk/shared";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const user = await authenticateUser(body);

      const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role });

      return reply.send({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      });
    },
  );

  app.get("/auth/me", { onRequest: [app.authenticate] }, async (request) => {
    const user = getUserById(request.user.sub);
    if (!user) throw new NotFoundError("Usuário");
    return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
  });
}
