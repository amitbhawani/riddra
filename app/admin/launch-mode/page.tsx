import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchModeRevisionPanel } from "@/components/launch-mode-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { launchModeItems, launchModeRules, launchModeSummary } from "@/lib/launch-mode-control";
import { getLaunchState } from "@/lib/launch-state";

export const metadata: Metadata = {
  title: "Launch Mode",
  description:
    "Protected launch-mode page for deciding whether the platform should behave like internal review, launch prep, public beta, or full launch.",
};

export default async function AdminLaunchModePage() {
  await requireUser();

  const launchState = getLaunchState();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Mode", href: "/admin/launch-mode" },
            ]}
          />
          <Eyebrow>Release posture</Eyebrow>
          <SectionHeading
            title="Launch mode"
            description="This page keeps the public posture honest by separating internal review, launch prep, limited public beta, and full launch as distinct operator choices."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchState.label}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Configured modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchModeSummary.configuredModes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recommended now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchModeSummary.recommendedNow}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {launchModeItems.map((item) => (
            <GlowCard key={item.mode}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Mode rules</h2>
          <div className="mt-5 grid gap-3">
            {launchModeRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchModeRevisionPanel items={launchModeItems} />
      </Container>
    </div>
  );
}
