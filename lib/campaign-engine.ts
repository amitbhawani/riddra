export const campaignEngineSummary = {
  channelFamilies: 4,
  lifecycleFlows: 7,
  queuedPlaybooks: 6,
};

export const campaignEngineItems = [
  {
    title: "Email, WhatsApp, SMS, and push playbooks",
    status: "In progress",
    summary:
      "Campaign flows should be organized around reusable channel families so launches, alerts, newsletters, and upsell nudges are coordinated instead of fragmented.",
  },
  {
    title: "Behavior-triggered journeys",
    status: "Queued",
    summary:
      "Portfolio imports, IPO milestones, subscriber inactivity, course completion, and alert opt-ins should later trigger structured campaign playbooks.",
  },
  {
    title: "Consent and delivery governance",
    status: "Queued",
    summary:
      "Every campaign family should respect channel consent, frequency rules, and provider fallback behavior before it is allowed to scale.",
  },
  {
    title: "Operator-managed campaign templates",
    status: "In progress",
    summary:
      "Campaign templates should eventually be configurable by operators without editing code, while still staying tied to stable data contracts.",
  },
];

export const campaignEngineRules = [
  "Campaign automation should be event-driven, consent-aware, and channel-agnostic.",
  "Operators should be able to control journeys without directly mutating user records or entitlements.",
  "Growth automation should increase relevance, not volume for its own sake.",
];
