import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export type ConversionPathAuditItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  detail: string;
  href: string;
};

export type ConversionPathRegistryRow = {
  lane: "Journey checklist" | "Route checkpoint";
  label: string;
  status: "Ready" | "In progress" | "Blocked";
  href: string;
  detail: string;
  source: string;
};

export function getConversionPathAuditItems(): ConversionPathAuditItem[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasPublicAuth = hasRuntimeSupabaseEnv();
  const hasSupportEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasSupportDelivery = Boolean(hasSupportEmail && resend.configured);
  const hasBilling = Boolean(config.razorpayKeyId && config.razorpayKeySecret);

  return [
    {
      title: "Public discovery entry",
      status: "Ready",
      detail: "Homepage, pricing, get-started, and market-entry routes are live and now have cleaner product-facing messaging plus stronger CTA handoffs.",
      href: "/get-started",
    },
    {
      title: "Signup and login path",
      status: hasPublicAuth ? "In progress" : "Blocked",
      detail: hasPublicAuth
        ? "Google and email-link auth flows are wired, but the broad-public conversion path still needs one full verified pass in launch conditions."
        : "Public auth cannot be treated as conversion-ready until Supabase public env activation is complete.",
      href: "/signup",
    },
    {
      title: "Post-auth account setup",
      status: hasPublicAuth ? "In progress" : "Blocked",
      detail: hasPublicAuth
        ? "Account setup, inbox, alerts, portfolio, and workspace entry points are present, but the first-session journey still needs launch-grade verification."
        : "Protected setup and workspace flows should not be treated as ready until public auth is active.",
      href: "/account/setup",
    },
    {
      title: "Support and reassurance layer",
      status: hasSupportDelivery ? "In progress" : "Blocked",
      detail: hasSupportDelivery
        ? "Support contact and transactional delivery are configured, so the next work is testing trust and recovery communication as part of signup and billing flows."
        : "Broad-public conversion should wait until support contact and email delivery are credible enough for first-time users.",
      href: "/contact",
    },
    {
      title: "Paid conversion branch",
      status: hasBilling ? "In progress" : "Blocked",
      detail: hasBilling
        ? "Pricing and billing surfaces are live, but checkout, entitlements, and post-payment state still need one verified path before paid traffic is invited broadly."
        : "The plan page is useful for direction, but paid conversion is still blocked until billing credentials are fully active.",
      href: "/pricing",
    },
  ];
}

export const conversionPathAuditRules = [
  "A launch-safe conversion path is more than working pages; it must also have trustworthy auth, support, and post-signup continuity.",
  "Signup, setup, and workspace should be reviewed as one flow, not as isolated routes.",
  "If billing is not fully verified, public messaging should stay in public-beta mode instead of implying a hardened paid funnel.",
  "The conversion path is only truly ready once launch-day smoke tests confirm the route sequence works under real configuration, not just local expectations.",
];

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getConversionPathRegistryRows(): ConversionPathRegistryRow[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const items = getConversionPathAuditItems();
  const hasLaunchMode = Boolean(config.launchMode);
  const hasSupportEmail = Boolean(config.supportEmail || config.contactEmail);
  const hasSupportDelivery = resend.configured;
  const hasBilling = Boolean(config.razorpayKeyId && config.razorpayWebhookSecret);

  const checklistRows: ConversionPathRegistryRow[] = items.map((item) => ({
    lane: "Journey checklist",
    label: item.title,
    status: item.status,
    href: item.href,
    detail: item.detail,
    source: "Conversion path audit surface",
  }));

  const routeRows: ConversionPathRegistryRow[] = [
    {
      lane: "Route checkpoint",
      label: "Homepage to pricing handoff",
      status: "Ready",
      href: "/pricing",
      detail: "Discovery and pricing routes are public and now read much more like a product front door than an internal roadmap shell.",
      source: "Public discovery routes",
    },
    {
      lane: "Route checkpoint",
      label: "Auth activation posture",
      status: hasRuntimeSupabaseEnv() ? "In progress" : "Blocked",
      href: "/signup",
      detail: hasRuntimeSupabaseEnv()
        ? "Runtime auth configuration exists, so the remaining work is verifying the actual public signup and login journey in launch conditions."
        : "Public auth is still blocked until Supabase runtime configuration is present.",
      source: "Signup and login routes",
    },
    {
      lane: "Route checkpoint",
      label: "Support-backed first-session trust",
      status: hasSupportEmail && hasSupportDelivery ? "In progress" : "Blocked",
      href: "/contact",
      detail:
        hasSupportEmail && hasSupportDelivery
          ? "Support visibility and delivery capability are configured enough to verify first-session reassurance and recovery paths."
          : "The first-session trust layer still needs both a visible support destination and transactional delivery to be credible.",
      source: "Support and recovery routes",
    },
    {
      lane: "Route checkpoint",
      label: "Paid conversion readiness",
      status: hasBilling ? "In progress" : "Blocked",
      href: "/account/billing",
      detail: hasBilling
        ? "Billing credentials are configured enough to verify the paid branch and post-payment state handling."
        : "Paid conversion should stay conservative until billing keys and webhook posture are configured.",
      source: "Billing and account routes",
    },
    {
      lane: "Route checkpoint",
      label: "Launch mode discipline",
      status: hasLaunchMode ? "In progress" : "Blocked",
      href: "/admin/launch-config-console",
      detail: hasLaunchMode
        ? "Launch mode is configured, so the conversion path can now be judged against an explicit public posture."
        : "The conversion path still needs an explicit launch mode before messaging and gating can be reviewed consistently.",
      source: "Launch posture config",
    },
  ];

  return [...checklistRows, ...routeRows];
}

export function getConversionPathRegistrySummary() {
  const rows = getConversionPathRegistryRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toConversionPathRegistryCsv(rows: ConversionPathRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "detail", "source"];

  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.detail, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
