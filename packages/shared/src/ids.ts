import { ulid } from "ulid";

/**
 * ULID: lexicographically sortable, non-predictable-enough for internal entity ids.
 * Sequential documents (proposals, sales) get their own human-readable numbers — see `documentNumber.ts`.
 */
export function createId(): string {
  return ulid().toLowerCase();
}
