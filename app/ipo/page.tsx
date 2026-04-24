import type { Metadata } from "next";
import Link from "next/link";

import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getIpos } from "@/lib/content";

export const metadata: Metadata = {
  title: "IPO Hub",
  description: "Riddra IPO hub for upcoming offers, lifecycle pages, and issue tracking.",
};

export default async function IpoIndexPage() {
  const ipos = await getIpos();
  const mainboardCount = ipos.filter((ipo) => !ipo.ipoType.toLowerCase().includes("sme")).length;
  const smeCount = ipos.filter((ipo) => ipo.ipoType.toLowerCase().includes("sme")).length;
  const upcomingCount = ipos.filter((ipo) => ipo.status.toLowerCase().includes("upcoming")).length;
  const hubCards = [
    "Track upcoming IPOs, SME IPOs, GMP, subscription trends, allotment updates, and listing-day coverage from one hub.",
    "Each IPO page brings together issue details, company context, strengths, risks, and official-document links in one decision-focused view.",
    "After listing, the IPO page remains the event-history archive while the long-term company destination shifts to the stock route.",
  ];

  if (ipos.length === 0) {
    return (
      <div className="py-16 sm:py-24">
        <Container className="space-y-10">
          <div className="space-y-5">
            <Eyebrow>Traffic engine</Eyebrow>
            <SectionHeading
              title="IPO hub"
              description="Browse upcoming issues, GMP coverage, allotment updates, and listing-day tracking from one organized IPO hub."
            />
          </div>
          <PublicSurfaceTruthSection
            eyebrow="IPO route truth"
            title="This IPO hub is waiting for verified issue coverage"
            description="The hub no longer falls back to sample IPO coverage for the public market layer. Real tracked issue records must exist before routes appear here."
            authReady="Signed-in continuity is active enough to carry IPO discovery into account and workspace flows."
            authPending="Local preview auth still limits how trustworthy the full IPO-to-account handoff can be."
            billingReady="Billing core credentials exist, so premium IPO workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
            billingPending="Billing credentials are still incomplete, so premium IPO promises should stay expectation-setting."
            supportReady="Support delivery is configured enough to begin testing real follow-up for public IPO users who convert."
            supportPending="Support delivery is still not fully active, so IPO routes should keep support expectations conservative."
            href="/launch-readiness"
            hrefLabel="Open launch readiness"
          />
          <MarketDataUnavailableState
            eyebrow="IPO hub availability"
            title="No public IPO routes are ready yet"
            description="This hub now refuses to populate itself from seeded issue coverage when verified IPO records are unavailable."
            items={[
              "Load real IPO route records before the hub exposes issue pages to public users.",
              "GMP, subscription, and listing fields then stay conservative until verified issue detail is attached.",
            ]}
            href="/admin/deployment-readiness"
            hrefLabel="Open deployment readiness"
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Traffic engine</Eyebrow>
          <SectionHeading
            title="IPO hub"
            description="Browse upcoming issues, GMP coverage, allotment updates, and listing-day tracking from one organized IPO hub."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="IPO route truth"
          title="This IPO hub is strong for discovery, but deeper continuity still depends on launch activation"
          description="Use the IPO hub confidently for public discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry IPO discovery into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full IPO-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium IPO workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium IPO promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for public IPO users who convert."
          supportPending="Support delivery is still not fully active, so IPO routes should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {hubCards.map((item) => (
            <GlowCard key={item}>
              <p className="text-sm leading-7 text-mist/76">{item}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/66">Total tracked IPOs</p>
            <p className="mt-3 text-3xl font-semibold text-white">{ipos.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/66">Mainboard IPOs</p>
            <p className="mt-3 text-3xl font-semibold text-white">{mainboardCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/66">SME IPOs</p>
            <p className="mt-3 text-3xl font-semibold text-white">{smeCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/66">Upcoming issues</p>
            <p className="mt-3 text-3xl font-semibold text-white">{upcomingCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Link href="/ipo/sme">
            <GlowCard className="h-full transition hover:border-aurora/50">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Specialized hub</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Explore SME IPOs</h2>
              <p className="mt-3 text-sm leading-7 text-mist/76">
                Separate SME issues from mainboard IPOs so the user journey, lot-size framing, and risk discussion stay cleaner.
              </p>
            </GlowCard>
          </Link>
          <GlowCard>
            <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Lifecycle reminder</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">One company, one long-term route</h2>
            <p className="mt-3 text-sm leading-7 text-mist/76">
              IPO pages remain event-history archives after listing, while the long-term company destination shifts into the listed-stock route family.
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {ipos.map((ipo) => (
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
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Issue size</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.issueSize}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Open date</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.openDate}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Listing date</p>
                    <p className="mt-2 text-sm font-semibold text-white">{ipo.listingDate}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["GMP", "Allotment", "Listing", "Archive"].map((tag) => (
                    <div key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-mist/70">
                      {tag}
                    </div>
                  ))}
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
