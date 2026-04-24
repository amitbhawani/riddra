import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { GlowCard } from "@/components/ui";
import { courses, getCourseBySlug, getCourseLessonEntries } from "@/lib/courses";
import { educationTracks } from "@/lib/education-library";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const publishedCourseSlugs = await getPublishableCmsSlugSet("course");
  return courses
    .filter((course) => publishedCourseSlugs.has(course.slug))
    .map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("course", slug);
  const course = publishableRecord ? getCourseBySlug(publishableRecord.canonicalSlug) : null;

  if (!course) {
    return { title: "Course not found" };
  }

  return {
    title: course.title,
    description: course.summary,
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sidebar = await getGlobalSidebarRail("courses");
  const publishableRecord = await getPublishableCmsRecordBySlug("course", slug);
  const course = publishableRecord ? getCourseBySlug(publishableRecord.canonicalSlug) : null;

  if (!course) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Courses", href: "/courses" },
    { name: course.title, href: `/courses/${course.slug}` },
  ];
  const lessonEntries = getCourseLessonEntries(course);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const relatedTrack =
    educationTracks.find((track) =>
      track.path.toLowerCase().includes(course.category.split(" ")[0].toLowerCase()) ||
      track.outcome.toLowerCase().includes(course.level.toLowerCase()),
    ) ?? educationTracks[0];

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="riddra-legacy-light-surface space-y-6">
              <ProductBreadcrumbs items={breadcrumbs.map((item) => ({ label: item.name, href: item.href }))} />
              <ProductCard tone="primary" className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
              {course.category}
            </p>
            <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[36px]">
              {course.title}
            </h1>
            <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.88)] sm:text-[15px]">
              {course.summary}
            </p>
          </div>
          {lessonEntries[0] ? (
            <Link
              href={lessonEntries[0].href}
              className="inline-flex w-fit rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
            >
              Start lesson 1
            </Link>
          ) : null}
              </ProductCard>

        <SubscriberTruthNotice
          eyebrow="Course detail truth"
          title="This course route is useful for guided learning right now, but saved continuity still depends on launch activation"
          description={`Use ${course.title} confidently for public learning, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry course usage into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full course-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium education workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium course promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for learners who convert into assisted workflows."
              : "Support delivery is still not fully active, so course-route support expectations should stay conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Support records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs attention</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-base font-semibold text-white">
              {config.supportEmail || config.billingSupportEmail || "Not configured yet"}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {[
            { label: "Access", value: course.access },
            { label: "Level", value: course.level },
            { label: "Duration", value: course.duration },
            { label: "Instructor", value: course.instructor },
            { label: "Audience", value: course.audience },
            { label: "Bundle fit", value: course.bundleFit },
            { label: "Lessons", value: `${course.lessonPlan.length} structured lessons` },
            { label: "Deliverables", value: `${course.deliverables.length} support assets` },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What you get from this course</h2>
            <div className="mt-5 grid gap-3">
              {course.outcomes.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Lesson plan</h2>
            <div className="mt-5 grid gap-3">
              {lessonEntries.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
                      {item.lessonNumber}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-mist/58">
                        <span>{item.format}</span>
                        <span>{item.duration}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-sm leading-7 text-mist/74">{item.outcome}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-aurora">Open lesson route</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/72">
              This page now maps course depth into structured lesson blocks, support assets, route handoffs, and dedicated lesson routes instead of only naming modules at a high level.
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Prerequisites</h2>
            <div className="mt-5 grid gap-3">
              {course.prerequisites.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Included deliverables</h2>
            <div className="mt-5 grid gap-3">
              {course.deliverables.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Module flow</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {course.modules.map((item, index) => (
              <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm text-mist/76">{item}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Where this fits in the library</h2>
            <p className="mt-4 text-sm leading-7 text-mist/74">{relatedTrack.path}</p>
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Intended audience</p>
              <p className="mt-2 text-sm font-semibold text-white">{relatedTrack.audience}</p>
            </div>
            <div className="mt-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Library outcome</p>
              <p className="mt-2 text-sm leading-7 text-mist/76">{relatedTrack.outcome}</p>
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Companion routes</h2>
            <div className="mt-5 grid gap-3">
              {course.relatedRoutes.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="mt-2 block text-mist/70">{item.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Follow-through surfaces</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Use the matching learn track to recap concepts in plain language.",
                "Route course graduates into the right product surface: charts, stock pages, IPO pages, or wealth pages.",
                "Turn high-intent learners into webinar attendees, newsletter readers, or mentorship prospects.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Course operating note</h2>
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              The course layer now carries real lesson blocks, prerequisites, deliverables, and route handoffs. The remaining work is deeper lesson payloads, progress persistence, replay assets, and bundle-linked access control.
            </div>
          </GlowCard>
        </div>
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
