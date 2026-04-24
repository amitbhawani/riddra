import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { getPublicTruthCopy } from "@/lib/public-route-truth";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reports",
  description: "Riddra report hub for institutional activity, event calendars, and market follow-through pages.",
};

const reportCards = [
  {
    title: "FII / DII activity",
    href: "/reports/fii-dii",
    description:
      "Track institutional buy, sell, and net-flow structure through an NSE-inspired report surface built for Indian market review.",
    status: "Coverage building",
  },
  {
    title: "Results calendar",
    href: "/reports/results-calendar",
    description:
      "Follow earnings windows, IPO milestones, and event-led market dates from one dedicated destination.",
    status: "Live route",
  },
];

export default function ReportsPage() {
  const truthCopy = getPublicTruthCopy({
    continuitySubject: "report usage",
    handoffLabel: "reports-to-workspace handoff",
    billingSubject: "premium report and event-follow-through language",
    supportSubject: "public report users who convert",
  });
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Reports", href: "/reports" },
  ];

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-3 sm:py-4">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Reports",
          description: "Riddra report hub for institutional activity, event calendars, and market follow-through pages.",
          path: "/reports",
        })}
      />
      <ProductPageContainer className="space-y-6">
        <ProductBreadcrumbs items={breadcrumbs.map((item) => ({ label: item.name, href: item.href }))} />
        <ProductCard tone="primary" className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
              Report hub
            </p>
            <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[36px]">
              Market reports
            </h1>
            <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.88)] sm:text-[15px]">
              Use report-led pages for recurring institutional, event, and market-structure follow-through instead of hunting across disconnected hubs.
            </p>
          </div>
        </ProductCard>

        <PublicSurfaceTruthSection
          eyebrow="Report truth"
          title="This report hub is useful for recurring market follow-through, but deeper continuity still depends on launch activation"
          description="Use reports confidently for public market follow-through, while keeping auth continuity, premium promises, and support follow-through honest until those live paths are fully verified."
          authReady={truthCopy.authReady}
          authPending={truthCopy.authPending}
          billingReady={truthCopy.billingReady}
          billingPending={truthCopy.billingPending}
          supportReady={truthCopy.supportReady}
          supportPending={truthCopy.supportPending}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {reportCards.map((item) => (
            <ProductCard key={item.href} tone="secondary" className="space-y-4 p-4">
              <ProductSectionTitle title={item.title} description={item.description} eyebrow={item.status} />
              <Link
                href={item.href}
                className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
              >
                Open report
              </Link>
            </ProductCard>
          ))}
        </div>
      </ProductPageContainer>
    </div>
  );
}
