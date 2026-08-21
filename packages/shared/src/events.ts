/**
 * Realtime (Socket.IO) event names. Each event carries a specific payload shape —
 * never emit generic "update"/"data" events (see spec §8).
 */
export const SOCKET_EVENTS = {
  MESSAGE_RECEIVED: "message.received",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_SENT: "message.sent",
  CONVERSATION_UPDATED: "conversation.updated",
  CONTACT_CREATED: "contact.created",
  CONTACT_UPDATED: "contact.updated",
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  OPPORTUNITY_MOVED: "opportunity.moved",
  CUSTOMER_CREATED: "customer.created",
  PROPOSAL_UPDATED: "proposal.updated",
  SALE_CREATED: "sale.created",
  PROJECT_UPDATED: "project.updated",
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  PAYMENT_CREATED: "payment.created",
  PAYMENT_OVERDUE: "payment.overdue",
  RECEIVABLE_UPDATED: "receivable.updated",
  FOLLOWUP_CREATED: "followup.created",
  NOTIFICATION_CREATED: "notification.created",
  WHATSAPP_STATUS_CHANGED: "whatsapp.status_changed",
  WHATSAPP_QR: "whatsapp.qr",
  AUTOMATION_RUN_COMPLETED: "automation.run_completed",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
