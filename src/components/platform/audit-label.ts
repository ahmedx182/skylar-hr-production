import type { PlatformAction } from "@/server/repositories/platform.repository";

const labels: Record<PlatformAction, string> = {
  block: "Suspended workspace",
  unblock: "Restored access",
  gift_access: "Gifted access",
  end_gift: "Ended gifted access",
  grant_paid: "Granted paid access",
  revoke_paid: "Revoked paid access",
  delete: "Deleted workspace",
  restore_workspace: "Restored deleted workspace",
  purge: "Permanently removed workspace",
  user_suspend: "Suspended user",
  user_unsuspend: "Restored user access",
  user_delete: "Deleted user account",
  user_restore: "Restored deleted user",
  user_purge: "Permanently removed user",
  platform_admin_grant: "Granted super admin",
  platform_admin_revoke: "Removed super admin",
  package_create: "Created package",
  package_update: "Updated package",
  package_archive: "Archived package",
  package_restore: "Restored package",
};

export function auditActionLabel(action: PlatformAction): string {
  return labels[action] ?? action;
}
