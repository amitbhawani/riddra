import clsx from "clsx";

type MarketDataStatusBadgeProps = {
  title: string;
  status: string;
  detail?: string;
  source?: string | null;
  updated?: string | null;
  tone?: "verified" | "pending" | "seeded" | "degraded";
};

export function MarketDataStatusBadge({
  title,
  status,
  detail,
  source,
  updated,
  tone = "pending",
}: MarketDataStatusBadgeProps) {
  return (
    <div
      className={clsx(
        "riddra-product-body rounded-[16px] border px-4 py-4 shadow-[0_8px_20px_rgba(27,58,107,0.03)]",
        tone === "verified"
          ? "border-[rgba(26,127,75,0.18)] bg-[rgba(26,127,75,0.06)]"
          : tone === "seeded" || tone === "degraded"
            ? "border-[rgba(212,133,59,0.24)] bg-[rgba(212,133,59,0.08)]"
          : "border-[rgba(221,215,207,0.96)] bg-white",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[rgba(107,114,128,0.72)]">{title}</p>
          <p className="mt-2 text-sm font-semibold text-[#1B3A6B]">{status}</p>
        </div>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
            tone === "verified"
              ? "bg-[rgba(26,127,75,0.12)] text-[#1A7F4B]"
              : tone === "seeded" || tone === "degraded"
                ? "bg-[rgba(212,133,59,0.12)] text-[#8E5723]"
              : "bg-[rgba(27,58,107,0.04)] text-[#1B3A6B]",
          )}
        >
          {tone}
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{detail}</p> : null}
      <div className="mt-4 space-y-1 text-xs text-[rgba(107,114,128,0.78)]">
        {source ? <p>Source: {source}</p> : null}
        {updated ? <p>Updated: {updated}</p> : null}
      </div>
    </div>
  );
}
