import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";
import { getResendReadiness } from "@/lib/email/resend";

type LaunchCutoverChecklistAutoStatus =
  | "Ready"
  | "Needs input"
  | "Needs verification"
  | "Deferred";

type LaunchCutoverChecklistTemplate = {
  id: string;
  order: number;
  title: string;
  where: string;
  action: string;
  autoStatus: LaunchCutoverChecklistAutoStatus;
  detectedValue: string;
  detailLabel: string;
  detailPlaceholder: string;
  notePlaceholder: string;
};

type LaunchCutoverChecklistStoreItem = {
  id: string;
  completed: boolean;
  detail: string;
  note: string;
  updatedAt: string;
};

type LaunchCutoverChecklistStore = {
  version: number;
  items: LaunchCutoverChecklistStoreItem[];
};

export type LaunchCutoverChecklistItem = LaunchCutoverChecklistTemplate & {
  completed: boolean;
  detail: string;
  note: string;
  updatedAt: string | null;
};

export type LaunchCutoverChecklistMemory = {
  items: LaunchCutoverChecklistItem[];
  summary: {
    total: number;
    completed: number;
    ready: number;
    needsInput: number;
    needsVerification: number;
  };
};

export type SaveLaunchCutoverChecklistItemInput = {
  id: string;
  completed: boolean;
  detail: string;
  note: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "launch-cutover-checklist-memory.json");
const STORE_VERSION = 1;
let checklistMutationQueue = Promise.resolve();

function getTemplates(): LaunchCutoverChecklistTemplate[] {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasGoogleOAuth = Boolean(config.googleOAuthConfigured);
  const hasProviderSync = Boolean(
    config.marketDataProviderUrl &&
      config.marketDataProviderToken &&
      (config.marketDataRefreshSecret || config.cronSecret) &&
      config.marketDataOhlcvEndpoint,
  );
  const hasFallbackKeys = Boolean(config.alphaVantageApiKey && config.finnhubApiKey);
  const hasBillingKeys = Boolean(
    config.razorpayKeyId &&
      config.razorpayKeySecret &&
      config.razorpayWebhookSecret,
  );
  const hasResend = resend.configured;
  const hasComplianceContacts = Boolean(
    config.privacyOwner &&
      config.termsOwner &&
      config.grievanceOfficerName &&
      config.grievanceOfficerEmail,
  );

  return [
    {
      id: "domain-cutover",
      order: 1,
      title: "Connect riddra.com and www.riddra.com to your hosting",
      where: "Your hosting dashboard plus your domain provider DNS panel",
      action:
        "Attach both domains, choose https://riddra.com as the canonical host, and wait until deployment plus TLS are both green before sending public traffic.",
      autoStatus: config.siteUrl ? "Needs verification" : "Needs input",
      detectedValue: config.siteUrl
        ? `Current runtime site URL: ${config.siteUrl}`
        : "No production site URL detected yet.",
      detailLabel: "Your domain or hosting detail",
      detailPlaceholder: "Paste the live deployment URL, DNS change note, or nameserver update you completed",
      notePlaceholder: "Example: apex and www added in hosting, TLS still pending",
    },
    {
      id: "google-oauth",
      order: 2,
      title: "Finish Google OAuth redirects and Supabase auth verification",
      where: "Google Cloud Console and Supabase Auth provider settings",
      action:
        "Add riddra.com and www.riddra.com as authorized origins and callback URLs, then complete one real sign-in and protected-route check.",
      autoStatus:
        hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Needs verification"
          : "Needs input",
      detectedValue:
        hasPublicSupabase && hasAdminSupabase && hasGoogleOAuth
          ? "Supabase auth inputs and Google OAuth flag are present."
          : "Supabase or Google OAuth setup is still incomplete.",
      detailLabel: "OAuth detail",
      detailPlaceholder: "Paste the redirect URLs or note which auth test you completed",
      notePlaceholder: "Example: sign-in worked, callback reached /auth/callback, account page opened",
    },
    {
      id: "provider-sync",
      order: 3,
      title: "Enter your provider backend URL, token, and sync secrets",
      where: "/admin/launch-config-console",
      action:
        "Fill provider URL, provider token, refresh secret, cron secret, and OHLCV endpoint so the app can pull trusted quotes, history, and refresh jobs through your backend layer.",
      autoStatus: hasProviderSync ? "Needs verification" : "Needs input",
      detectedValue: hasProviderSync
        ? "Provider URL, token, sync secret, and OHLCV endpoint are present."
        : "Provider execution inputs are still missing.",
      detailLabel: "Provider detail",
      detailPlaceholder: "Paste the provider base URL or the endpoint you added",
      notePlaceholder: "Example: provider URL saved, refresh secret still pending",
    },
    {
      id: "fallback-keys",
      order: 4,
      title: "Add Alpha Vantage and Finnhub fallback API keys",
      where: "/admin/launch-config-console",
      action:
        "Enter the Alpha Vantage key for metals and the Finnhub key for news so the fallback source stack is fully keyed and launch-ready.",
      autoStatus: hasFallbackKeys ? "Needs verification" : "Needs input",
      detectedValue: hasFallbackKeys
        ? "Alpha Vantage and Finnhub keys are present."
        : "Fallback source keys are still missing.",
      detailLabel: "Fallback API detail",
      detailPlaceholder: "Note which keys were entered or which provider account you used",
      notePlaceholder: "Example: Finnhub added, Alpha Vantage key pending",
    },
    {
      id: "billing-keys",
      order: 5,
      title: "Deferred commercial lane: Razorpay keys and webhook secret",
      where: "/admin/launch-config-console and Razorpay dashboard",
      action:
        "This step is intentionally outside the current private-beta gate. When company registration and commercial timing are ready, add the Razorpay key ID, key secret, and webhook signing secret, then run one checkout and webhook proof pass.",
      autoStatus: "Deferred",
      detectedValue: hasBillingKeys
        ? "Razorpay key ID, secret, and webhook secret are present, but this lane is still deferred for now."
        : "Razorpay billing inputs are still missing, but they are not required for private beta.",
      detailLabel: "Razorpay detail",
      detailPlaceholder: "Note whether you entered test keys or live keys",
      notePlaceholder: "Example: commercial lane deferred until company registration; no checkout proof required for private beta",
    },
    {
      id: "resend-email",
      order: 6,
      title: "Enter Resend API key and confirm support delivery",
      where: "/admin/launch-config-console and Resend dashboard",
      action:
        "Add RESEND_API_KEY and RESEND_FROM_EMAIL in deployment env, verify your sending domain if needed, and prepare one support-email or transactional-email proof pass.",
      autoStatus: hasResend ? "Needs verification" : "Needs input",
      detectedValue: hasResend
        ? "Resend API key is present."
        : "Transactional email is still missing.",
      detailLabel: "Email delivery detail",
      detailPlaceholder: "Write the verified sending domain or delivery setup you completed",
      notePlaceholder: "Example: API key added, sending domain still verifying",
    },
    {
      id: "compliance-contacts",
      order: 7,
      title: "Fill trust and compliance owner details",
      where: "/admin/launch-config-console",
      action:
        "Fill privacy owner, terms owner, grievance officer name, grievance officer email, and any required disclosure URLs so public trust pages are complete.",
      autoStatus: hasComplianceContacts ? "Needs verification" : "Needs input",
      detectedValue: hasComplianceContacts
        ? "Core trust and grievance contact details are present."
        : "One or more trust or grievance fields are still missing.",
      detailLabel: "Compliance detail",
      detailPlaceholder: "Write the owner or disclosure details you entered",
      notePlaceholder: "Example: grievance email added, risk disclosure URL still pending",
    },
    {
      id: "launch-rehearsal",
      order: 8,
      title: "Run one full launch rehearsal before public traffic",
      where: "Production deployment on riddra.com",
      action:
        "Complete one end-to-end pass covering homepage, sign-in, one protected account route, one market-data route, and one support or email check before private-beta traffic. Add a payment-path rehearsal later only when the deferred commercial lane resumes.",
      autoStatus: "Needs verification",
      detectedValue:
        "This step is always manual. It needs one real operator pass even after every config field is present.",
      detailLabel: "Rehearsal result",
      detailPlaceholder: "Write the exact flow you tested and the production URLs you checked",
      notePlaceholder: "Example: login worked, account opened, stock page loaded, support flow confirmed; payment test deferred",
    },
  ];
}

