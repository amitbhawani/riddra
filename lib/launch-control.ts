export type LaunchControlItem = {
  title: string;
  owner: "Codex" | "User" | "Shared";
  status: "Ready" | "In progress" | "Blocked";
  note: string;
};

export const launchControlItems: LaunchControlItem[] = [
  {
    title: "Private-beta deployment checklist and smoke tests",
    owner: "Codex",
    status: "Ready",
    note: "Deployment readiness now has a dedicated private-beta checklist covering config coverage, active blockers, deferred commercial work, and smoke tests for sign in, search, support email, market refresh, and persistent account state.",
  },
  {
    title: "Visual launch-config desk",
    owner: "Codex",
    status: "Ready",
    note: "Admin now has a launch-config console where Supabase, provider, support, deferred billing, and admin-access values can be entered from the backend instead of editing code or env files by hand.",
  },
  {
    title: "Public launch shell and route system",
    owner: "Codex",
    status: "Ready",
    note: "Homepage, stock, IPO, fund, index, tools, search, onboarding, trust, and tracker routes are already in place.",
  },
  {
    title: "Google plus email auth UX",
    owner: "Codex",
    status: "Ready",
    note: "The app now supports Google-first plus email-link auth flows in code, but still needs real provider settings in Supabase.",
  },
  {
    title: "Trigger.dev worker activation",
    owner: "Shared",
    status: "Ready",
    note: "Trigger.dev is working locally, durable job history is visible again, and refresh, search, and delivery routes already queue through the real worker path. The remaining work is only provider and delivery proof, not worker bring-up.",
  },
  {
    title: "Meilisearch host and search rebuild proof",
    owner: "Shared",
    status: "Ready",
    note: "Live Meilisearch search is already proven locally with a healthy index and real query results. This is no longer an active private-beta blocker.",
  },
  {
    title: "Supabase project keys and provider setup",
    owner: "Shared",
    status: "Ready",
    note: "Real auth and session continuity are now proven end to end. Supabase inputs, callback handling, and signed-in persistence are no longer part of the active blocker count.",
  },
  {
    title: "Run migrations and seed SQL in production Supabase",
    owner: "Shared",
    status: "Ready",
    note: "The current private-beta proof set is now complete for market-data: durable refresh succeeds, stock and fund routes render from durable rows, and index snapshots render from verified Supabase data. Future hosted-env parity remains an execution follow-up, not a blocker.",
  },
  {
    title: "Real legal copy and support details",
    owner: "Shared",
    status: "Ready",
    note: "Trust, metadata, callback, support-routing, and deployment-readiness surfaces are already aligned enough for private beta. This is no longer a last-mile blocker lane.",
  },
  {
    title: "Free TradingView widget rollout",
    owner: "Codex",
    status: "Ready",
    note: "The app can standardize on TradingView's hosted free widgets right now across the public market surfaces while the later self-hosted chart-library path stays separate.",
  },
  {
    title: "Pine Script for proprietary indicator",
    owner: "User",
    status: "Ready",
    note: "Advanced chart differentiation can grow further once you send the Pine Script for your TradingView indicator, but that is now a later product-enhancement lane rather than a private-beta blocker.",
  },
  {
    title: "Real data-source and licensing decisions",
    owner: "Shared",
    status: "Ready",
    note: "The product-side market-data path is already honest and the retained refresh route is proven for the current stock, fund, and index set. Broader source and licensing expansion is now a later coverage lane, not a signoff blocker.",
  },
  {
    title: "Transactional delivery now, Razorpay later",
    owner: "User",
    status: "Ready",
    note: "Transactional delivery and billing remain intentionally deferred for this manual, operator-led private beta. Contact and support routes stay strict and honest, but Resend plus Razorpay are no longer part of the active blocker count.",
  },
  {
    title: "NSE index TradingView symbol normalization",
    owner: "Codex",
    status: "Ready",
    note: "The route-integrity and index truth lanes are already build-complete. Remaining market-data risk now lives in retained provider-backed writes, not symbol-normalization backlog.",
  },
];

export const immediateUserInputs = [
  "Start the invite-only beta from the already-proven local baseline for auth, market data, search, and signed-in persistence",
  "Mirror the same working Supabase, Trigger, and Meilisearch posture into the hosted beta environment when you are ready",
  "Keep manual/operator-led support in place while Resend remains intentionally deferred",
  "Later, when the commercial lane resumes: paste the Razorpay key ID, key secret, and webhook secret in the Launch Config Console",
];
