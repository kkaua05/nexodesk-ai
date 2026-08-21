import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError, ForbiddenError, type UserRole } from "@nexodesk/shared";
import { env } from "../shared/env.js";

export interface AuthUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
  });

  app.decorate("requireRole", (...roles: UserRole[]) => {
    return async (request: FastifyRequest) => {
      if (!request.user) throw new UnauthorizedError();
      // Owner always passes — it is the superuser role (spec §59).
      if (request.user.role === "owner") return;
      if (!roles.includes(request.user.role)) throw new ForbiddenError();
    };
  });
});
