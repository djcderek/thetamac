import { randomUUID } from "crypto";

// Shared match and race records outlive a deleted account. The deleted player's ID in those
// records is replaced with a tombstone so opponents keep their history without the
// deleted user remaining identifiable or ranked.
const DELETED_USER_ID_PREFIX = "deleted:";

export const DELETED_PLAYER_NAME = "Deleted player";

export function createDeletedUserId() {
  return `${DELETED_USER_ID_PREFIX}${randomUUID()}`;
}

export function isDeletedUserId(id: string) {
  return id.startsWith(DELETED_USER_ID_PREFIX);
}
