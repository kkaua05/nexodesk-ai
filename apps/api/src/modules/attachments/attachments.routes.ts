import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, ValidationError } from "@nexodesk/shared";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — generous for briefings/contracts, small enough to keep the local disk sane

const querySchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
});

export async function attachmentsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/attachments", async (request) => {
    const { entityType, entityId } = querySchema.parse(request.query);
    return db
      .select()
      .from(schema.attachments)
      .where(and(eq(schema.attachments.entityType, entityType), eq(schema.attachments.entityId, entityId)))
      .orderBy(desc(schema.attachments.createdAt))
      .all();
  });

  app.post("/attachments", async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_FILE_SIZE_BYTES } });
    if (!file) throw new ValidationError("Nenhum arquivo enviado");

    const entityType = (file.fields.entityType as { value?: string } | undefined)?.value;
    const entityId = (file.fields.entityId as { value?: string } | undefined)?.value;
    if (!entityType || !entityId) throw new ValidationError("entityType e entityId são obrigatórios");

    const dir = path.join(UPLOAD_ROOT, entityType, entityId);
    await mkdir(dir, { recursive: true });

    const safeName = `${Date.now()}-${file.filename.replace(/[^\w.\-]/g, "_")}`;
    const filePath = path.join(dir, safeName);
    await pipeline(file.file, createWriteStream(filePath));

    if (file.file.truncated) {
      await unlink(filePath).catch(() => undefined);
      throw new ValidationError(`Arquivo excede o limite de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }

    const { size } = await stat(filePath);

    const attachment = db
      .insert(schema.attachments)
      .values({
        entityType,
        entityId,
        fileName: file.filename,
        filePath: path.relative(UPLOAD_ROOT, filePath),
        mimeType: file.mimetype,
        sizeBytes: size,
        uploadedByUserId: request.user.sub,
      })
      .returning()
      .get();

    return reply.status(201).send(attachment);
  });

  app.get("/attachments/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const attachment = db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get();
    if (!attachment) throw new NotFoundError("Anexo");

    const filePath = path.join(UPLOAD_ROOT, attachment.filePath);
    return reply.header("Content-Disposition", `attachment; filename="${attachment.fileName}"`).type(attachment.mimeType).send(createReadStream(filePath));
  });

  app.delete("/attachments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const attachment = db.select().from(schema.attachments).where(eq(schema.attachments.id, id)).get();
    if (!attachment) throw new NotFoundError("Anexo");

    await unlink(path.join(UPLOAD_ROOT, attachment.filePath)).catch(() => undefined);
    db.delete(schema.attachments).where(eq(schema.attachments.id, id)).run();
    return reply.status(204).send();
  });
}
