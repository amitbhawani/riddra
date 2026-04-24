import type { Metadata } from "next";

import { googleAuthAction, loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthStatusCard } from "@/components/auth-status-card";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";
import { getConfiguredSupportEmail, getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Riddra with Google or a secure email link.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const queryError = resolvedSearchParams.error?.trim();
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();

  return (
    <div className="py-16 sm:py-24">
      <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-6">
          <Eyebrow>Member access</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Log in and continue your market workflow.
          </h1>
          <p className="max-w-xl text-base leading-8 text-mist/76">
            Use Google for the fastest path or request a secure email link. Once you’re in, Riddra can take you into account setup, alerts, watchlists, and portfolio workflows without forcing a password-first flow.
          </p>
          {supportEmail ? (
            <p className="text-sm text-mist/64">
              Need help accessing your account? Reach us at <span className="text-white">{supportEmail}</span>.
            </p>
          ) : null}
          <PublicSurfaceTruthSection
            eyebrow="Login truth"
            title="This login path is live, but full member continuity still depends on launch activation"
            description="The auth surface is ready to use, while billing-linked access, support recovery, and provider callback verification still need honest framing until all live activation work is complete."
            authReady="Signed-in continuity is active enough to move members into workspace and account flows after login."
            authPending="Local preview auth still limits how trustworthy the full login-to-workspace handoff can be."
            billingReady="Billing core credentials exist, so plan-linked access can move beyond pure preview framing once checkout and webhook flows are exercised."
            billingPending="Billing credentials are still incomplete, so plan-linked continuity should stay expectation-setting after login."
            supportReady="Support delivery is configured enough to backstop access and recovery issues with real follow-up."
            supportPending={`Support delivery is still not fully active, so access help should rely on ${supportEmail || "the visible support channel"} as a conservative fallback.`}
            href="/account/support"
            hrefLabel="Open account support"
            stats={[
              {
                label: "Access continuity",
                value: `${supportRegistry.total} support rows`,
                detail: `${supportRegistry.inProgress} in progress, ${supportRegistry.blocked} blocked, and feedback inbox currently ${config.feedbackInbox ? "configured" : "not configured yet"}.`,
              },
            ]}
          />
        </div>

        <div className="grid gap-6">
          <GlowCard className="max-w-xl">
            <AuthForm
              action={loginAction}
              description="Use Google for the fastest path, or continue with a secure email link if you prefer not to connect Google."
              emailHelperText="A secure login link is emailed to you. No password is required in the current launch flow."
              googleAction={googleAuthAction}
              queryError={queryError}
              submitLabel="Send email login link"
              title="Log in to Riddra"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/get-started">Get started</ButtonLink>
              <ButtonLink href="/signup">Create account</ButtonLink>
              <ButtonLink href="/pricing" tone="secondary">
                View plans
              </ButtonLink>
            </div>
          </GlowCard>
          <AuthStatusCard />
        </div>
      </Container>
    </div>
  );
}
