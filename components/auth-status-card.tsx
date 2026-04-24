import { hasSupabaseEnv } from "@/lib/env";
import { GlowCard } from "@/components/ui";

export function AuthStatusCard() {
  const hasLiveAuth = hasSupabaseEnv();

  return (
    <GlowCard>
      <h2 className="text-xl font-semibold text-white">Access status</h2>
      <div className="mt-5 space-y-3 text-sm text-mist/76">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          Sign-in methods: <span className="text-white">Google + email link available</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          App auth configuration: <span className="text-white">{hasLiveAuth ? "configured" : "needs activation"}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          Current access posture:{" "}
          <span className="text-white">
            {hasLiveAuth
              ? "The app path is ready for Google login and secure email-link access. Final provider activation and callback verification still need the real dashboard setup."
              : "The auth flow is ready in code. The remaining step is connecting the real Supabase provider and callback setup."}
          </span>
        </div>
      </div>
    </GlowCard>
  );
}
