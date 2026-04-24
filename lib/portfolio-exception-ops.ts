export const portfolioExceptionSummary = {
  reviewQueues: 4,
  mismatchClasses: 6,
  brokerPaths: 3,
};

export const portfolioExceptionItems = [
  {
    title: "CSV mismatch review desk",
    status: "In progress",
    summary:
      "Quantity mismatches, duplicate rows, symbol ambiguity, and unsupported broker exports should flow into a structured review desk instead of being silently accepted.",
  },
  {
    title: "Broker sync conflict desk",
    status: "Queued",
    summary:
      "When imported holdings and connected-broker holdings disagree, the platform should preserve both states until the user confirms the correct truth source.",
  },
  {
    title: "Operator-assist exception handling",
    status: "Queued",
    summary:
      "Staff should later be able to assist on edge-case imports without overwriting the audit trail or losing the user’s previous portfolio state.",
  },
  {
    title: "User re-verification workflow",
    status: "In progress",
    summary:
      "Uncertain holdings should drive a user-facing confirmation workflow tied back to broker or demat truth rather than optimistic auto-merging.",
  },
];

export const portfolioExceptionRules = [
  "Portfolio exceptions should never silently resolve in ways the user cannot later audit.",
  "Broker truth, imported truth, and user-confirmed truth must remain distinguishable.",
  "Exception handling should improve trust, not just improve import completion rates.",
];
