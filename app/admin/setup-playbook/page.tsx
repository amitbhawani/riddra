import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { setupPlaybookSteps } from "@/lib/setup-playbook";

export const metadata: Metadata = {
  title: "Setup Playbook",
  description: "Protected setup playbook for Supabase, auth activation, migrations, seeds, and launch verification.",
};

export default async function SetupPlaybookPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Setup Playbook", href: "/admin/setup-playbook" },
  ];
  const readinessItems = setupPlaybookSteps.map((group) => ({
    label: group.title,
    status:
      group.title === "Connect Supabase environment"
        ? "Required"
        : group.title === "Enable auth providers"
          ? "Required"
          : group.title === "Run database setup"
            ? "Needs activation"
            : "Needs verification",
    detail: group.steps.join(" · "),
    routeTarget:
      group.title === "Connect Supabase environment"
        ? "/admin/system-status"
        : group.title === "Enable auth providers"
          ? "/admin/auth-activation"
          : group.title === "Run database setup"
            ? "/admin/db-activation"
            : "/admin/launch-control",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 activation</Eyebrow>
          <SectionHeading
            title="Setup playbook"
            description="This is the exact order to activate Supabase, auth providers, migrations, seeds, and launch verification once credentials are available."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="setup playbook step"
              panelTitle="Write-through setup-playbook action"
              panelDescription="Log activation-step changes into the shared revision lane so the setup playbook stops living only as a one-way credential checklist."
              defaultRouteTarget="/admin/setup-playbook"
              defaultOperator="Setup Playbook Operator"
              defaultChangedFields="activation_step, dependency_state, launch_verification"
              actionNoun="setup-playbook mutation"
            />
          </GlowCard>
          {setupPlaybookSteps.map((group) => (
            <GlowCard key={group.title}>
              <h2 className="text-2xl font-semibold text-white">{group.title}</h2>
              <div className="mt-5 grid gap-3">
                {group.steps.map((step) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {step}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
