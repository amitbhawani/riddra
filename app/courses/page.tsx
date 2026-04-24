import Link from "next/link";
import type { Metadata } from "next";

import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { courseCollections, courses } from "@/lib/courses";
import { educationBundleFamilies, educationLibraryRules, educationTracks } from "@/lib/education-library";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Courses",
  description: "Explore Riddra courses across starter learning, bundled education, and deeper guided study tracks.",
};

export default async function CoursesPage() {
  const publishedCourseSlugs = await getPublishableCmsSlugSet("course");
  const visibleCourses = courses.filter((course) => publishedCourseSlugs.has(course.slug));
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Learning products</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">Courses</h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            Use courses to go deeper than quick articles, with structured lessons that connect naturally to tools, market pages, and guided learning tracks.
          </p>
        </div>

        <SubscriberTruthNotice
          eyebrow="Courses truth"
          title="This courses layer is structurally strong, but deeper learning continuity still depends on launch activation"
          description="Use courses confidently for public learning and guided study, while keeping auth continuity, premium access promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry course usage into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full courses-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium course and bundle language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for users who convert through course flows."
              : "Support delivery is still not fully active, so the courses layer should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 xl:grid-cols-4">
          {courseCollections.map((collection) => (
            <GlowCard key={collection.title}>
              <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                {collection.access}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{collection.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{collection.description}</p>
            </GlowCard>
          ))}
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              {supportRegistry.inProgress} in progress, {supportRegistry.blocked} blocked, and support email currently{" "}
              {config.supportEmail ? "configured" : "not configured yet"}.
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Library tracks</h2>
            <div className="mt-5 grid gap-3">
              {educationTracks.slice(0, 4).map((track) => (
                <div key={track.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{track.audience}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{track.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{track.path}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/66">{track.outcome}</p>
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Bundle families</h2>
            <div className="mt-5 grid gap-3">
              {educationBundleFamilies.map((bundle) => (
                <div key={bundle.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{bundle.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{bundle.includes}</p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Bundle strategy</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Use free and bundle-included courses to make signups feel valuable before upsells begin.",
                "Courses connect naturally into tools, stock pages, IPO pages, mutual-fund pages, and trader workflows.",
                "The education layer should feel like serious investor value, not just another feature list.",
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {point}
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Live and replay path</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Courses can connect into webinar launches, replay pages, and creator-led workshops.",
                "Each course is designed to be reusable in newsletters, onboarding sequences, and bundle promotions.",
                "This makes the education layer a conversion engine, not just a static content library.",
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {point}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Library operating rules</h2>
          <div className="mt-5 grid gap-3">
            {educationLibraryRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {visibleCourses.map((course) => (
            <Link key={course.slug} href={`/courses/${course.slug}`}>
              <GlowCard className="transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-mist/60">
                      <span>{course.category}</span>
                      <span>{course.level}</span>
                      <span>{course.access}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{course.title}</h2>
                    <p className="max-w-3xl text-sm leading-7 text-mist/74">{course.summary}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-mist/68">
                      <span>Audience: <span className="text-white">{course.audience}</span></span>
                      <span>Lessons: <span className="text-white">{course.lessonPlan.length}</span></span>
                      <span>Bundle fit: <span className="text-white">{course.bundleFit}</span></span>
                    </div>
                  </div>
                  <div className="grid min-w-[240px] gap-3">
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Format</p>
                      <p className="mt-2 text-sm font-semibold text-white">{course.format}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Duration</p>
                      <p className="mt-2 text-sm font-semibold text-white">{course.duration}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Value signal</p>
                      <p className="mt-2 text-sm font-semibold text-white">{course.priceAnchor}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Deliverables</p>
                      <p className="mt-2 text-sm font-semibold text-white">{course.deliverables.length} included assets</p>
                    </div>
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
