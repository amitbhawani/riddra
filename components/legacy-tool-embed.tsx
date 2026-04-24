"use client";

import { useEffect, useState } from "react";

import { getPublicDataStateMeta } from "@/lib/product-page-design";

type LegacyToolEmbedProps = {
  rootId: string;
  scriptPath: string;
  chartJs?: boolean;
  note?: string;
};

function ensureStylesheet(href: string) {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-legacy-style="${href}"]`);

  if (existing) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.legacyStyle = href;
  document.head.appendChild(link);
}

function loadScript(src: string, key: string, forceReload = false) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-legacy-script="${key}"]`);

    if (existing) {
      if (forceReload) {
        existing.remove();
      } else {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.legacyScript = key;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(script);
  });
}

export function LegacyToolEmbed({ rootId, scriptPath, chartJs = false, note }: LegacyToolEmbedProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const refreshingMeta = getPublicDataStateMeta("refreshing");
  const readFailedMeta = getPublicDataStateMeta("read_failed");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setStatus("loading");
      setError(null);

      const root = document.getElementById(rootId);
      if (root) {
        root.innerHTML = "";
        root.className = "riddra-legacy-root";
      }

      ensureStylesheet("/legacy-tools/mg-design.css");

      try {
        if (chartJs) {
          await loadScript("https://cdn.jsdelivr.net/npm/chart.js", "chart-js");
        }

        await loadScript(scriptPath, scriptPath, true);

        const mountedRoot = document.getElementById(rootId);
        if (mountedRoot) {
          mountedRoot.classList.remove("mg-dark");
          mountedRoot.classList.add("mg-light");
        }

        try {
          localStorage.setItem("mg-theme", "light");
          localStorage.setItem("mg_gold_theme", "light");
          localStorage.setItem("mg_silver_theme", "light");
        } catch {}

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (loadError) {
        if (!cancelled) {
          setStatus("error");
          setError(loadError instanceof Error ? loadError.message : "Tool failed to load.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [chartJs, rootId, scriptPath]);

  return (
    <div className="riddra-legacy-tool space-y-4">
      {note ? (
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">{note}</div>
      ) : null}

      {status !== "ready" ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-mist/72">
          {status === "loading"
            ? `${refreshingMeta.title}. ${refreshingMeta.description}`
            : `${readFailedMeta.title}. ${error ? "The interactive block could not be loaded right now." : readFailedMeta.description}`}
        </div>
      ) : null}

      <div id={rootId} />
    </div>
  );
}
