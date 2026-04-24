import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWebinarBySlug, webinars } from "@/lib/webinars";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const publishedWebinarSlugs = await getPublishableCmsSlugSet("webinar");
  return webinars
    .filter((item) => publishedWebinarSlugs.has(item.slug))
    .map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("webinar", slug);
  const webinar = publishableRecord ? getWebinarBySlug(publishableRecord.canonicalSlug) : null;

  if (!webinar) {
    return { title: "Webinar registration not found" };
  }

  return {
    title: `${webinar.title} registration`,
    description: `Registration path for ${webinar.title}.`,
  };
}

export default async function WebinarRegisterPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("webinar", slug);
  const webinar = publishableRecord ? getWebinarBySlug(publishableRecord.canonicalSlug) : null;

  if (!webinar) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Webinars", href: "/webinars" },
    { name: webinar.title, href: `/webinars/${webinar.slug}` },
    { name: "Register", href: `/webinars/${webinar.slug}/register` },
  ];
  const publishedWebinarSlugs = await getPublishableCmsSlugSet("webinar");
  const siblingWebinars = webinars
    .filter((item) => item.slug !== webinar.slug && publishedWebinarSlugs.has(item.slug))
    .slice(0, 2);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Registration route</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            {webinar.title} registration
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This route turns the webinar into a real funnel stage with access framing, pre-session expectations,
            and follow-up handoffs instead of stopping at a summary card.
          </p>
        </div>

        <SubscriberTruthNotice
          eyebrow="Registration truth"
          title="This registration route is useful for public funneling right now, but saved continuity still depends on launch activation"
          description={`Use ${webinar.title} registration confidently for public funneling, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity ? "Signed-in continuity is active enough to carry registration flows into account and workspace surfaces." : "Local preview auth still limits how trustworthy the full registration-to-account handoff can be.",
            truth.hasBillingCore ? "Billing core credentials exist, so premium registration workflow language can move beyond pure preview framing once checkout and webhook flows are exercised." : "Billing credentials are still incomplete, so premium registration promises should stay expectation-setting.",
            truth.hasSupportDelivery ? "Support delivery is configured enough to begin testing real follow-up for registrants who need help before session start." : "Support delivery is still not fully active, so registration-route support expectations should stay conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard><p className="text-sm text-mist/68">Support registry rows</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">In progress</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">Blocked</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">Support continuity</p><p className="mt-2 text-base font-semibold text-white">{config.supportEmail || config.billingSupportEmail || "Not configured yet"}</p></GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {[
            { label: "Registration mode", value: webinar.registrationMode },
            { label: "Access", value: webinar.access },
            { label: "Next session", value: webinar.nextSession },
            { label: "Host", value: webinar.host },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Registration flow</h2>
            <div className="mt-5 grid gap-3">
              {webinar.registrationSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-mist/76">{step}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Pre-session pack</h2>
            <div className="mt-5 grid gap-3">
              {webinar.assets.map((asset) => (
                <div key={asset} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {asset}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              This is still a route-backed registration flow, not a live booking engine yet. The point is to make the
              education funnel explicit and reviewable before true RSVP persistence is activated.
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">After signup</h2>
            <div className="mt-5 grid gap-3">
              {webinar.followUpRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{route.label}</span>
                  <span className="mt-2 block text-mist/70">{route.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Other webinar routes</h2>
            <div className="mt-5 grid gap-3">
              <Link
                href={`/webinars/${webinar.slug}`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Open webinar detail</span>
                <span className="mt-2 block text-mist/70">Session overview, agenda, and companion routes.</span>
              </Link>
              <Link
                href={`/webinars/${webinar.slug}/replay`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Open replay route</span>
                <span className="mt-2 block text-mist/70">{webinar.replayPlan}</span>
              </Link>
              {siblingWebinars.map((item) => (
                <Link
                  key={item.slug}
                  href={`/webinars/${item.slug}/register`}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.title} registration</span>
                  <span className="mt-2 block text-mist/70">{item.registrationMode}</span>
                </Link>
              ))}
            </div>
          </GlowCard>
        </div>
      </Container>
    </div>
  );
}
