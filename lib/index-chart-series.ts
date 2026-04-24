import type { IndexSnapshot } from "@/lib/index-intelligence";
import type { UTCTimestamp } from "lightweight-charts";

export type IndexChartPoint = {
  time: UTCTimestamp;
  movePercent: number;
  weightedBreadthScore: number;
};

export function buildIndexIntradaySeries(snapshot: IndexSnapshot): IndexChartPoint[] {
  if (snapshot.historyBars && snapshot.historyBars.length > 1) {
    const firstClose = snapshot.historyBars[0]?.close ?? 0;

    if (firstClose > 0) {
      return snapshot.historyBars.map((bar) => ({
        time: Math.floor(new Date(`${bar.date}T15:30:00+05:30`).getTime() / 1000) as UTCTimestamp,
        movePercent: ((bar.close / firstClose) - 1) * 100,
        weightedBreadthScore: ((bar.close / firstClose) - 1) * 100,
      }));
    }
  }

  const anchorDate = new Date();
  const year = anchorDate.getUTCFullYear();
  const month = String(anchorDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(anchorDate.getUTCDate()).padStart(2, "0");

  return snapshot.timeline.map((point) => {
    const [hours = "09", minutes = "15"] = point.timeLabel.split(":");
    const iso = `${year}-${month}-${day}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00+05:30`;

    return {
      time: Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp,
      movePercent: point.movePercent,
      weightedBreadthScore: point.weightedBreadthScore,
    };
  });
}
