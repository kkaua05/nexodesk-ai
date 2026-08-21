import type { FastifyInstance, FastifyError } from "fastify";
import { AppError } from "@nexodesk/shared";
import { ZodError } from "zod";

/**
 * Standard error envelope (spec §64): { error: { code, message } } — never a raw stack trace.
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error instanceof ZodError) {
      request.log.warn({ err: error }, "validation failed");
      return reply.status(422).send({
        error: { code: "VALIDATION_ERROR", message: "Dados inválidos", details: error.flatten() },
      });
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      request.log.warn({ err: fastifyError }, fastifyError.message);
      return reply.status(fastifyError.statusCode).send({
        error: { code: fastifyError.code ?? "BAD_REQUEST", message: fastifyError.message },
      });
    }

    request.log.error({ err: error }, "unhandled error");
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: { code: "ROUTE_NOT_FOUND", message: `Rota não encontrada: ${request.method} ${request.url}` } });
  });
}
