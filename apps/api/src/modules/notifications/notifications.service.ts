import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export async function createNotification(input: {
  userId?: string;
  type: (typeof schema.NOTIFICATION_TYPE)[number];
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}) {
  const notification = (await (db.insert(schema.notifications).values(input).returning()))[0];
  emitEvent(SOCKET_EVENTS.NOTIFICATION_CREATED, { notification });
  return notification;
}

export async function listNotifications(userId?: string) {
  const all = (await (db.select().from(schema.notifications)));
  return all.filter((n) => !userId || !n.userId || n.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function markNotificationRead(id: string) {
  return (await (db.update(schema.notifications).set({ readAt: new Date() }).where(eq(schema.notifications.id, id)).returning()))[0];
}

export async function markAllNotificationsRead(userId: string) {
  const unread = (await listNotifications(userId)).filter((n) => !n.readAt);
  const now = new Date();
  for (const notification of unread) {
    (await (db.update(schema.notifications).set({ readAt: now }).where(eq(schema.notifications.id, notification.id))));
  }
}
