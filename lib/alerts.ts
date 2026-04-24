export type AlertCategory = {
  title: string;
  summary: string;
  audience: string;
  delivery: string;
};

export type AlertPreference = {
  label: string;
  defaultState: "On" | "Off" | "Priority";
  note: string;
};

export type AlertFeedItem = {
  title: string;
  timestamp: string;
  channel: string;
  status: "Sent" | "Queued" | "Needs review";
  summary: string;
};

export const alertCategories: AlertCategory[] = [
  {
    title: "Portfolio change alerts",
    summary:
      "Notify users when imports change quantities, average prices, or holding matches after CSV or broker refresh.",
    audience: "Signed-up portfolio users",
    delivery: "In-app first, then email or WhatsApp for important changes",
  },
  {
    title: "IPO milestone alerts",
    summary:
      "Track open date, close date, allotment status, listing day, GMP changes, and document updates for high-interest issues.",
    audience: "IPO watchers and research-led signups",
    delivery: "Email digest, WhatsApp reminders, and later push notifications",
  },
  {
    title: "Index sentiment alerts",
    summary:
      "Summarize bullish or bearish shifts across Nifty50, BankNifty, FinNifty, and Sensex trackers during market hours.",
    audience: "Active traders and intraday users",
    delivery: "In-app live state with future premium alert routing",
  },
  {
    title: "Learning and course nudges",
    summary:
      "Surface new videos, bundled courses, and high-value learning pieces without making the product feel spammy.",
    audience: "Free and paid users",
    delivery: "Email digest and account inbox",
  },
];

export const alertPreferences: AlertPreference[] = [
  {
    label: "Daily market summary",
    defaultState: "On",
    note: "Morning and evening summary blocks for major moves, index breadth, and standout stocks.",
  },
  {
    label: "Portfolio mismatch review",
    defaultState: "Priority",
    note: "High-trust signal that asks the user to verify suspicious import rows before Riddra overwrites holdings.",
  },
  {
    label: "IPO allotment and listing reminders",
    defaultState: "On",
    note: "Useful for users tracking multiple upcoming issues without manually revisiting every page.",
  },
  {
    label: "Course and learn updates",
    defaultState: "Off",
    note: "Optional educational nudges that should stay helpful, not noisy.",
  },
];

export const alertFeedItems: AlertFeedItem[] = [
  {
    title: "Portfolio import review needed for Tata Motors mismatch",
    timestamp: "Today, 10:22 AM",
    channel: "In-app inbox",
    status: "Needs review",
    summary: "Imported row `TATA MOTR` was matched to Tata Motors with medium confidence and needs user confirmation.",
  },
  {
    title: "Hero FinCorp IPO allotment window opens tomorrow",
    timestamp: "Today, 8:15 AM",
    channel: "Email digest",
    status: "Queued",
    summary: "Allotment reminder prepared with timeline, registrar link, and listing watch note.",
  },
  {
    title: "Nifty50 breadth turns positive after first hour",
    timestamp: "Today, 9:48 AM",
    channel: "In-app banner",
    status: "Sent",
    summary: "Weighted breadth moved back into bullish territory with financials providing most of the support.",
  },
];
