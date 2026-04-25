import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";

export function AuthStatusCard() {
  const hasLiveAuth = hasRuntimeSupabaseEnv();

  return (
    <ProductCard tone="secondary" className="riddra-auth-status-card space-y-4 p-4 sm:p-5">
      <ProductSectionTitle
        eyebrow="Account"
        title="Access status"
        description="Current sign-in readiness and the expected path into the member workspace."
      />
      <div className="riddra-auth-status-copy space-y-3 text-sm text-[rgba(75,85,99,0.84)]">
        <div className="riddra-auth-status-chip rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          Sign-in methods: <span className="riddra-auth-status-strong font-medium text-[#1B3A6B]">Google + email link available</span>
        </div>
        <div className="riddra-auth-status-chip rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          App auth configuration:{" "}
          <span className="riddra-auth-status-strong font-medium text-[#1B3A6B]">{hasLiveAuth ? "Configured" : "Needs activation"}</span>
        </div>
        <div className="riddra-auth-status-chip rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          Current access posture:{" "}
          <span className="riddra-auth-status-strong font-medium text-[#1B3A6B]">
            {hasLiveAuth
              ? "Google sign-in and secure email-link access are available on this route."
              : "Sign-in is temporarily unavailable. Please try again later."}
          </span>
        </div>
      </div>
    </ProductCard>
  );
}
