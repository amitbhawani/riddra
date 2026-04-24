import type { AdminActivityLogEntry } from "@/lib/admin-activity-log";

const SYSTEM_ACTOR_LABEL = "System";

function cleanString(value: string | null | undefined, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function formatAdminActivityTarget(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record") {
    return [entry.targetFamily, entry.targetSlug].filter(Boolean).join(" / ");
  }

  if (entry.targetType === "user_profile") {
    return entry.targetId || entry.targetSlug || "User profile";
  }

  if (entry.targetType === "refresh_job") {
    return entry.targetId || entry.targetSlug || "Refresh job";
  }

  if (entry.targetType === "membership_tier") {
    return entry.targetSlug || entry.targetId || "Membership tier";
  }

  if (entry.targetType === "system_settings") {
    return "System settings";
  }

  return entry.targetId || entry.targetSlug || entry.targetType;
}

export function getAdminActivityTargetHref(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record" && entry.targetFamily && entry.targetSlug) {
    return `/admin/content/${entry.targetFamily}/${entry.targetSlug}`;
  }

  if (entry.targetType === "user_profile") {
    return "/admin/users";
  }

  if (entry.targetType === "refresh_job") {
    return "/admin/refresh-jobs";
  }

  if (entry.targetType === "membership_tier") {
    return entry.targetSlug ? `/admin/memberships/${entry.targetSlug}` : "/admin/memberships";
  }

  if (entry.targetType === "system_settings") {
    return "/admin/settings";
  }

  return null;
}

export function getAdminActivityRevertHref(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record" && entry.targetFamily && entry.targetSlug) {
    return `/admin/content/${entry.targetFamily}/${entry.targetSlug}#version-history`;
  }

  return null;
}

export function getAdminActivityActorLabel(
  entry: Pick<AdminActivityLogEntry, "actorEmail" | "actorUserId">,
) {
  return cleanString(entry.actorEmail, 240) || (entry.actorUserId ? "Unknown user" : SYSTEM_ACTOR_LABEL);
}

export function getAdminActivityActorContext(
  entry: Pick<AdminActivityLogEntry, "actorEmail" | "actorUserId">,
) {
  if (getAdminActivityActorLabel(entry) === SYSTEM_ACTOR_LABEL) {
    return "Automatic or approval-generated action";
  }

  return cleanString(entry.actorUserId, 120) || "No user ID";
}

export function getAdminActivityActionTone(actionType: string) {
  if (actionType.includes("publish") || actionType.includes("created")) {
    return "success" as const;
  }

  if (
    actionType.includes("archive") ||
    actionType.includes("role") ||
    actionType.includes("failed")
  ) {
    return "danger" as const;
  }

  if (
    actionType.includes("retry") ||
    actionType.includes("review") ||
    actionType.includes("needs_fix")
  ) {
    return "warning" as const;
  }

  return "info" as const;
}
