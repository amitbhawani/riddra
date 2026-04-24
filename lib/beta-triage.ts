type BetaTriageItem = {
  title: string;
  severity: "P0" | "P1" | "P2";
  owner: string;
  trigger: string;
  action: string;
};

export function getBetaTriage() {
  const items: BetaTriageItem[] = [
    {
      title: "Auth failure or callback dead-end",
      severity: "P0",
      owner: "Engineering",
      trigger: "Any user cannot complete sign-in or lands in a broken callback loop.",
      action: "Pause wider beta invitations, inspect auth logs, validate callback matrix, and rerun login smoke checks before reopening access.",
    },
    {
      title: "Broken trust or support path",
      severity: "P0",
      owner: "Support / operations",
      trigger: "Users cannot find a valid support path, help route, or contact destination when something goes wrong.",
      action: "Correct support/contact visibility immediately and avoid further user invites until recovery messaging is clear.",
    },
    {
      title: "Portfolio or alert confidence regression",
      severity: "P1",
      owner: "Product + engineering",
      trigger: "Imported holdings, alerts, or account status feel inconsistent enough to reduce trust.",
      action: "Capture examples, compare against workspace flows, and fix the trust-breaking inconsistency before expanding beta scope.",
    },
    {
      title: "Pricing or premium confusion",
      severity: "P2",
      owner: "Growth / product",
      trigger: "Users misunderstand what is live, what is beta-only, or what premium features are actually active.",
      action: "Tighten pricing, entitlement, and beta-boundary copy before broader promotion.",
    },
  ];

  return {
    items,
    p0: items.filter((item) => item.severity === "P0").length,
    p1: items.filter((item) => item.severity === "P1").length,
    p2: items.filter((item) => item.severity === "P2").length,
  };
}
