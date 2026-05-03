import { env, hasMeilisearchEnv, hasTriggerEnv } from "@/lib/env";
import { getResendReadiness } from "@/lib/email/resend";
import {
  getRuntimeLaunchConfig,
  hasRuntimeSupabaseAdminEnv,
  hasRuntimeSupabaseEnv,
} from "@/lib/runtime-launch-config";

export type DeploymentReadinessStatus = "Configured" | "Partial" | "Blocked" | "Deferred";

export type DeploymentReadinessItem = {
  title: string;
  status: DeploymentReadinessStatus;
  note: string;
  href?: string;
};

export type DeploymentConfigItem = {
  title: string;
  status: "Configured" | "Partial" | "Missing" | "Deferred";
  note: string;
  envKeys: string[];
  href: string;
};

export type DeploymentBlockerItem = {
  title: string;
  status: "Needs activation" | "Needs verification";
  note: string;
  href: string;
};

export type DeploymentOutcomeItem = {
  title: string;
  note: string;
  href?: string;
};

export type DeploymentSmokeTestItem = {
  title: string;
  route: string;
  owner: string;
  steps: string[];
  success: string;
};

export type PrivateBetaDeploymentReadiness = {
  checklist: DeploymentReadinessItem[];
  configChecklist: DeploymentConfigItem[];
  blockers: DeploymentBlockerItem[];
  readyNow: DeploymentOutcomeItem[];
  deferred: DeploymentOutcomeItem[];
  smokeTests: DeploymentSmokeTestItem[];
};

function getConfigStatus(configured: number, total: number): DeploymentConfigItem["status"] {
  if (configured >= total) {
    return "Configured";
  }

  if (configured > 0) {
    return "Partial";
  }

  return "Missing";
}

