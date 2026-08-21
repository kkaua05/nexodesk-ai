import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";

/** Generic polymorphic association: (entityType, entityId) — kept intentionally loose
 *  since notes/attachments can hang off leads, customers, projects, proposals, etc. */
export const notes = sqliteTable(
  "notes",
  {
    id: idColumn(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    authorUserId: text("author_user_id"),
    body: text("body").notNull(),
    ...timestamps,
  },
  (table) => [index("notes_entity_idx").on(table.entityType, table.entityId)],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: idColumn(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedByUserId: text("uploaded_by_user_id"),
    ...timestamps,
  },
  (table) => [index("attachments_entity_idx").on(table.entityType, table.entityId)],
);
