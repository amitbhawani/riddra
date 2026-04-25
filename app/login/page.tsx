import type { Metadata } from "next";

import { googleAuthAction, loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthStatusCard } from "@/components/auth-status-card";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { ProductCard } from "@/components/product-page-system";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { getConfiguredSupportEmail } from "@/lib/runtime-launch-config";
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

function resolveAuthQueryError(rawError?: string) {
  const normalized = rawError?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return undefined;
  }

  if (
    normalized === "auth_failed" ||
    normalized === "server_error" ||
    normalized === "unexpected_failure" ||
    normalized.includes("temporarily unavailable")
  ) {
    return "Sign-in is temporarily unavailable. Please try again later.";
  }

  return rawError?.trim();
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const queryError = resolveAuthQueryError(resolvedSearchParams.error);
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();

  return (
    <GlobalSidebarPageShell
      category="account"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface riddra-auth-shell space-y-3.5 sm:space-y-4"
    >
      <ProductCard tone="primary" className="riddra-auth-hero-card overflow-hidden p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)]">
          <div className="space-y-5 p-4 sm:p-5 lg:p-6">
            <Eyebrow>Member access</Eyebrow>
            <div className="space-y-3">
              <h1 className="riddra-auth-title riddra-product-display text-[2rem] font-semibold leading-[1.03] tracking-tight text-[#1B3A6B] sm:text-[2.5rem]">
                Log in and continue your market workflow.
              </h1>
              <p className="riddra-auth-copy riddra-product-body max-w-2xl text-[15px] leading-8 text-[rgba(75,85,99,0.84)]">
                Use Google for the fastest path or request a secure email link. Once you’re in, Riddra can take you into account setup, alerts, watchlists, and portfolio workflows without forcing a password-first flow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="riddra-auth-mini-card rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Access tools
                </p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Watchlists</p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Save pages, track names, and keep your working shortlist in one place.
                </p>
              </div>
              <div className="riddra-auth-mini-card rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Workspace
                </p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">Portfolio</p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Move straight into portfolio tools and account setup without a heavy onboarding wall.
                </p>
              </div>
              <div className="riddra-auth-mini-card riddra-auth-mini-card-accent rounded-[10px] border border-[rgba(212,133,59,0.24)] bg-[linear-gradient(180deg,rgba(212,133,59,0.08),rgba(255,255,255,0.96))] px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.03)] sm:col-span-2 xl:col-span-1">
                <p className="riddra-auth-mini-card-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#8E5723]">Support</p>
                <p className="riddra-auth-mini-card-value riddra-product-number mt-2 text-[20px] font-semibold text-[#1B3A6B]">
                  {supportRegistry.total} help notes
                </p>
                <p className="riddra-auth-mini-card-copy riddra-product-body mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.82)]">
                  Support guidance is ready for account access questions and follow-up from this page.
                </p>
              </div>
            </div>

            {supportEmail ? (
              <p className="riddra-auth-copy riddra-product-body text-[13px] text-[rgba(75,85,99,0.82)]">
                Need help accessing your account? Reach us at{" "}
                <span className="riddra-auth-strong font-medium text-[#1B3A6B]">{supportEmail}</span>.
              </p>
            ) : null}
          </div>

          <div className="riddra-auth-form-panel border-t border-[rgba(221,215,207,0.86)] bg-[linear-gradient(180deg,rgba(27,58,107,0.03),rgba(255,255,255,0.98))] p-4 sm:p-5 lg:border-l lg:border-t-0 lg:p-6">
            <AuthForm
              action={loginAction}
              description="Use Google for the fastest path, or continue with a secure email link if you prefer not to connect Google."
              emailHelperText="A secure login link is emailed to you. No password is required in the current access flow."
              googleAction={googleAuthAction}
              queryError={queryError}
              submitLabel="Send email login link"
              title="Log in to Riddra"
            />
            <div className="riddra-auth-action-row mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="riddra-auth-primary-link">
                Create account
              </ButtonLink>
              <ButtonLink href="/pricing" tone="secondary" className="riddra-auth-secondary-link">
                View plans
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
          eyebrow="Login truth"
          title="Sign in to save pages, manage watchlists, and continue into your workspace"
          description="The login surface follows the same public product shell as the stock pages, while the cards below keep account tools and support paths visible at a glance."
          authReady="Signed-in continuity is active enough to move members into workspace and account flows after login."
          authPending="If sign-in is temporarily unavailable, try again shortly or use the visible support channel."
          billingReady="Plan-linked access can stay visible once checkout and membership continuity are fully exercised."
          billingPending="Membership details continue after sign-in, with plan access shown once available."
          supportReady="Support delivery is configured enough to backstop access and recovery issues with real follow-up."
          supportPending={`Support guidance stays available from ${supportEmail || "the visible support channel"} whenever you need help signing in.`}
          href="/account/support"
          hrefLabel="Open account support"
          stats={[
            {
              label: "Access support",
              value: `${supportRegistry.total} support notes`,
              detail: "Support and account guidance are available from the visible support channel on this page.",
            },
          ]}
        />
        <AuthStatusCard />
      </div>
    </GlobalSidebarPageShell>
  );
}
