import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { LaunchConfigConsoleClient } from "@/components/launch-config-console-client";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { requireUser } from "@/lib/auth";
import { getResendReadiness } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { getExternalActivationRegistrySummary } from "@/lib/external-activation-registry";
import {
  countConfiguredValues,
  getLaunchConfigStore,
  launchConfigSectionKeys,
  type LaunchConfigStore,
} from "@/lib/launch-config-store";
import {
  getMarketSourceCredentialSummary,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export const metadata: Metadata = {
  title: "Launch Config Console",
  description:
    "Protected launch config console for entering private-beta-critical and later commercial settings without editing code.",
};

type LaunchConfigSectionKey = keyof Omit<LaunchConfigStore, "updatedAt">;

const launchConfigSectionMeta: Record<
  LaunchConfigSectionKey,
  { label: string; helper: string; routeTarget: string }
> = {
  basic: {
    label: "Platform basics",
    helper: "Set launch mode, support inbox, and operator ownership before private-beta deployment proof.",
    routeTarget: "/admin/launch-control",
  },
  content: {
    label: "Content and SEO",
    helper: "Fill metadata, docs, and OG fields that shape public route trust and discoverability.",
    routeTarget: "/admin/content-rollout",
  },
  experience: {
    label: "Site chrome and page layouts",
    helper: "Manage header, footer, and route-family sidebar presets without code edits.",
    routeTarget: "/admin/cms",
  },
  supabase: {
    label: "Supabase and auth",
    helper: "Complete Supabase and Google OAuth inputs so protected routes can move from config to proof.",
    routeTarget: "/admin/auth-activation",
  },
  marketData: {
    label: "Market-data provider core",
    helper: "Enter the provider URL, secrets, and feed endpoints that power quotes, history, indices, and fund refresh.",
    routeTarget: "/admin/provider-onboarding",
  },
  referenceData: {
    label: "Reference and fallback sources",
    helper: "Keep official-source URLs and keyed fallback providers explicit before live market-data trust is claimed.",
    routeTarget: "/admin/source-mapping-desk",
  },
  billing: {
    label: "Billing and support delivery",
    helper: "Complete support routing for private beta, while keeping commercial billing activation visible but deferred.",
    routeTarget: "/admin/payment-readiness",
  },
  charting: {
    label: "Charting and index symbols",
    helper: "Fill chart defaults and index-symbol overrides before chart surfaces are treated as stable proof points.",
    routeTarget: "/admin/market-data",
  },
  communications: {
    label: "Communication channels",
    helper: "Set support, push, and feedback routing before support-readiness claims become launch truth.",
    routeTarget: "/admin/communication-readiness",
  },
  compliance: {
    label: "Compliance and trust ownership",
    helper: "Fill legal owners and grievance contacts before public-facing trust surfaces are considered complete.",
    routeTarget: "/admin/launch-commitments",
  },
  analytics: {
    label: "Analytics and observability",
    helper: "Wire analytics and web-vitals inputs so launch-day monitoring and attribution stop depending on guesswork.",
    routeTarget: "/admin/observability",
  },
  ai: {
    label: "AI services",
    helper: "Set model-provider inputs and gateway posture before AI-backed routes move beyond staged operations.",
    routeTarget: "/admin/ai-ops",
  },
  automation: {
    label: "Automation and ops hooks",
    helper: "Fill cron, workflow, backup, and incident-hook inputs before recurring jobs are treated as ready.",
    routeTarget: "/admin/recovery-readiness",
  },
  distribution: {
    label: "Distribution links",
    helper: "Keep app-distribution and status links explicit before launch-day handoff and status routing.",
    routeTarget: "/admin/go-live-handoff",
  },
  partners: {
    label: "Partners and broker ops",
    helper: "Capture broker and partner integrations before sync and partner-facing launch promises are treated as real.",
    routeTarget: "/admin/api-access",
  },
  researchOps: {
    label: "Research operations",
    helper: "Fill archive, document, webinar, and enrichment tooling before research continuity is claimed as durable.",
    routeTarget: "/admin/research-archive",
  },
};

function countSectionConfiguredValues(section: LaunchConfigStore[LaunchConfigSectionKey]) {
  return Object.values(section).filter((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value === true;
  }).length;
}

function buildLaunchConfigReadinessItems(
  store: LaunchConfigStore,
  runtimeConfig: ReturnType<typeof getRuntimeLaunchConfig>,
  sourceStackSummary: ReturnType<typeof getMarketSourceStackSummary>,
  sourceCredentialSummary: ReturnType<typeof getMarketSourceCredentialSummary>,
) {
  const resend = getResendReadiness();

  return launchConfigSectionKeys.map((section) => {
    const configured = countSectionConfiguredValues(store[section]);
    const total = Object.values(store[section]).length;
    const meta = launchConfigSectionMeta[section];
    const status =
      configured === total ? "Configured" : configured > 0 ? "Partial" : "Not configured";

    let detail = `${configured} of ${total} inputs filled. ${meta.helper}`;

    if (section === "supabase") {
      const authInputs = [runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey].filter(Boolean)
        .length;
      const adminEnvReady = runtimeConfig.supabaseServiceRoleKey ? "yes" : "no";
      detail = `${configured} of ${total} filled. Public Supabase inputs: ${authInputs}/2, env-backed admin access: ${adminEnvReady}, Google OAuth: ${
        runtimeConfig.googleOAuthConfigured ? "yes" : "no"
      }.`;
    }

    if (section === "marketData") {
      const executionInputs = [
        runtimeConfig.marketDataProviderUrl,
        runtimeConfig.marketDataProviderToken,
        runtimeConfig.marketDataRefreshSecret,
        runtimeConfig.cronSecret,
      ].filter(Boolean).length;
      const feedInputs = [
        runtimeConfig.marketDataQuoteEndpoint,
        runtimeConfig.marketDataOhlcvEndpoint,
        runtimeConfig.marketDataIndexEndpoint,
        runtimeConfig.marketDataOptionChainEndpoint,
        runtimeConfig.marketDataBhavcopyUrl,
        runtimeConfig.marketDataFundNavEndpoint,
      ].filter(Boolean).length;
      detail = `${configured} of ${total} filled. Execution inputs: ${executionInputs}/4, feed endpoints: ${feedInputs}/6.`;
    }

    if (section === "referenceData") {
      detail = `${configured} of ${total} filled. Source URLs: ${sourceStackSummary.configured}/${sourceStackSummary.total}, keyed credentials: ${sourceCredentialSummary.configured}/${
        sourceCredentialSummary.configured + sourceCredentialSummary.missing
      }.`;
    }

    if (section === "billing") {
      const deliveryInputs = [
        resend.configured ? "resend-ready" : "",
        env.resendFromEmail,
        runtimeConfig.supportEmail || runtimeConfig.contactEmail || runtimeConfig.feedbackInbox,
      ].filter(Boolean).length;
      const deferredBillingInputs = [
        runtimeConfig.razorpayKeyId,
        runtimeConfig.razorpayKeySecret,
        runtimeConfig.razorpayWebhookSecret,
      ].filter(Boolean).length;
      detail = `${configured} of ${total} filled. Beta delivery inputs: ${deliveryInputs}/3, deferred commercial billing inputs: ${deferredBillingInputs}/3.`;
    }

    return {
      label: meta.label,
      status,
      detail,
      routeTarget: meta.routeTarget,
    };
  });
}

function getStatusTone(status: string) {
  if (status === "Configured") return "success" as const;
  if (status === "Partial") return "warning" as const;
  return "default" as const;
}

export default async function LaunchConfigConsolePage() {
  await requireUser();
  const store = await getLaunchConfigStore();
  const runtimeConfig = getRuntimeLaunchConfig();
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const externalActivationRegistrySummary = await getExternalActivationRegistrySummary();
  const readinessItems = buildLaunchConfigReadinessItems(
    store,
    runtimeConfig,
    sourceStackSummary,
    sourceCredentialSummary,
  );

  const coverageNotes = [
    "Platform basics, support inboxes, and admin ownership",
    "Brand, SEO, docs, OG surfaces, and editorial operations links",
    "Supabase, Google auth, market-data provider setup, and feed endpoints",
    "Reference URLs for NSE, BSE, AMFI, MFAPI, metals, FX, news, filings, and corporate actions",
    "Billing, charting, communications, compliance, analytics, AI, automation, distribution, partners, and research ops",
  ];

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Launch Config Console", href: "/admin/launch-config-console" },
        ]}
        eyebrow="Launch config"
        title="Launch config console"
        description="Single operator desk for private-beta-critical and later commercial settings. Coverage here means configured, not automatically live-verified."
        actions={<AdminActionLink href="/admin/launch-control" label="Open launch control" tone="primary" />}
      />

      <AdminStatGrid
        stats={[
          {
            label: "Config sections",
            value: String(launchConfigSectionKeys.length),
            note: "Tracked launch-config groups in the shared backend store.",
          },
          {
            label: "Filled values",
            value: String(countConfiguredValues(store)),
            note: "Stored values across all launch-config sections.",
          },
          {
            label: "Source URLs",
            value: String(sourceStackSummary.configured),
            note: `${sourceStackSummary.primaryConfigured} primary and ${sourceStackSummary.referenceConfigured} fallback/reference URLs configured.`,
          },
          {
            label: "Credential gaps",
            value: String(sourceCredentialSummary.missing),
            note: `${sourceCredentialSummary.configured} keyed source credentials already configured.`,
          },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <AdminSectionCard
          title="Config coverage by section"
          description="Each row shows how much of that config block is filled and where the team would continue proof or activation work."
        >
          <AdminSimpleTable
            columns={["Section", "Status", "Coverage", "Open"]}
            rows={readinessItems.map((item) => [
              <div key={`${item.label}-title`} className="space-y-1">
                <p className="font-semibold text-[#111827]">{item.label}</p>
                <p className="line-clamp-2 text-xs leading-[18px] text-[#4b5563]">{item.detail}</p>
              </div>,
              <AdminBadge key={`${item.label}-status`} label={item.status} tone={getStatusTone(item.status)} />,
              <span key={`${item.label}-coverage`} className="text-[13px] text-[#4b5563]">
                {item.detail.split(".")[0]}
              </span>,
              <AdminActionLink key={`${item.label}-open`} href={item.routeTarget} label="Open" />,
            ])}
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="External activation registry"
          description="Tracks config-side truth and the outside-the-code blocker list in one exportable lane."
        >
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Registry rows", externalActivationRegistrySummary.totalRows],
              ["Config groups", externalActivationRegistrySummary.configGroups],
              ["Blocker rows", externalActivationRegistrySummary.blockerRows],
              ["Configured", externalActivationRegistrySummary.configured],
              ["Partial / mixed", externalActivationRegistrySummary.partial],
              ["Deferred", externalActivationRegistrySummary.deferred],
              ["Blocked / missing", externalActivationRegistrySummary.blocked],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-[14px] py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  {label}
                </p>
                <p className="mt-1.5 text-[22px] font-semibold leading-none text-[#111827]">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <a
              href="/api/admin/external-activation-registry"
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
            >
              Download activation registry CSV
            </a>
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminSectionCard
          title="Console coverage"
          description="High-level scope of what the launch-config console now owns."
        >
          <div className="space-y-2">
            {coverageNotes.map((item) => (
              <div key={item} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-[14px] py-2.5 text-sm leading-5 text-[#4b5563]">
                {item}
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Record config readiness"
          description="Append real readiness revisions for each config section so setup coverage and proof feed the same backend trail."
        >
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="launch configuration"
            panelTitle="Record launch-config readiness"
            panelDescription="Log launch-config progress from this setup desk instead of treating provider, billing, auth, and compliance inputs as silent form saves only."
            defaultRouteTarget="/admin/launch-config-console"
            defaultOperator="ops"
            defaultChangedFields="launch config inputs, setup status"
            actionNoun="launch configuration action"
          />
        </AdminSectionCard>
      </div>

      <LaunchConfigConsoleClient />
    </AdminPageFrame>
  );
}