export function getPrivateBetaDeploymentReadiness(): PrivateBetaDeploymentReadiness {
  const config = getRuntimeLaunchConfig();
  const hasPublicSupabase = hasRuntimeSupabaseEnv();
  const hasAdminSupabase = hasRuntimeSupabaseAdminEnv();
  const hasGoogleOAuth = Boolean(config.googleOAuthConfigured);
  const localAuthBypassEnabled = env.localAuthBypass === "true";
  const hasSiteUrl = Boolean(config.siteUrl);
  const hasTrigger = hasTriggerEnv();
  const hasMeilisearch = hasMeilisearchEnv();
  const resend = getResendReadiness();
  const hasResend = resend.configured;
  const hasSupportDestination = Boolean(
    config.supportEmail || config.contactEmail || config.feedbackInbox,
  );
  const hasProviderUrl = Boolean(config.marketDataProviderUrl);
  const hasProviderToken = Boolean(config.marketDataProviderToken);
  const hasRefreshSecret = Boolean(config.marketDataRefreshSecret || config.cronSecret);
  const feedEndpointCount = [
    config.marketDataQuoteEndpoint,
    config.marketDataOhlcvEndpoint,
    config.marketDataIndexEndpoint,
    config.marketDataFundNavEndpoint,
  ].filter(Boolean).length;
  const hasCriticalFeedCoverage = feedEndpointCount >= 3;

  const authDeployable =
    hasSiteUrl &&
    hasPublicSupabase &&
    hasAdminSupabase &&
    hasGoogleOAuth &&
    !localAuthBypassEnabled;
  const jobsDeployable = hasTrigger && hasAdminSupabase;
  const searchDeployable = hasMeilisearch && hasTrigger;
  const emailDeployable = hasResend && hasSupportDestination && hasTrigger;
  const dataRefreshDeployable =
    hasTrigger && hasAdminSupabase && hasProviderUrl && hasProviderToken && hasRefreshSecret;
  const accountContinuityDeployable = authDeployable && hasAdminSupabase;

  const checklist: DeploymentReadinessItem[] = [
    {
      title: "Production environment coverage",
      status:
        hasSiteUrl &&
        hasPublicSupabase &&
        hasAdminSupabase &&
        hasTrigger &&
        hasMeilisearch &&
        hasResend &&
        hasProviderUrl &&
        hasProviderToken &&
        hasRefreshSecret
          ? "Configured"
          : hasSiteUrl || hasPublicSupabase || hasTrigger || hasMeilisearch || hasResend
            ? "Partial"
            : "Blocked",
      note:
        "This lane only tracks whether the required private-beta runtime inputs are present together. A configured status here does not prove live providers or a successful smoke-test pass yet. Deferred Razorpay credentials stay visible, but they no longer count as private-beta deployment coverage.",
      href: "/admin/launch-config-console",
    },
    {
      title: "Auth and session continuity",
      status: authDeployable ? "Configured" : hasPublicSupabase || hasAdminSupabase ? "Partial" : "Blocked",
      note: localAuthBypassEnabled
        ? "LOCAL_AUTH_BYPASS is still enabled, so deploy-time auth truth would be misleading. Private beta should run with bypass off, real Supabase keys present, and one real signup or callback rehearsal completed."
        : hasGoogleOAuth
          ? "Supabase public and admin envs plus Google OAuth can now form the private-beta auth path, but this remains configuration coverage until one live sign-in, refresh, and protected-route verification pass succeeds."
          : "Supabase connection exists in code, but Google OAuth and or full env coverage still need activation before signed-in continuity can be trusted in deployment.",
      href: "/admin/auth-activation",
    },
    {
      title: "Durable jobs and worker execution",
      status: jobsDeployable ? "Configured" : hasTrigger ? "Partial" : "Blocked",
      note: jobsDeployable
        ? "Trigger.dev tasks for market refresh, search rebuilds, support delivery, notifications, and reconciliation are wired with the required env coverage, but they still need a clean worker run before this lane counts as proven."
        : "Trigger.dev is implemented in code, but private-beta deployment still needs the Trigger project ref, secret key, and shared backend env coverage to treat job execution as live.",
      href: "/admin/deployment-readiness",
    },
    {
      title: "Search deployment and reindex path",
      status: searchDeployable ? "Configured" : hasMeilisearch ? "Partial" : "Blocked",
      note: searchDeployable
        ? "Public search now requires the Meilisearch-backed engine path and Trigger-backed rebuilds, but this remains config-complete until a live rebuild and query pass succeed."
        : "The Meilisearch-backed search engine exists in code, but private beta still needs a live Meilisearch host, API key, and one real rebuild verification pass.",
      href: "/admin/search-screener-truth",
    },
    {
      title: "Support email and transactional delivery",
      status: emailDeployable ? "Configured" : hasSupportDestination || hasResend || hasTrigger ? "Partial" : "Blocked",
      note: emailDeployable
        ? "Support acknowledgement, follow-up, notification summary, account alerts, and contact intake all have provider-backed delivery paths through Resend and Trigger.dev, but this lane still needs a real send proof before it should be treated as live."
        : "Delivery code is in place, but private beta still needs a verified sender, Resend API key, and one real support-email proof run before email delivery is trustworthy.",
      href: "/admin/communication-readiness",
    },
    {
      title: "Market-data refresh and retained history",
      status: dataRefreshDeployable ? "Configured" : hasProviderUrl || hasProviderToken || feedEndpointCount > 0 || hasTrigger ? "Partial" : "Blocked",
      note: dataRefreshDeployable
        ? `Durable market-data storage, refresh metadata, and Trigger-backed refresh jobs are configured. Critical feed endpoint coverage is ${feedEndpointCount}/4, and the lane still needs one clean end-to-end provider refresh proof before user-facing market data should be treated as live.`
        : `Durable history storage is in place, but private beta still needs provider URL or token or refresh authorization. Critical feed endpoint coverage is ${feedEndpointCount}/4. Until then, refresh posture cannot be treated as deployable truth.`,
      href: "/admin/market-data",
    },
    {
      title: "Persistent account and user-linked state",
      status: accountContinuityDeployable ? "Configured" : hasAdminSupabase ? "Partial" : "Blocked",
      note: accountContinuityDeployable
        ? "Account continuity, workspace continuity, broker continuity, support delivery state, and entitlement placeholders now stitch through stored records instead of only UI cards, but the lane still needs a live signed-in rehearsal before it should be treated as fully trusted."
        : "The continuity model is stronger, but private beta still needs live auth proof and backend env coverage before sign-in, reload, and account-state continuity can be treated as fully deployable.",
      href: "/account/workspace",
    },
    {
      title: "Commercial billing and paid feature activation",
      status: "Deferred",
      note:
        "Razorpay checkout, invoice truth, subscription lifecycle proof, and purchase-gated entitlements are deliberately deferred until the commercial lane resumes. They should stay visible, but not block private beta.",
      href: "/admin/payment-readiness",
    },
  ];

  const configChecklist: DeploymentConfigItem[] = [
    {
      title: "Site URL and launch mode",
      status: getConfigStatus([config.siteUrl, config.launchMode].filter(Boolean).length, 2),
      note:
        "Set the canonical site URL and keep launch mode explicit before metadata, redirects, and deployment posture are treated as trustworthy.",
      envKeys: ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_LAUNCH_MODE"],
      href: "/admin/launch-config-console",
    },
    {
      title: "Supabase auth and session env",
      status: getConfigStatus(
        [
          config.supabaseUrl,
          config.supabaseAnonKey,
          config.supabaseServiceRoleKey,
          hasGoogleOAuth ? "google-oauth" : "",
          !localAuthBypassEnabled ? "local-auth-bypass-off" : "",
        ].filter(Boolean).length,
        5,
      ),
      note:
        "Private beta auth requires Supabase public and admin keys, Google OAuth marked configured, and LOCAL_AUTH_BYPASS kept off in the deployed environment.",
      envKeys: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "LOCAL_AUTH_BYPASS",
      ],
      href: "/admin/auth-activation",
    },
    {
      title: "Trigger.dev worker env",
      status: getConfigStatus([env.triggerSecretKey, env.triggerProjectRef].filter(Boolean).length, 2),
      note:
        "Trigger.dev powers market refresh, search rebuilds, notifications, support delivery, and reconciliation. Deployment should not treat jobs as live until both worker inputs exist.",
      envKeys: ["TRIGGER_SECRET_KEY", "TRIGGER_PROJECT_REF"],
      href: "/admin/deployment-readiness",
    },
    {
      title: "Meilisearch engine env",
      status: getConfigStatus(
        [env.meilisearchHost, env.meilisearchApiKey, env.meilisearchIndexPrefixExplicit].filter(Boolean).length,
        3,
      ),
      note:
        "Search now reads through a shared engine abstraction. Private beta still needs a real Meilisearch host, API key, and stable index prefix before search is treated as live.",
      envKeys: ["MEILISEARCH_HOST", "MEILISEARCH_API_KEY", "MEILISEARCH_INDEX_PREFIX"],
      href: "/admin/search-screener-truth",
    },
    {
      title: "Resend and support routing env",
      status: getConfigStatus(
        [
          resend.configured ? "resend-ready" : "",
          env.resendFromEmail,
          config.supportEmail || config.contactEmail || config.feedbackInbox,
        ].filter(Boolean).length,
        3,
      ),
      note:
        "Support acknowledgement, contact delivery, notification summaries, and account alerts all need provider creds plus a real support destination before deployment can promise operator follow-through.",
      envKeys: [
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "RESEND_REPLY_TO_EMAIL",
        "NEXT_PUBLIC_SUPPORT_EMAIL",
      ],
      href: "/admin/communication-readiness",
    },
    {
      title: "Market-data provider and refresh env",
      status: getConfigStatus(
        [
          config.marketDataProviderUrl,
          config.marketDataProviderToken,
          config.marketDataRefreshSecret,
          config.cronSecret,
          config.marketDataQuoteEndpoint,
          config.marketDataOhlcvEndpoint,
          config.marketDataIndexEndpoint,
          config.marketDataFundNavEndpoint,
        ].filter(Boolean).length,
        8,
      ),
      note:
        "Private beta data refresh should have provider core inputs, signed refresh secrets, and the main quote or OHLCV or index or fund endpoints configured before charts and reports are trusted.",
      envKeys: [
        "MARKET_DATA_PROVIDER_URL",
        "MARKET_DATA_PROVIDER_TOKEN",
        "MARKET_DATA_REFRESH_SECRET",
        "CRON_SECRET",
      ],
      href: "/admin/market-data",
    },
    {
      title: "Deferred commercial billing env",
      status: "Deferred",
      note:
        "Keep Razorpay keys documented, but do not treat them as required for private-beta deployment. Commercial billing resumes later.",
      envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
      href: "/admin/payment-readiness",
    },
  ];

  const blockers: DeploymentBlockerItem[] = [];

  if (!hasSiteUrl) {
    blockers.push({
      title: "Canonical site URL and deployment target",
      status: "Needs activation",
      note:
        "Set the final site URL before auth redirects, metadata, and deployment smoke checks can be treated as private-beta proof.",
      href: "/admin/domain-readiness",
    });
  } else {
    blockers.push({
      title: "Production deploy verification",
      status: "Needs verification",
      note:
        "The site URL exists, but private beta still needs one clean deployment verification pass covering auth, search, support delivery, and data refresh.",
      href: "/admin/deployment-readiness",
    });
  }

  if (!authDeployable) {
    blockers.push({
      title: "Signed-in auth rehearsal",
      status: hasPublicSupabase || hasAdminSupabase ? "Needs verification" : "Needs activation",
      note: localAuthBypassEnabled
        ? "Disable LOCAL_AUTH_BYPASS for deployment, then complete one real signup, callback, refresh, and protected-route pass."
        : "Private beta still needs complete Supabase env coverage and one live session rehearsal before auth continuity is trustworthy.",
      href: "/admin/auth-activation",
    });
  }

  if (!jobsDeployable) {
    blockers.push({
      title: "Trigger.dev worker activation",
      status: hasTrigger ? "Needs verification" : "Needs activation",
      note:
        "Worker-backed refresh, search, notification, support, and reconciliation jobs should not be treated as live until Trigger.dev env coverage and one successful run are verified.",
      href: "/admin/deployment-readiness",
    });
  }

  if (!searchDeployable) {
    blockers.push({
      title: "Meilisearch rebuild proof",
      status: hasMeilisearch ? "Needs verification" : "Needs activation",
      note:
        "Search now has a real engine abstraction, but private beta still needs a live index rebuild and query proof before search is treated as deployable.",
      href: "/admin/search-screener-truth",
    });
  }

  if (!emailDeployable) {
    blockers.push({
      title: "Support email proof",
      status: hasResend || hasSupportDestination ? "Needs verification" : "Needs activation",
      note:
              "Support acknowledgements and follow-ups are wired, but private beta still needs provider credentials, a sender identity, Trigger-backed execution, and one real delivery proof run.",
      href: "/admin/communication-readiness",
    });
  }

  if (!dataRefreshDeployable || !hasCriticalFeedCoverage) {
    blockers.push({
      title: "Provider-backed refresh proof",
      status:
        hasProviderUrl || hasProviderToken || hasRefreshSecret || feedEndpointCount > 0
          ? "Needs verification"
          : "Needs activation",
      note: `Durable history storage exists, but charts and reports should not be trusted until provider credentials, refresh secrets, and the main feed endpoints are verified together. Current critical feed coverage is ${feedEndpointCount}/4.`,
      href: "/admin/market-data",
    });
  }

  const readyNow: DeploymentOutcomeItem[] = [
    {
      title: "Private-beta deployment desk",
      note:
        "Deployment, config, blockers, and smoke-test posture now live in one protected deployment-readiness surface instead of scattered launch-era notes.",
      href: "/admin/deployment-readiness",
    },
    ...(authDeployable
      ? [
          {
            title: "Signed-in auth and account continuity",
            note:
              "Supabase-backed auth, account continuity, workspace continuity, and protected account routes are config-complete and ready for a real private-beta smoke-test pass.",
            href: "/account",
          } satisfies DeploymentOutcomeItem,
        ]
      : []),
    ...(jobsDeployable
      ? [
          {
            title: "Trigger.dev durable jobs",
            note:
              "Market refresh, search rebuilds, support delivery, notifications, and reconciliation are configured to run through Trigger.dev with status visibility, but still need successful worker proof.",
            href: "/api/admin/durable-jobs",
          } satisfies DeploymentOutcomeItem,
        ]
      : []),
    ...(searchDeployable
      ? [
          {
            title: "Meilisearch-backed search",
            note:
              "Public search now requires the shared Meilisearch abstraction, and admin-safe rebuilds are configured through the protected search desk, but still need live engine proof.",
            href: "/admin/search-screener-truth",
          } satisfies DeploymentOutcomeItem,
        ]
      : []),
    ...(emailDeployable
      ? [
          {
            title: "Resend-backed support and alert delivery",
            note:
              "Support, contact, notification summary, and account-change alert emails are config-complete once the sender is verified, but still need provider proof before they count as live.",
            href: "/admin/communication-readiness",
          } satisfies DeploymentOutcomeItem,
        ]
      : []),
    ...(dataRefreshDeployable
      ? [
          {
            title: "Durable market refresh and retained history",
            note:
              "Stored OHLCV, index, fund, and chart continuity data now have refresh metadata and worker-backed refresh paths configured for private beta, but still need provider-backed refresh proof.",
            href: "/admin/market-data",
          } satisfies DeploymentOutcomeItem,
        ]
      : []),
  ];

  const deferred: DeploymentOutcomeItem[] = [
    {
      title: "Razorpay checkout and subscriptions",
      note:
        "Commercial checkout, subscription lifecycle proof, and invoice truth stay outside the private-beta gate until company registration and the billing lane resume.",
      href: "/admin/payment-readiness",
    },
    {
      title: "Paid entitlement coupling",
      note:
        "Entitlement placeholders remain persisted and explainable, but they are not yet coupled to live purchase proof or renewal logic.",
      href: "/account/access/entitlements",
    },
    {
      title: "Broad-public smoke and marketing proof",
      note:
        "Public launch messaging, wide-traffic rehearsal, and marketing readiness stay deferred while private beta focuses on deployability and operator truth.",
      href: "/build-tracker",
    },
  ];

  const smokeTests: DeploymentSmokeTestItem[] = [
    {
      title: "Sign in",
      route: "/login",
      owner: "User plus operator",
      steps: [
        "Confirm LOCAL_AUTH_BYPASS is false in the deployed environment.",
        "Use a real Supabase-backed sign-in path and complete the callback.",
        "Refresh the browser and reopen one protected route such as /account.",
        "Verify the account continuity export still resolves the same signed-in account.",
      ],
      success:
        "The same signed-in account survives sign-in, refresh, reload, and protected-route navigation without falling back to preview auth.",
    },
    {
      title: "Market data refresh",
      route: "/admin/market-data",
      owner: "Operator",
      steps: [
        "Queue a market-data refresh or provider sync through the admin desk.",
        "Confirm the Trigger.dev run starts and completes without partial-corruption errors.",
        "Check one stock chart and one fund route after the refresh finishes.",
        "Confirm last-updated timestamps and retained history move forward.",
      ],
      success:
        "The refresh job succeeds, retained series update cleanly, and charts or reports read the newest durable data without falling back to seeded rows.",
    },
    {
      title: "Search",
      route: "/admin/search-screener-truth",
      owner: "Operator",
      steps: [
        "Queue a search-index rebuild from the protected search desk.",
        "Verify the Trigger.dev search job reaches success.",
        "Run a real search query such as a stock, fund, or index term on /search.",
        "Confirm the admin desk shows the Meilisearch-backed index as current.",
      ],
      success:
        "Search returns live Meilisearch-backed results and the rebuild path records a successful run with no missing-engine fallback.",
    },
    {
      title: "Support email",
      route: "/account/support",
      owner: "User plus operator",
      steps: [
        "Queue a support follow-up or submit a contact request.",
        "Confirm the Trigger.dev support-delivery task runs.",
        "Check the email-delivery log and support state on the account route.",
        "Verify the requester acknowledgement and internal inbox notification were both accepted by Resend.",
      ],
      success:
        "Support delivery produces logged provider-backed sends, and the support state visible in-account matches the delivery log.",
    },
    {
      title: "Persistent user and account state",
      route: "/account/workspace",
      owner: "User",
      steps: [
        "Modify a saved account-scoped record such as a watchlist, alert preference, or consent setting.",
        "Refresh the page and revisit /account and /account/workspace.",
        "Open the continuity export route and inspect the stored continuity summary.",
        "Confirm the changed record, last-updated timestamp, and continuity lane all reflect the same persisted state.",
      ],
      success:
        "User-linked state persists across reloads and is explainable from stored account continuity records instead of temporary UI state.",
    },
  ];

  return {
    checklist,
    configChecklist,
    blockers,
    readyNow,
    deferred,
    smokeTests,
  };
}

export function getDeploymentReadinessItems(): DeploymentReadinessItem[] {
  return getPrivateBetaDeploymentReadiness().checklist;
}
