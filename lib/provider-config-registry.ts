import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { providerConfigItems, providerConfigRules } from "@/lib/provider-configs";

export type ProviderConfigRegistryStatus = "Live" | "In progress" | "Queued";

export type ProviderConfigRegistryRow = {
  lane: "Provider profile" | "Runtime checkpoint" | "Config rule";
  label: string;
  status: ProviderConfigRegistryStatus;
  href: string;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function mapStatus(status: string): ProviderConfigRegistryStatus {
  if (status === "In progress") {
    return "In progress";
  }

  if (status === "Queued") {
    return "Queued";
  }

  return "Live";
}

export function getProviderConfigRegistryRows(): ProviderConfigRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasAuthConfig = Boolean(config.supabaseUrl && config.googleOAuthConfigured);
  const hasBillingConfig = Boolean(config.razorpayKeyId && config.razorpayWebhookSecret);
  const hasCommunicationConfig = Boolean(resend.configured || config.supportEmail || config.contactEmail);
  const hasBrokerConfig = Boolean(config.marketDataProviderUrl || config.marketDataProviderToken);
  const hasAiConfig = Boolean(config.openAiApiKey || config.aiGatewayUrl);
  const hasStorageConfig = Boolean(config.canonicalHost || config.statusPageUrl);

  const profileRows: ProviderConfigRegistryRow[] = providerConfigItems.map((item) => ({
    lane: "Provider profile",
    label: item.title,
    status: mapStatus(item.status),
    href: "/admin/provider-configs",
    note: item.summary,
    source: "Provider config desk",
  }));

  const runtimeRows: ProviderConfigRegistryRow[] = [
    {
      lane: "Runtime checkpoint",
      label: "Auth provider contract",
      status: hasAuthConfig ? "Live" : "In progress",
      href: "/admin/auth-activation",
      note: hasAuthConfig
        ? "Supabase plus Google OAuth configuration is present enough for auth to behave like a real provider-backed contract."
        : "Auth provider setup still needs fuller runtime configuration before it can be treated as a stable switchable contract.",
      source: "Auth activation",
    },
    {
      lane: "Runtime checkpoint",
      label: "Billing provider contract",
      status: hasBillingConfig ? "Live" : "In progress",
      href: "/admin/payment-readiness",
      note: hasBillingConfig
        ? "Billing config includes payment and webhook credentials, so the provider contract can move beyond planning into verification."
        : "Billing still needs stronger runtime configuration before the payment provider profile is truly portable.",
      source: "Billing readiness",
    },
    {
      lane: "Runtime checkpoint",
      label: "Communication provider contract",
      status: hasCommunicationConfig ? "In progress" : "Queued",
      href: "/admin/communication-readiness",
      note: hasCommunicationConfig
        ? "Support or email delivery configuration exists, so communication channels can now be audited as a real provider profile."
        : "Communication provider switching is still mostly conceptual until support or delivery credentials are configured.",
      source: "Communication readiness",
    },
    {
      lane: "Runtime checkpoint",
      label: "Broker and data-adapter contract",
      status: hasBrokerConfig ? "In progress" : "Queued",
      href: "/admin/provider-onboarding",
      note: hasBrokerConfig
        ? "Provider URL or token is configured, so broker or data-adapter abstraction can start behaving like a real contract."
        : "Broker and external data adapters still need configured provider inputs before they can move beyond planning.",
      source: "Provider onboarding",
    },
    {
      lane: "Runtime checkpoint",
      label: "AI provider contract",
      status: hasAiConfig ? "In progress" : "Queued",
      href: "/admin/ai-ops",
      note: hasAiConfig
        ? "An AI key or gateway endpoint is configured, so optional AI providers can now be governed as a runtime-backed profile."
        : "AI remains formula-first for now because no runtime AI provider contract has been configured yet.",
      source: "AI operations",
    },
    {
      lane: "Runtime checkpoint",
      label: "Storage and distribution contract",
      status: hasStorageConfig ? "In progress" : "Queued",
      href: "/admin/launch-config-console",
      note: hasStorageConfig
        ? "Canonical host or distribution config exists, so storage and asset-delivery profiles can now be reasoned about more concretely."
        : "Storage and media profile work still lacks enough saved runtime distribution context.",
      source: "Launch config console",
    },
  ];

  const ruleRows: ProviderConfigRegistryRow[] = providerConfigRules.map((rule, index) => ({
    lane: "Config rule",
    label: `Provider rule ${index + 1}`,
    status: "Live",
    href: "/admin/provider-configs",
    note: rule,
    source: "Provider config policy",
  }));

  return [...profileRows, ...runtimeRows, ...ruleRows];
}

export function getProviderConfigRegistrySummary() {
  const rows = getProviderConfigRegistryRows();

  return {
    total: rows.length,
    live: rows.filter((row) => row.status === "Live").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    queued: rows.filter((row) => row.status === "Queued").length,
  };
}

export function toProviderConfigRegistryCsv(rows: ProviderConfigRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
