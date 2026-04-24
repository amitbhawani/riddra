import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import type { LaunchConfigStore } from "@/lib/launch-config-store";
import { getLaunchConfigStore } from "@/lib/launch-config-store";
import {
  externalActivationSummary,
  getExternalActivationItems,
} from "@/lib/external-activation";
import {
  getMarketSourceCredentialSummary,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export type ExternalActivationRegistryStatus =
  | "Configured"
  | "Partial"
  | "Blocked"
  | "Deferred";

export type ExternalActivationRegistryRow = {
  kind: "config_group" | "activation_blocker";
  label: string;
  status: ExternalActivationRegistryStatus;
  href: string;
  owner: string;
  note: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function countConfiguredSectionValues(section: LaunchConfigStore[keyof Omit<LaunchConfigStore, "updatedAt">]) {
  return Object.values(section).filter((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value === true;
  }).length;
}

export async function getExternalActivationRegistryRows(): Promise<ExternalActivationRegistryRow[]> {
  const store = await getLaunchConfigStore();
  const runtimeConfig = getRuntimeLaunchConfig();
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const delivery = getTransactionalDeliveryReadiness();
  const hasSupportRouting = Boolean(
    runtimeConfig.supportEmail || runtimeConfig.contactEmail || runtimeConfig.feedbackInbox,
  );
  const hasDeferredBillingInputs = Boolean(
    runtimeConfig.razorpayKeyId || runtimeConfig.razorpayKeySecret || runtimeConfig.razorpayWebhookSecret,
  );

  const configRows: ExternalActivationRegistryRow[] = [
    {
      kind: "config_group",
      label: "Auth and Supabase core",
      status:
        runtimeConfig.supabaseUrl &&
        runtimeConfig.supabaseAnonKey &&
        runtimeConfig.supabaseServiceRoleKey &&
        runtimeConfig.googleOAuthConfigured
          ? "Configured"
          : countConfiguredSectionValues(store.supabase) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/auth-activation",
      owner: "Shared",
      note: `${countConfiguredSectionValues(store.supabase)} of ${Object.values(store.supabase).length} auth inputs are filled, including ${
        runtimeConfig.googleOAuthConfigured ? "active" : "missing"
      } Google OAuth posture.`,
    },
    {
      kind: "config_group",
      label: "Provider execution core",
      status:
        runtimeConfig.marketDataProviderUrl &&
        runtimeConfig.marketDataProviderToken &&
        (runtimeConfig.marketDataRefreshSecret || runtimeConfig.cronSecret) &&
        runtimeConfig.marketDataOhlcvEndpoint
          ? "Configured"
          : countConfiguredSectionValues(store.marketData) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/provider-onboarding",
      owner: "Shared",
      note: `${countConfiguredSectionValues(store.marketData)} of ${Object.values(store.marketData).length} market-data inputs are filled, with ${sourceStackSummary.configured}/${sourceStackSummary.total} source URLs configured.`,
    },
    {
      kind: "config_group",
      label: "Reference and fallback coverage",
      status:
        sourceStackSummary.missing === 0 && sourceCredentialSummary.missing === 0
          ? "Configured"
          : countConfiguredSectionValues(store.referenceData) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/source-mapping-desk",
      owner: "Shared",
      note: `${sourceStackSummary.configured}/${sourceStackSummary.total} source URLs and ${sourceCredentialSummary.configured}/${sourceCredentialSummary.total} keyed credentials are configured.`,
    },
    {
      kind: "config_group",
      label: "Support delivery and deferred billing inputs",
      status:
        delivery.configured && hasSupportRouting
          ? "Configured"
          : hasDeferredBillingInputs && !delivery.configured && !hasSupportRouting
            ? "Deferred"
            : countConfiguredSectionValues(store.billing) > 0 || hasSupportRouting || delivery.configured
              ? "Partial"
              : "Blocked",
      href: "/admin/payment-readiness",
      owner: "User",
      note: `${countConfiguredSectionValues(store.billing)} of ${Object.values(store.billing).length} billing inputs are filled, including ${
        delivery.configured ? "configured" : "missing"
      } Trigger-backed email delivery, ${
        hasSupportRouting ? "configured" : "missing"
      } support routing, and ${runtimeConfig.razorpayKeyId ? "present" : "missing"} deferred commercial billing keys.`,
    },
    {
      kind: "config_group",
      label: "Communication routing",
      status:
        runtimeConfig.supportEmail &&
        runtimeConfig.contactEmail &&
        runtimeConfig.feedbackInbox
          ? "Configured"
          : countConfiguredSectionValues(store.communications) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/communication-readiness",
      owner: "Shared",
      note: `${countConfiguredSectionValues(store.communications)} of ${Object.values(store.communications).length} communication inputs are filled, with ${
        runtimeConfig.feedbackInbox ? "configured" : "missing"
      } launch feedback routing.`,
    },
    {
      kind: "config_group",
      label: "Compliance and trust ownership",
      status:
        runtimeConfig.privacyOwner &&
        runtimeConfig.termsOwner &&
        runtimeConfig.grievanceOfficerName &&
        runtimeConfig.grievanceOfficerEmail
          ? "Configured"
          : countConfiguredSectionValues(store.compliance) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/launch-commitments",
      owner: "User",
      note: `${countConfiguredSectionValues(store.compliance)} of ${Object.values(store.compliance).length} compliance inputs are filled, with ${
        runtimeConfig.grievanceOfficerEmail ? "configured" : "missing"
      } grievance routing.`,
    },
    {
      kind: "config_group",
      label: "Distribution and status links",
      status:
        runtimeConfig.siteUrl &&
        runtimeConfig.canonicalHost &&
        runtimeConfig.statusPageUrl
          ? "Configured"
          : countConfiguredSectionValues(store.distribution) > 0 || countConfiguredSectionValues(store.basic) > 0
            ? "Partial"
            : "Blocked",
      href: "/admin/go-live-handoff",
      owner: "Shared",
      note: `Basic plus distribution inputs now cover ${countConfiguredSectionValues(store.basic) + countConfiguredSectionValues(store.distribution)} configured values across public URL, launch mode, app links, and status routing.`,
    },
  ];

  const blockerRows: ExternalActivationRegistryRow[] = getExternalActivationItems().map((item) => ({
    kind: "activation_blocker",
    label: item.title,
    status:
      item.status === "Blocked"
        ? "Blocked"
        : item.status === "Deferred"
          ? "Deferred"
          : item.status === "Configured"
            ? "Configured"
            : "Partial",
    href: item.href,
    owner: item.action,
    note: item.summary,
  }));

  return [...configRows, ...blockerRows];
}

export async function getExternalActivationRegistrySummary() {
  const rows = await getExternalActivationRegistryRows();

  return {
    providerGroups: externalActivationSummary.providerGroups,
    requiredCredentials: externalActivationSummary.requiredCredentials,
    launchCritical: externalActivationSummary.launchCritical,
    totalRows: rows.length,
    configGroups: rows.filter((row) => row.kind === "config_group").length,
    blockerRows: rows.filter((row) => row.kind === "activation_blocker").length,
    configured: rows.filter((row) => row.status === "Configured").length,
    partial: rows.filter((row) => row.status === "Partial").length,
    deferred: rows.filter((row) => row.status === "Deferred").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toExternalActivationRegistryCsv(rows: ExternalActivationRegistryRow[]) {
  const header = ["kind", "label", "status", "href", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.label, row.status, row.href, row.owner, row.note]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
