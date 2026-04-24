"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ProductUserProfile } from "@/lib/user-product-store";

export function UserProfileSettingsCard({
  profile,
}: {
  profile: ProductUserProfile;
}) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string; detail?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function saveProfile() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          username,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            profile?: ProductUserProfile;
            storageMode?: "durable" | "fallback";
          }
        | null;

      if (!response.ok || !data?.profile) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not update your profile right now.",
        });
        return;
      }

      setCurrentProfile(data.profile);
      setName(data.profile.name);
      setUsername(data.profile.username);
      setBanner({
        tone: "success",
        text: "Profile updated.",
        detail:
          data.storageMode === "durable"
            ? "Saved through the durable profile path with product extras mirrored locally."
            : "Saved through the local product profile path.",
      });
    });
  }

  return (
    <div className="space-y-4 rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1B3A6B]">Public profile</p>
          <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
            Your profile page is public by default and shows only safe member-facing data.
          </p>
        </div>
        <Link href={`/user/${currentProfile.username}`} className="text-sm font-medium text-[#1B3A6B] underline">
          Open public profile
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
            Name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
            Username
          </span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            className="h-11 w-full rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827]"
          />
        </label>
      </div>

      <p className="text-xs leading-5 text-[rgba(107,114,128,0.88)]">
        Usernames can use lowercase letters, numbers, and underscores. If a name is already taken, the system will suggest a safe variation.
      </p>

      {banner ? (
        <div
          className={`rounded-[12px] border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
              : "border-[rgba(248,113,113,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
          }`}
        >
          <p>{banner.text}</p>
          {banner.detail ? <p className="mt-1 text-xs leading-5">{banner.detail}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveProfile}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-5 text-sm font-medium text-white"
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
        <Link
          href={`/user/${currentProfile.username}`}
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-5 text-sm font-medium text-[#1B3A6B]"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}
