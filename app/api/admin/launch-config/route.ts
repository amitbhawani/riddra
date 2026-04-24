import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { appendAdminGlobalRevision } from "@/lib/admin-operator-store";
import { sanitizeAdminFailureMessage } from "@/lib/admin-operator-guards";
import {
  getLaunchConfigStore,
  saveLaunchConfigSection,
  type LaunchConfigStore,
} from "@/lib/launch-config-store";

const stringKeysBySection = {
  basic: ["siteUrl", "launchMode", "supportEmail", "adminEmails"],
  content: [
    "defaultTitleTemplate",
    "defaultMetaDescription",
    "stockTitleTemplate",
    "stockMetaDescriptionTemplate",
    "fundTitleTemplate",
    "fundMetaDescriptionTemplate",
    "indexTitleTemplate",
    "indexMetaDescriptionTemplate",
    "blogBaseUrl",
    "docsBaseUrl",
    "canonicalHost",
    "ogImageBaseUrl",
    "schemaOrganizationName",
    "editorialCalendarUrl",
  ],
  experience: [
    "headerAnnouncement",
    "headerQuickLinks",
    "headerMarketNav",
    "headerUtilityNav",
    "headerPrimaryCtaLabel",
    "headerPrimaryCtaHref",
    "footerSummary",
    "footerLinks",
    "stockSidebarMode",
    "stockSidebarTitle",
    "stockSidebarLinks",
    "fundSidebarMode",
    "fundSidebarTitle",
    "fundSidebarLinks",
    "ipoSidebarMode",
    "ipoSidebarTitle",
    "ipoSidebarLinks",
    "indexSidebarMode",
    "indexSidebarTitle",
    "indexSidebarLinks",
    "sharedSidebarEnabledPageCategories",
    "sharedSidebarVisibleBlocks",
    "sharedSidebarMarketDataMode",
    "sharedSidebarIndiaRows",
    "sharedSidebarGlobalRows",
    "sharedSidebarTopGainersRows",
    "sharedSidebarTopLosersRows",
    "sharedSidebarPopularStocksRows",
  ],
  supabase: [
    "supabaseUrl",
    "supabaseAnonKey",
    "googleClientId",
    "googleClientSecret",
  ],
  marketData: [
    "providerUrl",
    "providerToken",
    "refreshSecret",
    "cronSecret",
    "quoteEndpoint",
    "ohlcvEndpoint",
    "indexEndpoint",
    "optionChainEndpoint",
    "bhavcopyUrl",
    "fundNavEndpoint",
  ],
  referenceData: [
    "nseBaseUrl",
    "bseBaseUrl",
    "amfiNavUrl",
    "mfApiBaseUrl",
    "mfApiCollectionUrl",
    "bseQuoteApiUrl",
    "goldApiUrl",
    "alphaVantageApiKey",
    "fxApiUrl",
    "secondaryFxApiUrl",
    "newsApiUrl",
    "finnhubApiKey",
    "filingsApiUrl",
    "corporateAnnouncementsApiUrl",
    "corporateActionsApiUrl",
  ],
  billing: [
    "razorpayKeyId",
    "razorpayKeySecret",
    "razorpayWebhookSecret",
    "resendApiKey",
    "resendAudienceId",
    "invoicePrefix",
    "billingSupportEmail",
  ],
  charting: [
    "tradingviewLibraryUrl",
    "tradingviewBrokerConfigUrl",
    "chartImageApiUrl",
    "defaultExchange",
    "defaultInterval",
    "nifty50Symbol",
    "bankNiftySymbol",
    "finNiftySymbol",
    "sensexSymbol",
  ],
  communications: [
    "contactEmail",
    "supportWhatsapp",
    "telegramHandle",
    "xHandle",
    "youtubeChannelUrl",
    "discordInviteUrl",
    "pushProviderKey",
    "feedbackInbox",
  ],
  compliance: [
    "privacyOwner",
    "termsOwner",
    "sebiRegistrationType",
    "sebiRegistrationNumber",
    "amfiRegistrationNumber",
    "grievanceOfficerName",
    "grievanceOfficerEmail",
    "riskDisclosureUrl",
  ],
  analytics: [
    "gaMeasurementId",
    "gtmContainerId",
    "metaPixelId",
    "posthogKey",
    "posthogHost",
    "msClarityId",
    "searchConsoleVerification",
  ],
  ai: [
    "openAiApiKey",
    "openAiModel",
    "anthropicApiKey",
    "aiGatewayUrl",
    "embeddingsProvider",
    "rerankerProvider",
  ],
  automation: [
    "uptimeWebhookUrl",
    "incidentWebhookUrl",
    "backupBucketName",
    "mediaStorageBucket",
    "docsStorageBucket",
  ],
  distribution: [
    "appName",
    "androidPackageName",
    "playStoreUrl",
    "appStoreUrl",
    "chromeExtensionUrl",
    "apkDownloadUrl",
    "desktopAppUrl",
    "statusPageUrl",
  ],
  partners: [
    "brokerApiBaseUrl",
    "brokerApiKey",
    "brokerWebhookSecret",
    "smallcasePartnerId",
    "affiliateNetworkUrl",
    "referralCodeDefault",
    "partnerOpsEmail",
    "crmWebhookUrl",
  ],
  researchOps: [
    "earningsCalendarSourceUrl",
    "ipoFeedUrl",
    "portfolioDisclosureUrl",
    "newsletterCmsUrl",
    "webinarPlatformUrl",
    "coursesPlatformUrl",
    "documentAiApiUrl",
    "transcriptProviderUrl",
  ],
} as const;

