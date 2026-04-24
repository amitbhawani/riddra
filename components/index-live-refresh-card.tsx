"use client";

import { useEffect, useState } from "react";

import { getPublicDataStateMeta } from "@/lib/product-page-design";

type IndexLiveRefreshCardProps = {
  slug?: string;
};

type IndexSnapshotPayload = {
  title: string;
  marketLabel: string;
  marketDetail: string;
  lastUpdated: string;
  dataMode: "verified" | "seeded" | "manual";
};

export function IndexLiveRefreshCard({ slug }: IndexLiveRefreshCardProps) {
  const refreshingMeta = getPublicDataStateMeta("refreshing");
  const readFailedMeta = getPublicDataStateMeta("read_failed");
  const unavailableMeta = getPublicDataStateMeta("unavailable");
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    summary: string;
  }>({
    status: "loading",
    summary: `${refreshingMeta.title}.`,
  });

  useEffect(() => {
    const controller = new AbortController();
    const url = slug ? `/api/index-snapshots?slug=${encodeURIComponent(slug)}` : "/api/index-snapshots";

    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            setState({
              status: "error",
              summary: slug
                ? unavailableMeta.description
                : "Tracked index snapshots have not been written yet.",
            });
            return;
          }

          throw new Error("fetch_failed");
        }

        const payload = (await response.json()) as {
          snapshot?: IndexSnapshotPayload;
          snapshots?: IndexSnapshotPayload[];
        };

        const snapshot = slug ? payload.snapshot : payload.snapshots?.[0];
        if (!snapshot) {
          throw new Error("missing_snapshot");
        }

          setState({
            status: "ready",
            summary:
              snapshot.dataMode === "verified"
                ? `${snapshot.title} is currently reading verified index data. Last update: ${snapshot.lastUpdated}.`
                : snapshot.dataMode === "manual"
                  ? `${snapshot.title} is currently using admin-entered source rows. Last update: ${snapshot.lastUpdated}.`
                  : `${snapshot.title} is still showing seeded intelligence. Latest refresh path: ${snapshot.lastUpdated}.`,
          });
      })
      .catch(() => {
        setState({
          status: "error",
          summary: readFailedMeta.description,
        });
      });

    return () => controller.abort();
  }, [slug]);

  const tone =
    state.status === "ready"
      ? "border-aurora/20 bg-aurora/8 text-aurora"
      : state.status === "error"
        ? "border-bloom/20 bg-bloom/8 text-bloom"
        : "border-white/10 bg-white/[0.04] text-white";

  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${tone}`}>{state.summary}</div>;
}
