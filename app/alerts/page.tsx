import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { alertCategories, alertFeedItems } from "@/lib/alerts";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Review alert categories, notification flows, and the handoff into your account-level preferences.",
};

export default async function AlertsPage() {
  const placeholderTruth = getPlaceholderHonestyRowByHref("/alerts");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Alerts", href: "/alerts" },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Alerts",
          description:
            "Review alert categories, notification flows, and the handoff into your account-level preferences.",
          path: "/alerts",
        })}
      />
      <GlobalSidebarPageShell category="account" leftClassName="riddra-legacy-light-surface space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Retention layer</Eyebrow>
          <SectionHeading
            title="Alerts and notification center"
            description="See how Riddra surfaces portfolio changes, IPO milestones, market signals, and learning reminders without turning notifications into noise."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Alert truth"
          title="This public alerts route is a delivery preview, not a live personal feed"
          description="This page should explain alert categories and delivery intent clearly, but the feed below is still a preview layer. Durable per-user alert memory, WhatsApp or SMS delivery, and verified urgency routing still belong to the signed-in workspace once those channels are truly active."
          items={[
            "Use this route as a launch-safe explanation of Riddra's alert model, not as evidence of live personal alert history.",
            "The signed-in account preferences route remains the correct place for subscriber channel controls and later delivery-backed alert continuity.",
          ]}
          currentState={placeholderTruth?.currentState}
          expectedState={placeholderTruth?.expectedState}
          href="/account/alerts"
          hrefLabel="Open alert preferences"
          secondaryHref="/admin/public-launch-qa"
          secondaryHrefLabel="Open placeholder honesty"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Core principle</p>
            <p className="mt-2 text-3xl font-semibold text-white">Useful first</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              Alerts help you act faster, not just return to the app for vanity engagement.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Delivery model</p>
            <p className="mt-2 text-3xl font-semibold text-white">In-app to multi-channel</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              Start with inbox and email, then expand to WhatsApp, SMS, or mobile alerts only where the signal quality is strong.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Subscriber value</p>
            <p className="mt-2 text-3xl font-semibold text-white">Daily habit engine</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              Good alerts can turn Riddra into a repeat-use workspace even before every premium workflow is live.
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Alert categories</h2>
            <div className="mt-5 grid gap-4">
              {alertCategories.map((category) => (
                <div key={category.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{category.title}</h3>
                    <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {category.audience}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{category.summary}</p>
                  <p className="mt-4 text-sm leading-7 text-sky">Delivery: {category.delivery}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Next action</h2>
            <p className="mt-4 text-sm leading-7 text-mist/74">
              Use the account-level preferences page to decide how often Riddra can reach you and which signals deserve immediate delivery.
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/account/alerts"
                className="rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open alert preferences
              </Link>
              <Link
                href="/portfolio/import"
                className="rounded-[22px] border border-white/10 bg-black/15 px-5 py-4 text-sm font-medium text-mist/82 transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                See portfolio import review
              </Link>
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Preview alert examples</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            These cards illustrate the kinds of signals Riddra can route. They are not durable user-specific alert history yet.
          </p>
          <div className="mt-5 grid gap-4">
            {alertFeedItems.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">Preview example</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.status}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-mist/66">
                  {item.timestamp} · {item.channel}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>
      </GlobalSidebarPageShell>
    </>
  );
}
