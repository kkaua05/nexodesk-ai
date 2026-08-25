import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";
import { addTimelineEvent } from "../customers/customers.service.js";

export interface CreateProjectInput {
  customerId: string;
  name: string;
  serviceId?: string;
  description?: string;
  valueCents?: number;
  startDate?: Date;
  dueDate?: Date;
  responsibleUserId?: string;
}

/**
 * Manual "novo projeto" entry point — projects are otherwise only ever created
 * automatically when a sale closes (see sales.service.ts's closeSale). When a service
 * (tipo de projeto) is picked, its stage-template checklist is copied in, same as the
 * automatic flow, so manually created projects get the same tracking UI for free.
 */
export function createProject(input: CreateProjectInput) {
  const customer = db.select().from(schema.customers).where(eq(schema.customers.id, input.customerId)).get();
  if (!customer) throw new NotFoundError("Cliente");

  if (input.serviceId) {
    const service = db.select().from(schema.services).where(eq(schema.services.id, input.serviceId)).get();
    if (!service) throw new NotFoundError("Serviço");
  }

  const project = db.transaction((tx) => {
    const created = tx
      .insert(schema.projects)
      .values({
        customerId: input.customerId,
        serviceId: input.serviceId,
        name: input.name,
        description: input.description,
        valueCents: input.valueCents,
        responsibleUserId: input.responsibleUserId,
        startDate: input.startDate,
        dueDate: input.dueDate,
      })
      .returning()
      .get();

    if (input.serviceId) {
      const stageTemplates = tx.select().from(schema.serviceStageTemplates).where(eq(schema.serviceStageTemplates.serviceId, input.serviceId)).all();
      for (const template of stageTemplates) {
        tx.insert(schema.projectStages).values({ projectId: created.id, name: template.name, order: template.order }).run();
      }
    }

    return created;
  });

  addTimelineEvent({ customerId: input.customerId, type: "project_created", title: `Projeto criado: ${project.name}` });
  emitEvent(SOCKET_EVENTS.PROJECT_UPDATED, { project });

  return project;
}
