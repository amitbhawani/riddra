import type { Metadata } from "next";

import { googleAuthAction, loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthStatusCard } from "@/components/auth-status-card";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { ProductCard } from "@/components/product-page-system";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Eyebrow } from "@/components/ui";
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
    <GlobalSidebarPageShell category="account" className="space-y-3.5 sm:space-y-4" leftClassName="space-y-3.5 sm:space-y-4">
      <ProductCard tone="primary" className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)]">
          <div className="space-y-5 p-4 sm:p-5 lg:p-6">
            <Eyebrow>Member access</Eyebrow>
            <div className="space-y-3">
              <h1 className="riddra-product-display text-[2rem] font-semibold leading-[1.03] tracking-tight text-[#1B3A6B] sm:text-[2.5rem]">
                Log in and continue your market workflow.
              </h1>
              <p className="riddra-product-body max-w-2xl text-[15px] leading-8 text-[rgba(75,85,99,0.84)]">
                Use Google for the fastest path or request a secure email link. Once you’re in, Riddra can take you into account setup, alerts, watchlists, and portfolio workflows without forcing a password-first flow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Access tools
                </p>
                <p className="riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Watchlists</p>
                <p className="riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Save pages, track names, and keep your working shortlist in one place.
                </p>
              </div>
              <div className="rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Workspace
                </p>
                <p className="riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Portfolio</p>
                <p className="riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Move straight into portfolio tools and account setup without a heavy onboarding wall.
                </p>
              </div>
              <div className="rounded-[10px] border border-[rgba(212,133,59,0.24)] bg-[linear-gradient(180deg,rgba(212,133,59,0.08),rgba(255,255,255,0.96))] px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.03)] sm:col-span-2 xl:col-span-1">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#8E5723]">Support</p>
                <p className="riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">
                  {supportRegistry.total} records
                </p>
                <p className="riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  {supportRegistry.inProgress} in progress, {supportRegistry.blocked} needing attention, and feedback inbox currently{" "}
                  {config.feedbackInbox ? "configured" : "not configured yet"}.
                </p>
              </div>
            </div>

            {supportEmail ? (
              <p className="riddra-product-body text-[13px] text-[rgba(75,85,99,0.82)]">
                Need help accessing your account? Reach us at{" "}
                <span className="font-medium text-[#1B3A6B]">{supportEmail}</span>.
              </p>
            ) : null}
          </div>

          <div className="border-t border-[rgba(221,215,207,0.86)] bg-[linear-gradient(180deg,rgba(27,58,107,0.03),rgba(255,255,255,0.98))] p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6">
            <AuthForm
              action={loginAction}
              description="Use Google for the fastest path, or continue with a secure email link if you prefer not to connect Google."
              emailHelperText="A secure login link is emailed to you. No password is required in the current access flow."
              googleAction={googleAuthAction}
              queryError={queryError}
              submitLabel="Send email login link"
              title="Log in to Riddra"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Create account</ButtonLink>
              <ButtonLink href="/pricing" tone="secondary">
                View plans
              </ButtonLink>
              <ButtonLink href="/get-started" tone="secondary">
                Get started
              </ButtonLink>
            </div>
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
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
        <AuthStatusCard />
      </div>
    </GlobalSidebarPageShell>
  );
}