const booleanKeysBySection = {
  basic: [],
  content: [],
  experience: [],
  supabase: ["googleOAuthConfigured"],
  marketData: [],
  referenceData: [],
  billing: [],
  charting: ["tradingviewEnabled", "allowSymbolChange"],
  communications: [],
  compliance: [],
  analytics: ["speedInsightsEnabled", "webVitalsEnabled"],
  ai: ["openAiEnabled", "anthropicEnabled"],
  automation: ["cronEnabled", "workflowEnabled"],
  distribution: [],
  partners: [],
  researchOps: [],
} as const;

async function requireAdminApi() {
  return await requireAdmin();
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function sanitizeSectionData<TSection extends keyof Omit<LaunchConfigStore, "updatedAt">>(
  section: TSection,
  data: Record<string, unknown>,
  currentSection: LaunchConfigStore[TSection],
): LaunchConfigStore[TSection] {
  const next = { ...currentSection } as Record<string, unknown>;

  for (const key of stringKeysBySection[section]) {
    if (key in data) {
      next[key] = String(data[key] ?? "").trim();
    }
  }

  for (const key of booleanKeysBySection[section]) {
    if (key in data) {
      next[key] = Boolean(data[key]);
    }
  }

  return next as LaunchConfigStore[TSection];
}

export async function GET() {
  try {
    await requireAdminApi();

    return NextResponse.json(await getLaunchConfigStore());
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminApi();

    const payload = (await request.json()) as {
      section: keyof Omit<LaunchConfigStore, "updatedAt">;
      data: Record<string, unknown>;
      mode?: "draft" | "publish";
    };

    if (!payload?.section || !payload?.data) {
      return badRequest("Section and data are required.");
    }

    if (!(payload.section in stringKeysBySection)) {
      return badRequest("Unsupported config section.");
    }

    const currentStore = await getLaunchConfigStore();
    const store = await saveLaunchConfigSection(
      payload.section,
      sanitizeSectionData(payload.section, payload.data, currentStore[payload.section]),
    );
    const changedCount = Object.keys(payload.data).length;
    const loggedGlobalSections: string[] = [];

    if (payload.section === "experience") {
      const data = payload.data;

      if (
        "headerAnnouncement" in data ||
        "headerQuickLinks" in data ||
        "headerMarketNav" in data ||
        "headerUtilityNav" in data ||
        "headerPrimaryCtaLabel" in data ||
        "headerPrimaryCtaHref" in data
      ) {
        await appendAdminGlobalRevision({
          section: "header",
          title: "Header / top navigation",
          editor: user.email ?? "Admin",
          action:
            payload.mode === "publish"
              ? "Published global site header settings"
              : "Saved global site header draft",
          status: payload.mode === "publish" ? "published" : "draft",
          changedCount,
        });
        loggedGlobalSections.push("header");
        await appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          actionType: payload.mode === "publish" ? "global_site.published" : "global_site.saved",
          targetType: "global_site_section",
          targetId: "header",
          targetFamily: null,
          targetSlug: "header",
          summary:
            payload.mode === "publish"
              ? "Published global site header settings."
              : "Saved global site header draft.",
          metadata: {
            section: "header",
            changedCount,
            storageMode: "operator_backbone",
          },
        });
      }

      if ("footerSummary" in data || "footerLinks" in data) {
        await appendAdminGlobalRevision({
          section: "footer",
          title: "Footer",
          editor: user.email ?? "Admin",
          action:
            payload.mode === "publish"
              ? "Published global site footer settings"
              : "Saved global site footer draft",
          status: payload.mode === "publish" ? "published" : "draft",
          changedCount,
        });
        loggedGlobalSections.push("footer");
        await appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          actionType: payload.mode === "publish" ? "global_site.published" : "global_site.saved",
          targetType: "global_site_section",
          targetId: "footer",
          targetFamily: null,
          targetSlug: "footer",
          summary:
            payload.mode === "publish"
              ? "Published global site footer settings."
              : "Saved global site footer draft.",
          metadata: {
            section: "footer",
            changedCount,
            storageMode: "operator_backbone",
          },
        });
      }

      if (
        "sharedSidebarEnabledPageCategories" in data ||
        "sharedSidebarVisibleBlocks" in data ||
        "sharedSidebarMarketDataMode" in data ||
        "sharedSidebarIndiaRows" in data ||
        "sharedSidebarGlobalRows" in data ||
        "sharedSidebarTopGainersRows" in data ||
        "sharedSidebarTopLosersRows" in data ||
        "sharedSidebarPopularStocksRows" in data
      ) {
        await appendAdminGlobalRevision({
          section: "pageSidebar",
          title: "Shared page sidebar",
          editor: user.email ?? "Admin",
          action:
            payload.mode === "publish"
              ? "Published shared page sidebar settings"
              : "Saved shared page sidebar draft",
          status: payload.mode === "publish" ? "published" : "draft",
          changedCount,
        });
        loggedGlobalSections.push("pageSidebar");
        await appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          actionType: payload.mode === "publish" ? "global_site.published" : "global_site.saved",
          targetType: "global_site_section",
          targetId: "page-sidebar",
          targetFamily: null,
          targetSlug: "page-sidebar",
          summary:
            payload.mode === "publish"
              ? "Published shared page sidebar settings."
              : "Saved shared page sidebar draft.",
          metadata: {
            section: "page-sidebar",
            changedCount,
            storageMode: "operator_backbone",
          },
        });
      }
    }

    if (!loggedGlobalSections.length) {
      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: payload.mode === "publish" ? "launch_config.published" : "launch_config.saved",
        targetType: "launch_config_section",
        targetId: payload.section,
        targetFamily: null,
        targetSlug: payload.section,
        summary:
          payload.mode === "publish"
            ? `Published launch config section ${payload.section}.`
            : `Saved launch config section ${payload.section}.`,
        metadata: {
          section: payload.section,
          changedCount,
          storageMode: "operator_backbone",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      store,
      savedAt: store.updatedAt,
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
