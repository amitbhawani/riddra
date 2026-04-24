export type AiWorkflowCard = {
  title: string;
  status: "Now" | "Next" | "Later";
  summary: string;
  outputs: string[];
};

export type NotificationOpsCard = {
  channel: string;
  trigger: string;
  purpose: string;
};

export type AiModeCard = {
  title: string;
  mode: string;
  summary: string;
  fit: string[];
};

export type AiCostRule = {
  title: string;
  summary: string;
};

export type AiToggleCard = {
  title: string;
  summary: string;
  defaultState: "On" | "Off";
};

export const aiWorkflowCards: AiWorkflowCard[] = [
  {
    title: "Portfolio import validator",
    status: "Now",
    summary:
      "Checks CSV imports, flags mismatches, compares against saved holdings, and asks users to confirm ambiguous rows before saving.",
    outputs: ["Mismatch queue", "Suggested symbol matches", "Change summary before save"],
  },
  {
    title: "Smart result search",
    status: "Next",
    summary:
      "A search-box-native assistant that converts natural-language queries into structured stock, IPO, fund, and tool results instead of open-ended chat.",
    outputs: ["Entity matches", "Structured result cards", "Suggested next actions"],
  },
  {
    title: "Alert summarizer",
    status: "Next",
    summary:
      "Turns index changes, portfolio changes, and IPO events into concise user-facing summaries for delivery across multiple channels.",
    outputs: ["Email digest copy", "WhatsApp short alert", "Push summary"],
  },
  {
    title: "Editorial copilot",
    status: "Later",
    summary:
      "Helps your staff extract summaries, document highlights, and reusable block drafts while keeping a human review loop in place.",
    outputs: ["Draft summaries", "Document highlights", "Suggested FAQs"],
  },
];

export const aiModeCards: AiModeCard[] = [
  {
    title: "Formula-first default",
    mode: "Lowest cost",
    summary:
      "Use rules, formulas, weighted models, saved templates, and structured retrieval so the product feels smart even when no live model call is made.",
    fit: ["Index sentiment trackers", "Portfolio validation", "Screeners and calculators"],
  },
  {
    title: "Hybrid optional AI",
    mode: "Recommended",
    summary:
      "Keep formula outputs as the first layer, and only call an LLM when the user explicitly asks for a summary, explanation, or draft that adds real value.",
    fit: ["Smart search summaries", "Portfolio change explanations", "Document extraction help"],
  },
  {
    title: "Live AI on demand",
    mode: "Controlled spend",
    summary:
      "Enable real AI only for selected operator-approved flows, with usage caps and human-review checkpoints so costs do not quietly expand.",
    fit: ["Premium copilot answers", "Editorial draft assist", "Subscriber-only advanced summaries"],
  },
];

export const aiCostRules: AiCostRule[] = [
  {
    title: "Rules before models",
    summary:
      "Every workflow should try deterministic scoring, retrieval, or structured templates first before even considering a model call.",
  },
  {
    title: "AI must be switchable",
    summary:
      "Real AI should be enabled from admin controls and disabled safely without breaking charts, trackers, or core portfolio workflows.",
  },
  {
    title: "Only pay for high-value moments",
    summary:
      "Use paid AI for summaries, clarifications, and drafts that save operator or subscriber effort, not for things a formula can already compute.",
  },
  {
    title: "Ground every answer",
    summary:
      "AI-facing outputs should be assembled from trusted internal records, documents, and market structures so the platform remains reliable and auditable.",
  },
];

export const aiToggleCards: AiToggleCard[] = [
  {
    title: "Real AI calls",
    summary:
      "Master switch for whether live LLM requests are allowed at all. When off, the platform stays in formula-first mode.",
    defaultState: "Off",
  },
  {
    title: "Subscriber AI summaries",
    summary:
      "Controls whether user-facing summaries are generated live or served from precomputed/rules-based templates.",
    defaultState: "Off",
  },
  {
    title: "Editorial AI drafts",
    summary:
      "Controls whether staff can request draft summaries and FAQ suggestions from documents inside the CMS workflow.",
    defaultState: "Off",
  },
  {
    title: "Smart search answer layer",
    summary:
      "Controls whether search stops at structured results or adds a lightweight AI-generated explanation on top of those results.",
    defaultState: "Off",
  },
];

export const notificationOpsCards: NotificationOpsCard[] = [
  {
    channel: "Email",
    trigger: "Portfolio import complete or mismatch detected",
    purpose: "Confirms imports, highlights issues, and nurtures users into returning to the dashboard.",
  },
  {
    channel: "WhatsApp",
    trigger: "High-priority portfolio, IPO, or index alert",
    purpose: "Delivers short-form, high-open-rate updates for important actions and reminders.",
  },
  {
    channel: "SMS",
    trigger: "Critical fallback alerts",
    purpose: "Acts as a backup for urgent notifications when richer channels are unavailable or disabled.",
  },
  {
    channel: "Push notifications",
    trigger: "Future app engagement loops",
    purpose: "Shares the same event engine later when iOS and Android apps are introduced.",
  },
];

export const placeholderBrandRules = [
  "The current product name is temporary and should stay centralized in shared config so the final rename is one controlled update, not a manual hunt across the codebase.",
  "AI outputs, email templates, and notification copy should reference shared brand variables rather than hardcoded names.",
];
