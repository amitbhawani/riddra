import { hasSupabaseEnv } from "@/lib/env";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";

export function AuthStatusCard() {
  const hasLiveAuth = hasSupabaseEnv();

  return (
    <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
      <ProductSectionTitle
        eyebrow="Account"
        title="Access status"
        description="Current sign-in readiness and the expected path into the member workspace."
      />
      <div className="space-y-3 text-sm text-[rgba(75,85,99,0.84)]">
        <div className="rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          Sign-in methods: <span className="font-medium text-[#1B3A6B]">Google + email link available</span>
        </div>
        <div className="rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          App auth configuration:{" "}
          <span className="font-medium text-[#1B3A6B]">{hasLiveAuth ? "Configured" : "Needs activation"}</span>
        </div>
        <div className="rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3">
          Current access posture:{" "}
          <span className="font-medium text-[#1B3A6B]">
            {hasLiveAuth
              ? "The app path is ready for Google login and secure email-link access. Final provider activation and callback verification still need the real dashboard setup."
              : "The auth flow is ready in code. The remaining step is connecting the real Supabase provider and callback setup."}
          </span>
        </div>
      </div>
    </ProductCard>
  );
}
