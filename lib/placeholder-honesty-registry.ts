export type PlaceholderHonestyStatus = "Ready" | "In progress" | "Blocked";

export type PlaceholderHonestyRow = {
  cluster: string;
  label: string;
  status: PlaceholderHonestyStatus;
  href: string;
  note: string;
  currentState: string;
  expectedState: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getPlaceholderHonestyRows(): PlaceholderHonestyRow[] {
  return [
    {
      cluster: "Subscriber billing",
      label: "Billing invoice history examples",
      status: "In progress",
      href: "/account/billing",
      note: "The billing route now separates verified invoice truth from preview-only examples, but checkout-backed invoice history still does not exist for real subscribers.",
      currentState: "Preview-only invoice examples",
      expectedState: "Webhook-confirmed invoice history or a clean empty-state with no examples",
    },
    {
      cluster: "Subscriber workspace",
      label: "Portfolio holdings and P&L snapshot",
      status: "Ready",
      href: "/portfolio",
      note: "The portfolio route now starts empty for untouched accounts, and valid manual saves create a real user-linked holdings snapshot instead of seeded portfolio examples. If live quotes are still missing, valuation cells stay explicitly pending.",
      currentState: "Verified empty-state or real user-linked holdings snapshot with quote-aware pending valuation",
      expectedState: "Real user-linked holdings snapshot with live quote-backed valuation when durable market data exists",
    },
    {
      cluster: "Subscriber workspace",
      label: "Watchlist cards and alert handoffs",
      status: "Ready",
      href: "/account/watchlists",
      note: "The watchlists route now starts from an honest empty state, persists per-user saved lists, and reports the real storage lane back through the write APIs. Alert-routing proof is now tracked in the delivery lane instead of leaving watchlists themselves as fake saved-state.",
      currentState: "Empty or per-user saved watchlists with real storage-mode reporting",
      expectedState: "Durable per-user watchlists with verified alert linkage when delivery proof is active",
    },
    {
      cluster: "Subscriber workspace",
      label: "Saved screen examples",
      status: "Ready",
      href: "/account/screens",
      note: "The saved-screen route now starts from an honest empty state, persists per-user saved screens, and reports the real storage lane through workspace writes instead of implying fallback preview as the only path.",
      currentState: "Empty or per-user saved-screen state with real storage-mode reporting",
      expectedState: "Durable saved-screen memory with repeat-run and sharing continuity when those workflows are activated",
    },
    {
      cluster: "Subscriber workspace",
      label: "Inbox and alert memory",
      status: "Ready",
      href: "/account/inbox",
      note: "Inbox and alert-memory routes now start from empty per-user state, persist account-specific rows, and report the real storage lane from their mutation APIs. Delivery-confirmed history is a separate provider proof rather than a fake-state gap in these routes.",
      currentState: "Empty or per-user inbox and alert-memory state with real storage-mode reporting",
      expectedState: "Durable per-user inbox memory and delivery-confirmed alert history when provider-backed delivery is active",
    },
    {
      cluster: "Subscriber workspace",
      label: "Broker review queue decisions",
      status: "Ready",
      href: "/account/brokers/review",
      note: "Broker review decisions now persist per-user state in the shared broker queue while still staying honest that no live adapter sync or holdings overwrite has happened yet.",
      currentState: "Protected review queue with durable per-user approval outcomes",
      expectedState: "Durable per-user broker review queue with live adapter execution only after explicit approval",
    },
    {
      cluster: "Public retention routes",
      label: "Public alerts feed examples",
      status: "In progress",
      href: "/alerts",
      note: "The public alerts route now explicitly frames its cards as preview examples, but it still should not be mistaken for real user-specific alert history until delivery-backed state exists in the signed-in workspace.",
      currentState: "Public delivery-model page with preview example cards",
      expectedState: "A trust-safe marketing page that defers real alert history to verified signed-in routes",
    },
    {
      cluster: "Trading workflows",
      label: "Option chain strike table",
      status: "Ready",
      href: "/option-chain",
      note: "The route now removes fake strike rows, avoids seeded retained chain snapshots, and stays in an explicit empty preview state until a real derivatives source is wired.",
      currentState: "Explicit empty preview state with no fake OI rows or seeded chain snapshots",
      expectedState: "Live or delayed derivatives data with expiry-aware chain state",
    },
    {
      cluster: "Trading workflows",
      label: "Trader workstation depth",
      status: "In progress",
      href: "/trader-workstation",
      note: "The workstation is gated and now labeled as preview-backed, but it still reads more like a staged premium shell than a fully live trading workspace.",
      currentState: "Protected premium preview surface",
      expectedState: "Durable workstation memory, verified premium tooling, or a tighter staged-access state",
    },
    {
      cluster: "AI and guidance",
      label: "Market Copilot reality",
      status: "In progress",
      href: "/market-copilot",
      note: "The route now behaves more clearly as a guided-preview copilot with playbooks, handoffs, and a first grounded-answer memory lane, but it still is not a live AI assistant with durable per-user memory or activated provider continuity.",
      currentState: "Guided-preview copilot surface with explicit truth notice and persisted answer-packet memory",
      expectedState: "Working guided copilot plus optional live AI layer with durable continuity",
    },
    {
      cluster: "Learning and growth",
      label: "Courses and webinar execution depth",
      status: "In progress",
      href: "/courses",
      note: "The learning layer has richer structure now, but registrations, replay delivery, and real lesson payloads still need to catch up before those routes feel fully live.",
      currentState: "Structured depth with partial payload reality",
      expectedState: "Real lesson assets, registration handling, and replay continuity",
    },
  ];
}

export function getPlaceholderHonestySummary() {
  const rows = getPlaceholderHonestyRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function getPlaceholderHonestyRowByHref(href: string) {
  return getPlaceholderHonestyRows().find((row) => row.href === href) ?? null;
}

export function toPlaceholderHonestyCsv(rows: PlaceholderHonestyRow[]) {
  const header = ["cluster", "label", "status", "href", "note", "current_state", "expected_state"];
  const lines = rows.map((row) =>
    [row.cluster, row.label, row.status, row.href, row.note, row.currentState, row.expectedState]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
