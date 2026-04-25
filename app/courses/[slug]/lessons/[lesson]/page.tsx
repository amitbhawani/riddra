import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard } from "@/components/ui";
import { getCourseLessonBySlug, getCourseLessonRoutes } from "@/lib/courses";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

type PageProps = {
  params: Promise<{ slug: string; lesson: string }>;
};

export async function generateStaticParams() {
  const publishedCourseSlugs = await getPublishableCmsSlugSet("course");
  return getCourseLessonRoutes()
    .filter((item) => publishedCourseSlugs.has(item.courseSlug))
    .map((item) => ({
      slug: item.courseSlug,
      lesson: item.lessonSlug,
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lesson } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("course", slug);
  const payload = publishableRecord
    ? getCourseLessonBySlug(publishableRecord.canonicalSlug, lesson)
    : null;

  if (!payload) {
    return { title: "Lesson not found" };
  }

  return {
    title: `${payload.lesson.title} · ${payload.course.title}`,
    description: payload.lesson.outcome,
  };
}

export default async function CourseLessonPage({ params }: PageProps) {
  const { slug, lesson } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("course", slug);
  const payload = publishableRecord
    ? getCourseLessonBySlug(publishableRecord.canonicalSlug, lesson)
    : null;

  if (!payload) {
    notFound();
  }

  const { course, lesson: activeLesson, lessons } = payload;
  const lessonIndex = lessons.findIndex((item) => item.slug === activeLesson.slug);
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Courses", href: "/courses" },
    { name: course.title, href: `/courses/${course.slug}` },
    { name: activeLesson.title, href: activeLesson.href },
  ];

  return (
    <GlobalSidebarPageShell category="courses" leftClassName="riddra-legacy-light-surface space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>
            Lesson {activeLesson.lessonNumber} of {lessons.length}
          </Eyebrow>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {activeLesson.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-mist/76">{activeLesson.outcome}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-mist/68">
                This lesson is part of <span className="text-white">{course.title}</span> and turns the course plan into a real route with practical context, companion surfaces, and a guided next step.
              </p>
            </div>
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Back to course
            </Link>
          </div>
        </div>

        <SubscriberTruthNotice
          eyebrow="Lesson-route truth"
          title="This lesson route is useful for guided progress right now, but saved continuity still depends on launch activation"
          description={`Use ${activeLesson.title} confidently for public learning, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry lesson usage into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full lesson-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium lesson workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium lesson promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for learners who convert from lessons into assisted workflows."
              : "Support delivery is still not fully active, so lesson-route support expectations should stay conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Support registry rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
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
            { label: "Format", value: activeLesson.format },
            { label: "Duration", value: activeLesson.duration },
            { label: "Course level", value: course.level },
            { label: "Access", value: course.access },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What to prepare before this lesson</h2>
            <div className="mt-5 grid gap-3">
              {course.prerequisites.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What this lesson unlocks</h2>
            <div className="mt-5 grid gap-3">
              {[activeLesson.outcome, ...course.outcomes].slice(0, 4).map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Practice surfaces</h2>
            <div className="mt-5 grid gap-3">
              {course.relatedRoutes.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="mt-2 block text-mist/68">{item.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Included support assets</h2>
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
          <h2 className="text-2xl font-semibold text-white">Lesson path</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lessons.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className={`rounded-2xl border px-4 py-4 text-sm leading-7 transition ${
                  item.slug === activeLesson.slug
                    ? "border-aurora/40 bg-aurora/10 text-white"
                    : "border-white/8 bg-black/15 text-mist/76 hover:border-white/18 hover:bg-white/[0.04]"
                }`}
              >
                <span className="block text-xs uppercase tracking-[0.16em] text-mist/58">
                  Lesson {item.lessonNumber}
                </span>
                <span className="mt-2 block font-semibold text-white">{item.title}</span>
                <span className="mt-2 block text-mist/68">
                  {item.format} · {item.duration}
                </span>
              </Link>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Next best move</h2>
            <div className="mt-5 grid gap-3">
              {nextLesson ? (
                <Link
                  href={nextLesson.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">Continue to lesson {nextLesson.lessonNumber}</span>
                  <span className="mt-2 block text-mist/68">{nextLesson.title}</span>
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.slug}`}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">Return to the full course</span>
                  <span className="mt-2 block text-mist/68">Use the course page to revisit modules, deliverables, and companion routes.</span>
                </Link>
              )}
              {previousLesson ? (
                <Link
                  href={previousLesson.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">Revisit lesson {previousLesson.lessonNumber}</span>
                  <span className="mt-2 block text-mist/68">{previousLesson.title}</span>
                </Link>
              ) : null}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Lesson operating note</h2>
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              The education layer now has real lesson destinations instead of stopping at course-level summaries. The remaining work is progress persistence, media embeds, replay assets, and bundle-aware access control, but this route already gives users a concrete lesson-by-lesson reading path.
            </div>
          </GlowCard>
        </div>
    </GlobalSidebarPageShell>
  );
}
