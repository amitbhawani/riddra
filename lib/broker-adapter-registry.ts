export type BrokerAdapterRegistryRow = {
  brokerName: string;
  adapterKey: string;
  status: "Queue-ready" | "Planned";
  authMode: string;
  executionMode: string;
  syncCoverage: string;
  reviewPolicy: string;
  routeTarget: string;
  note: string;
};

const brokerAdapterRegistryRows: BrokerAdapterRegistryRow[] = [
  {
    brokerName: "Zerodha",
    adapterKey: "zerodha",
    status: "Queue-ready",
    authMode: "Session token review",
    executionMode: "Approval-first adapter queue",
    syncCoverage: "Holdings, positions, and broker-account review preparation",
    reviewPolicy: "Always create an approval-first review item before applying imported holdings changes.",
    routeTarget: "/account/brokers",
    note: "The private-beta queue can now stage Zerodha sync execution internally, but live token capture and holdings application still need provider activation.",
  },
  {
    brokerName: "Groww",
    adapterKey: "groww",
    status: "Queue-ready",
    authMode: "Sandbox token review",
    executionMode: "Approval-first adapter queue",
    syncCoverage: "Broker-account linkage, queue posture, and approval-first holdings review",
    reviewPolicy: "Prepare review rows and linked-account state before any holdings overwrite is allowed.",
    routeTarget: "/account/brokers",
    note: "Groww is now modeled as a real internal adapter lane rather than only a roadmap card, but live provider credentials still need to be activated separately.",
  },
  {
    brokerName: "Upstox",
    adapterKey: "upstox",
    status: "Queue-ready",
    authMode: "Sandbox token review",
    executionMode: "Approval-first adapter queue",
    syncCoverage: "Broker refresh queue, linked-account continuity, and review-row hydration",
    reviewPolicy: "Create explicit review work before approving any imported position changes.",
    routeTarget: "/account/brokers",
    note: "Upstox now has a declared internal adapter profile and worker-backed sync lane for private-beta rehearsal, but live broker access still needs provider setup.",
  },
  {
    brokerName: "ICICIdirect",
    adapterKey: "icicidirect",
    status: "Planned",
    authMode: "Provider onboarding required",
    executionMode: "Planned adapter lane",
    syncCoverage: "Planned full-service broker continuity and account review workflow",
    reviewPolicy: "Do not enable direct holdings application until provider credentials and account review rules are verified.",
    routeTarget: "/account/brokers",
    note: "This remains planned until provider onboarding and credential posture are available, but it now has an explicit adapter slot in the registry.",
  },
];

function normalizeBrokerName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getBrokerAdapterRegistryRows() {
  return brokerAdapterRegistryRows.map((row) => ({ ...row }));
}

export function getBrokerAdapterProfile(brokerName: string) {
  const normalized = normalizeBrokerName(brokerName);
  return brokerAdapterRegistryRows.find((row) => normalizeBrokerName(row.brokerName) === normalized) ?? null;
}

export function getBrokerAdapterRegistrySummary() {
  const rows = getBrokerAdapterRegistryRows();

  return {
    totalRows: rows.length,
    queueReady: rows.filter((row) => row.status === "Queue-ready").length,
    planned: rows.filter((row) => row.status === "Planned").length,
  };
}

export function toBrokerAdapterRegistryCsv(rows: BrokerAdapterRegistryRow[]) {
  const header = [
    "broker_name",
    "adapter_key",
    "status",
    "auth_mode",
    "execution_mode",
    "sync_coverage",
    "review_policy",
    "route_target",
    "note",
  ];

  const lines = rows.map((row) =>
    [
      row.brokerName,
      row.adapterKey,
      row.status,
      row.authMode,
      row.executionMode,
      row.syncCoverage,
      row.reviewPolicy,
      row.routeTarget,
      row.note,
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
