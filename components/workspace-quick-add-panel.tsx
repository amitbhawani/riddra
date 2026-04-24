"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceQuickAddPanelProps = {
  storageMode: "file_backed_preview" | "supabase_private_beta";
  currentWatchlists: Array<{
    title: string;
    assetCount: number;
  }>;
  currentScreens: Array<{
    title: string;
    type: string;
  }>;
};

export function WorkspaceQuickAddPanel({
  storageMode,
  currentWatchlists,
  currentScreens,
}: WorkspaceQuickAddPanelProps) {
  const router = useRouter();
  const [watchlistTitle, setWatchlistTitle] = useState("");
  const [watchlistAssets, setWatchlistAssets] = useState("6");
  const [watchlistAlerts, setWatchlistAlerts] = useState("2");
  const [watchlistNote, setWatchlistNote] = useState("");
  const [watchlistStatus, setWatchlistStatus] = useState<string | null>(null);

  const [screenTitle, setScreenTitle] = useState("");
  const [screenType, setScreenType] = useState("Stock screener");
  const [screenNote, setScreenNote] = useState("");
  const [repeatRunCapable, setRepeatRunCapable] = useState(true);
  const [sharedLayout, setSharedLayout] = useState(false);
  const [screenStatus, setScreenStatus] = useState<string | null>(null);
  function storageLabel(mode?: string | null) {
    const resolvedMode = mode ?? storageMode;
    return resolvedMode === "supabase_private_beta"
      ? "shared private-beta workspace store"
      : "fallback file-backed workspace store";
  }

  async function submitWatchlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWatchlistStatus("Saving watchlist...");

    const response = await fetch("/api/account/workspace/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: watchlistTitle,
        assetCount: Number(watchlistAssets),
        linkedAlerts: Number(watchlistAlerts),
        note: watchlistNote,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; storageMode?: string } | null;

    if (!response.ok) {
      setWatchlistStatus(payload?.error ?? "Unable to save watchlist.");
      return;
    }

    setWatchlistStatus(`Watchlist saved to the ${storageLabel(payload?.storageMode)}.`);
    setWatchlistTitle("");
    setWatchlistNote("");
    router.refresh();
  }

  async function submitScreen(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScreenStatus("Saving screen...");

    const response = await fetch("/api/account/workspace/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: screenTitle,
        type: screenType,
        note: screenNote,
        repeatRunCapable,
        sharedLayout,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; storageMode?: string } | null;

    if (!response.ok) {
      setScreenStatus(payload?.error ?? "Unable to save screen.");
      return;
    }

    setScreenStatus(`Saved screen written to the ${storageLabel(payload?.storageMode)}.`);
    setScreenTitle("");
    setScreenNote("");
    router.refresh();
  }

  async function removeWatchlist(title: string) {
    setWatchlistStatus("Removing watchlist...");

    const response = await fetch("/api/account/workspace/watchlists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; storageMode?: string } | null;

    if (!response.ok) {
      setWatchlistStatus(payload?.error ?? "Unable to remove watchlist.");
      return;
    }

    setWatchlistStatus(`Removed ${title} from the ${storageLabel(payload?.storageMode)}.`);
    router.refresh();
  }

  async function removeScreen(title: string) {
    setScreenStatus("Removing saved screen...");

    const response = await fetch("/api/account/workspace/screens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; storageMode?: string } | null;

    if (!response.ok) {
      setScreenStatus(payload?.error ?? "Unable to remove saved screen.");
      return;
    }

    setScreenStatus(`Removed ${title} from the ${storageLabel(payload?.storageMode)}.`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <form onSubmit={submitWatchlist} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-base font-semibold text-white">Add watchlist</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={watchlistTitle}
              onChange={(event) => setWatchlistTitle(event.target.value)}
              placeholder="Dividend radar"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={watchlistAssets}
                onChange={(event) => setWatchlistAssets(event.target.value)}
                placeholder="6"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
              />
              <input
                value={watchlistAlerts}
                onChange={(event) => setWatchlistAlerts(event.target.value)}
                placeholder="2"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
              />
            </div>
            <textarea
              value={watchlistNote}
              onChange={(event) => setWatchlistNote(event.target.value)}
              placeholder="Tracks dividend candidates, payout consistency, and valuation check-ins."
              className="min-h-28 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-mist/55">
              {watchlistStatus ?? `This writes a new watchlist into the ${storageLabel()}.`}
            </p>
            <button
              type="submit"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Save watchlist
            </button>
          </div>
        </form>

        <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-base font-semibold text-white">Manage saved watchlists</h3>
          <div className="mt-4 grid gap-3">
            {currentWatchlists.map((item) => (
              <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-mist/60">{item.assetCount} tracked assets</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeWatchlist(item.title)}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <form onSubmit={submitScreen} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-base font-semibold text-white">Add saved screen</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={screenTitle}
              onChange={(event) => setScreenTitle(event.target.value)}
              placeholder="Weekly earnings monitor"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
            />
            <input
              value={screenType}
              onChange={(event) => setScreenType(event.target.value)}
              placeholder="Stock screener"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
            />
            <textarea
              value={screenNote}
              onChange={(event) => setScreenNote(event.target.value)}
              placeholder="Reusable workspace for earnings momentum, guidance shifts, and follow-up compare routes."
              className="min-h-28 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
            />
            <div className="flex flex-wrap gap-4 text-sm text-mist/74">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={repeatRunCapable} onChange={(event) => setRepeatRunCapable(event.target.checked)} />
                Repeat run capable
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={sharedLayout} onChange={(event) => setSharedLayout(event.target.checked)} />
                Shared layout
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-mist/55">
              {screenStatus ?? `This writes a new saved-screen row into the ${storageLabel()}.`}
            </p>
            <button
              type="submit"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Save screen
            </button>
          </div>
        </form>

        <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-base font-semibold text-white">Manage saved screens</h3>
          <div className="mt-4 grid gap-3">
            {currentScreens.map((item) => (
              <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-mist/60">{item.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeScreen(item.title)}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
