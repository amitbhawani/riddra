import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAuthActivationItems } from "@/lib/auth-activation";

export const metadata: Metadata = {
  title: "Auth Activation",
  description: "Protected auth-activation page for Google login, email links, callback URLs, and testing.",
};

export default async function AuthActivationPage() {
  await requireUser();

  const { callbackUrl, items } = getAuthActivationItems();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
  }));
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Auth Activation", href: "/admin/auth-activation" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 auth</Eyebrow>
          <SectionHeading
            title="Auth activation"
            description="This page keeps Google login, email-link auth, callback configuration, and end-to-end auth testing in one operational view."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Callback target</h2>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
            Use this callback URL in Google and Supabase auth configuration:
            <div className="mt-3 text-white">{callbackUrl}</div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Auth checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="auth activation check"
              panelTitle="Write-through auth action"
              panelDescription="Log auth-activation changes into the shared revision lane so callback and provider work stop living only as a static readiness checklist."
              defaultRouteTarget="/admin/auth-activation"
              defaultOperator="Auth Activation Operator"
              defaultChangedFields="auth_provider, callback_path, activation_state"
              actionNoun="auth-activation mutation"
            />
          </div>
          <div className="mt-5 grid gap-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
