import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { UserPortfolioImportClient } from "@/components/user-portfolio-import-client";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPortfolioImportTemplate } from "@/lib/portfolio-imports";
import { getUserPortfolioHoldings } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Import Portfolio",
  description: "Upload a CSV, preview the rows, and import valid holdings into your portfolio.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioImportPage() {
  const user = await requireUser();
  const [holdings, template] = await Promise.all([
    getUserPortfolioHoldings(user),
    Promise.resolve(getPortfolioImportTemplate()),
  ]);

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Portfolio", href: "/portfolio" },
              { name: "Import", href: "/portfolio/import" },
            ]}
          />
          <Eyebrow>Portfolio import</Eyebrow>
          <SectionHeading
            title="Import your portfolio"
            description="Upload a CSV, review the rows, and add valid holdings without entering each one manually."
          />
        </div>

        <div className="space-y-6">
            <GlowCard className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[26px]">
                    Guided portfolio upload
                  </h2>
                  <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    Bring in your holdings from a simple CSV, check the rows first, then import only the valid matches into your portfolio workspace.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/portfolio" className="text-sm font-medium text-[#1B3A6B] underline">
                    Back to portfolio
                  </Link>
                  <Link href="/account" className="text-sm font-medium text-[#1B3A6B] underline">
                    Open account
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white/80 p-4">
                  <p className="text-sm text-[rgba(75,85,99,0.84)]">Current holdings</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{holdings.length}</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                    Your existing positions stay visible after the import finishes.
                  </p>
                </div>
                <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white/80 p-4">
                  <p className="text-sm text-[rgba(75,85,99,0.84)]">CSV format</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">Simple</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                    Stock slug or symbol, quantity, buy price, and an optional buy date.
                  </p>
                </div>
                <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white/80 p-4">
                  <p className="text-sm text-[rgba(75,85,99,0.84)]">Best next step</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">Check first</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                    Always check the file once so symbol, quantity, and price issues are caught before import.
                  </p>
                </div>
              </div>
            </GlowCard>

            <UserPortfolioImportClient template={template} />
        </div>
      </Container>
    </div>
  );
}
