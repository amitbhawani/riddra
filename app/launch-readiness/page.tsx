import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PublicLaunchPreflight } from "@/components/public-launch-preflight";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getLaunchState } from "@/lib/launch-state";
import {
  getImmediateLaunchBlockers,
  getLaunchChecklist,
  launchCallsToAction,
} from "@/lib/launch-readiness";
import {
  getMarketSourceCredentialSummary,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Launch Readiness",
  description: "Pending-first launch readiness view for current Riddra launch blockers and next actions.",
  robots: {
    index: false,
    follow: false,
  },
};

function statusClasses(status: string) {
  if (status === "Ready") return "bg-aurora/14 text-aurora";
  if (status === "In progress" || status === "Needs verification") return "bg-flare/14 text-flare";
  if (status === "Deferred") return "bg-white/10 text-white";
  return "bg-bloom/14 text-bloom";
}

export default async function LaunchReadinessPage() {
  await requireAdmin();

  const launchState = getLaunchState();
  const launchChecklist = getLaunchChecklist();
  const blockers = getImmediateLaunchBlockers();
  const commitmentItems = getLaunchCommitmentItems();
  const marketSourceSummary = getMarketSourceStackSummary();
  const marketCredentialSummary = getMarketSourceCredentialSummary();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Launch Readiness", href: "/launch-readiness" },
  ];

  const activeBlockers = blockers.filter((item) => item.status !== "Ready");
  const readyBlockers = blockers.filter((item) => item.status === "Ready");
  const openChecklistItems = launchChecklist.filter((item) => item.status !== "Ready");
  const readyChecklistItems = launchChecklist.filter((item) => item.status === "Ready");
  const activeCommitmentItems = commitmentItems.filter(
    (item) => item.status !== "Ready" && item.status !== "Deferred",
  );
  const readyCommitmentItems = commitmentItems.filter((item) => item.status === "Ready");
  const deferredCommitmentItems = commitmentItems.filter((item) => item.status === "Deferred");
  const hasPending = activeBlockers.length > 0 || openChecklistItems.length > 0 || activeCommitmentItems.length > 0;

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Launch Readiness",
          description: "Pending-first launch readiness view for current Riddra launch blockers and next actions.",
          path: "/launch-readiness",
        })}
      />
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Go-live track</Eyebrow>
          <SectionHeading
            title="Launch readiness"
            description={`${launchState.publicMessage} This page now keeps the main view focused on what is still open. Proven and deferred items are hidden below so the page stays short and usable.`}
          />
        </div>

        <GlowCard>
          <SectionHeading
            title="Launch Snapshot"
            description="This is the compact view of what still needs attention before launch-style traffic should expand."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Active blockers</p>
              <p className="mt-2 text-3xl font-semibold text-white">{activeBlockers.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Open checklist items</p>
              <p className="mt-2 text-3xl font-semibold text-white">{openChecklistItems.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Open commitments</p>
              <p className="mt-2 text-3xl font-semibold text-white">{activeCommitmentItems.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Source coverage</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {marketSourceSummary.configured}/{marketSourceSummary.total}
              </p>
              <p className="mt-3 text-sm leading-7 text-mist/72">
                Credentials {marketCredentialSummary.configured}/{marketCredentialSummary.total}
              </p>
            </div>
          </div>
        </GlowCard>

        {hasPending ? (
          <>
            {activeBlockers.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Immediate Blockers"
                  description="Only the launch lanes that are still unresolved stay in the main view."
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {activeBlockers.map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                      <Link
                        href={item.href}
                        className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                      >
                        Open blocker lane
                      </Link>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}

            {openChecklistItems.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Open Launch Checklist"
                  description="Completed checklist items are hidden. This section only shows what still needs movement."
                />
                <div className="mt-5 grid gap-4">
                  {openChecklistItems.map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}

            {activeCommitmentItems.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Open Launch Commitments"
                  description="Only live unresolved commitments stay visible here."
                />
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {activeCommitmentItems.map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                      <Link
                        href={item.href}
                        className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                      >
                        Open commitment lane
                      </Link>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}

            <GlowCard>
              <SectionHeading
                title="What Still Needs Human Activation"
                description="This stays short and only calls out the outside-the-repo activation work that still matters."
              />
              <div className="mt-5 grid gap-3">
                <div className="rounded-[24px] border border-white/8 bg-black/15 p-5 text-sm leading-7 text-mist/74">
                  Real provider access, deployed-host verification, and any remaining external dashboard activation still need human completion outside the repo.
                </div>
                <div className="rounded-[24px] border border-white/8 bg-black/15 p-5 text-sm leading-7 text-mist/74">
                  Keep launch promises aligned with what is truly live now. If something is not activated, it should stay out of the public claim set.
                </div>
              </div>
            </GlowCard>
          </>
        ) : (
          <GlowCard>
            <SectionHeading
              title="Pending Right Now"
              description="There is no active launch-readiness item left in the main view."
            />
            <div className="mt-6 rounded-[24px] border border-aurora/20 bg-aurora/[0.04] p-6">
              <h3 className="text-2xl font-semibold text-white">No active pending launch item</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                Completed and deferred launch material is hidden below so this page stays short when the main board is clean.
              </p>
            </div>
          </GlowCard>
        )}

        <details className="rounded-[28px] border border-white/8 bg-black/15 p-6">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">Completed and deferred</h2>
                <p className="mt-2 text-sm leading-7 text-mist/74">
                  Open this only if you want the hidden ready lanes, deferred commitments, and broad-public preflight.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                Hidden by default
              </span>
            </div>
          </summary>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Ready blockers and checklist lanes</h3>
                <span className="rounded-full bg-aurora/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-aurora">
                  {readyBlockers.length + readyChecklistItems.length} ready
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {readyBlockers.map((item) => (
                  <div key={`ready-blocker-${item.title}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  </div>
                ))}
                {readyChecklistItems.map((item) => (
                  <div key={`ready-checklist-${item.title}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  </div>
                ))}
                {readyBlockers.length + readyChecklistItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm leading-7 text-mist/74">
                    No fully-ready item is currently hidden here.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Deferred and later-proof lanes</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  {deferredCommitmentItems.length} deferred
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {readyCommitmentItems.map((item) => (
                  <div key={`ready-commitment-${item.title}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                ))}
                {deferredCommitmentItems.map((item) => (
                  <div key={`deferred-commitment-${item.title}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                ))}
                {readyCommitmentItems.length + deferredCommitmentItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm leading-7 text-mist/74">
                    No ready or deferred commitment item is currently hidden here.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
            <h3 className="text-xl font-semibold text-white">Broad-public preflight</h3>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              This stays hidden by default because it is not part of the short pending-first launch view.
            </p>
            <div className="mt-6">
              <PublicLaunchPreflight />
            </div>
          </div>
        </details>

        <div className="grid gap-4 sm:grid-cols-3">
          {launchCallsToAction.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
