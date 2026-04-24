import type { Metadata } from "next";

import { googleAuthAction, signupAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthStatusCard } from "@/components/auth-status-card";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";
import { getConfiguredSupportEmail, getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Riddra account with Google or email verification.",
};

export default function SignupPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();

  return (
    <div className="py-16 sm:py-24">
      <Container className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Eyebrow>Early access setup</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Create your account and start shaping your workspace.
          </h1>
          <p className="max-w-xl text-base leading-8 text-mist/76">
            Start with Google or a verification link, then move into account setup, saved workflows, alerts, and portfolio tools. The signup flow stays light so users can reach value before a long onboarding wall appears.
          </p>
          {supportEmail ? (
            <p className="text-sm text-mist/64">
              Questions before signup? Reach us at <span className="text-white">{supportEmail}</span>.
            </p>
          ) : null}
          <PublicSurfaceTruthSection
            eyebrow="Signup truth"
            title="This signup path is live, but the full subscriber handoff still depends on launch activation"
            description="The auth surface is ready to use, but plan enforcement, support recovery, and full account continuity still need honest framing until all live activation work is complete."
            authReady="Signed-in continuity is active enough to move users into account setup after signup."
            authPending="Local preview auth still limits how trustworthy the full signup-to-account handoff can be."
            billingReady="Billing core credentials exist, so paid-plan continuity can move beyond pure preview framing once checkout is exercised."
            billingPending="Billing credentials are still incomplete, so paid-plan access should stay expectation-setting after signup."
            supportReady="Support delivery is configured enough to backstop signup or onboarding issues with real follow-up."
            supportPending={`Support delivery is still not fully active, so users should rely on ${supportEmail || "the visible support channel"} as a conservative fallback rather than expecting a hardened helpdesk.`}
            href="/account/setup"
            hrefLabel="Open account setup"
            stats={[
              {
                label: "Support continuity",
                value: `${supportRegistry.total} rows`,
                detail: `${supportRegistry.inProgress} in progress, ${supportRegistry.blocked} blocked, and feedback inbox currently ${config.feedbackInbox ? "configured" : "not configured yet"}.`,
              },
            ]}
          />
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <AuthForm
              action={signupAction}
              description="Use Google for the fastest signup path, or continue with email verification if that feels better."
              emailHelperText="A verification link is emailed to finish signup and move you into account setup."
              googleAction={googleAuthAction}
              includeName
              submitLabel="Send verification link"
              title="Sign up for Riddra"
            />
            <div className="mt-6 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
              After signup, you move into account setup to choose your alerts, workspace starting point, and portfolio workflow.
            </div>
            <div className="mt-6 flex gap-3">
              <ButtonLink href="/get-started">Get started</ButtonLink>
              <ButtonLink href="/pricing">Choose plan</ButtonLink>
              <ButtonLink href="/login" tone="secondary">
                I already have an account
              </ButtonLink>
            </div>
          </GlowCard>
          <AuthStatusCard />
        </div>
      </Container>
    </div>
  );
}
