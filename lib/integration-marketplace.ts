export const integrationMarketplaceSummary = {
  replaceableProviders: 7,
  activeClasses: 5,
  queuedAdapters: 4,
};

export const integrationMarketplaceItems = [
  {
    title: "Auth providers",
    status: "Active",
    summary:
      "Google and email-link auth already establish the idea that provider-backed capabilities should plug into stable platform contracts.",
  },
  {
    title: "Payment providers",
    status: "Active",
    summary:
      "Billing, entitlements, and webhooks should stay behind a payment contract so Razorpay today does not hardwire the future forever.",
  },
  {
    title: "Communication providers",
    status: "Active",
    summary:
      "Email, WhatsApp, SMS, and push should share event-driven contracts so channels can be expanded or swapped later.",
  },
  {
    title: "Broker and sync providers",
    status: "Queued",
    summary:
      "Broker connections, portfolio sync, and reconciliation should attach through adapters instead of special-casing each broker family.",
  },
  {
    title: "AI providers",
    status: "Active",
    summary:
      "Formula-first mode is the default, but optional live providers should attach through one AI contract with clear cost and governance rules.",
  },
  {
    title: "Analytics and attribution providers",
    status: "Queued",
    summary:
      "Traffic, campaign attribution, and funnel analysis should later sit behind replaceable measurement adapters.",
  },
  {
    title: "Storage and document providers",
    status: "Queued",
    summary:
      "Uploads, documents, and derived assets should be moveable across provider layers without breaking page logic or audit trails.",
  },
];

export const integrationMarketplaceRules = [
  "Every provider class should expose one stable contract to the product layer, even if the underlying vendor changes later.",
  "Vendor-specific credentials, callbacks, and limits belong in provider ops, not in page logic.",
  "Marketplace-style expansion should reduce coupling, not encourage random third-party sprawl.",
];
