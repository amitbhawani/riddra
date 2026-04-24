type BetaMetric = {
  title: string;
  status: "Healthy" | "Watch" | "Risk";
  target: string;
  reason: string;
};

export function getBetaMetrics() {
  const metrics: BetaMetric[] = [
    {
      title: "Auth completion confidence",
      status: "Watch",
      target: "Most invited users should complete login and reach the workspace without manual help.",
      reason:
        "Auth is now functional, but beta should not widen until repeated login success feels routine rather than fragile.",
    },
    {
      title: "Support response confidence",
      status: "Watch",
      target: "Questions from beta users should land in a visible support path and receive a same-day response.",
      reason:
        "A working support address exists, but the team still needs to prove the real response loop under actual beta traffic.",
    },
    {
      title: "Trust-breaking issue rate",
      status: "Risk",
      target: "No recurring P0 trust failures should remain open while the beta audience expands.",
      reason:
        "This remains the most important beta health metric because auth, support, and data-confidence failures destroy credibility quickly.",
    },
    {
      title: "Premium clarity",
      status: "Watch",
      target: "Users should understand what is live, what is beta, and what is premium without confusing upgrade promises.",
      reason:
        "Pricing and premium surfaces exist, but the beta phase still needs to test whether the current copy is clear and believable.",
    },
  ];

  return {
    metrics,
    healthy: metrics.filter((metric) => metric.status === "Healthy").length,
    watch: metrics.filter((metric) => metric.status === "Watch").length,
    risk: metrics.filter((metric) => metric.status === "Risk").length,
  };
}
