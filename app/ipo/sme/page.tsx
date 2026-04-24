import type { Metadata } from "next";
import Link from "next/link";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getIpos } from "@/lib/content";

export const metadata: Metadata = {
  title: "SME IPO Hub",
  description: "Riddra SME IPO hub for higher-lot-size issues, GMP, allotment, and listing tracking.",
};

export default async function SmeIpoIndexPage() {
  const ipos = await getIpos();
  const smeIpos = ipos.filter((ipo) => ipo.ipoType.toLowerCase().includes("sme"));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>IPO lifecycle</Eyebrow>
          <SectionHeading
            title="SME IPO hub"
            description="Review SME IPOs with stronger emphasis on lot size, capital commitment, liquidity risk, GMP, and listing behavior."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="SME IPO truth"
          title="This SME IPO hub is useful for public issue discovery right now, but supported continuity still depends on launch activation"
          description="Use this hub confidently for SME issue research, while keeping signed-in continuity, support follow-through, and premium workflow promises honest until the live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry SME IPO discovery into account and workspace surfaces."
          authPending="Local preview auth still limits how trustworthy the full SME IPO-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium SME IPO workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium SME IPO promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for SME IPO users who need help after discovery."
          supportPending="Support delivery is still not fully active, so SME IPO support expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            "SME IPO pages highlight lot size and minimum capital requirement much more clearly.",
            "The same company can still move from SME IPO mode into the listed-stock system once listing is complete.",
            "This hub keeps SME and mainboard investor journeys separate so risk and capital context stay clearer.",
          ].map((item) => (
            <GlowCard key={item}>
              <p className="text-sm leading-7 text-mist/76">{item}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {smeIpos.map((ipo) => (
            <Link key={ipo.slug} href={`/ipo/${ipo.slug}`}>
              <GlowCard className="h-full transition hover:border-aurora/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{ipo.name}</h2>
                    <p className="mt-2 text-sm text-mist/68">{ipo.status} • {ipo.ipoType}</p>
                  </div>
                  <div className="rounded-full bg-flare/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-flare">
                    {ipo.gmp}
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-mist/74">{ipo.summary}</p>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Price band</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.priceBand}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Lot size</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.lotSize}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Min investment</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.minInvestment}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Listing date</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.listingDate}</p>
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
