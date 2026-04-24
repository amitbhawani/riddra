import { GlowCard } from "@/components/ui";
import type { GoldHistoryEntry, SilverHistoryEntry } from "@/lib/commodity-history";

type CommodityHistoryPreviewProps =
  | {
      tool: "gold";
      entries: GoldHistoryEntry[];
    }
  | {
      tool: "silver";
      entries: SilverHistoryEntry[];
    };

function formatUpdatedDate(value: string) {
  return new Date(`${value}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  });
}

export function CommodityHistoryPreview({ tool, entries }: CommodityHistoryPreviewProps) {
  const title = tool === "gold" ? "Saved gold history" : "Saved silver history";
  const sourceLabel = tool === "gold" ? "Gold rates saved in backend" : "Silver rates saved in backend";
  const rowCountLabel = `${entries.length} rows visible`;

  return (
    <GlowCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            This Riddra layer shows the most recent backend-saved rows so the tool page remains trustworthy even before the full embedded utility finishes loading.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">{rowCountLabel}</div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5 text-sm leading-7 text-mist/72">
        <p className="text-white">{sourceLabel}</p>
        <p className="mt-2">
          Use the admin source-entry console to append real historical rows and keep these pages aligned with your trusted source workflow.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-[24px] border border-white/8">
          {tool === "gold" ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-mist/72">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Primary rate</th>
                  <th className="px-4 py-3 font-medium">USD spot</th>
                  <th className="px-4 py-3 font-medium">USD/INR</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.date}-${entry.source}`} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{formatUpdatedDate(entry.date)}</td>
                    <td className="px-4 py-3 text-mist/80">{entry.gold24} (24K)</td>
                    <td className="px-4 py-3 text-mist/80">{entry.xauusd}</td>
                    <td className="px-4 py-3 text-mist/80">{entry.usdinr}</td>
                    <td className="px-4 py-3 text-mist/68">{entry.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-mist/72">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Primary rate</th>
                  <th className="px-4 py-3 font-medium">USD spot</th>
                  <th className="px-4 py-3 font-medium">USD/INR</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.date}-${entry.source}`} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{formatUpdatedDate(entry.date)}</td>
                    <td className="px-4 py-3 text-mist/80">{entry.silver999} (999)</td>
                    <td className="px-4 py-3 text-mist/80">{entry.xagusd}</td>
                    <td className="px-4 py-3 text-mist/80">{entry.usdinr}</td>
                    <td className="px-4 py-3 text-mist/68">{entry.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-[24px] border border-dashed border-white/10 px-4 py-5 text-sm text-mist/60">
          No backend history rows are visible yet for this tool.
        </div>
      )}
    </GlowCard>
  );
}
