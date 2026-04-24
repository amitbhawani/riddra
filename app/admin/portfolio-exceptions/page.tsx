import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPortfolioRegistrySummary } from "@/lib/portfolio-registry";
import {
  portfolioExceptionItems,
  portfolioExceptionRules,
  portfolioExceptionSummary,
} from "@/lib/portfolio-exception-ops";

export const metadata: Metadata = {
  title: "Portfolio Exceptions",
  description: "Protected portfolio-exceptions page for CSV mismatch reviews, broker conflicts, and user re-verification workflows.",
};

export default async function AdminPortfolioExceptionsPage() {
  const user = await requireUser();
  const portfolioRegistrySummary = await getPortfolioRegistrySummary(user, "admin");
  const readinessItems = portfolioExceptionItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "CSV mismatch review desk"
        ? "/portfolio/import"
        : item.title === "Broker sync conflict desk"
          ? "/account/brokers"
          : item.title === "Operator-assist exception handling"
            ? "/admin/portfolio-exceptions"
            : "/portfolio",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Portfolio Exceptions", href: "/admin/portfolio-exceptions" }]} />
          <Eyebrow>Portfolio trust desk</Eyebrow>
          <SectionHeading
            title="Portfolio exceptions"
            description="This page turns CSV mismatches, broker conflicts, and uncertain holdings into a real trust-preserving review workflow instead of guesswork."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Review queues</p>
            <p className="mt-2 text-3xl font-semibold text-white">{portfolioExceptionSummary.reviewQueues}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Mismatch classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{portfolioExceptionSummary.mismatchClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Broker paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">{portfolioExceptionSummary.brokerPaths}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Portfolio registry</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            The portfolio lane now has a dedicated admin export path too, so exception handling can audit import runs,
            reconciliation checkpoints, review rows, holdings posture, draft state, and recent portfolio activity from
            the operator desk instead of sending every audit step back through the subscriber route.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Import runs</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.importRuns}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Checkpoints</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.reconciliations}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Review rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.reviewRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Holdings</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.holdings}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Unresolved rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.unresolvedRows}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/portfolio-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download admin portfolio registry CSV
            </Link>
            <Link
              href="/portfolio/import"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open portfolio import review
            </Link>
          </div>
        </GlowCard>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="portfolio exception lane"
              panelTitle="Write-through portfolio-exception action"
              panelDescription="Log mismatch and re-verification changes into the shared revision lane so portfolio exception posture stops living only as a trust-desk explainer."
              defaultRouteTarget="/admin/portfolio-exceptions"
              defaultOperator="Portfolio Exceptions Operator"
              defaultChangedFields="exception_lane, broker_conflict, verification_posture"
              actionNoun="portfolio-exception mutation"
            />
          </GlowCard>
          {portfolioExceptionItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Exception rules</h2>
          <div className="mt-5 grid gap-3">
            {portfolioExceptionRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
