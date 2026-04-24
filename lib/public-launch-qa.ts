import { getResendReadiness } from "@/lib/email/resend";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export type PublicLaunchQaItem = {
  title: string;
  status: "Ready" | "In progress" | "Blocked";
  note: string;
  href: string;
};

export function getPublicLaunchQaItems(): PublicLaunchQaItem[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasAuthRuntime = hasRuntimeSupabaseEnv();
  const hasProviderSync = Boolean(
    config.marketDataProviderUrl &&
      (config.marketDataRefreshSecret || config.cronSecret),
  );
  const hasSupportDelivery = Boolean(
    config.supportEmail && resend.configured,
  );

  return [
    {
      title: "Mobile route QA",
      status: "In progress",
      note: "The header is much healthier now, but broad-public launch still needs a deliberate mobile pass across homepage, search, pricing, stock detail, charts, and subscriber flows.",
      href: "/admin/mobile-qa-matrix",
    },
    {
      title: "Chart render and visual stability",
      status: "In progress",
      note: "The four flagship index routes plus the market-overview chart section already use the free native TradingView chart library with internal timeline data, the homepage chart strip is fully native across its index and Tata Motors tiles, stock chart routes now stay in a stable waiting state instead of falling back to the hosted widget, and mutual-fund pages now use an honest benchmark handoff card instead of a vague hosted proxy. The remaining work is final provider-backed OHLCV verification and benchmark-specific mapping, not launch-risky hosted chart behavior.",
      href: "/admin/release-checks",
    },
    {
      title: "Placeholder and demo-state honesty",
      status: "In progress",
      note: "Fake-looking invoice history, demo portfolio P&L, preview watchlists, preview saved screens, public alert examples, staged broker-review actions, architecture-heavy premium shells, guided-preview AI surfaces, and similar seeded states now have a dedicated placeholder-honesty registry. The option-chain route now stays in an explicit empty preview state with no fake strike rows or seeded retained chain snapshots, while the public alerts route still needs either real data or clearer outside-user guardrails.",
      href: "/admin/public-launch-qa",
    },
    {
      title: "Core smoke tests",
      status: "In progress",
      note: hasAuthRuntime
        ? "The live smoke-test desk now has a dedicated journey registry and CSV export across public discovery, auth, billing, support, and operator control, so the broad-public pass is finally a real route sequence instead of loose launch memory, but the final run still needs one clean rehearsal with real auth, more credible data state, and stronger billing or support activation."
        : "The live smoke-test desk now has a dedicated journey registry and CSV export across public discovery, auth, billing, support, and operator control, but some journeys are still blocked by missing runtime auth and broader activation inputs, so the final broad-public rehearsal remains incomplete.",
      href: "/admin/live-smoke-tests",
    },
    {
      title: "Incident and rollback drill",
      status: "In progress",
      note: "Reliability, incident response, recovery readiness, and rollback scenarios now have one combined registry and exportable drill lane, but the team still needs one practical rehearsal so launch-day failures can be handled without improvising.",
      href: "/admin/reliability-ops",
    },
    {
      title: "Announcement rollout and launch narrative",
      status: hasProviderSync && hasSupportDelivery ? "In progress" : "Blocked",
      note:
        hasProviderSync && hasSupportDelivery
          ? "Messaging surfaces and trust pages are ready to tighten into final launch assets once broad-public scope is approved."
          : "Broad-public messaging should wait until live-data sync and support delivery are both credible enough to survive a signup spike.",
      href: "/admin/announcement-readiness",
    },
    {
      title: "Final go / no-go review",
      status: hasProviderSync ? "In progress" : "Blocked",
      note: hasProviderSync
        ? "The go / no-go workflow now has the right surfaces, the launch-day queue plus runbook sequence are exportable, and the combined launch-evidence packet now compresses mobile, smoke, chart, reliability, placeholder, and announcement proof into one final QA handoff, but the broad-public decision still depends on those lanes being exercised together with live data and subscriber truth."
        : "The final go / no-go review should wait until legitimate upstream provider sync is active for the launch-critical data surfaces, even though the launch-day queue, runbook sequence, and combined launch-evidence packet are now easier to audit.",
      href: "/admin/go-no-go",
    },
  ];
}

export const publicLaunchQaRules = [
  "A broad-public launch should only happen after mobile quality, smoke tests, subscriber truth, and live-data trust have all been reviewed together.",
  "Announcement assets should follow product truth. They should not promise live depth, paid boundaries, or support responsiveness that the ops layer cannot yet sustain.",
  "Launch-day incident response must be rehearsed once before a tweet-driven traffic spike, not discovered during the spike.",
  "Go / no-go is the last step, not the first. It should happen after launch-readiness, market-data readiness, subscriber readiness, and QA surfaces agree on scope.",
];
