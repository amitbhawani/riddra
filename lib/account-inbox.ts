export type InboxItem = {
  title: string;
  source: string;
  timestamp: string;
  priority: "High" | "Medium" | "Low";
  status: "Unread" | "Reviewed" | "Needs action";
  summary: string;
  actionLabel: string;
  actionHref: string;
};

export const inboxItems: InboxItem[] = [
  {
    title: "Confirm Tata Motors symbol match from imported portfolio CSV",
    source: "Portfolio import validator",
    timestamp: "Today, 10:22 AM",
    priority: "High",
    status: "Needs action",
    summary: "A broker export row was matched to Tata Motors with medium confidence and should be reviewed before holdings are saved.",
    actionLabel: "Review import",
    actionHref: "/portfolio/import",
  },
  {
    title: "Hero FinCorp IPO allotment reminder is queued",
    source: "IPO timeline engine",
    timestamp: "Today, 8:15 AM",
    priority: "Medium",
    status: "Unread",
    summary: "Your IPO watchlist has an upcoming allotment milestone, and Riddra has prepared the reminder flow and listing checklist.",
    actionLabel: "Open IPO page",
    actionHref: "/ipo/hero-fincorp",
  },
  {
    title: "Nifty50 breadth turned bullish after the first hour",
    source: "Index tracker",
    timestamp: "Today, 9:48 AM",
    priority: "Medium",
    status: "Reviewed",
    summary: "Weighted breadth improved as financials led the move, which can now be used in future premium intraday alerting.",
    actionLabel: "Open tracker",
    actionHref: "/nifty50",
  },
  {
    title: "New course bundle is ready for activation-led onboarding",
    source: "Learning and courses",
    timestamp: "Yesterday, 7:30 PM",
    priority: "Low",
    status: "Unread",
    summary: "The free-plus-bundle learning track is ready to be used for signup-led activation and future upgrade nudges.",
    actionLabel: "View courses",
    actionHref: "/courses",
  },
];
