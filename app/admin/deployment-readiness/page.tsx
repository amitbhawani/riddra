import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getPrivateBetaDeploymentReadiness } from "@/lib/deployment-readiness";

export const metadata: Metadata = {
  title: "Deployment Readiness",
  description:
    "Protected private-beta deployment desk for config coverage, blockers, deferred billing, and smoke-test proof.",
};

function renderStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("configured")) {
    return "text-aurora";
  }

  if (normalized.includes("deferred")) {
    return "text-sand";
  }

  if (normalized.includes("progress") || normalized.includes("partial")) {
    return "text-sky-200";
  }

  return "text-rose-200";
}

export default async function DeploymentReadinessPage() {
  await requireUser();

  const readiness = getPrivateBetaDeploymentReadiness();
  const marketDataRuns = await listDurableJobRuns({ family: "market_data", limit: 5 });
  const [contactAcknowledgementEntries, contactInboxEntries, supportAcknowledgementEntries, supportFollowUpEntries, supportInboxEntries] =
    await Promise.all([
      getEmailDeliveryLog({ family: "contact_acknowledgement", limit: 5 }),
      getEmailDeliveryLog({ family: "contact_inbox_notification", limit: 5 }),
      getEmailDeliveryLog({ family: "support_acknowledgement", limit: 5 }),
      getEmailDeliveryLog({ family: "support_follow_up", limit: 5 }),
      getEmailDeliveryLog({ family: "support_inbox_notification", limit: 5 }),
    ]);
  const readinessItems = readiness.checklist.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
    routeTarget: item.href ?? "/admin/deployment-readiness",
  }));
  const configuredCount = readiness.checklist.filter((item) => item.status === "Configured").length;
  const partialCount = readiness.checklist.filter((item) => item.status === "Partial").length;
  const blockedCount = readiness.checklist.filter((item) => item.status === "Blocked").length;
  const deferredCount = readiness.checklist.filter((item) => item.status === "Deferred").length;
  const latestMarketDataRun = marketDataRuns.items[0] ?? null;
  const latestContactEntry = contactAcknowledgementEntries[0] ?? contactInboxEntries[0] ?? null;
  const latestSupportEntry =
    supportFollowUpEntries[0] ?? supportAcknowledgementEntries[0] ?? supportInboxEntries[0] ?? null;
  const contactSummary = summarizeEmailDeliveryLog([...contactAcknowledgementEntries, ...contactInboxEntries]);
  const supportSummary = summarizeEmailDeliveryLog([
    ...supportAcknowledgementEntries,
    ...supportFollowUpEntries,
    ...supportInboxEntries,
  ]);

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Deployment Readiness", href: "/admin/deployment-readiness" },
            ]}
          />
          <Eyebrow>Private beta deployment</Eyebrow>
          <SectionHeading
            title="Deployment readiness"
            description="Use this desk as the single private-beta deployment truth surface. It separates config-complete lanes from blocked, preview, and deferred work, and it treats smoke-test proof as separate from mere setup coverage."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Configured, needs proof</p>
            <p className="mt-2 text-3xl font-semibold text-white">{configuredCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Partial / mixed</p>
            <p className="mt-2 text-3xl font-semibold text-white">{partialCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked / not configured</p>
            <p className="mt-2 text-3xl font-semibold text-white">{blockedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Deferred commercial lane</p>
            <p className="mt-2 text-3xl font-semibold text-white">{deferredCount}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">Private-beta deployment checklist</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
                This checklist covers the current deployment gate only. It includes auth, jobs, search, email,
                retained market data, and persistent account continuity. Billing remains visible as a deferred lane,
                not an active blocker. A <span className="text-white">Configured</span> status here means the code path
                and required inputs line up; it does not mean the live provider or smoke-test proof already exists.
              </p>
            </div>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="private-beta deployment check"
              panelTitle="Write-through deployment action"
              panelDescription="Log private-beta deployment changes into the shared revision lane so environment, blocker, and smoke-test updates stop living only as page copy."
              defaultRouteTarget="/admin/deployment-readiness"
              defaultOperator="Deployment Readiness Operator"
              defaultChangedFields="deployment_step, config_state, blocker_state, smoke_test_state"
              actionNoun="deployment-readiness mutation"
            />
            <div className="grid gap-4">
              {readiness.checklist.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <span
                      className={`rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] ${renderStatusTone(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      Open related surface
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current proof state</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            These cards show the live state of the two remaining signoff lanes directly from the durable-run ledger and delivery-log store, so deployment planning does not depend on stale checklist wording.
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
                      : "No market-data refresh run has been recorded yet.")}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {marketDataRuns.summary.total} · Succeeded {marketDataRuns.summary.succeeded} · Failed {marketDataRuns.summary.failed}
              </p>
              <Link
                href="/admin/source-mapping-desk"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open market-data proof lane
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
                Open contact proof lane
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
                href="/admin/communication-readiness"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open support proof lane
              </Link>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Config checklist</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            These are the exact environment and config groups that private beta depends on. Deferred commercial billing
            stays documented here, but it does not belong to the active deployment gate.
          </p>
          <div className="mt-5 grid gap-4">
            {readiness.configChecklist.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <span
                    className={`rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] ${renderStatusTone(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.envKeys.map((envKey) => (
                    <span
                      key={envKey}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/78"
                    >
                      {envKey}
                    </span>
                  ))}
                </div>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Open config surface
                </Link>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Active blocker list</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Only current private-beta blockers appear here. Billing-only work no longer lives in the active blocker
              lane.
            </p>
            {readiness.blockers.length ? (
              <div className="mt-5 grid gap-4">
                {readiness.blockers.map((blocker) => (
                  <div key={blocker.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{blocker.title}</h3>
                      <span
                        className={`rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] ${renderStatusTone(blocker.status)}`}
                      >
                        {blocker.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{blocker.note}</p>
                    <Link
                      href={blocker.href}
                      className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      Resolve from related surface
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                No active private-beta blockers are currently registered here. Configured lanes still need the smoke
                tests below before the deployment should be treated as trustworthy.
              </div>
            )}
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What is intentionally deferred</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              These items stay documented so later launch work is not lost, but they are intentionally outside the
              private-beta deployment gate.
            </p>
            <div className="mt-5 grid gap-4">
              {readiness.deferred.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      Open deferred surface
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Config-complete lanes</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              This section shows the lanes whose runtime inputs and code paths line up today. Treat them as ready for
              smoke-test proof, not as automatically live-verified.
            </p>
            {readiness.readyNow.length ? (
              <div className="mt-5 grid gap-4">
                {readiness.readyNow.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        Open ready surface
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                No deployment lane is config-complete yet. Finish the blocker list and rerun the smoke tests.
              </div>
            )}
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Smoke test runbook</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Use these five checks as the minimum private-beta go or no-go proof after each serious deployment or
              environment change.
            </p>
            <div className="mt-5 grid gap-4">
              {readiness.smokeTests.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.owner}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-mist/68">Route: {item.route}</p>
                  <div className="mt-4 space-y-2 text-sm leading-7 text-mist/74">
                    {item.steps.map((step, index) => (
                      <p key={step}>
                        {index + 1}. {step}
                      </p>
                    ))}
                  </div>
                  <p className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/82">
                    Success looks like: {item.success}
                  </p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </Container>
    </div>
  );
}
