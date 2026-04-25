import type { Metadata } from "next";

import { googleAuthAction, signupAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthStatusCard } from "@/components/auth-status-card";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { ProductCard } from "@/components/product-page-system";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { getConfiguredSupportEmail } from "@/lib/runtime-launch-config";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Riddra account with Google or email verification.",
};

export default async function SignupPage() {
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();

  return (
    <GlobalSidebarPageShell
      category="account"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface riddra-auth-shell space-y-3.5 sm:space-y-4"
    >
      <ProductCard tone="primary" className="riddra-auth-hero-card overflow-hidden p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5 p-4 sm:p-5 lg:p-6">
            <Eyebrow>Early access setup</Eyebrow>
            <div className="space-y-3">
              <h1 className="riddra-auth-title riddra-product-display text-[2rem] font-semibold leading-[1.03] tracking-tight text-[#1B3A6B] sm:text-[2.5rem]">
                Create your account and start shaping your workspace.
              </h1>
              <p className="riddra-auth-copy riddra-product-body max-w-2xl text-[15px] leading-8 text-[rgba(75,85,99,0.84)]">
                Start with Google or a verification link, then move into account setup, saved workflows, alerts, and portfolio tools. The signup flow stays light so users can reach value before a long onboarding wall appears.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="riddra-auth-mini-card rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Start point
                </p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Account setup</p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Move into setup, alerts, and saved tools without a heavy onboarding sequence.
                </p>
              </div>
              <div className="riddra-auth-mini-card rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Member workflow
                </p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Saved context</p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Keep continuity across watchlists, portfolio tools, and account preferences.
                </p>
              </div>
              <div className="riddra-auth-mini-card riddra-auth-mini-card-accent rounded-[10px] border border-[rgba(212,133,59,0.24)] bg-[linear-gradient(180deg,rgba(212,133,59,0.08),rgba(255,255,255,0.96))] px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.03)] sm:col-span-2 xl:col-span-1">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#8E5723]">Support</p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">
                  {supportRegistry.total} help notes
                </p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Support guidance is ready for signup and account access questions.
                </p>
              </div>
            </div>

            {supportEmail ? (
              <p className="riddra-auth-copy riddra-product-body text-[13px] text-[rgba(75,85,99,0.82)]">
                Questions before signup? Reach us at <span className="riddra-auth-strong font-medium text-[#1B3A6B]">{supportEmail}</span>.
              </p>
            ) : null}
          </div>

          <div className="riddra-auth-form-panel border-t border-[rgba(221,215,207,0.86)] bg-[linear-gradient(180deg,rgba(27,58,107,0.03),rgba(255,255,255,0.98))] p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6">
            <AuthForm
              action={signupAction}
              description="Use Google for the fastest signup path, or continue with email verification if that feels better."
              emailHelperText="A verification link is emailed to finish signup and move you into account setup."
              googleAction={googleAuthAction}
              includeName
              submitLabel="Send verification link"
              title="Sign up for Riddra"
            />
            <div className="riddra-auth-helper mt-5 rounded-[12px] border border-[rgba(221,215,207,0.86)] bg-[rgba(248,246,242,0.86)] p-4 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              After signup, you move into account setup to choose your alerts, workspace starting point, and portfolio workflow.
            </div>
            <div className="riddra-auth-action-row mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/pricing" className="riddra-auth-primary-link">
                Choose plan
              </ButtonLink>
              <ButtonLink href="/login" tone="secondary" className="riddra-auth-secondary-link">
                I already have an account
              </ButtonLink>
              <ButtonLink href="/get-started" tone="secondary" className="riddra-auth-secondary-link">
                Get started
              </ButtonLink>
            </div>
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
        <PublicSurfaceTruthSection
          eyebrow="Signup truth"
          title="Create your account and continue into setup, watchlists, and portfolio tools"
          description="Signup uses the same public product shell as the rest of Riddra, with account setup and support paths kept visible from the start."
          authReady="Signed-in continuity is active enough to move users into account setup after signup."
          authPending="If signup is temporarily unavailable, try again shortly or use the visible support channel."
          billingReady="Billing core credentials exist, so paid-plan continuity can move beyond pure preview framing once checkout is exercised."
          billingPending="Plan access is shown after signup, with billing details added as they become available."
          supportReady="Support delivery is configured enough to backstop signup or onboarding issues with real follow-up."
          supportPending={`Support guidance stays available from ${supportEmail || "the visible support channel"} whenever you need help finishing signup.`}
          href="/account/setup"
          hrefLabel="Open account setup"
          stats={[
            {
              label: "Signup support",
              value: `${supportRegistry.total} support notes`,
              detail: "Account setup and signup help are available from the visible support channel on this page.",
            },
          ]}
        />
        <AuthStatusCard />
      </div>
    </GlobalSidebarPageShell>
  );
}
