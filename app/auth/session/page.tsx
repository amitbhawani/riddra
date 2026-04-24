"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/account/setup";
  }

  return value;
}

export default function AuthSessionPage() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const [message, setMessage] = useState("Completing your sign-in session...");

  useEffect(() => {
    let cancelled = false;

    async function completeSession() {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        window.location.replace("/login?error=Auth+is+not+configured+yet.");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        window.location.replace("/login?error=Unable+to+complete+authentication.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        window.location.replace("/login?error=Unable+to+complete+authentication.");
        return;
      }

      if (!cancelled) {
        setMessage("Sign-in complete. Redirecting to your account...");
      }

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.replace(nextPath);
    }

    void completeSession();

    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-2xl">
        <GlowCard className="space-y-4">
          <Eyebrow>Auth session</Eyebrow>
          <h1 className="display-font text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Finishing sign-in
          </h1>
          <p className="text-base leading-8 text-mist/76">{message}</p>
        </GlowCard>
      </Container>
    </div>
  );
}
