import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchControlRevisionPanel } from "@/components/launch-control-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getExternalActivationRegistrySummary } from "@/lib/external-activation-registry";
import { immediateUserInputs, launchControlItems } from "@/lib/launch-control";
import { getSubscriberLaunchRegistrySummary } from "@/lib/subscriber-launch-registry";

export const metadata: Metadata = {
  title: "Launch Control",
  description: "Protected launch-control surface for launch blockers, owner mapping, and required inputs.",
};

export default async function LaunchControlPage() {
  await requireUser();
  const [
    externalActivationSummary,
    subscriberLaunchSummary,
    marketDataRuns,
    contactAcknowledgementEntries,
    contactInboxEntries,
    supportAcknowledgementEntries,
    supportFollowUpEntries,
    supportInboxEntries,
  ] = await Promise.all([
    getExternalActivationRegistrySummary(),
    getSubscriberLaunchRegistrySummary(),
    listDurableJobRuns({ family: "market_data", limit: 5 }),
    getEmailDeliveryLog({ family: "contact_acknowledgement", limit: 5 }),
    getEmailDeliveryLog({ family: "contact_inbox_notification", limit: 5 }),
    getEmailDeliveryLog({ family: "support_acknowledgement", limit: 5 }),
    getEmailDeliveryLog({ family: "support_follow_up", limit: 5 }),
    getEmailDeliveryLog({ family: "support_inbox_notification", limit: 5 }),
  ]);
  const latestMarketDataRun = marketDataRuns.items[0] ?? null;
  const latestContactEntry = contactAcknowledgementEntries[0] ?? contactInboxEntries[0] ?? null;
  const latestSupportEntry =
    supportFollowUpEntries[0] ?? supportAcknowledgementEntries[0] ?? supportInboxEntries[0] ?? null;
  const contactSummary = summarizeEmailDeliveryLog([
    ...contactAcknowledgementEntries,
    ...contactInboxEntries,
  ]);
  const supportSummary = summarizeEmailDeliveryLog([
    ...supportAcknowledgementEntries,
    ...supportFollowUpEntries,
    ...supportInboxEntries,
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Launch Control", href: "/admin/launch-control" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Launch operations</Eyebrow>
          <SectionHeading
            title="Launch control"
            description="This page separates what is already coded from what is waiting on real credentials, setup, legal inputs, or business decisions so we can move faster under deadline."
          />
          <Link
            href="/admin/system-status"
            className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Open system status
          </Link>
          <Link
            href="/admin/launch-config-console"
            className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Open launch config console
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {launchControlItems.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {launchControlItems.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {launchControlItems.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current proof state</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This is the real launch-control snapshot for the final private-beta proof state. It uses the same durable-run ledger and delivery-log state as the specialized admin desks while keeping deferred commercial and automation lanes visible but non-blocking.
          </p>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Market-data retained refresh</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {marketDataRuns.error
                  ? marketDataRuns.error
                  : latestMarketDataRun?.errorMessage ??
                    (latestMarketDataRun
                      ? `Latest market-data run is ${latestMarketDataRun.status}.`
                      : "No retained refresh proof has been recorded yet.")}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {marketDataRuns.summary.total} · Succeeded {marketDataRuns.summary.succeeded} · Failed {marketDataRuns.summary.failed}
              </p>
              <Link
                href="/admin/market-data"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open market-data desk
              </Link>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Contact delivery proof</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {latestContactEntry
                  ? latestContactEntry.messageId
                    ? `Newest contact proof resolved as ${latestContactEntry.status} with message id ${latestContactEntry.messageId}.`
                    : `Newest contact proof resolved as ${latestContactEntry.status}.`
                  : "No contact acknowledgement proof has been recorded yet."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {contactSummary.total} · Sent {contactSummary.sent} · Failed {contactSummary.failed} · Skipped {contactSummary.skipped}
              </p>
              <Link
                href="/admin/communication-readiness"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open communication desk
              </Link>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Signed-in support proof</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {latestSupportEntry
                  ? latestSupportEntry.messageId
                    ? `Newest support proof resolved as ${latestSupportEntry.status} with message id ${latestSupportEntry.messageId}.`
                    : `Newest support proof resolved as ${latestSupportEntry.status}.`
                  : "No signed-in support delivery proof has been recorded yet."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {supportSummary.total} · Sent {supportSummary.sent} · Failed {supportSummary.failed} · Skipped {supportSummary.skipped}
              </p>
              <Link
                href="/account/support"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open support route
              </Link>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Launch blocker map</h2>
            <div className="mt-5">
              <LaunchControlRevisionPanel items={launchControlItems} />
            </div>
            <div className="mt-5 grid gap-4">
              {launchControlItems.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <div className="flex gap-2 text-xs uppercase tracking-[0.18em]">
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.owner}</span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.status}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Needed from your side</h2>
            <div className="mt-5 grid gap-3">
              {immediateUserInputs.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">External activation registry</h2>
                <p className="max-w-3xl text-sm leading-7 text-mist/74">
                  Launch control now pulls in the same activation truth as the external-activation and launch-config
                  desks, so provider, auth, billing, support, compliance, and go-live blockers can be reviewed from
                  the central launch page too.
                </p>
              </div>
              <Link
                href="/api/admin/external-activation-registry"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Download activation CSV
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-7">
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Registry rows</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.totalRows}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Config groups</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.configGroups}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Blocker rows</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.blockerRows}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Config-complete</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.configured}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Partial / mixed</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.partial}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Deferred</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.deferred}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Blocked / missing</p>
                <p className="mt-2 text-2xl font-semibold text-white">{externalActivationSummary.blocked}</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">Subscriber launch registry</h2>
                <p className="max-w-3xl text-sm leading-7 text-mist/74">
                  Launch control now also pulls in the main subscriber launch audit, so launch ops can review blocked
                  auth, billing, delivery, and gated-workspace truth from the central launch page instead of bouncing
                  back out to the separate subscriber launch desk.
                </p>
              </div>
              <Link
                href="/api/admin/subscriber-launch-registry"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Download subscriber CSV
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Registry rows</p>
                <p className="mt-2 text-2xl font-semibold text-white">{subscriberLaunchSummary.total}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Ready</p>
                <p className="mt-2 text-2xl font-semibold text-white">{subscriberLaunchSummary.ready}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">In progress</p>
                <p className="mt-2 text-2xl font-semibold text-white">{subscriberLaunchSummary.inProgress}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/68">Blocked</p>
                <p className="mt-2 text-2xl font-semibold text-white">{subscriberLaunchSummary.blocked}</p>
              </div>
            </div>
          </GlowCard>
        </div>
      </Container>
    </div>
  );
}
