import Link from "next/link";
import type { Metadata } from "next";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ToolsExplorer } from "@/components/tools-explorer";
import { Eyebrow } from "@/components/ui";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free Tools",
  description: "Riddra tool hub with investing calculators, market trackers, PDF utilities, and practical everyday workflows.",
};

export default async function ToolsPage() {
  return (
    <GlobalSidebarPageShell
      category="tools"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
      <ProductCard tone="primary" className="space-y-5">
        <div className="space-y-3">
          <Eyebrow>Tools</Eyebrow>
          <ProductSectionTitle
            title="Tools"
            description="Use investing calculators, live commodity trackers, and practical utility tools inside the same container, spacing rhythm, and reading surface as the rest of Riddra."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Trading utility",
              value: "Position sizing",
              detail: "Work out entry risk and share size before taking a trade.",
            },
            {
              label: "IPO utility",
              value: "IPO lots",
              detail: "Estimate lot count and application amount quickly.",
            },
            {
              label: "Wealth utility",
              value: "SIP goal",
              detail: "Translate long-term goals into a monthly savings target.",
            },
            {
              label: "Scanning utility",
              value: "Breakout check",
              detail: "Use a focused signal card before opening the full chart route.",
            },
          ].map((item) => (
            <ProductCard key={item.value} tone="secondary" className="space-y-2 p-4">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                {item.label}
              </p>
              <p className="riddra-product-number text-[20px] font-semibold text-[#1B3A6B]">{item.value}</p>
              <p className="riddra-product-body text-sm leading-7 text-[rgba(75,85,99,0.84)]">{item.detail}</p>
            </ProductCard>
          ))}
        </div>
      </ProductCard>

        <PublicSurfaceTruthSection
          eyebrow="Tools truth"
          title="Use the tools hub now and step into account features only when you need them"
          description="This route stays useful as a public utility surface first, while saved tools, member continuity, and support follow-through remain clearly signposted."
          authReady="Signed-in continuity is active enough to carry tool usage into saved account and workspace flows."
          authPending="The full tool-to-account handoff still depends on the live sign-in path staying healthy."
          billingReady="Premium tool continuity can move beyond preview framing once membership continuity is fully exercised."
          billingPending="Until then, premium workflow promises stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for tool-driven onboarding and recovery questions."
          supportPending="Support follow-through stays conservative on this route until the live help path is fully exercised."
          href="/pricing"
          hrefLabel="Open pricing"
        />

        <ToolsExplorer />

      <div className="grid gap-6">
        {tools.map((tool) => (
          <Link key={tool.slug} href={`/tools/${tool.slug}`}>
            <ProductCard tone="secondary" className="transition hover:border-[rgba(27,58,107,0.18)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="riddra-product-body flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">
                    <span>{tool.category}</span>
                    <span>{tool.access}</span>
                  </div>
                  <h2 className="riddra-product-body text-2xl font-semibold text-[#1B3A6B]">{tool.title}</h2>
                  <p className="riddra-product-body max-w-3xl text-sm leading-7 text-[rgba(75,85,99,0.84)]">{tool.summary}</p>
                </div>
                <div className="grid min-w-[260px] gap-3">
                  <div className="rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(27,58,107,0.03)]">
                    <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">What it helps with</p>
                    <p className="riddra-product-body mt-2 text-sm font-semibold text-[#1B3A6B]">{tool.outcome}</p>
                  </div>
                  <div className="rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(27,58,107,0.03)]">
                    <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">Typical input</p>
                    <p className="riddra-product-body mt-2 text-sm font-semibold text-[#1B3A6B]">{tool.inputLabel}</p>
                  </div>
                </div>
              </div>
            </ProductCard>
          </Link>
        ))}
      </div>
    </GlobalSidebarPageShell>
  );
}
