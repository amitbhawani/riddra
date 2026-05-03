"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountSetupRecoveryCard({
  email,
  initialError,
}: {
  email: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function handleRetry() {
    setIsRetrying(true);
    setError("");

    try {
      const response = await fetch("/api/account/bootstrap", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.ok) {
        router.replace("/account");
        router.refresh();
        return;
      }

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      setError(payload?.error ?? "Account setup is still unavailable. Please try again in a moment.");
      router.refresh();
    } catch {
      setError("Account setup is still unavailable. Please try again in a moment.");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#1B3A6B]">Signed in as</p>
        <p className="text-lg font-semibold text-[#111827]">{email || "Authenticated member"}</p>
      </div>
      <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
        Please try again shortly. If this keeps happening, contact support so we can restore durable profile storage without risking any account data.
      </p>
      {error ? (
        <div className="rounded-[12px] border border-[rgba(212,133,59,0.28)] bg-[rgba(212,133,59,0.08)] px-4 py-3 text-sm text-[#8E5723]">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="riddra-button-link-primary inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1B3A6B] px-5 text-sm font-medium text-[white] transition hover:bg-[#264a83] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRetrying ? "Retrying..." : "Retry account setup"}
        </button>
        <Link
          href="/contact"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-5 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
        >
          Contact support
        </Link>
        <Link
          href="/logout"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-5 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
        >
          Sign out
        </Link>
      </div>
    </div>
  );
}
