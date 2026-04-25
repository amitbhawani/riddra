import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { persistApprovedAdminRecordChange } from "@/lib/admin-record-workflow";
import {
  getAdminManagedRecord,
  getAdminOperatorStore,
  type AdminManagedRecord,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import { getPublishableCmsRecordBySlug } from "@/lib/publishable-content";
import {
  defaultStockSlugFromIpoSlug,
  getIpoLifecycleState,
  getTodayIstDateKey,
  IPO_LIFECYCLE_SECTION_KEY,
  stripIpoSuffix,
} from "@/lib/ipo-lifecycle";

type IpoLifecycleRunSource = "cron_get" | "manual_post";

type IpoLifecycleRunResult = {
  checked: number;
  transitioned: number;
  skipped: number;
  errors: Array<{ ipoSlug: string; message: string }>;
  items: Array<{
    ipoSlug: string;
    targetStockSlug: string | null;
    action: "transitioned" | "skipped" | "failed";
    reason: string;
  }>;
};

function cleanString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function buildRecordSaveInput(record: AdminManagedRecord): SaveAdminRecordInput {
  return {
    recordId: record.id,
    originalSlug: record.slug,
    family: record.family,
    slug: record.slug,
    title: record.title,
    symbol: record.symbol,
    benchmarkMapping: record.benchmarkMapping,
    status: record.status,
    visibility: record.visibility,
    publicHref: record.publicHref,
    canonicalRoute: record.canonicalRoute,
    sourceTable: record.sourceTable,
    sourceRowId: record.sourceRowId,
    sourceLabel: record.sourceLabel,
    sourceDate: record.sourceDate,
    sourceUrl: record.sourceUrl,
    sourceState: record.sourceState,
    refreshState: record.refreshState,
    accessControl: record.accessControl,
    assignedTo: record.assignedTo,
    assignedBy: record.assignedBy,
    dueDate: record.dueDate,
    scheduledPublishAt: record.scheduledPublishAt,
    scheduledUnpublishAt: record.scheduledUnpublishAt,
    sections: record.sections,
    documents: record.documents,
    imports: record.imports,
  };
}

function buildLifecycleSectionValues(record: AdminManagedRecord) {
  return {
    ...(record.sections[IPO_LIFECYCLE_SECTION_KEY]?.values ?? {}),
  };
}

function buildAutoCreatedStockInput(input: {
  ipoRecord: AdminManagedRecord;
  targetStockSlug: string;
  targetStockName: string;
  listingDate: string | null;
}): SaveAdminRecordInput {
  const identityValues = {
    companyName: input.targetStockName,
    slug: input.targetStockSlug,
    symbol: "",
    sector:
      cleanString(input.ipoRecord.sections.frontend_fields?.values?.companySector) ??
      cleanString(input.ipoRecord.sections.identity?.values?.sector) ??
      "Listed company",
    sectorIndexSlug: "",
    indexMemberships: "",
  };
  const publishingValues = {
    publishState: "published",
    publicRoute: `/stocks/${input.targetStockSlug}`,
    truthLabel: "IPO lifecycle stock route",
    latestNewsReady: "no",
    publishNote: `Automatically created from IPO ${input.ipoRecord.title} on listing handoff.`,
  };
  const dataSourceValues = {
    primarySourceCode: "ipo_lifecycle_cutover",
    sourceState: "manual_only",
    sourceUpdatedAt: input.listingDate ?? new Date().toISOString(),
    snapshotSource: "",
    snapshotDate: "",
    fundamentalsSource: "",
    fundamentalsDate: "",
    shareholdingSource: "",
    shareholdingDate: "",
    sourceUrl: "",
  };
  const sourceSummary =
    cleanString(input.ipoRecord.sections.frontend_fields?.values?.summary) ??
    `${input.targetStockName} has moved from the IPO route into the listed stock route after its listing date.`;
  const angle =
    cleanString(input.ipoRecord.sections.frontend_fields?.values?.angle) ??
    "Newly listed company now moving into the long-term stock research route.";

  return {
    family: "stocks",
    slug: input.targetStockSlug,
    title: input.targetStockName,
    symbol: null,
    status: "published",
    visibility: "public",
    publicHref: `/stocks/${input.targetStockSlug}`,
    canonicalRoute: `/stocks/${input.targetStockSlug}`,
    sourceTable: null,
    sourceRowId: null,
    sourceLabel: "ipo_lifecycle_cutover",
    sourceDate: input.listingDate ?? new Date().toISOString(),
    sourceUrl: "",
    benchmarkMapping: null,
    accessControl: {
      mode: "public_free",
      allowedMembershipTiers: [],
      requireLogin: false,
      showTeaserPublicly: true,
      showLockedPreview: false,
      ctaLabel: null,
      ctaHref: null,
      internalNotes: `Auto-created from IPO record ${input.ipoRecord.slug}.`,
    },
    sections: {
      identity: {
        mode: "manual_override",
        values: identityValues,
        note: "Created automatically by IPO listing cutover.",
        lastManualEditAt: null,
        expiresAt: null,
      },
      publishing: {
        mode: "manual_override",
        values: publishingValues,
        note: "Published automatically on IPO listing cutover.",
        lastManualEditAt: null,
        expiresAt: null,
      },
      data_sources: {
        mode: "manual_override",
        values: dataSourceValues,
        note: "Manual temporary stock shell created from IPO lifecycle automation.",
        lastManualEditAt: null,
        expiresAt: null,
      },
      frontend_fields: {
        mode: "manual_override",
        values: {
          summary: sourceSummary,
          thesis: angle,
          momentumLabel: "Newly listed company",
          keyPointsText: [
            "Automatically moved from IPO coverage into the stock route on listing date.",
            "Replace temporary editorial placeholders with live company, quote, and financial coverage.",
            "Keep the stock route as the main long-term destination going forward.",
          ].join("\n"),
          quickStatsText: "",
          fundamentalsText: "",
          shareholdingText: "",
          peerConfigText: "",
          newsReadinessNote:
            "This route was created automatically from IPO lifecycle automation. News, filings, and fundamentals should be filled next.",
          newsItemsText: "",
          faqText: [
            "Why was this stock page created automatically? | The company reached its IPO listing date, so the lifecycle automation moved the primary route into the stock family.",
          ].join("\n"),
          manualNotes:
            "This is an automated listing handoff shell. Replace placeholders with real stock coverage as soon as source-backed data is available.",
        },
        note: "Auto-created stock shell from IPO lifecycle cutover.",
        lastManualEditAt: null,
        expiresAt: null,
      },
      documents_links: {
        mode: "manual_override",
        values: {
          documentLinksText: "",
          fundamentalsSourceUrl: "",
          shareholdingSourceUrl: "",
        },
        note: "Document links can be added after listing cutover.",
        lastManualEditAt: null,
        expiresAt: null,
      },
    },
    documents: [],
    imports: [],
  };
}

async function ensureTargetStockRoute(input: {
  ipoRecord: AdminManagedRecord;
  targetStockSlug: string;
  targetStockName: string;
  listingDate: string | null;
}) {
  const publishableStock = await getPublishableCmsRecordBySlug("stock", input.targetStockSlug);

  if (publishableStock) {
    return { created: false, published: false, mode: "publishable_record" as const };
  }

  const existingAdminStock = await getAdminManagedRecord("stocks", input.targetStockSlug, null);

  if (existingAdminStock) {
    if (existingAdminStock.status === "published") {
      return { created: false, published: false, mode: "admin_record" as const };
    }

    const saveInput = buildRecordSaveInput(existingAdminStock);
    saveInput.status = "published";
    saveInput.visibility = "public";
    saveInput.publicHref = `/stocks/${input.targetStockSlug}`;
    saveInput.canonicalRoute = `/stocks/${input.targetStockSlug}`;
    saveInput.sections = {
      ...saveInput.sections,
      publishing: {
        ...(saveInput.sections.publishing ?? {
          mode: "manual_override",
          values: {},
          note: "",
          lastManualEditAt: null,
          expiresAt: null,
        }),
        values: {
          ...(saveInput.sections.publishing?.values ?? {}),
          publishState: "published",
          publicRoute: `/stocks/${input.targetStockSlug}`,
          truthLabel:
            cleanString(saveInput.sections.publishing?.values?.truthLabel) ??
            "IPO lifecycle stock route",
          publishNote:
            cleanString(saveInput.sections.publishing?.values?.publishNote) ??
            `Published automatically when IPO ${input.ipoRecord.title} moved into listed-stock mode.`,
        },
      },
    };

    await persistApprovedAdminRecordChange({
      actorUserId: "",
      actorEmail: "System",
      activityActorSource: "system",
      payload: saveInput,
    });

    return { created: false, published: true, mode: "admin_record" as const };
  }

  await persistApprovedAdminRecordChange({
    actorUserId: "",
    actorEmail: "System",
    activityActorSource: "system",
    payload: buildAutoCreatedStockInput(input),
  });

  return { created: true, published: true, mode: "auto_created_admin_record" as const };
}

export async function runIpoListingCutover(input: {
  source: IpoLifecycleRunSource;
}): Promise<IpoLifecycleRunResult> {
  const store = await getAdminOperatorStore();
  const todayKey = getTodayIstDateKey();
  const ipoRecords = store.records.filter(
    (record) => record.family === "ipos" && record.status === "published",
  );
  const result: IpoLifecycleRunResult = {
    checked: ipoRecords.length,
    transitioned: 0,
    skipped: 0,
    errors: [],
    items: [],
  };

  for (const ipoRecord of ipoRecords) {
    const lifecycle = getIpoLifecycleState(ipoRecord);
    const targetStockSlug = lifecycle.targetStockSlug ?? defaultStockSlugFromIpoSlug(ipoRecord.slug);
    const targetStockName =
      lifecycle.targetStockName ??
      stripIpoSuffix(ipoRecord.sections.identity?.values?.companyName) ??
      stripIpoSuffix(ipoRecord.title) ??
      ipoRecord.title;

    if (!lifecycle.autoConvertOnListingDate) {
      result.skipped += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "skipped",
        reason: "Auto-convert is disabled.",
      });
      continue;
    }

    if (!lifecycle.listingDateKey) {
      result.skipped += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "skipped",
        reason: "Listing date is missing or invalid.",
      });
      continue;
    }

    if (lifecycle.listingDateKey > todayKey) {
      result.skipped += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "skipped",
        reason: `Listing date ${lifecycle.listingDateKey} has not arrived yet.`,
      });
      continue;
    }

    if (!targetStockSlug) {
      result.skipped += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug: null,
        action: "skipped",
        reason: "Target stock slug is missing.",
      });
      continue;
    }

    if (lifecycle.redirectActive && lifecycle.redirectPath) {
      result.skipped += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "skipped",
        reason: "Redirect is already active.",
      });
      continue;
    }

    try {
      const stockRoute = await ensureTargetStockRoute({
        ipoRecord,
        targetStockSlug,
        targetStockName: targetStockName ?? targetStockSlug,
        listingDate: lifecycle.listingDate,
      });
      const lifecycleValues = buildLifecycleSectionValues(ipoRecord);
      const saveInput = buildRecordSaveInput(ipoRecord);

      saveInput.sections = {
        ...saveInput.sections,
        identity: {
          ...(saveInput.sections.identity ?? {
            mode: "manual_override",
            values: {},
            note: "",
            lastManualEditAt: null,
            expiresAt: null,
          }),
          values: {
            ...(saveInput.sections.identity?.values ?? {}),
            status: "Listed",
          },
        },
        [IPO_LIFECYCLE_SECTION_KEY]: {
          ...(saveInput.sections[IPO_LIFECYCLE_SECTION_KEY] ?? {
            mode: "manual_permanent_lock",
            values: {},
            note: "",
            lastManualEditAt: null,
            expiresAt: null,
          }),
          mode: "manual_permanent_lock",
          values: {
            ...lifecycleValues,
            listingDate: lifecycle.listingDate ?? lifecycleValues.listingDate ?? "",
            targetStockSlug,
            targetStockName: targetStockName ?? "",
            autoConvertOnListingDate: "yes",
            redirectActive: "yes",
            redirectPath: `/stocks/${targetStockSlug}`,
            cutoverCompletedAt: new Date().toISOString(),
            cutoverStatus: "Redirecting to listed stock route",
          },
          note: "Converted automatically by the IPO listing cutover job.",
        },
        publishing: {
          ...(saveInput.sections.publishing ?? {
            mode: "manual_override",
            values: {},
            note: "",
            lastManualEditAt: null,
            expiresAt: null,
          }),
          values: {
            ...(saveInput.sections.publishing?.values ?? {}),
            publishNote: `Listing handoff completed automatically. This IPO route now permanently redirects to /stocks/${targetStockSlug}.`,
          },
        },
      };

      await persistApprovedAdminRecordChange({
        actorUserId: "",
        actorEmail: "System",
        activityActorSource: "system",
        payload: saveInput,
      });

      await appendAdminActivityLog({
        actorUserId: null,
        actorEmail: "System",
        actionType: "lifecycle.ipo_cutover",
        targetType: "content_record",
        targetId: ipoRecord.id,
        targetFamily: "ipos",
        targetSlug: ipoRecord.slug,
        summary: `Automatically redirected IPO ${ipoRecord.title} to /stocks/${targetStockSlug} after listing date cutover.`,
        metadata: {
          source: input.source,
          targetStockSlug,
          stockCreationMode: stockRoute.mode,
        },
      });

      result.transitioned += 1;
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "transitioned",
        reason: `Cutover completed and redirect activated to /stocks/${targetStockSlug}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown IPO cutover failure.";
      result.errors.push({ ipoSlug: ipoRecord.slug, message });
      result.items.push({
        ipoSlug: ipoRecord.slug,
        targetStockSlug,
        action: "failed",
        reason: message,
      });
    }
  }

  return result;
}
