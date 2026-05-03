import { revalidatePath } from "next/cache";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  appendAdminRecordRevision,
  saveAdminManagedRecord,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import { appendCmsRecordVersion } from "@/lib/user-product-store";
import { invalidatePublicContentCachesForAdminRecord } from "@/lib/content";
import { syncSearchIndexForAdminContentChange } from "@/lib/search-index-rebuild";

export async function persistApprovedAdminRecordChange(input: {
  actorUserId: string;
  actorEmail: string;
  payload: SaveAdminRecordInput;
  activityActorSource?: "manual" | "system";
}) {
  const saved = await saveAdminManagedRecord(input.payload);
  const sectionKeys = Object.keys(input.payload.sections ?? {});
  const overrideSections = Object.entries(input.payload.sections ?? {})
    .filter(([, section]) => section.mode !== "auto_source")
    .map(([sectionKey]) => sectionKey);
  const activityActor =
    input.activityActorSource === "system"
      ? { actorUserId: null, actorEmail: "System" }
      : {
          actorUserId: input.actorUserId,
          actorEmail: input.actorEmail,
        };

  await appendAdminRecordRevision({
    family: input.payload.family,
    slug: saved.slug,
    title: saved.title,
    editor: input.actorEmail,
    action:
      input.payload.status === "published"
        ? "Published operator record"
        : input.payload.status === "ready_for_review"
          ? "Saved operator review draft"
          : input.payload.status === "needs_fix"
            ? "Marked operator draft as needs fix"
            : input.payload.status === "archived"
              ? "Archived operator record"
              : "Saved operator draft",
    changedFields: sectionKeys,
    reason:
      input.payload.status === "published"
        ? "Operator editor published updated public-facing fields."
        : input.payload.status === "ready_for_review"
          ? "Operator editor saved a review-ready version for follow-up."
          : input.payload.status === "needs_fix"
            ? "Operator editor flagged this record for fixes before it can move forward."
            : input.payload.status === "archived"
              ? "Operator editor archived this record from the active publishing flow."
              : "Operator editor saved field changes without publishing.",
    revisionState:
      input.payload.status === "published"
        ? "Published"
        : input.payload.status === "ready_for_review"
          ? "Review ready"
          : input.payload.status === "needs_fix"
            ? "Needs fix"
            : "Rollback staged",
    routeTarget: `/admin/content/${input.payload.family}/${saved.slug}`,
  });

  await appendCmsRecordVersion({
    family: saved.family,
    slug: saved.slug,
    title: saved.title,
    savedBy: input.actorEmail,
    status: input.payload.status,
    routeTarget: saved.publicHref ?? saved.canonicalRoute ?? null,
    changedFields: sectionKeys,
    snapshot: input.payload,
  });

  await appendAdminActivityLog({
    actorUserId: activityActor.actorUserId,
    actorEmail: activityActor.actorEmail,
    actionType:
      input.payload.status === "published"
        ? "content.published"
        : input.payload.status === "archived"
          ? "content.archived"
          : "content.saved",
    targetType: "content_record",
    targetId: saved.id,
    targetFamily: saved.family,
    targetSlug: saved.slug,
    summary:
      input.payload.status === "published"
        ? `Published ${saved.title} in ${saved.family}.`
        : input.payload.status === "archived"
          ? `Archived ${saved.title} in ${saved.family}.`
          : input.payload.status === "ready_for_review"
            ? `Moved ${saved.title} in ${saved.family} into review.`
            : input.payload.status === "needs_fix"
              ? `Marked ${saved.title} in ${saved.family} as needs fix.`
              : `Saved ${saved.title} in ${saved.family}.`,
    metadata: {
      changedFields: sectionKeys,
      publishState: input.payload.status,
    },
  });

  if (overrideSections.length) {
    await appendAdminActivityLog({
      actorUserId: activityActor.actorUserId,
      actorEmail: activityActor.actorEmail,
      actionType: "override.updated",
      targetType: "content_record",
      targetId: saved.id,
      targetFamily: saved.family,
      targetSlug: saved.slug,
      summary: `Updated override-controlled sections on ${saved.title}: ${overrideSections.join(", ")}.`,
      metadata: {
        overrideSections,
      },
    });
  }

  if (
    saved.family === "stocks" ||
    saved.family === "mutual-funds" ||
    saved.family === "ipos"
  ) {
    invalidatePublicContentCachesForAdminRecord(saved.family, saved.slug);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/change-log");
  revalidatePath("/admin/readiness");
  revalidatePath(`/admin/content/${saved.family}/${saved.slug}`);
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${saved.family}`);
  if (saved.publicHref) {
    revalidatePath(saved.publicHref);
  }
  if (saved.canonicalRoute && saved.canonicalRoute !== saved.publicHref) {
    revalidatePath(saved.canonicalRoute);
  }

  if (saved.family === "stocks") {
    try {
      await syncSearchIndexForAdminContentChange({
        family: "stocks",
        slugs: [saved.slug],
        requestedBy: input.actorEmail,
        source: "admin_record_workflow",
        publicStatus: saved.status,
      });
    } catch (error) {
      console.error("[search-index-sync] stock workflow refresh failed", {
        family: saved.family,
        slug: saved.slug,
        requestedBy: input.actorEmail,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    saved,
    sectionKeys,
    overrideSections,
  };
}
