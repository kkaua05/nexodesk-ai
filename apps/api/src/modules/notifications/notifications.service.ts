import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export function createNotification(input: {
  userId?: string;
  type: (typeof schema.NOTIFICATION_TYPE)[number];
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}) {
  const notification = db.insert(schema.notifications).values(input).returning().get();
  emitEvent(SOCKET_EVENTS.NOTIFICATION_CREATED, { notification });
  return notification;
}

export function listNotifications(userId?: string) {
  const all = db.select().from(schema.notifications).all();
  return all.filter((n) => !userId || !n.userId || n.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function markNotificationRead(id: string) {
  return db.update(schema.notifications).set({ readAt: new Date() }).where(eq(schema.notifications.id, id)).returning().get();
}

export function markAllNotificationsRead(userId: string) {
  const unread = listNotifications(userId).filter((n) => !n.readAt);
  const now = new Date();
  for (const notification of unread) {
    db.update(schema.notifications).set({ readAt: now }).where(eq(schema.notifications.id, notification.id)).run();
  }
}
