import type { StockSnapshot } from "@/lib/mock-data";

export type StockOwnershipLens = {
  promoterHolding: string;
  institutionalHolding: string;
  publicHolding: string;
  posture: string;
};

export function getStockOwnershipLens(stock: StockSnapshot): StockOwnershipLens {
  const promoterHolding = readShareholdingValue(stock, "Promoters");
  const fiiHolding = readShareholdingValue(stock, "FIIs");
  const diiHolding = readShareholdingValue(stock, "DIIs");
  const publicHolding = readShareholdingValue(stock, "Public");
  const institutionalHoldingValue = (parsePercent(fiiHolding) ?? 0) + (parsePercent(diiHolding) ?? 0);
  const promoterHoldingValue = parsePercent(promoterHolding) ?? 0;
  const publicHoldingValue = parsePercent(publicHolding) ?? 0;

  return {
    promoterHolding,
    institutionalHolding: promoterHolding === "Pending source feed" && fiiHolding === "Pending source feed" && diiHolding === "Pending source feed"
      ? "Pending source feed"
      : formatPercent(institutionalHoldingValue),
    publicHolding,
    posture:
      promoterHoldingValue >= 50
        ? "Promoter-anchored ownership"
        : institutionalHoldingValue >= 35
          ? "Institution-led ownership"
          : publicHoldingValue >= 20
            ? "Broad public participation"
            : "Balanced ownership mix",
  };
}

function readShareholdingValue(stock: StockSnapshot, label: string) {
  return stock.shareholding.find((item) => item.label === label)?.value ?? "Pending source feed";
}

function parsePercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
