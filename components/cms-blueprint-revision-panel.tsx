"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type CmsBlueprint = {
  assetType: string;
  title: string;
  description: string;
  blocks: Array<{
    key: string;
    title: string;
    mode: "source" | "editorial" | "hybrid";
  }>;
};

type CmsBlueprintRevisionPanelProps = {
  blueprints: CmsBlueprint[];
};

function getRouteTarget(assetType: string) {
  switch (assetType) {
    case "stock":
      return "/stocks/tata-motors";
    case "ipo_mainboard":
      return "/ipo/hero-fincorp";
    case "ipo_sme":
      return "/ipo/sme";
    case "mutual_fund":
      return "/mutual-funds/hdfc-mid-cap-opportunities";
    case "etf":
      return "/etfs/nifty-bees";
    case "pms":
      return "/pms/quality-compounders-pms";
    case "aif":
      return "/aif/growth-equity-aif-cat-iii";
    case "sif":
      return "/sif/structured-income-sif";
    default:
      return "/admin/cms";
  }
}

function getDefaultRevisionState(mode: "source" | "editorial" | "hybrid") {
  if (mode === "editorial") return "Review ready" as const;
  if (mode === "hybrid") return "Published" as const;
  return "Rollback staged" as const;
}

export function CmsBlueprintRevisionPanel({ blueprints }: CmsBlueprintRevisionPanelProps) {
  const router = useRouter();
  const [selectedAssetType, setSelectedAssetType] = useState(blueprints[0]?.assetType ?? "");
  const [editor, setEditor] = useState("CMS Blueprint Operator");
  const selectedBlueprint = useMemo(
    () => blueprints.find((item) => item.assetType === selectedAssetType) ?? blueprints[0],
    [blueprints, selectedAssetType],
  );
  const [selectedBlockKey, setSelectedBlockKey] = useState(selectedBlueprint?.blocks[0]?.key ?? "");
  const selectedBlock =
    selectedBlueprint?.blocks.find((item) => item.key === selectedBlockKey) ?? selectedBlueprint?.blocks[0];
  const [action, setAction] = useState(
    selectedBlueprint && selectedBlock
      ? `Logged ${selectedBlock.key} blueprint mutation from CMS operations`
      : "",
  );
  const [reason, setReason] = useState(
    selectedBlueprint && selectedBlock
      ? `${selectedBlueprint.title} now has a write-through mutation lane for ${selectedBlock.title.toLowerCase()}.`
      : "",
  );
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    selectedBlock ? getDefaultRevisionState(selectedBlock.mode) : "Published",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncAssetType(assetType: string) {
    const nextBlueprint = blueprints.find((item) => item.assetType === assetType);
    if (!nextBlueprint) return;
    const nextBlock = nextBlueprint.blocks[0];
    setSelectedAssetType(assetType);
    setSelectedBlockKey(nextBlock?.key ?? "");
    setAction(nextBlock ? `Logged ${nextBlock.key} blueprint mutation from CMS operations` : "");
    setReason(
      nextBlock
        ? `${nextBlueprint.title} now has a write-through mutation lane for ${nextBlock.title.toLowerCase()}.`
        : "",
    );
    setRevisionState(nextBlock ? getDefaultRevisionState(nextBlock.mode) : "Published");
    setMessage(null);
  }

  function syncBlock(blockKey: string) {
    const nextBlock = selectedBlueprint?.blocks.find((item) => item.key === blockKey);
    if (!nextBlock || !selectedBlueprint) return;
    setSelectedBlockKey(blockKey);
    setAction(`Logged ${nextBlock.key} blueprint mutation from CMS operations`);
    setReason(`${selectedBlueprint.title} now has a write-through mutation lane for ${nextBlock.title.toLowerCase()}.`);
    setRevisionState(getDefaultRevisionState(nextBlock.mode));
    setMessage(null);
  }

  async function saveRevision() {
    if (!selectedBlueprint || !selectedBlock) return;

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: selectedBlueprint.title,
          assetType: `${selectedBlueprint.assetType} blueprint`,
          editor,
          action,
          changedFields: selectedBlock.key,
          reason,
          revisionState,
          routeTarget: getRouteTarget(selectedBlueprint.assetType),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record CMS blueprint mutation.");
      }

      setMessage("Saved a write-through CMS blueprint revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record CMS blueprint mutation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through CMS blueprint mutation</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log a real revision entry when a blueprint block is updated from CMS operations, so this desk also contributes to the shared audit lane instead of only describing the editing model.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Blueprint</span>
            <select
              value={selectedAssetType}
              onChange={(event) => syncAssetType(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {blueprints.map((item) => (
                <option key={item.assetType} value={item.assetType} className="bg-slate-950">
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Editor</span>
            <input
              value={editor}
              onChange={(event) => setEditor(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Block</span>
            <select
              value={selectedBlockKey}
              onChange={(event) => syncBlock(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {(selectedBlueprint?.blocks ?? []).map((item) => (
                <option key={item.key} value={item.key} className="bg-slate-950">
                  {item.title} · {item.key}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Revision state</span>
            <select
              value={revisionState}
              onChange={(event) => setRevisionState(event.target.value as (typeof revisionStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {revisionStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Mode</span>
            <input
              value={selectedBlock?.mode ?? ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Route target</span>
            <input
              value={selectedBlueprint ? getRouteTarget(selectedBlueprint.assetType) : ""}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Action</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveRevision}
            disabled={pending || !selectedBlueprint || !selectedBlock}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Write CMS revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from the CMS operations desk instead of keeping blueprint changes as planning-only prose."}
          </p>
        </div>
      </div>
    </div>
  );
}