async function readStore(): Promise<LaunchCutoverChecklistStore | null> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as LaunchCutoverChecklistStore;
  } catch {
    return null;
  }
}

async function writeStore(store: LaunchCutoverChecklistStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.items) {
    return store;
  }

  return {
    version: STORE_VERSION,
    items: [],
  };
}

function toMemory(
  templates: LaunchCutoverChecklistTemplate[],
  store: LaunchCutoverChecklistStore,
): LaunchCutoverChecklistMemory {
  const items = templates.map<LaunchCutoverChecklistItem>((template) => {
    const saved = store.items.find((item) => item.id === template.id);

    return {
      ...template,
      completed: saved?.completed ?? false,
      detail: saved?.detail ?? "",
      note: saved?.note ?? "",
      updatedAt: saved?.updatedAt ?? null,
    };
  });

  return {
    items,
    summary: {
      total: items.length,
      completed: items.filter((item) => item.completed).length,
      ready: items.filter((item) => item.autoStatus === "Ready").length,
      needsInput: items.filter((item) => item.autoStatus === "Needs input").length,
      needsVerification: items.filter((item) => item.autoStatus === "Needs verification").length,
    },
  };
}

export async function getLaunchCutoverChecklistMemory(): Promise<LaunchCutoverChecklistMemory> {
  const templates = getTemplates();
  const store = await ensureStore();
  return toMemory(templates, store);
}

export async function saveLaunchCutoverChecklistItem(
  input: SaveLaunchCutoverChecklistItemInput,
): Promise<LaunchCutoverChecklistMemory> {
  const mutation = checklistMutationQueue.then(async () => {
    const templates = getTemplates();
    const store = await ensureStore();

    if (!templates.some((template) => template.id === input.id)) {
      throw new Error(`Unknown launch-cutover checklist item: ${input.id}`);
    }

    const nextItem: LaunchCutoverChecklistStoreItem = {
      id: input.id,
      completed: input.completed,
      detail: input.detail.trim(),
      note: input.note.trim(),
      updatedAt: new Date().toISOString(),
    };

    const nextStore: LaunchCutoverChecklistStore = {
      ...store,
      version: STORE_VERSION,
      items: store.items.some((item) => item.id === input.id)
        ? store.items.map((item) => (item.id === input.id ? nextItem : item))
        : [...store.items, nextItem],
    };

    await writeStore(nextStore);
    return toMemory(templates, nextStore);
  });

  checklistMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
