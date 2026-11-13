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
  hr_advisor_grant: "Added HR advisor",
  hr_advisor_revoke: "Removed HR advisor",
  advisor_view_case: "Opened advisor case",
  advisor_claim: "Claimed advisor case",
  advisor_take_over: "Took over advisor case",
  advisor_release: "Released advisor case",
  advisor_resolve: "Resolved advisor case",
  advisor_false_alarm: "Marked advisor case a false alarm",
  advisor_settings_update: "Changed HR advisor settings",
  advisor_close_unclaimed: "Closed unclaimed case",
  package_create: "Created package",
  package_update: "Updated package",
  package_archive: "Archived package",
  package_restore: "Restored package",
  package_promo_create: "Created promo code",
  package_promo_replace: "Replaced promo code",
  package_promo_activate: "Turned on promo code",
  package_promo_deactivate: "Turned off promo code",
};

export function auditActionLabel(action: PlatformAction): string {
  return labels[action] ?? action;
}
