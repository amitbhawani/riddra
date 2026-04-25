export type MarketSessionState = "pre_open" | "open" | "closed" | "weekend";

export type MarketSessionSummary = {
  state: MarketSessionState;
  label: string;
  detail: string;
};

export type MarketDataPresentation = {
  marketState: MarketSessionState;
  marketLabel: string;
  marketDetail: string;
};

const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 15;
const MARKET_CLOSE_HOUR = 15;
const MARKET_CLOSE_MINUTE = 30;

function getIndiaDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return { weekday, hour, minute };
}

export function getIndianMarketSession(date = new Date()): MarketSessionSummary {
  const { weekday, hour, minute } = getIndiaDateParts(date);
  const totalMinutes = hour * 60 + minute;
  const openMinutes = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  const closeMinutes = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;

  if (weekday === "Sat" || weekday === "Sun") {
    return {
      state: "weekend",
      label: "Market closed",
      detail: "Weekend session. Public routes should show the latest verified close until the next trading day opens.",
    };
  }

  if (totalMinutes < openMinutes) {
    return {
      state: "pre_open",
      label: "Pre-open / before market",
      detail: "Show the latest verified close or pre-open preparation state until the regular session begins.",
    };
  }

  if (totalMinutes <= closeMinutes) {
    return {
      state: "open",
      label: "Market open",
      detail: "Use the latest verified delayed snapshot and keep the freshness label visible on public pages.",
    };
  }

  return {
    state: "closed",
    label: "Market closed",
    detail: "Show the latest verified close and keep after-hours refreshes separate from the intraday session label.",
  };
}

export function getEquitySnapshotPresentation(verified: boolean): MarketDataPresentation {
  const session = getIndianMarketSession();

  if (!verified) {
    return {
      marketState: session.state,
      marketLabel:
        session.state === "open"
          ? "Verified delayed market snapshot pending"
          : "Latest verified close pending",
      marketDetail:
        session.state === "open"
          ? "The route is ready for delayed market snapshots during live hours, but a verified stock quote has not been written yet."
          : "The route will switch to the latest verified close once a legitimate stock quote is available for this symbol.",
    };
  }

  return {
    marketState: session.state,
    marketLabel:
      session.state === "open" ? "Latest delayed market snapshot" : "Latest verified close",
    marketDetail:
      session.state === "open"
        ? "During the live session, public stock routes should surface the latest verified delayed snapshot with freshness clearly visible."
        : "Outside live market hours, public stock routes should keep showing the most recent verified close until the next session begins.",
  };
}

export function getChartSnapshotPresentation(
  mode: "verified" | "source_entry" | "pending",
): MarketDataPresentation {
  const session = getIndianMarketSession();

  if (mode === "pending") {
    return {
      marketState: session.state,
      marketLabel:
        session.state === "open" ? "Verified delayed OHLCV pending" : "Verified closing OHLCV pending",
      marketDetail:
        session.state === "open"
          ? "This chart route is waiting for verified delayed OHLCV bars for the current symbol."
        : "This chart route will show the latest verified closing series once legitimate OHLCV bars are persisted for the current symbol.",
    };
  }

  if (mode === "source_entry") {
    return {
      marketState: session.state,
      marketLabel:
        session.state === "open" ? "Manual retained OHLCV" : "Manual retained closing series",
      marketDetail:
        "This chart route is using manually-entered or source-entry OHLCV. It is stored for continuity, but it is not the same as fully verified chart history.",
    };
  }

  return {
    marketState: session.state,
    marketLabel:
      session.state === "open" ? "Verified delayed OHLCV" : "Latest verified closing series",
    marketDetail:
      session.state === "open"
        ? "During market hours, the chart should use the latest verified delayed bars available for this symbol."
        : "After market close, the chart should keep showing the latest verified closing series until the next session refreshes.",
  };
}

export function getIndexSnapshotPresentation(
  mode: "verified" | "seeded" | "manual",
): MarketDataPresentation {
  const session = getIndianMarketSession();

  if (mode === "manual") {
    return {
      marketState: session.state,
      marketLabel: "Manual retained index snapshot",
      marketDetail:
        "This index route is showing retained manual rows. It remains useful for structure, but it is not the same as a fully verified delayed breadth snapshot.",
    };
  }

  if (mode !== "verified") {
    return {
      marketState: session.state,
      marketLabel: "Verified index snapshot unavailable",
      marketDetail:
        "This index route will stay unavailable rather than showing mock market-intelligence scaffolding until a verified delayed snapshot is written.",
    };
  }

  return {
    marketState: session.state,
    marketLabel:
      session.state === "open" ? "Latest delayed index snapshot" : "Latest verified close snapshot",
    marketDetail:
      session.state === "open"
        ? "During market hours, the index page should surface the latest verified delayed breadth and contribution snapshot."
        : "Outside live market hours, the index page should hold the latest verified close snapshot until the next session begins.",
  };
}
