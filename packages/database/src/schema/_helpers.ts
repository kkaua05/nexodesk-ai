import { text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@nexodesk/shared";

/** Primary key: ULID stored as text, generated app-side. */
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

/** Unix epoch millis, always UTC — presentation layer applies timezone (spec §75). */
export const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};
