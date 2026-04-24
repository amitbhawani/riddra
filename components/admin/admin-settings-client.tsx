"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import type { SystemSettings } from "@/lib/user-product-store";
import {
  AdminBadge,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";

export function AdminSettingsClient({
  initialSettings,
}: {
  initialSettings: SystemSettings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            settings?: SystemSettings;
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.settings) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save settings right now.",
        });
        return;
      }

      setSettings(data.settings);
      router.refresh();
      setBanner({
        tone: "success",
        text: "System settings updated successfully.",
        detail: `${data.storageMode === "durable" ? "Saved to durable store." : "Saved to local fallback store."} ${formatAdminSavedState(data.savedAt)}`,
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#4b5563]">
        Current settings last updated {formatAdminDateTime(settings.updatedAt)}.
      </div>

      <AdminSectionCard
        title="Site and default SEO"
        description="Global platform settings used for metadata defaults and operator-safe system behavior."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <input
            value={settings.siteName}
            onChange={(event) => update("siteName", event.target.value)}
            placeholder="Site name"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
          <input
            value={settings.defaultMetaTitleSuffix}
            onChange={(event) => update("defaultMetaTitleSuffix", event.target.value)}
            placeholder="Meta title suffix"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
          <textarea
            value={settings.defaultMetaDescription}
            onChange={(event) => update("defaultMetaDescription", event.target.value)}
            rows={3}
            placeholder="Default meta description"
            className="rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827]"
          />
          <div className="space-y-3">
            <input
              value={settings.defaultOgImage}
              onChange={(event) => update("defaultOgImage", event.target.value)}
              placeholder="/media-library/default-og.jpg"
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            <input
              value={settings.defaultCanonicalBase}
              onChange={(event) => update("defaultCanonicalBase", event.target.value)}
              placeholder="https://riddra.com"
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        id="head-code"
        title="Header code"
        description="Paste public-site code that should be injected before the closing </head> tag, such as Google Analytics, ads, or verification snippets."
      >
        <div className="space-y-3">
          <textarea
            value={settings.publicHeadCode}
            onChange={(event) => update("publicHeadCode", event.target.value)}
            rows={8}
            placeholder={`<!-- Example -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-XXXX\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXX');\n</script>`}
            className="w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] leading-6 text-[#111827]"
          />
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-[#4b5563]">
            This runs on the public-facing site only. Do not paste full <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, or <code>&lt;body&gt;</code> wrappers.
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Membership and support defaults"
        description="Default tier and CTA behavior for new records, plus support destinations."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <input
            value={settings.defaultMembershipTier}
            onChange={(event) => update("defaultMembershipTier", event.target.value)}
            placeholder="free"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
          <input
            value={settings.defaultLockedCtaLabel}
            onChange={(event) => update("defaultLockedCtaLabel", event.target.value)}
            placeholder="Unlock with membership"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
          <input
            value={settings.supportEmail}
            onChange={(event) => update("supportEmail", event.target.value)}
            placeholder="support@example.com"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
          <input
            value={settings.supportRoute}
            onChange={(event) => update("supportRoute", event.target.value)}
            placeholder="/contact"
            className="h-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
          />
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Global switches"
        description="Safe product toggles for previews, media, watchlist, and portfolio features."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["defaultNoIndex", "Default noindex"],
            ["previewEnabled", "Preview enabled"],
            ["mediaUploadsEnabled", "Media uploads enabled"],
            ["watchlistEnabled", "Watchlist enabled"],
            ["portfolioEnabled", "Portfolio enabled"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-sm text-[#111827]"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key as keyof SystemSettings])}
                onChange={(event) =>
                  update(key as keyof SystemSettings, event.target.checked as never)
                }
              />
            </label>
          ))}
        </div>
      </AdminSectionCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
        >
          {isPending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
