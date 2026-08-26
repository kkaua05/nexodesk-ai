import { text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@nexodesk/shared";

/** Primary key: ULID stored as text, generated app-side. */
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

/** Unix epoch millis, always UTC — presentation layer applies timezone (spec §75). */
export const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};
