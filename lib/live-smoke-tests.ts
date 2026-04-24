import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";

export type LiveSmokeTestStatus = "Ready to test" | "Blocked" | "Optional";
export type LiveSmokeTestStepStatus = "Ready" | "In progress" | "Blocked";

export type LiveSmokeTestStep = {
  label: string;
  href: string;
  status: LiveSmokeTestStepStatus;
  note: string;
};

export type LiveSmokeTest = {
  title: string;
  status: LiveSmokeTestStatus;
  path: string;
  summary: string;
  steps: LiveSmokeTestStep[];
};

export type LiveSmokeTestRegistryRow = {
  journey: string;
  journeyStatus: LiveSmokeTestStatus;
  step: string;
  href: string;
  status: LiveSmokeTestStepStatus;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getLiveSmokeTests() {
  const config = getRuntimeLaunchConfig();
  const delivery = getTransactionalDeliveryReadiness();
  const normalizedLaunchMode = config.launchMode.toLowerCase();
  const billingDeferred = !["public_live", "public-launch", "public_launch", "live"].includes(
    normalizedLaunchMode,
  );
  const hasAuthRuntime = hasRuntimeSupabaseEnv();
  const hasProviderSync = Boolean(
    config.marketDataProviderUrl &&
      (config.marketDataProviderToken || config.marketDataRefreshSecret || config.cronSecret),
  );
  const hasBillingCore = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
  const hasBillingWebhook = Boolean(config.razorpayWebhookSecret);
  const hasSupportContact = Boolean(
    config.supportEmail ||
      config.contactEmail ||
      config.billingSupportEmail ||
      config.supportWhatsapp,
  );
  const hasSupportDelivery = delivery.configured;
  const hasLaunchOps =
    Boolean(config.feedbackInbox || config.statusPageUrl || config.adminEmails) ||
    hasProviderSync;

  const tests: LiveSmokeTest[] = [
    {
      title: "Public discovery and research loop",
      status: "Ready to test",
      path: "/",
      summary:
        "The front-door journey can now be exercised as one route sequence across landing, markets, search, stock research, reports, and tools instead of being remembered as separate launch anecdotes.",
      steps: [
        {
          label: "Homepage opening posture",
          href: "/",
          status: "Ready",
          note: "Confirm the opening chart strip, quick links, and launch messaging still load cleanly on the real build.",
        },
        {
          label: "Markets overview handoff",
          href: "/markets",
          status: "Ready",
          note: "Check that the native major-index chart block, commodity cards, and route handoffs still read as one coherent market dashboard.",
        },
        {
          label: "Search and route intent",
          href: "/search",
          status: "Ready",
          note: "Verify live suggestions, route grouping, and smart handoffs across stock, compare, tool, and report intents.",
        },
        {
          label: "Flagship stock research route",
          href: "/stocks/tata-motors",
          status: hasProviderSync ? "In progress" : "Blocked",
          note: hasProviderSync
            ? "Provider-linked sync values exist, so the remaining work is a clean manual verification pass on quote, chart, and trust copy."
            : "The route is usable, but research truth is still limited by missing provider-backed delayed quote sync.",
        },
        {
          label: "Public reports and event continuity",
          href: "/reports/results-calendar",
          status: "Ready",
          note: "Make sure report discovery and event-route handoffs still feel connected to the research loop.",
        },
        {
          label: "Interactive tools handoff",
          href: "/tools",
          status: "Ready",
          note: "Confirm the calculator explorer and breakout checklist still behave like working product surfaces rather than catalog copy.",
        },
      ],
    },
    {
      title: "Login and account continuity",
      status: hasAuthRuntime ? "Ready to test" : "Blocked",
      path: "/login",
      summary: hasAuthRuntime
        ? "Runtime Supabase values exist, so the next job is a real pass across login, callback, account, setup, and workspace continuity."
        : "Auth continuity still cannot be treated as a real launch-safe journey until runtime Supabase values are configured beyond the local bypass.",
      steps: [
        {
          label: "Login entry",
          href: "/login",
          status: hasAuthRuntime ? "Ready" : "Blocked",
          note: hasAuthRuntime
            ? "The route is ready for real sign-in verification."
            : "Login form review is possible, but launch-grade auth proof is blocked by missing runtime Supabase values.",
        },
        {
          label: "Callback and provider return path",
          href: "/auth/callback",
          status: hasAuthRuntime ? "In progress" : "Blocked",
          note: hasAuthRuntime
            ? "Exercise callback handling and account creation flow with a real provider round-trip."
            : "Callback verification stays theoretical until Supabase runtime values are configured.",
        },
        {
          label: "Account hub continuity",
          href: "/account",
          status: hasAuthRuntime ? "In progress" : "Blocked",
          note: hasAuthRuntime
            ? "The account surface is live enough for continuity testing once the session flow is real."
            : "The account hub still leans on local bypass behavior instead of verified subscriber identity.",
        },
        {
          label: "Setup and workspace onboarding",
          href: "/account/setup",
          status: hasAuthRuntime ? "In progress" : "Blocked",
          note: hasAuthRuntime
            ? "Check setup framing, workspace links, and preview-state honesty under a real signed-in session."
            : "Setup and workspace still cannot be treated as real subscriber continuity until auth is live.",
        },
        {
          label: "Workspace and protected routes",
          href: "/account/workspace",
          status: hasAuthRuntime ? "In progress" : "Blocked",
          note: hasAuthRuntime
            ? "Walk the protected workspace, access, billing, and support routes with a real user session."
            : "Protected-route smoke testing is blocked until public auth continuity is available.",
        },
      ],
    },
    {
      title: "Billing lifecycle and recovery",
      status: billingDeferred
        ? "Optional"
        : hasBillingCore && hasBillingWebhook
          ? "Ready to test"
          : hasBillingCore
            ? "Optional"
            : "Blocked",
      path: "/pricing",
      summary:
        billingDeferred
          ? "Commercial billing remains intentionally deferred during private beta. Keep this journey visible as a later rehearsal lane, not as part of the current deployment gate."
          : hasBillingCore && hasBillingWebhook
          ? "Billing credentials and webhook posture now allow a real checkout, lifecycle, and recovery rehearsal from pricing to entitlements."
          : hasBillingCore
            ? "Billing secrets exist, but without webhook-confirmed truth this should be treated as a partial rehearsal rather than a launch-safe billing pass."
            : "Pricing can be reviewed visually, but billing lifecycle smoke tests are still blocked until live Razorpay credentials are configured.",
      steps: [
        {
          label: "Pricing and plan selection",
          href: "/pricing",
          status: billingDeferred ? "Ready" : hasBillingCore ? "Ready" : "In progress",
          note: billingDeferred
            ? "Review pricing as an expectation layer only. Do not treat it as a live checkout entry point during private beta."
            : hasBillingCore
              ? "Pricing is ready for plan-selection and checkout trigger validation."
              : "Pricing copy can be reviewed, but it still leads into non-live billing posture.",
        },
        {
          label: "Billing workspace truth",
          href: "/account/billing",
          status: billingDeferred ? "Ready" : hasBillingCore ? "In progress" : "Blocked",
          note: billingDeferred
            ? "Confirm that the billing workspace stays read-only and honestly marks commercial billing as deferred."
            : hasBillingCore
              ? "Confirm that verified-versus-preview billing states read honestly under a real purchase rehearsal."
              : "Billing workspace still cannot be treated as live subscriber truth without Razorpay activation.",
        },
        {
          label: "Billing lifecycle audit",
          href: "/account/billing/lifecycle",
          status: billingDeferred ? "Ready" : hasBillingCore ? "In progress" : "Blocked",
          note: billingDeferred
            ? "Review stored lifecycle placeholder state and make sure it no longer pretends live renewal automation exists."
            : hasBillingCore
              ? "Exercise activation, renewal, and failed-charge posture with test-mode transaction outcomes."
              : "Lifecycle guidance exists, but there is no live billing core to validate yet.",
        },
        {
          label: "Billing recovery and support handoff",
          href: "/account/billing/recovery",
          status: billingDeferred ? "Ready" : hasBillingCore && hasBillingWebhook ? "In progress" : "Blocked",
          note: billingDeferred
            ? "Confirm that recovery posture stays support-led and read-only while the commercial lane is deferred."
            : hasBillingCore && hasBillingWebhook
              ? "Recovery flow is ready for webhook-confirmed failure and retry validation."
              : "Recovery posture stays theoretical until billing webhook truth is active.",
        },
        {
          label: "Entitlement mapping review",
          href: "/account/access/entitlements",
          status: billingDeferred ? "Ready" : hasBillingCore && hasBillingWebhook ? "In progress" : "Blocked",
          note: billingDeferred
            ? "Review the stored entitlement placeholder state and confirm it remains decoupled from deferred commercial billing."
            : hasBillingCore && hasBillingWebhook
              ? "Check that plan purchase, lifecycle state, and account access all agree after a test transaction."
              : "Entitlement verification is still blocked until billing state becomes real.",
        },
      ],
    },
    {
      title: "Support and trust reassurance",
      status: hasSupportContact ? (hasSupportDelivery ? "Ready to test" : "Optional") : "Blocked",
      path: "/help",
      summary:
        hasSupportContact && hasSupportDelivery
          ? "Support contact and transactional delivery exist, so the next work is a real trust pass across help, contact, account support, and launch-readiness reassurance."
          : hasSupportContact
            ? "Support contact is present, but the trust lane still needs transactional delivery before it can be rehearsed as a full subscriber reassurance flow."
            : "Public trust should not be treated as launch-safe until support contact and recovery handoff are explicitly configured.",
      steps: [
        {
          label: "Help surface",
          href: "/help",
          status: hasSupportContact ? "Ready" : "Blocked",
          note: hasSupportContact
            ? "Review public help and the handoff into signed-in support."
            : "Help posture is missing a configured support contact path.",
        },
        {
          label: "Contact route",
          href: "/contact",
          status: hasSupportContact ? "In progress" : "Blocked",
          note: hasSupportContact
            ? "Confirm contact copy, trust framing, and escalation expectations."
            : "Contact route cannot support real reassurance without configured support ownership.",
        },
        {
          label: "Signed-in account support",
          href: "/account/support",
          status: hasSupportContact ? "In progress" : "Blocked",
          note: hasSupportContact
            ? "Exercise the protected support route as the real subscriber help handoff."
            : "Protected support posture is blocked by missing support contact inputs.",
        },
        {
          label: "Launch-readiness trust check",
          href: "/launch-readiness",
          status: hasSupportContact ? "In progress" : "Blocked",
          note: hasSupportContact
            ? "Review launch promises against actual support and delivery posture."
            : "Trust copy should stay conservative until support ownership is configured.",
        },
      ],
    },
    {
      title: "Operator release control",
      status: hasLaunchOps ? "Ready to test" : "Optional",
      path: "/admin/public-launch-qa",
      summary: hasLaunchOps
        ? "The operator stack is broad enough for a route-by-route release rehearsal across QA, preflight, smoke tests, and go/no-go."
        : "Operator surfaces exist, but launch-control smoke work will still read more like desk review than an operational rehearsal until runtime ops inputs are configured.",
      steps: [
        {
          label: "Public launch QA desk",
          href: "/admin/public-launch-qa",
          status: "Ready",
          note: "Confirm that mobile, smoke, chart, and placeholder lanes agree on the current launch posture.",
        },
        {
          label: "Release checks matrix",
          href: "/admin/release-checks",
          status: "Ready",
          note: "Verify route-by-route launch checks and compare them with the smoke-test journey registry.",
        },
        {
          label: "Live smoke-test desk",
          href: "/admin/live-smoke-tests",
          status: hasLaunchOps ? "Ready" : "In progress",
          note: hasLaunchOps
            ? "This desk is ready to drive one deliberate launch rehearsal."
            : "The desk exists, but runtime ops inputs still limit how practical the rehearsal can be.",
        },
        {
          label: "Preflight checklist",
          href: "/admin/preflight-checklist",
          status: hasLaunchOps ? "In progress" : "Blocked",
          note: hasLaunchOps
            ? "Fold the smoke-test registry into final preflight review and signoff."
            : "Preflight route verification is still partly blocked by missing runtime ops posture.",
        },
        {
          label: "Go / No-Go decision",
          href: "/admin/go-no-go",
          status: hasLaunchOps ? "In progress" : "Blocked",
          note: hasLaunchOps
            ? "Use the smoke, launch, and activation lanes together for the final recommendation."
            : "Final go / no-go should wait until operator inputs are more grounded in real runtime posture.",
        },
      ],
    },
  ];

  return {
    tests,
    ready: tests.filter((test) => test.status === "Ready to test").length,
    blocked: tests.filter((test) => test.status === "Blocked").length,
    optional: tests.filter((test) => test.status === "Optional").length,
    totalSteps: tests.reduce((sum, test) => sum + test.steps.length, 0),
  };
}

export function getLiveSmokeTestRegistryRows(): LiveSmokeTestRegistryRow[] {
  const smoke = getLiveSmokeTests();

  return smoke.tests.flatMap((test) =>
    test.steps.map((step) => ({
      journey: test.title,
      journeyStatus: test.status,
      step: step.label,
      href: step.href,
      status: step.status,
      note: step.note,
      source: "Live smoke tests",
    })),
  );
}

export function getLiveSmokeTestRegistrySummary() {
  const smoke = getLiveSmokeTests();
  const rows = getLiveSmokeTestRegistryRows();

  return {
    journeys: smoke.tests.length,
    totalSteps: smoke.totalSteps,
    readyJourneys: smoke.ready,
    blockedJourneys: smoke.blocked,
    optionalJourneys: smoke.optional,
    readySteps: rows.filter((row) => row.status === "Ready").length,
    inProgressSteps: rows.filter((row) => row.status === "In progress").length,
    blockedSteps: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toLiveSmokeTestCsv(rows: LiveSmokeTestRegistryRow[]) {
  const header = ["journey", "journey_status", "step", "href", "status", "note", "source"];
  const lines = rows.map((row) =>
    [row.journey, row.journeyStatus, row.step, row.href, row.status, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
