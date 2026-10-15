import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { deleteAfterMs } from "@/features/platform/lifecycle";

/** A record that was deleted but is kept, restorable, until its `deleteAfter` date. */
export function isSoftDeleted(doc: { get(field: string): unknown }): boolean {
  return doc.get("deletedAt") != null;
}

export function softDeleteFields(actorUid: string, now = Date.now()) {
  return {
    deletedAt: FieldValue.serverTimestamp(),
    deleteAfter: Timestamp.fromMillis(deleteAfterMs(now)),
    deletedBy: actorUid,
  };
}

export function restoreFields() {
  return {
    deletedAt: FieldValue.delete(),
    deleteAfter: FieldValue.delete(),
    deletedBy: FieldValue.delete(),
  };
}
