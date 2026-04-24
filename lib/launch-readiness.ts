import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { getMarketDataRefreshProofStatus, getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import {
  getMarketSourceCredentialSummary,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";

export type LaunchChecklistItem = {
  title: string;
  status: "Ready" | "In progress" | "Pending";
  note: string;
};

export type LaunchBlockerItem = {
  title: string;
  status: "Ready" | "Needs activation" | "Needs verification";
  note: string;
  href: string;
};

export function getLaunchChecklist(): LaunchChecklistItem[] {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasSupportEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasProviderUrl = Boolean(config.marketDataProviderUrl);
  const hasSyncSecret = Boolean(config.marketDataRefreshSecret || config.cronSecret);
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const hasVerifiedAuthRuntime = hasRuntimeSupabaseEnv() && !isLocalAuthBypassEnabled();

  return [
    {
      title: "Homepage, stock, IPO, fund, chart, and index routes",
      status: "Ready",
      note: "The flagship public route families now load through honest catalog and route integrity paths, with stock, fund, IPO, chart, and index hubs preferring durable data and falling back only to explicit unavailable or degraded states. Remaining live-data proof belongs to the separate market-data and source-activation lanes, not this route-integrity checklist item.",
    },
    {
      title: "Auth foundation and subscriber workspace",
      status: hasVerifiedAuthRuntime ? "Ready" : hasPublicSupabase ? "In progress" : "Pending",
      note: hasPublicSupabase
        ? hasVerifiedAuthRuntime
          ? "Auth flows and protected routes are live with reload-safe Supabase session continuity. Broader subscriber storage and deployed-host rehearsal still matter, but basic auth and workspace access are no longer a pending build-side blocker."
          : "Auth flows and protected routes exist, but the workspace still leans on local bypass behavior or incomplete subscriber memory, so auth cannot be treated as truly launch-ready yet."
        : "The UI and route structure exist, but public Supabase env setup still needs to be connected before auth can be treated as live.",
    },
    {
      title: "CMS and admin operating model",
      status: "Ready",
      note: "Admin dashboards, revisions, documents, overrides, launch control, system status, and CMS blueprints are in place for launch-shell operations.",
    },
    {
      title: "Supabase production connection",
      status: hasAdminSupabase ? "In progress" : hasPublicSupabase ? "In progress" : "Pending",
      note: hasAdminSupabase
        ? "Public and admin Supabase envs are present, so the connection path is active. The remaining work is migration, seed, and production verification rather than blank setup."
        : hasPublicSupabase
          ? "Public Supabase auth envs are present, but service-role access and full backend activation still need to be completed."
          : "Environment keys and production project connection still need to be applied before Supabase can be treated as live.",
    },
    {
      title: "Official source and data refresh setup",
      status: hasAdminSupabase ? "Ready" : "Pending",
      note:
        hasAdminSupabase
          ? `Source contracts, ingest-job planning, payload validation, and the market-data tester are all live. ${sourceStackSummary.configured}/${sourceStackSummary.total} source URLs and ${sourceCredentialSummary.configured}/${sourceCredentialSummary.total} source credentials are visible from runtime config, and the remaining work is the separate provider-backed market-data execution and source-activation proof lanes rather than missing setup surfaces.`
          : `Source contracts and payload testing exist, but service-role activation plus provider sync credentials still need to be completed before verified market-data execution can begin. Right now ${sourceStackSummary.configured}/${sourceStackSummary.total} source URLs are configured.`,
    },
    {
      title: "India source-stack coverage and fallback credentials",
      status:
        sourceStackSummary.missing === 0 && sourceCredentialSummary.missing === 0
          ? "Ready"
          : sourceStackSummary.configured > 0
            ? "In progress"
            : "Pending",
      note:
        sourceStackSummary.missing === 0 && sourceCredentialSummary.missing === 0
          ? "NSE, BSE, AMFI, FX, filings, corporate-actions, and keyed fallback sources are all explicitly configured."
          : `${sourceStackSummary.configured}/${sourceStackSummary.total} source URLs and ${sourceCredentialSummary.configured}/${sourceCredentialSummary.total} source credentials are configured. The missing portion is now explicit in the launch-config console instead of living only in scattered notes.`,
    },
    {
      title: "Provider payload validation desk",
      status: hasAdminSupabase ? "Ready" : "In progress",
      note: hasAdminSupabase
        ? "The admin tester can now load the first-rollout stock, fund, and index sample payload, validate provider JSON, and prepare verified ingestion safely."
        : "The tester and sample payload are live, but admin Supabase env activation is still needed before validation can turn into verified writes.",
    },
    {
      title: "Billing and subscription activation (deferred for public launch)",
      status: config.razorpayKeyId && config.razorpayKeySecret ? "In progress" : "Pending",
      note:
        config.razorpayKeyId && config.razorpayKeySecret
          ? "Payment credentials exist, but checkout, webhook verification, entitlement mapping, and invoice truth remain a later commercial lane. They are no longer treated as blockers for private beta."
          : "The billing workspace exists, but Razorpay and subscription proof are deliberately deferred until company registration and commercial timing are ready.",
    },
    {
      title: "Trust and support pages",
      status: hasSupportEmail ? "Ready" : "In progress",
      note: hasSupportEmail
        ? `Privacy, terms, contact, methodology, and support contact are visible, with support configured as ${config.supportEmail}.`
        : "Trust pages are live, but the support contact still needs final production confirmation.",
    },
    {
      title: "Deployment readiness tracking",
      status: "In progress",
      note:
        "The app now tracks private-beta deployment blockers, config coverage, smoke tests, auth posture, readiness mode, and go or no-go state, and the local production build script no longer force-wipes `.next` while an active dev server is using `.next/dev`. Final private-beta deployment validation plus one clean production-build completion still need execution.",
    },
    {
      title: "Communication and support setup",
      status: hasSupportEmail ? "Ready" : "Pending",
      note:
        hasSupportEmail
          ? delivery.configured
            ? "Support contact, protected support routes, and transactional delivery inputs are configured. Manual or operator-led support remains acceptable for the current invite-only beta."
            : "Support contact and protected support routes are in place. Manual or operator-led support is acceptable for the current invite-only beta, while automated transactional delivery is intentionally deferred."
          : "Support email or contact routing still needs final activation.",
    },
  ];
}

export function getImmediateLaunchBlockers(): LaunchBlockerItem[] {
  const config = getRuntimeLaunchConfig();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasGoogleOAuth = Boolean(config.googleOAuthConfigured);
  const hasProductionSiteUrl = Boolean(
    config.siteUrl && config.siteUrl.startsWith("https://") && !config.siteUrl.includes("localhost"),
  );
  const hasSupportContact = Boolean(config.supportEmail || config.contactEmail);
  const refreshReadiness = getMarketDataRefreshReadiness();
  const refreshProof = getMarketDataRefreshProofStatus();
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const hasVerifiedAuthRuntime = hasRuntimeSupabaseEnv() && !isLocalAuthBypassEnabled();

  return [
    {
      title: "Private-beta deployment, domain, and DNS hardening",
      status:
        hasProductionSiteUrl && hasSupportContact
          ? "Ready"
          : hasProductionSiteUrl
            ? "Needs verification"
            : "Needs activation",
      note:
        hasProductionSiteUrl && hasSupportContact
          ? `Build-side domain posture is aligned to ${config.siteUrl}: callbacks, trust surfaces, sitemap base, and support contact all point at the intended private-beta host. Repeat one deployed-host TLS and DNS proof before invite traffic, but this no longer belongs on the active code backlog.`
          : hasProductionSiteUrl
            ? `The runtime site URL is set to ${config.siteUrl}, but support contact or trust-surface alignment still needs final activation before the domain posture can be treated as build-complete.`
            : "Set the final site URL before metadata, auth redirects, and canonical surfaces can be trusted for private beta.",
      href: "/admin/domain-readiness",
    },
    {
      title: "Supabase auth and protected-route truth",
      status:
        hasVerifiedAuthRuntime && hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Ready"
          : hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Needs verification"
          : "Needs activation",
      note:
        hasVerifiedAuthRuntime && hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Real Supabase session continuity is active and reload-safe in the current runtime. Repeat the same proof once on the deployed private-beta host before broad invite traffic."
          : hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Public auth, admin auth, and Google provider posture are present, but one real signup, callback, session, and protected-route rehearsal is still needed."
          : "Public Supabase auth, service-role access, or Google OAuth setup is still incomplete, so subscriber identity cannot be treated as launch-ready yet.",
      href: "/admin/auth-activation",
    },
    {
      title: "Provider-backed market-data execution",
      status: refreshProof.proofMode === "verification_ready" ? "Ready" : "Needs activation",
      note:
        refreshProof.proofMode === "verification_ready"
          ? `Durable refresh is configured through ${refreshProof.sourceLabel}, recent runs are succeeding, stock and fund routes are rendering from durable quote and NAV rows, and Nifty-family index snapshots are rendering from verified durable rows. This lane is now proven for a manual, operator-led private beta.`
          : `The market-data refresh proof is still missing ${refreshProof.exactMissing.join(", ")}. Source coverage currently sits at ${sourceStackSummary.configured}/${sourceStackSummary.total} URLs and ${sourceCredentialSummary.configured}/${sourceCredentialSummary.total} credentials. ${refreshReadiness.sourceMode === "configuration_pending" ? "Configure direct quote/NAV refresh endpoints or a provider payload source first." : "Once the missing refresh inputs are filled, rerun the durable refresh proof."}`,
      href: "/admin/source-mapping-desk",
    },
    {
      title: "Support delivery and operator escalation proof",
      status: hasSupportContact ? "Ready" : "Needs activation",
      note:
        hasSupportContact
          ? "Manual or operator-led support posture is acceptable for the current private beta. Transactional email proof is intentionally deferred and should not hold up invite-only signoff."
          : "Support inbox routing still needs a real support or contact destination before the operator-led private-beta posture can be trusted.",
      href: "/admin/communication-readiness",
    },
  ];
}

export const launchCallsToAction = [
  {
    label: "Review build tracker",
    href: "/build-tracker",
  },
  {
    label: "Open admin dashboard",
    href: "/admin",
  },
  {
    label: "Open launch scorecard",
    href: "/admin/launch-scorecard",
  },
  {
    label: "Open external activation",
    href: "/admin/external-activation",
  },
  {
    label: "Open market data tester",
    href: "/admin/market-data-tester",
  },
  {
    label: "Open source mapping desk",
    href: "/admin/source-mapping-desk",
  },
  {
    label: "Open launch config console",
    href: "/admin/launch-config-console",
  },
  {
    label: "Open readiness backlog",
    href: "/admin/public-launch-backlog",
  },
];
