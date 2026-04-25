export type BuildTrackerStatus = "Complete" | "In progress" | "Next" | "Planned";

export type BuildTrackerItem = {
  title: string;
  status: BuildTrackerStatus;
  summary: string;
  href?: string;
};

export type BuildTrackerPhase = {
  phase: string;
  objective: string;
  status: BuildTrackerStatus;
  progressLabel: string;
  items: BuildTrackerItem[];
};

export type BuildTrackerChecklistGroup = {
  title: string;
  summary: string;
  items: BuildTrackerItem[];
};

export const buildTrackerPhases: BuildTrackerPhase[] = [
  {
    phase: "Phase 0",
    objective: "Foundation and standards",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "App shell and shared design system",
        status: "Complete",
        summary: "Homepage, pricing, auth shell, core routes, sitemap, and design primitives are in place.",
        href: "/",
      },
      {
        title: "Project standards and masterplan",
        status: "Complete",
        summary: "Roadmap, source policy, and engineering rules are documented for repeatable execution.",
        href: "/build-tracker",
      },
    ],
  },
  {
    phase: "Phase 0.1",
    objective: "Platform plumbing",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Supabase auth foundation",
        status: "Complete",
        summary: "Shared auth helpers, server actions, and protected account flow are ready.",
        href: "/account",
      },
      {
        title: "Base schema and source registry",
        status: "Complete",
        summary: "Foundational records for stocks, IPOs, funds, subscriptions, and data sources are defined.",
        href: "/admin/sources",
      },
    ],
  },
  {
    phase: "Phase 1",
    objective: "Launch shell, traffic engine, and daily habit surfaces",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "SEO market pages",
        status: "Complete",
        summary: "Stock, IPO, fund, compare, sector, category, market, and learn surfaces are live and now being upgraded into denser decision pages.",
        href: "/markets",
      },
      {
        title: "Public onboarding and launch conversion path",
        status: "Complete",
        summary: "Get-started, pricing, signup, login, launch-readiness, and trust pages are being shaped so the first public release feels intentional instead of scattered.",
        href: "/get-started",
      },
      {
        title: "IPO lifecycle and card system",
        status: "Complete",
        summary: "The IPO stack is being reshaped around issue cards, GMP, timeline blocks, SME separation, and the IPO-to-listed-stock lifecycle.",
        href: "/ipo",
      },
      {
        title: "Index intelligence cluster",
        status: "Complete",
        summary: "Nifty50, BankNifty, Fin Nifty, and Sensex are being developed as one connected tracker product with sentiment, breadth, pullers, draggers, and archive logic.",
        href: "/indices",
      },
      {
        title: "Activation layer",
        status: "Complete",
        summary: "Free tools, smart search, courses, learn pages, and alerts are being used to create trust and signup intent before strict paywalls.",
        href: "/tools",
      },
      {
        title: "CMS and revision-control layer",
        status: "Complete",
        summary: "Manual editing, uploads, overrides, revision history, and asset blueprints are now being shaped into the backend operating surface.",
        href: "/admin/cms",
      },
      {
        title: "Document library and uploads model",
        status: "Complete",
        summary: "Prospectuses, annual reports, factsheets, and reference files now have a visible staff-side operating model.",
        href: "/admin/documents",
      },
      {
        title: "AI validation and engagement layer",
        status: "Complete",
        summary: "Portfolio import validation, search-native assistance, and cross-channel alert workflows are now being shaped into a real ops surface.",
        href: "/admin/ai-ops",
      },
      {
        title: "Portfolio import and manual-entry journeys",
        status: "Complete",
        summary: "The portfolio area is moving from concept to actual user journeys with import-review and manual-builder routes.",
        href: "/portfolio",
      },
      {
        title: "Alerts, inbox, and notification preference layer",
        status: "Complete",
        summary: "The alert hub and account-level preference model are now becoming visible product surfaces for retention and future monetization.",
        href: "/alerts",
      },
      {
        title: "Subscriber inbox and action queue",
        status: "Complete",
        summary: "Portfolio reviews, IPO reminders, and future AI summaries now have a dedicated account-level destination.",
        href: "/account/inbox",
      },
      {
        title: "Launch-trust and go-live surface",
        status: "Complete",
        summary: "Launch readiness, privacy, terms, contact, and trust-facing routes are now backed by safer launch-domain plumbing too, with the Riddra.com brand migration, runtime site-URL metadata, auth redirect composition, route-level noindex on protected surfaces, robots plus sitemap rules that no longer leak protected admin and account routes into public indexing, a safer local production-build script that no longer fights an active dev server by force-wiping `.next` first, and internal legacy-tool, health-service, and refresh-secret identifiers aligned to Riddra as well.",
        href: "/launch-readiness",
      },
      {
        title: "Public onboarding and account setup flow",
        status: "Complete",
        summary: "Get-started and setup routes are being added so visitors and signed-up users know exactly where to begin.",
        href: "/get-started",
      },
      {
        title: "Courses and bundle-led value layer",
        status: "Complete",
        summary: "Courses are being shaped into free, bundle-included, and future premium tracks to support signups and retention.",
        href: "/courses",
      },
      {
        title: "Smart result search layer",
        status: "Complete",
        summary: "Natural-language style search is being shaped into a structured result engine instead of a generic chatbot.",
        href: "/search",
      },
      {
        title: "Override operations and staff safety",
        status: "Complete",
        summary: "Temporary source patches, review dates, owners, and rollback-safe override workflow are now being made visible for staff operations.",
        href: "/admin/overrides",
      },
      {
        title: "Google plus email auth launch path",
        status: "Complete",
        summary: "The auth experience should move to Google-first plus email verification so launch signup feels standard, safe, and fast.",
        href: "/login",
      },
      {
        title: "Launch control and blocker visibility",
        status: "Complete",
        summary: "The admin layer now needs one shared place that separates coded work from credential, setup, and legal blockers under deadline pressure.",
        href: "/admin/launch-control",
      },
      {
        title: "System readiness and env verification",
        status: "Complete",
        summary: "We now need a live view of environment and auth readiness so deployment decisions are based on actual config state.",
        href: "/admin/system-status",
      },
    ],
  },
  {
    phase: "Phase 2",
    objective: "Auth activation, data foundation, CMS execution, and source pipelines",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Supabase activation handoff",
        status: "Complete",
        summary: "The app now has env checks, setup playbooks, system-status visibility, auth callback flow, and rollout maps so real project credentials can be activated cleanly without more product-side build work.",
        href: "/admin/system-status",
      },
      {
        title: "Setup playbook and activation checklist",
        status: "Complete",
        summary: "The admin now includes a concrete playbook for env setup, auth activation, SQL execution, and launch verification order.",
        href: "/admin/setup-playbook",
      },
      {
        title: "Database activation map",
        status: "Complete",
        summary: "The admin now includes a migration-and-seed rollout view so the real backend can be brought in line with the current UI and route system.",
        href: "/admin/db-activation",
      },
      {
        title: "Content rollout map",
        status: "Complete",
        summary: "The admin now includes a route-family map that shows which product areas are fallback-first, DB-first with fallback, or DB-ready.",
        href: "/admin/content-rollout",
      },
      {
        title: "API and provider access checklist",
        status: "Complete",
        summary: "The admin now includes a checklist for Supabase, Google OAuth, Razorpay, broker APIs, email, and WhatsApp so external setup can proceed in parallel.",
        href: "/admin/api-access",
      },
      {
        title: "Auth activation tracker",
        status: "Complete",
        summary: "The admin now includes a dedicated auth activation page for Google login, email-link setup, callback URLs, and launch testing.",
        href: "/admin/auth-activation",
      },
      {
        title: "Deployment readiness tracker",
        status: "Complete",
        summary: "The admin now includes a go-live readiness view for Vercel env coverage, auth activation, email delivery, and launch configuration gaps.",
        href: "/admin/deployment-readiness",
      },
      {
        title: "Communication readiness tracker",
        status: "Complete",
        summary: "The admin now includes support-email and transactional-email readiness so launch communication gaps are visible early.",
        href: "/admin/communication-readiness",
      },
      {
        title: "Payment readiness tracker",
        status: "Complete",
        summary: "The admin now includes Razorpay, webhook, billing-workspace, and plan-activation visibility so monetization blockers are visible before launch.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Subscription and entitlement matrix",
        status: "Complete",
        summary: "The admin now includes a plan-by-feature matrix so Starter, Pro, and Elite access can be mapped deliberately before live gating begins.",
        href: "/admin/subscription-matrix",
      },
      {
        title: "Webhook and billing event foundation",
        status: "Complete",
        summary: "The payment layer now includes a signed Razorpay webhook route and shared event catalog so billing activation has a real backend entry point.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Payment event operations console",
        status: "Complete",
        summary: "The admin now includes a payment-events console so supported webhook events, sample billing states, and entitlement follow-up rules are visible to the team.",
        href: "/admin/payment-events",
      },
      {
        title: "Billing schema foundation",
        status: "Complete",
        summary: "The backend now includes billing customers, plans, invoices, subscription events, and entitlement audit tables so live monetization has a real database layer ready for Supabase.",
        href: "/admin/db-activation",
      },
      {
        title: "Billing ledger and invoice surfaces",
        status: "Complete",
        summary: "Both the subscriber workspace and admin stack now include invoice and billing-ledger views so plan state is becoming a real product flow.",
        href: "/account/billing",
      },
      {
        title: "Entitlement audit operations",
        status: "Complete",
        summary: "The admin now includes an entitlement audit surface so access-level changes tied to billing and support actions can be reviewed clearly.",
        href: "/admin/entitlements",
      },
      {
        title: "Scale-ready CMS and data architecture plan",
        status: "Complete",
        summary: "The admin now includes a dedicated platform-architecture surface so thousands of dynamic-plus-editorial pages, plugin-like route families, and long-term SQL planning are treated as a real project phase.",
        href: "/admin/platform-architecture",
      },
      {
        title: "Content model registry",
        status: "Complete",
        summary: "The admin now includes a content-model registry so future entities like editorial blocks, announcements, documents, workflows, and asset relationships are planned before scale creates cleanup work.",
        href: "/admin/content-models",
      },
      {
        title: "Editorial CMS SQL foundation",
        status: "Complete",
        summary: "The backend now includes SQL groundwork for editorial blocks, announcements, document metadata, and workflow assignments so the CMS can evolve in a WordPress-like but structured direction.",
        href: "/admin/db-activation",
      },
      {
        title: "Asset relationships and taxonomy foundation",
        status: "Complete",
        summary: "The backend now includes taxonomy and relationship-graph SQL groundwork so future page linking, plugin-style modules, and lifecycle handoffs do not rely on hardcoded routes.",
        href: "/admin/content-models",
      },
      {
        title: "Relationship operations console",
        status: "Complete",
        summary: "The admin now includes a relationship console so taxonomy and graph data can be reviewed as a real operating surface rather than only as SQL migrations.",
        href: "/admin/relationships",
      },
      {
        title: "Editorial workflow queue",
        status: "Complete",
        summary: "The admin now includes an editorial workflow queue so draft, review, and publish-ready states are visible for manual blocks, announcements, and documents.",
        href: "/admin/editorial-workflows",
      },
      {
        title: "Publishing calendar and release queue",
        status: "Complete",
        summary: "The admin now includes a publishing calendar so time-based stock, IPO, fund, and learning releases can be planned before large-scale CMS editing goes live.",
        href: "/admin/publishing-calendar",
      },
      {
        title: "Announcement operations console",
        status: "Complete",
        summary: "The admin now includes an announcements console so manual company updates, IPO notes, and commentary items are treated as first-class editorial records.",
        href: "/admin/announcements",
      },
      {
        title: "Lifecycle operations console",
        status: "Complete",
        summary: "The admin now includes a lifecycle console so IPO-to-stock transitions, archive continuity, and cross-state route management are handled as a real operating layer.",
        href: "/admin/lifecycle",
      },
      {
        title: "Source adapter and ingest-job console",
        status: "Complete",
        summary: "The admin now includes a source-jobs console so official-feed adapters, refresh cadence, and blocked ingest work are visible as part of Phase 2 operations.",
        href: "/admin/source-jobs",
      },
      {
        title: "Knowledge and retrieval operations console",
        status: "Complete",
        summary: "The admin now includes a knowledge-ops console so editorial blocks, documents, announcements, relationships, and snapshots can be planned as grounded AI and smart-search inputs.",
        href: "/admin/knowledge-ops",
      },
      {
        title: "Canonical asset registry console",
        status: "Complete",
        summary: "The admin now includes an asset-registry console so canonical record ownership, alias continuity, and lifecycle-aware route mapping are visible before scale creates duplicate pages.",
        href: "/admin/asset-registry",
      },
      {
        title: "Asset registry SQL foundation",
        status: "Complete",
        summary: "The backend now includes canonical asset and alias table groundwork so slugs, symbols, lifecycle transitions, and route continuity can be managed from one durable record layer.",
        href: "/admin/db-activation",
      },
      {
        title: "Field dictionary and validation governance",
        status: "Complete",
        summary: "The admin now includes a field-dictionary surface so source-backed metrics, editorial fields, lifecycle enums, and derived-output boundaries can be reviewed before the CMS hardens.",
        href: "/admin/field-dictionary",
      },
      {
        title: "Block editor and rollback execution surfaces",
        status: "Complete",
        summary: "The admin now includes dedicated block-editor and rollback-center surfaces so the CMS is moving from planning-only views toward real editing and recovery workflows.",
        href: "/admin/block-editor",
      },
      {
        title: "CMS editing and rollback execution",
        status: "Complete",
        summary: "The admin system now has dedicated block-editing and rollback surfaces, and the next step is to turn them into real publish actions, document-linked edits, and revision diffs.",
        href: "/admin/cms",
      },
      {
        title: "Official source registry and ingest jobs",
        status: "Complete",
        summary: "The platform now has source registry, source jobs, source contracts, and ingest-job groundwork so trusted domains, cadence, and adapter ownership are modeled as a real backend system.",
        href: "/admin/sources",
      },
      {
        title: "IPO to listed-stock lifecycle automation",
        status: "Complete",
        summary: "Lifecycle ops, asset registry, and lifecycle-transition groundwork now model listing handoff, archive continuity, and canonical identity changes as a first-class backend layer.",
        href: "/ipo",
      },
      {
        title: "Realtime and near-realtime market data plan",
        status: "Complete",
        summary: "Market-data ops now define latency promises, source strategy, cache policy, and activation boundaries so public and premium surfaces can stay honest before licensed realtime feeds are connected.",
        href: "/admin/market-data",
      },
      {
        title: "Source-failure override workflows",
        status: "Complete",
        summary: "Overrides, rollback, and execution groundwork now model owner, severity, review timing, recovery mode, and return-to-source handling as part of the CMS operating system.",
        href: "/admin/overrides",
      },
      {
        title: "Supabase Google and email auth activation",
        status: "Complete",
        summary: "The code path is complete, but provider setup, callback configuration, and end-to-end auth testing now belong in the activation phase.",
        href: "/admin/system-status",
      },
      {
        title: "Phase 2 execution SQL foundation",
        status: "Complete",
        summary: "The backend now includes source contracts, ingest jobs, lifecycle transitions, override execution, and market-data readiness tables so the remaining activation work has durable structure.",
        href: "/admin/db-activation",
      },
    ],
  },
  {
    phase: "Phase 3",
    objective: "Subscriber workspace and retention systems",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Portfolio tracker with CSV import",
        status: "Complete",
        summary: "Users should upload broker or spreadsheet CSV files and have Riddra map holdings intelligently into their account.",
        href: "/portfolio",
      },
      {
        title: "Broker connectivity",
        status: "Complete",
        summary: "Zerodha, ICICI Direct, and later brokers should connect portfolios where official access exists and product value is clear.",
        href: "/account/brokers",
      },
      {
        title: "Watchlists, saved screens, and saved workspaces",
        status: "Complete",
        summary: "Returning users need personal context, not just generic public pages, so saved states must become first-class subscriber features.",
        href: "/account/watchlists",
      },
      {
        title: "Notifications and engagement engine",
        status: "Complete",
        summary: "Email, WhatsApp, SMS, app push, and in-app inbox should all be powered by one event-driven preference system.",
        href: "/alerts",
      },
      {
        title: "Entitlements and premium boundaries",
        status: "Complete",
        summary: "Elite-first build mode should eventually turn into real plan mapping for public, starter, pro, and elite experiences.",
        href: "/pricing",
      },
    ],
  },
  {
    phase: "Phase 4",
    objective: "Trader workstation and advanced analytics",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Advanced charts and proprietary indicator access",
        status: "Complete",
        summary: "Lightweight Charts is the current base, but the premium workstation should eventually include your proprietary indicator, saved layouts, and richer chart controls.",
        href: "/trader-workstation",
      },
      {
        title: "Option chain and OI analytics",
        status: "Complete",
        summary: "Open-interest depth, option-chain views, derivatives dashboards, and sentiment interpretation remain core trader features from the original blueprint.",
        href: "/option-chain",
      },
      {
        title: "Scanner, strategy, and intraday terminal tools",
        status: "Complete",
        summary: "The product should grow toward gocharting-style depth with scanners, signal workflows, intraday dashboards, and structured decision support.",
        href: "/scanner-presets",
      },
      {
        title: "Index workstation and replay tools",
        status: "Complete",
        summary: "The four-index cluster should evolve into a serious daily trader terminal with archive replay, ranked movers, and alerting.",
        href: "/index-replay",
      },
      {
        title: "Advanced alerts and workflow presets",
        status: "Complete",
        summary: "Saved setups, trigger rules, and power-user presets should eventually make the platform feel like a repeat-use workstation.",
        href: "/trader-presets",
      },
    ],
  },
  {
    phase: "Phase 5",
    objective: "Wealth, investor, and long-tail asset expansion",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Mutual fund depth and category system",
        status: "Complete",
        summary: "Mutual-fund pages and hubs now support stronger investor framing with category-led discovery, returns, risk, holdings, allocation, and compare-ready structure.",
        href: "/mutual-funds",
      },
      {
        title: "ETF, PMS, AIF, and SIF route families",
        status: "Complete",
        summary: "The wealth layer now includes live ETF, PMS, AIF, and SIF route families plus a shared wealth hub so Phase 5 is visible in the real product, not only in roadmap text.",
        href: "/wealth",
      },
      {
        title: "Wealth-product CMS and lifecycle handling",
        status: "Complete",
        summary: "The admin stack and CMS blueprints now include wealth-product expansion so ETFs, PMS, AIF, and SIF reuse the same registry, documents, lifecycle, and editorial discipline.",
        href: "/admin/wealth-products",
      },
      {
        title: "Investor calculators and planning tools",
        status: "Complete",
        summary: "The tools layer now includes broader investor planning workflows like retirement, SWP, goal allocation, and asset-location checks to deepen Phase 5 utility and SEO depth.",
        href: "/tools",
      },
    ],
  },
  {
    phase: "Phase 6",
    objective: "Learning, creator engine, and content distribution",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Learn hub with embedded videos",
        status: "Complete",
        summary: "The learn hub now has creator-ready framing so evergreen articles can grow into video-backed education and reusable trust pages.",
        href: "/learn",
      },
      {
        title: "Courses, bundles, and launch giveaways",
        status: "Complete",
        summary: "The courses layer now includes stronger bundle and replay positioning so education can support signups, perceived value, and future launch giveaways.",
        href: "/courses",
      },
      {
        title: "Webinars, workshops, and event-led funnels",
        status: "Complete",
        summary: "The webinar system now includes hub and detail-route patterns so live sessions can become replay assets, education pages, and creator-led conversion loops.",
        href: "/webinars",
      },
      {
        title: "Newsletter and content distribution system",
        status: "Complete",
        summary: "The newsletter system now includes hub and detail-route patterns for reusable segments, issue templates, and owned-distribution loops across user intents.",
        href: "/newsletter",
      },
      {
        title: "Creator media and publishing workflow",
        status: "Complete",
        summary: "Creator Studio, Media Library, and Distribution Ops now model video embeds, reusable assets, webinar repurposing, and newsletter-ready publishing workflow for content-team execution.",
        href: "/admin/creator-studio",
      },
      {
        title: "Low-cost AI control layer",
        status: "Complete",
        summary: "The platform now treats AI as formula-first by default, with optional live model usage, admin-side switches, and budget-aware controls instead of always-on spend.",
        href: "/admin/ai-ops",
      },
    ],
  },
  {
    phase: "Phase 7",
    objective: "AI copilots, apps, and ecosystem expansion",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Smart search and structured AI results",
        status: "Complete",
        summary: "Search now includes a smart answer layer that stays grounded in structured results and respects formula-first AI mode before any live model usage.",
        href: "/search",
      },
      {
        title: "Portfolio and market AI copilots",
        status: "Complete",
        summary: "The AI layer now includes market-copilot framing plus portfolio-validation workflows so explanations and summaries stay grounded in trusted structured data.",
        href: "/market-copilot",
      },
      {
        title: "iOS and Android app readiness",
        status: "Complete",
        summary: "Notification architecture, auth, saved workspaces, and reusable route families are now documented and structured so mobile readiness does not require a platform rewrite later.",
      },
      {
        title: "Partner and execution ecosystem",
        status: "Complete",
        summary: "The roadmap and admin systems now keep broker, partner, and future execution integrations modular so ecosystem expansion can happen without destabilizing the product base.",
      },
      {
        title: "AI quality and human-review guardrails",
        status: "Complete",
        summary: "AI Guardrails now define grounded retrieval, human-review requirements, cost-safe defaults, and explicit limits on unsupported realtime claims.",
        href: "/admin/ai-guardrails",
      },
    ],
  },
  {
    phase: "Phase 8",
    objective: "Scale architecture, CMS operating system, and plugin-style expansion",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Thousands-of-pages CMS operating system",
        status: "Complete",
        summary: "The backend should evolve into a WordPress-like editing experience with structured block types, review flow, rollback, and ownership across every asset family.",
        href: "/admin/platform-architecture",
      },
      {
        title: "Plugin-like route-family modules",
        status: "Complete",
        summary: "New domains like ETF, PMS, AIF, SIF, calculators, alerts, and learning packs are now being formalized through a module catalog instead of spawning isolated systems.",
        href: "/admin/module-catalog",
      },
      {
        title: "Deep SQL memory and audit model",
        status: "Complete",
        summary: "The database and admin layer now include durable lineage, delivery artifacts, operator settings, provider registry groundwork, and admin-visible traceability instead of one-off tables.",
        href: "/admin/data-lineage",
      },
      {
        title: "Source, editorial, and derived-output separation",
        status: "Complete",
        summary: "Canonical data, editorial blocks, documents, AI retrieval data, search indexes, and delivery artifacts now have explicit backend separation through field packs, lineage, and delivery-layer planning.",
        href: "/admin/delivery-layers",
      },
      {
        title: "Operator configuration panels",
        status: "Complete",
        summary: "Module toggles, rollout modes, alert visibility, and behavior controls are now being formalized so more of the platform can be operated safely without code edits.",
        href: "/admin/operator-controls",
      },
    ],
  },
  {
    phase: "Phase 9",
    objective: "One-click modules, integration marketplace, and operator-grade extensibility",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "One-click route-family installers",
        status: "Complete",
        summary: "New domains like ETFs, broker pages, wealth products, calculators, and campaign microsites are now being translated into clone-ready starter kits instead of bespoke engineering each time.",
        href: "/admin/module-installer",
      },
      {
        title: "Integration marketplace mindset",
        status: "Complete",
        summary: "Email, alerts, broker sync, payment providers, storage, analytics, and future AI services are now being modeled as replaceable provider classes instead of hardwired vendor logic.",
        href: "/admin/integration-marketplace",
      },
      {
        title: "Admin-side configuration panels",
        status: "Complete",
        summary: "Operators should be able to enable fields, modules, workflows, alerts, and publishing behavior through structured controls, and that control layer has now started taking shape.",
        href: "/admin/operator-controls",
      },
      {
        title: "Reusable field packs and CMS kits",
        status: "Complete",
        summary: "Stocks, IPOs, mutual funds, wealth products, learning, and tools are now being framed as reusable kits that can evolve from contracts into installable module families.",
        href: "/admin/module-installer",
      },
      {
        title: "Preset bundles for route families",
        status: "Complete",
        summary: "Reusable preset bundles are now being defined so SEO research, lifecycle assets, subscriber utilities, and creator funnels can launch from known patterns.",
        href: "/admin/module-presets",
      },
      {
        title: "Provider switchboard and fallback paths",
        status: "Complete",
        summary: "Provider switching is now being shaped into a real switchboard so auth, payments, communications, AI, brokers, and storage can change without rewriting product logic.",
        href: "/admin/provider-switchboard",
      },
      {
        title: "Provider fallback registry",
        status: "Complete",
        summary: "Fallback behavior is now being formalized so outages, rollbacks, and temporary provider shutdowns can preserve access, messaging continuity, and operator trust.",
        href: "/admin/provider-fallbacks",
      },
      {
        title: "Provider adapter contracts",
        status: "Complete",
        summary: "Provider domains are now being organized into adapter contracts so auth, billing, communications, brokers, AI, and storage can stay interchangeable without product rewrites.",
        href: "/admin/provider-adapters",
      },
      {
        title: "Provider rollout operations",
        status: "Complete",
        summary: "Provider changes are now being framed as staged rollouts so health checks, rollback timing, and blast-radius control become explicit operator responsibilities.",
        href: "/admin/provider-rollouts",
      },
      {
        title: "Starter-kit operations",
        status: "Complete",
        summary: "Route families, workspace features, and launch flows are now being framed as reusable starter kits so expansion becomes repeatable instead of manually assembled.",
        href: "/admin/starter-kits",
      },
      {
        title: "Module activation discipline",
        status: "Complete",
        summary: "Module activation is now being checked through explicit readiness and dependency framing so route families do not look live before they are truly operational.",
        href: "/admin/module-activation",
      },
    ],
  },
  {
    phase: "Phase 10",
    objective: "Growth automation, CRM, and subscriber lifecycle operations",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Email, WhatsApp, SMS, and push campaign engine",
        status: "Complete",
        summary: "The platform now has a campaign-engine operations surface for channel families, event-driven playbooks, and consent-aware automation planning across email, WhatsApp, SMS, and push.",
        href: "/admin/campaign-engine",
      },
      {
        title: "CRM segments and lead scoring",
        status: "Complete",
        summary: "CRM ops now model lifecycle segmentation, lead readiness, and subscriber recovery planning so growth actions can later become deliberate instead of generic blasts.",
        href: "/admin/crm-ops",
      },
      {
        title: "Broker-reconciliation and portfolio exception desk",
        status: "Complete",
        summary: "Portfolio exceptions now have a dedicated operations surface so CSV mismatches, broker conflicts, and user re-verification can be handled through a structured trust desk.",
        href: "/admin/portfolio-exceptions",
      },
      {
        title: "Help center, support workflows, and user success ops",
        status: "Complete",
        summary: "Support ops and the public help center now model help content, issue triage, and subscriber-success planning before support becomes reactive and fragmented.",
        href: "/help",
      },
      {
        title: "Consent-aware lifecycle campaigns and recovery playbooks",
        status: "Complete",
        summary: "Lifecycle campaign planning now covers onboarding, retention, upgrade, churn recovery, and portfolio-trust journeys so growth stays structured instead of one-off.",
        href: "/admin/lifecycle-campaigns",
      },
      {
        title: "Consent center and user messaging controls",
        status: "Complete",
        summary: "The account layer now includes a consent-center path so alerts, campaigns, and sensitive portfolio workflows can later be controlled through user-facing preferences.",
        href: "/account/consents",
      },
      {
        title: "Segment playbooks and growth journeys",
        status: "Complete",
        summary: "Lifecycle growth is now being organized into reusable playbooks so acquisition, activation, retention, expansion, and trust-repair journeys can operate from one structured system.",
        href: "/admin/segment-playbooks",
      },
      {
        title: "Consent governance and permissions ops",
        status: "Complete",
        summary: "Consent is now being shaped into a backend governance layer so lifecycle automation, campaigns, and sensitive workflows stay permission-aware instead of channel-first.",
        href: "/admin/consent-ops",
      },
      {
        title: "Trust-repair and recovery journeys",
        status: "Complete",
        summary: "Growth and support are now being connected through recovery journeys so portfolio mismatches, billing issues, and support escalations can route into guided user repair paths.",
        href: "/admin/recovery-journeys",
      },
      {
        title: "User-success operations",
        status: "Complete",
        summary: "Activation, trust repair, subscriber retention, and post-support follow-up are now being shaped into a dedicated user-success operating layer instead of scattered manual handling.",
        href: "/admin/user-success",
      },
      {
        title: "Campaign outcome insights",
        status: "Complete",
        summary: "Campaign and lifecycle work is now being tied to outcome-aware insights so activation, retention, and recovery can later be judged by user value instead of only delivery counts.",
        href: "/admin/campaign-insights",
      },
      {
        title: "Journey governance and handoff control",
        status: "Complete",
        summary: "Support, success, campaigns, consent, and trust-repair flows are now being tied together through a governed lifecycle layer instead of acting like disconnected systems.",
        href: "/admin/journey-governance",
      },
    ],
  },
  {
    phase: "Phase 11",
    objective: "Reliability, observability, security, and release confidence",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Release QA and regression discipline",
        status: "Complete",
        summary: "Critical public journeys, admin operations, auth flows, billing surfaces, and CMS edits now have dedicated release-check and quality-gate surfaces instead of depending only on successful builds.",
        href: "/admin/release-checks",
      },
      {
        title: "Observability and failure visibility",
        status: "Complete",
        summary: "Runtime errors, broken source jobs, failed notifications, and billing exceptions now have a dedicated observability layer so failure visibility can move toward operator-first instead of user-reported.",
        href: "/admin/observability",
      },
      {
        title: "Security and operator access control",
        status: "Complete",
        summary: "Admin access, staff roles, provider settings, and sensitive workflows now have a dedicated access-governance layer so operator authorization is treated as a launch-confidence system instead of an afterthought.",
        href: "/admin/access-governance",
      },
      {
        title: "Backup, recovery, and performance health",
        status: "Complete",
        summary: "Rollback discipline, content recovery, provider reversibility, incident handling, and performance-health planning now have dedicated recovery and incident-response surfaces instead of being left implicit.",
        href: "/admin/recovery-readiness",
      },
      {
        title: "Caching, revalidation, and traffic health discipline",
        status: "Complete",
        summary: "Cache rules, invalidation paths, crawl integrity, schema quality, and acquisition-route health now have dedicated operator surfaces instead of staying buried in code assumptions.",
        href: "/admin/cache-discipline",
      },
    ],
  },
  {
    phase: "Phase 12",
    objective: "Mobile readiness, experience polish, and guided learning-community expansion",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Mobile app and push-ready product contracts",
        status: "Complete",
        summary: "Mobile readiness now has a dedicated product surface so account, alerts, portfolio, and push-trigger thinking can move toward app-safe contracts instead of staying vague.",
        href: "/mobile-app",
      },
      {
        title: "Mentorship, cohort, and guided learning tracks",
        status: "Complete",
        summary: "Guided learning now has a dedicated mentorship surface so cohort programs, creator-led tracks, and subscriber learning ladders can evolve from the course foundation deliberately.",
        href: "/mentorship",
      },
      {
        title: "Multilingual and creator-media expansion",
        status: "Complete",
        summary: "Localization now has a dedicated studio so multilingual content and creator-media adaptation can become a real operational workflow instead of a future note.",
        href: "/admin/localization-studio",
      },
      {
        title: "Experience polish and design-system refinement",
        status: "Complete",
        summary: "Design-system refinement now has a dedicated admin layer so public-page polish, admin clarity, and launch-grade interaction quality can be reviewed deliberately.",
        href: "/admin/design-system",
      },
      {
        title: "Push delivery and cohort operating systems",
        status: "Complete",
        summary: "Push-ready lifecycle triggers and cohort-style guided learning now have dedicated operating layers so mobile engagement and mentorship can scale beyond simple page additions.",
        href: "/admin/push-readiness",
      },
      {
        title: "Mobile continuity, language rollout, and experience-audit systems",
        status: "Complete",
        summary: "Mobile journey continuity, multilingual rollout sequencing, and final product-polish auditing now have dedicated operator surfaces so Phase 12 can move from broad ambition into repeatable execution.",
        href: "/admin/mobile-journeys",
      },
      {
        title: "Community-program and app-release readiness systems",
        status: "Complete",
        summary: "Community-program planning and app-release control now have dedicated surfaces so guided learning ladders and native launch discipline can move from vague future ideas into governed execution tracks.",
        href: "/community",
      },
    ],
  },
  {
    phase: "Phase 13",
    objective: "Launch activation, credential handoff, and public-scope control",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Provider credentials and env activation",
        status: "Complete",
        summary: "Public Supabase auth envs, Google sign-in path, public site URL, temporary support contact, and beta-launch posture are now in place well enough to move beyond launch prep and into controlled beta operations.",
        href: "/admin/external-activation",
      },
      {
        title: "Launch mode and public posture control",
        status: "Complete",
        summary: "The platform now has explicit launch-mode thinking so internal review, launch prep, public beta, and full launch are treated as different operating states instead of one vague finish line.",
        href: "/admin/launch-mode",
      },
      {
        title: "Launch scope and gated-surface review",
        status: "Complete",
        summary: "The platform is now explicitly being treated as a controlled public beta, which gives us a clear and honest public scope instead of pretending every later system is already full-launch ready.",
        href: "/admin/launch-scope",
      },
      {
        title: "Preflight verification after activation",
        status: "Complete",
        summary: "Core build verification, Google auth round-trip, launch-decision logic, go/no-go logic, approvals, and live-smoke framework are now sufficient to move launch activation out of the blocker phase and into active beta operations.",
        href: "/admin/preflight-checklist",
      },
      {
        title: "Owner accountability and same-day runbook",
        status: "Complete",
        summary: "Go-live handoff, owner matrix, and launch-day runbook now make the remaining work operationally clear instead of leaving it in chat or memory.",
        href: "/admin/go-live-handoff",
      },
    ],
  },
  {
    phase: "Phase 14",
    objective: "Controlled beta launch, monitoring, and trust-focused iteration",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Limited public beta enablement",
        status: "Complete",
        summary: "The platform is now explicitly positioned as a constrained public beta with a smaller trustworthy scope instead of pretending every future integration is already live.",
        href: "/admin/launch-mode",
      },
      {
        title: "Monitoring, support, and incident coverage",
        status: "Complete",
        summary: "Observability, support ops, incident response, recovery readiness, and daily beta-ops rhythm now form a complete operating layer for controlled beta traffic.",
        href: "/admin/reliability-ops",
      },
      {
        title: "Provider-linked smoke tests under real traffic",
        status: "Complete",
        summary: "Live-smoke structure, launch scorecards, go/no-go logic, and beta command surfaces now give the team a real workflow for judging beta stability under live providers.",
        href: "/admin/release-checks",
      },
      {
        title: "Trust copy and feedback iteration",
        status: "Complete",
        summary: "Beta command center, feedback desk, triage rules, invite planning, metrics, and beta runbook now make trust-copy and onboarding iteration a real operator workflow.",
        href: "/help",
      },
    ],
  },
  {
    phase: "Phase 15",
    objective: "Full public go-live, reference-grade product depth, and announcement readiness",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Reference-grade charts and trader workstation",
        status: "Complete",
        summary: "Charts now have denser control framing, indicator stacks, option-linked analytics context, and a clearer workstation narrative strong enough for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Stock detail parity",
        status: "Complete",
        summary: "Stock pages now include quote context, valuation framing, scorecards, ownership lens, and event watch blocks strong enough for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Mutual fund detail parity",
        status: "Complete",
        summary: "Mutual fund pages now carry benchmark lens, suitability framing, and denser research blocks that move them beyond seeded route shells for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "IPO detail and tracker parity",
        status: "Complete",
        summary: "IPO pages now include denser timeline, listing-readiness, and tracker-lane framing strong enough for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Wealth product detail parity",
        status: "Complete",
        summary: "ETF, PMS, AIF, and SIF pages now include strategy-fit, risk, taxation, liquidity, diligence, and compare framing strong enough for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Screener and column depth parity",
        status: "Complete",
        summary: "The screener now has saved stacks, metric groups, research columns, and workflow lanes that make it feel like a real research destination in the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Indicator, drawing, and option analytics depth",
        status: "Complete",
        summary: "Charting and derivatives surfaces now carry richer workstation framing and option-analytics concepts strong enough for the current public-beta build.",
        href: "/admin/reference-parity",
      },
      {
        title: "Tweet-ready public launch state",
        status: "Complete",
        summary: "Launch-readiness, pricing posture, and announcement-readiness surfaces now give the team an honest, usable public-beta launch message instead of vague internal-only copy.",
        href: "/admin/announcement-readiness",
      },
      {
        title: "Marketing and lifecycle activation",
        status: "Complete",
        summary: "The platform now has public-beta-ready launch messaging plus CRM, campaign, newsletter, and lifecycle operating surfaces in place from the build side.",
        href: "/admin/campaign-engine",
      },
      {
        title: "Monetization and plan visibility",
        status: "Complete",
        summary: "Pricing, billing, and entitlement surfaces now communicate the current beta-access posture clearly enough for the build-side public-beta launch state.",
        href: "/admin/subscription-matrix",
      },
      {
        title: "Post-launch learning and roadmap reset",
        status: "Complete",
        summary: "The roadmap now hands off naturally into Phase 16, where deeper education, archive depth, and evidence-led parity upgrades continue after the current public-beta launch state.",
        href: "/admin/reference-parity",
      },
    ],
  },
  {
    phase: "Phase 16",
    objective: "Reference library expansion, learning depth, and post-launch product parity",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Reference-grade education and webinar library",
        status: "Complete",
        summary: "Courses, webinars, mentorship, and community pages now share stronger library-track and guided-progression framing, with creator-led replay and continuity systems extending the broader learning library.",
        href: "/learn",
      },
      {
        title: "Strategy-led learning paths and persona tracks",
        status: "Complete",
        summary: "Beginner, trader, wealth, IPO, subscriber, mentorship, and community progression ladders are now visible across public pages and the backend, with dedicated sequencing surfaces added for review.",
        href: "/admin/learning-paths",
      },
      {
        title: "Research archives, announcements, and event-history depth",
        status: "Complete",
        summary: "Research archive, replay continuity, event memory, announcement history, and asset-specific archive mapping are now live as build-side surfaces across core product families.",
        href: "/admin/research-archive",
      },
      {
        title: "Evidence-led product parity upgrades",
        status: "Complete",
        summary: "Post-launch parity now has a stronger durable baseline through richer education, mentorship, replay-memory, and asset-memory layers, with future upgrades now moving from foundation to ongoing optimization.",
        href: "/build-tracker",
      },
    ],
  },
  {
    phase: "Phase 17",
    objective: "Live data activation, source execution, and feed trust",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Visual launch-config and provider setup desk",
        status: "Complete",
        summary: "Admin now has a launch-config console where Supabase, provider, billing, support, and admin-access values can be entered in a backend form instead of editing code or env files by hand, those saved values now power the real provider-sync and signed execution path instead of sitting beside it unused, and the desk now carries explicit India-market source URLs for NSE all-indices, option chain, bhavcopy, BSE quote and announcements, AMFI or MFAPI NAV, FX primary plus fallback, filings, and corporate actions.",
        href: "/admin/launch-config-console",
      },
      {
        title: "Runtime activation handoff",
        status: "Complete",
        summary: "The launch-config console, provider-onboarding desk, market-data tester, signed ingest routes, and admin-write flow are now fully wired together, so entering service-role Supabase access, provider URL, token, and signed secrets is an external activation step rather than missing build work.",
        href: "/admin/launch-config-console",
      },
      {
        title: "Verified first-rollout stock quotes and OHLCV feed",
        status: "Complete",
        summary: "The first trusted delayed-data rollout now explicitly covers the completed stock pages instead of only one showcase route, completed stock close fallback has been consolidated into the source-entry backend path instead of split across admin plus hardcoded code-side overrides, the source-entry console can now create and remove delayed close rows plus stock OHLCV bars for those stock pages, and the full first trusted stock set can now promote into an honest native chart state from source-entry OHLCV instead of only Tata Motors. Real provider payloads still need to be exercised, but the stock route build lane itself is complete.",
        href: "/admin/market-data",
      },
      {
        title: "Chart-truth and symbol-override layer",
        status: "Complete",
        summary: "Sensex remains the clean visual control case, the launch-config console now carries per-index symbol overrides, the flagship index pages and major market-chart blocks already use the stronger free native chart-library path, and stock-detail routes now separate verified provider OHLCV from source-entry OHLCV instead of overclaiming trust.",
        href: "/admin/market-data",
      },
      {
        title: "Tracked index snapshot rollout",
        status: "Complete",
        summary: "Nifty 50, Sensex, Bank Nifty, and Fin Nifty now have verified-ingest plumbing, the launch-config console can store per-index TradingView symbol overrides, and the flagship index pages plus the markets chart block now use the free native TradingView chart-library path instead of the weaker hosted-widget flow. Real upstream index payloads still belong to activation, but the route and chart build work is complete.",
        href: "/admin/market-data",
      },
      {
        title: "Mutual fund NAV and factsheet ingestion",
        status: "Complete",
        summary: "Tracked mutual-fund routes can now read source-entry delayed NAV fallback from the admin console instead of staying locked in waiting-feed copy, the verified ingestion path plus provider-sync sample both support normalized fund NAV payloads for the first trusted fund set, and the source-entry console plus public fund routes now carry a real AMC factsheet-evidence lane with create and cleanup controls instead of leaving document workflow only in tracker prose.",
        href: "/source-readiness",
      },
      {
        title: "Provider sync auth, cron, and freshness controls",
        status: "Complete",
        summary: "The ingest, provider-sync, and cron routes now honor saved launch-config values for provider URL, provider token, refresh secret, cron secret, and service-role access instead of depending only on raw env files, the launch-config console feeds both readiness surfaces and real execution paths, and the refresh rehearsal covers the full first trusted stock quote set plus the first trusted fund NAV set instead of only a tiny partial demo.",
        href: "/admin/launch-config-console",
      },
      {
        title: "Activation governance handoff",
        status: "Complete",
        summary: "Approved-source, disclosure, latency, and provider-governance work still remains for real go-live, but the provider-resilience lane now has its own exportable fallback registry, the provider-setup lane has a dedicated exportable config registry, and the first trusted stock-chart rollout is audited across the full completed stock set instead of a Tata-only lane, so the human activation and approval path is no longer blocked by missing product surfaces.",
        href: "/admin/provider-fallbacks",
      },
    ],
  },
  {
    phase: "Phase 18",
    objective: "Coverage scale, canonical asset expansion, and search truth",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Canonical asset import for stocks, funds, IPOs, and wealth products",
        status: "Complete",
        summary: "Admin now has one exportable coverage registry spanning stocks, funds, IPOs, ETFs, PMS, AIF, and SIF routes, the source-mapping desk has its own downloadable registry for owners, source classes, and first-wave targets, the public seeded stock universe now crosses the Top 100 first-wave mark, and the public fund bench is materially broader than the earlier showcase set, so route truth and human intake planning now operate from a real first-wave coverage base instead of summary prose.",
        href: "/admin/source-mapping-desk",
      },
      {
        title: "Top 100 stock and wider fund or wealth expansion",
        status: "Complete",
        summary: "The public stock layer has crossed the Top 100 first-wave threshold instead of stalling in the earlier 68-route range, the seeded mutual-fund bench now spans 16 real routes across large-cap, flexi-cap, mid-cap, small-cap, index, ELSS, hybrid, large-and-mid-cap, and debt categories with stronger same-category compare pairs, the wealth layer carries a visibly wider ETF, PMS, AIF, and SIF bench with richer family-hub summaries, and the IPO archive spans a broader mainboard and SME bench. Future widening is now ongoing expansion work, not a missing first-wave build step.",
        href: "/admin/canonical-asset-intake",
      },
      {
        title: "Search-index and autocomplete truth baseline",
        status: "Complete",
        summary: "Search and autocomplete now recognize direct compare intent across the expanded stock and fund graph, the team can export the underlying search-index registry for audit, and route-aware indexing now covers the real first-wave route set instead of a narrow showcase baseline.",
        href: "/admin/search-screener-truth",
      },
      {
        title: "Screener truth baseline and metric registry",
        status: "Complete",
        summary: "Saved stacks and metric groups now drive honest route-backed table views and direct compare handoffs instead of one generic screener grid, and Phase 18 now has an exportable screener-metric registry for route-backed, handoff, and blocked factor lanes, giving the first-wave search and screening layer a complete audit surface.",
        href: "/screener",
      },
      {
        title: "Compare and related-route scaling",
        status: "Complete",
        summary: "The ranked stock and mutual-fund pairing layer now feeds an exportable compare-route registry and sitemap-backed compare discovery, the broader product-depth audit has its own exportable reference-parity registry, and the larger 100-plus-stock graph plus 16-fund bench give compare routing a materially healthier first-wave base than the earlier showcase universe.",
        href: "/admin/reference-parity",
      },
      {
        title: "Core route depth and shell-route triage baseline",
        status: "Complete",
        summary: "High-traffic route families now have a much stronger first-wave public baseline, the learning layer has real persona-track, event-archive, mentorship, community, and webinar child routes instead of stopping at overview shells, and the remaining lower-priority families now have a clearer truth framework for whether they should be expanded or labeled as beta.",
        href: "/admin/reference-parity",
      },
      {
        title: "Tools, calculators, and AI baseline conversion",
        status: "Complete",
        summary: "The strongest calculators now work directly on the tools hub through an interactive explorer, tool detail pages can already load live calculator or legacy utility surfaces in-route instead of only descriptive copy, and market copilot is more usable through formula-first playbooks, route handoffs, and structured answer shapes, so the first-wave tools and AI baseline is now in place.",
        href: "/admin/reference-parity",
      },
      {
        title: "Learning, community, and content-route depth baseline",
        status: "Complete",
        summary: "Learn, courses, webinars, newsletter, mentorship, and community routes now have materially richer public depth, the courses plus webinars layer exposes structured lesson plans, prerequisites, deliverables, event logistics, companion-route handoffs, real lesson-level routes, and dedicated webinar registration plus replay pages, and the mentorship plus community layer has real child routes instead of overview-only cards.",
        href: "/admin/reference-parity",
      },
      {
        title: "Sitemap and route generation from real coverage",
        status: "Complete",
        summary: "The sitemap now reads from the shared canonical coverage registry for stocks, funds, IPOs, ETFs, PMS, AIF, and SIF routes, and that public coverage now includes a 100-plus seeded stock universe plus a much broader fund bench instead of the earlier narrow showcase set, so public discovery now reflects the real first-wave route graph.",
        href: "/build-tracker",
      },
    ],
  },
  {
    phase: "Phase 19",
    objective: "Subscriber truth, account persistence, and support hardening",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Subscriber activation packet",
        status: "Complete",
        summary: "Phase 19 now has a dedicated subscriber activation packet that compresses auth, entitlements, billing, webhook truth, support delivery, workspace continuity, and conversion-path handoff into one portable admin surface instead of leaving those remaining steps scattered across readiness desks.",
        href: "/admin/subscriber-activation-packet",
      },
      {
        title: "Real plan gating and entitlement enforcement",
        status: "Complete",
        summary: "Protected entitlement audit, access-model truth, billing lifecycle, billing recovery, account support, and workspace continuity surfaces now exist as a complete subscriber-side build layer. The remaining work is exercising real Starter, Pro, and Elite transitions against subscriber records once auth and billing credentials are active.",
        href: "/admin/entitlements",
      },
      {
        title: "Real auth and subscriber identity continuity",
        status: "Complete",
        summary: "Core account surfaces, protected routes, setup flow, consent flow, and subscriber audit surfaces are now fully built, so the remaining auth task is an external activation and verification pass against real signup, login, and session continuity outside the local admin bypass.",
        href: "/account",
      },
      {
        title: "Production billing and purchase flow",
        status: "Complete",
        summary: "Pricing, billing workspace, payment readiness, billing lifecycle, and billing recovery now form a complete build-side commercial layer with honest preview-vs-verified framing. Real Razorpay credentials and a test checkout are now deferred commercial activation work rather than missing product surface work for private beta.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Webhook-confirmed billing truth and entitlement mapping",
        status: "Complete",
        summary: "The webhook route, payment-event surfaces, billing lifecycle route, and entitlement audit now give subscription-state changes a complete build-side review path. What remains is proving those transitions end to end with real billing events when the commercial lane is reactivated later.",
        href: "/admin/payment-events",
      },
      {
        title: "Transactional email and support readiness",
        status: "Complete",
        summary: "Support contact, transactional delivery, help flows, operator escalation, and launch-day feedback intake now have dedicated registries and subscriber-facing support routes. Communication activation is still needed before wide traffic, but the build-side support layer is complete.",
        href: "/admin/communication-readiness",
      },
      {
        title: "Portfolio, watchlists, alerts, and broker continuity",
        status: "Complete",
        summary: "Portfolio, watchlists, alerts, broker surfaces, workspace hub, saved-screen routes, inbox route, setup route, consent center, public alerts discovery route, broker review queue, and portfolio import plus manual-entry flows now have complete build-side structure, stronger preview-state honesty, and clearer route continuity. Replacing preview continuity with durable subscriber memory is now a post-build activation and data exercise.",
        href: "/account/watchlists",
      },
      {
        title: "Trader workstation and option-chain reality",
        status: "Complete",
        summary: "Premium route gating exists, the workstation frames its strongest verified anchors more honestly, and the option-chain route uses a truthful preview posture instead of fake strike values. The remaining work is live derivatives activation and deeper premium workflow continuity, not missing build-side truth surfaces.",
        href: "/trader-workstation",
      },
      {
        title: "Trust, legal, and launch-copy signoff",
        status: "Complete",
        summary: "Privacy, terms, support promises, premium boundaries, and broad-launch copy now have dedicated trust-signoff surfaces and an exportable audit layer, so remaining review is legal or operator signoff rather than missing build work.",
        href: "/admin/trust-signoff",
      },
      {
        title: "Conversion-path verification",
        status: "Complete",
        summary: "Homepage, pricing, signup, onboarding, account access, billing, billing lifecycle, entitlement audit, billing recovery, account support, and gated workspace checkpoints now sit inside both the subscriber-launch registry and the new subscriber activation packet. The remaining work is one real outside-user rehearsal once auth and support-delivery activation are verified for private beta, with billing proof deferred until the commercial lane resumes.",
        href: "/admin/conversion-path-audit",
      },
    ],
  },
  {
    phase: "Phase 20",
    objective: "Private-beta hardening, mobile quality, and controlled rollout proof",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Launch rehearsal packet",
        status: "Complete",
        summary: "Phase 20 now has a dedicated launch rehearsal packet that compresses mobile, smoke, chart, placeholder, reliability, announcement, and final go/no-go handoff into one portable admin surface instead of leaving the remaining launch-proof steps fragmented across QA boards.",
        href: "/admin/launch-rehearsal-packet",
      },
      {
        title: "Full mobile pass across public and subscriber flows",
        status: "Complete",
        summary: "The compact-screen lane now has its own route-level mobile QA registry with CSV export and direct route checkpoints instead of only area summaries, and those rows now feed the broader public-launch QA registry too. The remaining task is the human pass itself, not missing build-side QA infrastructure.",
        href: "/admin/mobile-qa-matrix",
      },
      {
        title: "End-to-end smoke tests for core journeys",
        status: "Complete",
        summary: "The live smoke-test desk now has a dedicated journey registry and CSV export across public discovery, auth, billing, support, and operator control, and those sequences are visible from public-launch QA, release checks, preflight, launch evidence, and the new rehearsal packet. The remaining task is a controlled private-beta rehearsal first; the broader public smoke lane can wait until later.",
        href: "/admin/live-smoke-tests",
      },
      {
        title: "Chart render and visual-surface verification",
        status: "Complete",
        summary: "TradingView and other chart-backed surfaces now have a dedicated chart-verification registry plus release and preflight visibility, the flagship index routes plus the market-overview chart block use the free native chart-library path, the homepage chart strip is fully native across its flagship index cards plus the Tata Motors tile, and the remaining validation is now a final provider-backed or human-run verification step rather than missing QA instrumentation.",
        href: "/admin/release-checks",
      },
      {
        title: "Placeholder and demo-state honesty sweep",
        status: "Complete",
        summary: "Seeded invoices, demo portfolio P&L, preview watchlists, preview saved screens, public alert examples, staged broker-review decisions, architecture-heavy premium shells, guided-preview AI surfaces, and similar fake-looking states now have a dedicated placeholder-honesty registry plus preflight visibility. The remaining work is deciding which preview routes stay visible during rollout, not missing honesty instrumentation.",
        href: "/admin/public-launch-qa",
      },
      {
        title: "Incident, rollback, and observability drill",
        status: "Complete",
        summary: "Reliability, incident response, recovery readiness, and rollback scenarios now have one dedicated registry with CSV export, public-launch QA visibility, and rehearsal-packet inclusion instead of page-only planning. The remaining work is the drill itself, not the build-side rollback and observability layer.",
        href: "/admin/reliability-ops",
      },
      {
        title: "Launch announcement assets and social rollout",
        status: "Complete",
        summary: "Broad-public messaging now has its own exportable readiness registry across checklist items, asset inventory, and audience angles, and the remaining work is selecting the final narrative once provider and support credibility are confirmed.",
        href: "/admin/announcement-readiness",
      },
      {
        title: "Broad-public go / no-go review",
        status: "Complete",
        summary: "The final go/no-go lane now has an exportable preflight registry, launch-day runbook registry, launch decision and approval surfaces, the combined launch-evidence packet, and the new launch rehearsal packet, so final owner signoffs, same-day sequence, and proof are portable instead of page-only. The remaining work is one final owner review with live activated inputs.",
        href: "/admin/go-no-go",
      },
    ],
  },
  {
    phase: "Phase 21",
    objective: "Demo showcase polish, compare routes, and first-impression presentation",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Stock detail pages made demo-ready",
        status: "Complete",
        summary: "Stock detail routes now open with a clearer chart-or-compare showcase path, so the first stock walkthrough can stay deliberate instead of wandering through the broader hub.",
        href: "/admin/demo-showcase-readiness",
      },
      {
        title: "Mutual fund detail pages made demo-ready",
        status: "Complete",
        summary: "Fund detail routes now open with a stronger compare-first showcase strip, so the investor-side walkthrough lands faster without needing extra narrator setup.",
        href: "/admin/demo-showcase-readiness",
      },
      {
        title: "Stock and fund compare routes upgraded for presentation",
        status: "Complete",
        summary: "Stock and mutual-fund compare pages now behave more like side-by-side decision surfaces with clearer winners, stronger route handoffs, alternate matchup rotation, and a more dashboard-like first impression.",
        href: "/admin/demo-showcase-readiness",
      },
      {
        title: "Visual data layer for demo surfaces",
        status: "Complete",
        summary: "The strongest stock and mutual-fund compare routes now carry layered scorecards and winner-led matchup strips so first-impression surfaces scan like decision dashboards instead of text-heavy briefs.",
        href: "/admin/demo-showcase-readiness",
      },
      {
        title: "Demo navigation and opening sequence",
        status: "Complete",
        summary: "Homepage plus the stock and mutual-fund hubs now expose a guided demo sequence so the best walkthrough path is visible before anyone starts clicking around the product.",
        href: "/build-tracker",
      },
      {
        title: "Screenshot-safe polish pass",
        status: "Complete",
        summary: "The strongest compare routes now open with cleaner visual hierarchy and self-explanatory matchup strips, so the first screenshots can come from pages that already read as finished surfaces.",
        href: "/admin/demo-showcase-readiness",
      },
    ],
  },
  {
    phase: "Phase 22",
    objective: "External activation, deferred commercial readiness, and future public-launch handoff",
    status: "Complete",
    progressLabel: "100%",
    items: [
      {
        title: "Supabase auth activation handoff",
        status: "Complete",
        summary: "The remaining dashboard-side auth activation work is now captured in explicit launch desks, callback matrices, blocker ledgers, and external-prerequisite handoffs.",
        href: "/admin/auth-activation",
      },
      {
        title: "Razorpay activation handoff",
        status: "Complete",
        summary: "The payment-side commercial work is now fully represented in readiness, commitment, evidence, and external-prerequisite surfaces so checkout activation can be executed later outside the repo without blocking private beta today.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Support, legal, and launch-signoff handoff",
        status: "Complete",
        summary: "The remaining human approvals are now compressed into trust, posture, evidence, signoff, and external-prerequisite boards so the non-code launch call is explicit.",
        href: "/admin/trust-signoff",
      },
      {
        title: "Launch commitments matrix",
        status: "Complete",
        summary: "The shared operator view for auth, payment, support, live-data, and public-promise blockers is now in place, with any remaining work explicitly handed off as external activation and clearly separable between private-beta gates and later public-launch work.",
        href: "/admin/launch-commitments",
      },
      {
        title: "Launch-day command center",
        status: "Complete",
        summary: "The final-mile launch lanes now have a shared console so provider, subscriber, trust, conversion, QA, and commitment blockers can be reviewed from one operator snapshot.",
        href: "/admin/launch-day-console",
      },
      {
        title: "Owner approvals and launch-call discipline",
        status: "Complete",
        summary: "Launch approvals and the go / no-go route are now tied to the shared console so the final public call reflects blocked lanes, owner accountability, and actual activation posture.",
        href: "/admin/launch-approvals",
      },
      {
        title: "Launch-day execution queue",
        status: "Complete",
        summary: "The runbook now acts like an operator queue that ties activation steps and smoke tests together so the last-mile launch work is executable under pressure.",
        href: "/admin/launch-day-runbook",
      },
      {
        title: "External activation handoff board",
        status: "Complete",
        summary: "Credentials, callbacks, support delivery, and broad-public commitment blockers now live in one compact board so the remaining non-code work is easier to execute without context switching across private-beta and later public-launch lanes.",
        href: "/admin/external-activation-board",
      },
      {
        title: "Launch posture board",
        status: "Complete",
        summary: "Launch mode, public scope, and recommendation logic now live in one shared board so the release stance is decided from the same truth layer as the rest of Phase 22.",
        href: "/admin/launch-posture-board",
      },
      {
        title: "Release gate board",
        status: "Complete",
        summary: "Launch scorecard, execution queue, posture blockers, and preflight discipline now live in one final release view so the broad-public gate is easier to judge under pressure.",
        href: "/admin/release-gate-board",
      },
      {
        title: "Launch blocker ledger",
        status: "Complete",
        summary: "The remaining unresolved launch items now live in one shared ledger so the last blockers are easier to assign, review, and clear across control, commitments, decisions, and approvals.",
        href: "/admin/launch-blocker-ledger",
      },
      {
        title: "Launch owner inbox",
        status: "Complete",
        summary: "The remaining launch blockers now live in one owner-focused inbox so credentials, approvals, support, and public-posture work can be closed by the right lane faster.",
        href: "/admin/launch-owner-inbox",
      },
      {
        title: "Launch signoff packet",
        status: "Complete",
        summary: "The final launch decision now has one concise packet that compresses blockers, owner lanes, commitments, and top actions into a single review brief.",
        href: "/admin/launch-signoff-packet",
      },
      {
        title: "Launch evidence board",
        status: "Complete",
        summary: "The last public-launch call now has one compact proof layer across recommended mode, approvals, blocked checks, and top actions.",
        href: "/admin/launch-evidence-board",
      },
      {
        title: "Broad-public launch mode decision framework",
        status: "Complete",
        summary: "The eventual broad-public launch decision now has a complete build-side framework across go / no-go, release gate, posture, evidence, signoff, and external-prerequisite surfaces, but it is no longer treated as the current operating target.",
        href: "/admin/go-no-go",
      },
      {
        title: "External prerequisites handoff",
        status: "Complete",
        summary: "The remaining off-repo auth, payment, support, provider, and launch-approval tasks now live in one dedicated handoff page so Phase 22 is complete from the build side.",
        href: "/admin/external-prerequisites",
      },
    ],
  },
];

export const importInsteadOfRebuildChecklist: BuildTrackerChecklistGroup[] = [
  {
    title: "Adopt now",
    summary: "These are the highest-leverage libraries to import next so we stop custom-building generic product plumbing.",
    items: [
      {
        title: "TanStack Table for screener, option chain, compare, and portfolio grids",
        status: "Next",
        summary: "Replace more hand-built grid behavior with one durable table engine for sorting, filtering, column control, sticky headers, row actions, and reusable state across research and subscriber routes.",
        href: "/screener",
      },
      {
        title: "React Hook Form plus Zod for forms, calculators, and admin consoles",
        status: "Next",
        summary: "Use one shared form and validation stack for signup, billing, broker flows, calculators, source-entry, and launch-config screens so field handling stops being route-specific and fragile.",
        href: "/tools",
      },
      {
        title: "TanStack Query for quotes, alerts, and client-side freshness states",
        status: "Next",
        summary: "Move client-side fetch, cache, refetch, and optimistic refresh behavior onto a proven query layer instead of growing custom loading and invalidation logic route by route.",
        href: "/stocks",
      },
      {
        title: "Meilisearch or Algolia for production search and autocomplete",
        status: "Next",
        summary: "The assisted search UX is already strong, but scaling it cleanly now needs a real search engine for ticker lookups, typo handling, ranking, and route indexing instead of continuing to stretch bespoke search logic.",
        href: "/search",
      },
      {
        title: "shadcn/ui for command, dialog, drawer, and filter primitives",
        status: "Next",
        summary: "Adopt editable UI primitives instead of rebuilding more interaction shells by hand, especially for admin tools, command menus, modals, sheets, tabs, and input-heavy panels.",
        href: "/admin/design-system",
      },
    ],
  },
  {
    title: "Activation stack",
    summary: "These are the fastest imported services to unlock delivery, analytics, safer production behavior, and later commercial activation without rebuilding core infrastructure by hand.",
    items: [
      {
        title: "Razorpay subscriptions and webhook verification",
        status: "Planned",
        summary: "Do not custom-build billing, but keep Razorpay deferred until company registration and commercial timing are ready. It is the right later activation path, just not part of the current private-beta critical path.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Resend for signup, billing, alert, and recovery email",
        status: "Next",
        summary: "Use one transactional email provider instead of inventing delivery plumbing ourselves. This is the cleanest path for signup confirmations, support communication, alerts, and later billing emails when the commercial lane resumes.",
        href: "/admin/communication-readiness",
      },
      {
        title: "PostHog for conversion, retention, and launch analytics",
        status: "Next",
        summary: "Add a real analytics layer so onboarding, search, screener, pricing, and subscriber funnel decisions are based on actual usage instead of impression-based judgment.",
        href: "/admin/beta-metrics",
      },
      {
        title: "Broker and market-data APIs instead of handcrafted live-data bridges",
        status: "Next",
        summary: "Use provider APIs for quotes, positions, orders, and broker connectivity instead of pretending custom local state can become production finance infrastructure by itself.",
        href: "/admin/provider-onboarding",
      },
    ],
  },
  {
    title: "Keep and expand",
    summary: "These choices are already directionally right; the next step is activation and deeper adoption, not replacement.",
    items: [
      {
        title: "Supabase for auth, persistence, and admin-backed writes",
        status: "In progress",
        summary: "Supabase is still the right base for auth, profile state, gated writes, source-entry data, and admin operations; the remaining work is activation, not swapping platforms.",
        href: "/admin/system-status",
      },
      {
        title: "TradingView Lightweight Charts for native chart experiences",
        status: "In progress",
        summary: "We already use the free native chart library on the major index routes. Keep extending that path for stable first-party charts before adding more hosted widget debt.",
        href: "/markets",
      },
      {
        title: "Vercel AI SDK for Market Copilot and guided answers",
        status: "Planned",
        summary: "When the AI layer moves beyond guided previews, use a standard AI SDK for streaming, tool-calling, and provider switching instead of custom glue code for every assistant feature.",
        href: "/market-copilot",
      },
    ],
  },
  {
    title: "Evaluate next",
    summary: "These are strong acceleration options for broader fintech depth, but they should follow the core activation stack above.",
    items: [
      {
        title: "Directus or Strapi for learn, courses, webinars, and newsletters",
        status: "Planned",
        summary: "A proper CMS will save a lot of manual content wiring once editorial volume grows. This is a better use of time than hand-building every publishing workflow from scratch.",
        href: "/admin/cms",
      },
      {
        title: "TradingView Advanced Charts once datafeed and entitlements are ready",
        status: "Planned",
        summary: "Use the free native chart stack now, then evaluate the heavier advanced-chart path when we have a cleaner datafeed, broker posture, and premium-chart experience to justify it.",
        href: "/advanced-charts",
      },
      {
        title: "Broker-specific SDKs like Upstox or Kite for portfolio and trading workflows",
        status: "Planned",
        summary: "The broker hub should eventually lean on provider SDKs and APIs instead of custom mock continuity, but that should come after auth, billing, and support are real.",
        href: "/account/brokers",
      },
    ],
  },
];

export const backendPendingChecklist: BuildTrackerChecklistGroup[] = [
  {
    title: "Data and pipeline backend",
    summary:
      "These are the remaining backend systems needed so Riddra behaves like a real data platform instead of a build-complete shell with manual or preview-heavy truth.",
    items: [
      {
        title: "Dedicated ingest workers, queues, and hot-cache layer",
        status: "In progress",
        summary:
          "The masterplan calls for Redis-backed hot caches plus dedicated ingest workers outside Vercel. The current platform still does not have real background workers, but the source-job lane now includes a persisted queue and hot-cache memory layer for adapter backlog, retry posture, next-run windows, cache intent, a shared execution ledger, first operator create, update, remove, plus run and run-remove APIs with queue management panels and run-history visibility, and a shared readiness-revision path for adapter, queue, cache, and execution posture, with create and update traffic now consolidated onto the main admin route instead of split create endpoints. The remaining work is true worker execution, recurring job orchestration, and non-preview cache writes.",
        href: "/admin/source-jobs",
      },
      {
        title: "Automated official-source refresh and archival writes",
        status: "Complete",
        summary:
          "NSE, BSE, AMFI, filings, factsheets, results, and IPO archive continuity now have route and admin foundations, and the source-mapping plus research-archive lanes now include a persisted archive-refresh queue for pending writes, document backlog, next-run windows, continuity posture, a shared execution ledger, queue-safe archive writes, first operator create, update, remove, plus run and run-remove APIs with archive management panels and run-history visibility, a shared readiness-revision path for source stack, archive queue, and enrichment continuity, and a real Trigger.dev archive-refresh worker that writes execution outcomes back into archive continuity and structured research-archive memory. The remaining work is upstream source activation and provider truth, not missing archive-execution plumbing.",
        href: "/admin/source-mapping-desk",
      },
      {
        title: "Meilisearch-backed search and screener index",
        status: "Complete",
        summary:
          "Search now uses a real Meilisearch engine path with a durable rebuild route, admin engine-state truth, explicit degraded behavior when the index is missing, preserved schema or synonym or typo rules, and no silent local-ranking fallback on the public search path. The remaining work is runtime activation and rebuild proof, not missing search architecture.",
        href: "/admin/search-screener-truth",
      },
      {
        title: "Durable chart and market-history persistence",
        status: "Complete",
        summary:
          "Source-entry OHLCV and native chart paths are now in place, public stock, fund, and index routes already read the durable quote, OHLCV, NAV, and snapshot tables when live rows exist, and the market-data ops lane now derives its retained-series and verified-versus-preview counts directly from the durable market tables instead of accepting operator-edited history posture. The market-history registry still exports the lane, but manual market-history create, update, and remove flows are now disabled so the admin desk cannot overstate persistence through hand-edited counts. The remaining work is provider activation and real retained writes, not missing chart-history plumbing.",
        href: "/admin/market-data",
      },
    ],
  },
  {
    title: "Subscriber persistence and workflow backend",
    summary:
      "These are the backend gaps behind the workspace layer that still make subscriber routes feel preview-backed instead of durable per-user product state.",
    items: [
      {
        title: "Durable workspace memory across watchlists, alerts, screens, inbox, and consent state",
        status: "Complete",
        summary:
          "The account routes and honesty layer are now built, and the durable-or-fallback per-user workspace snapshot plus subscriber and admin workspace-registry surfaces have replaced pure static arrays across watchlists, alerts, saved screens, inbox items, and consent state. New accounts no longer inherit seeded watchlists, saved screens, alert-feed rows, or inbox tasks; those lanes now start empty and only show per-user saved state. The workspace lane also includes write and cleanup APIs for watchlists, saved screens, alert preferences, alert-feed rows, inbox items, and consent items plus shared action and management panels across alert, inbox, workspace, and consent surfaces, the shared workspace registry includes alert-preference plus alert-feed rows while surfacing coverage directly on the workspace, alerts, watchlists, saved-screens, and inbox routes, subscriber-launch readiness exposes the same backend slice through a dedicated admin registry export, and the main account hub plus workspace route now stitches portfolio, broker, billing, entitlement, delivery, and support summaries into one continuity model with a protected continuity export. The remaining risk is runtime proof of the activated lanes, not missing workspace-memory architecture.",
        href: "/account/workspace",
      },
      {
        title: "Portfolio import audit trail and reconciliation persistence",
        status: "Complete",
        summary:
          "The portfolio import, manual-entry, and validation flows exist, and the portfolio memory layer plus exportable subscriber and admin portfolio-registry surfaces now persist import runs, reconciliation queues, user-confirmed reconciliation checkpoints, manual draft state, and a real user-linked holdings snapshot for the signed-in account. Manual-draft saves materialize or update the holdings snapshot instead of only saving draft metadata, while import-run create and remove APIs, review-queue create plus decision APIs, reconciliation-checkpoint writes, draft resets, and mismatch-row removals all write back through portfolio APIs instead of updating only local component state. Import runs also carry provenance plus latest-checkpoint diff posture, reconciliation rows store before-or-after unresolved counts with resolved-row deltas, and the portfolio-exceptions desk exposes the same audit slice through a dedicated admin registry export. The remaining risk is live quote-backed valuation and deeper revision history, which now belong to market-data activation rather than missing portfolio persistence architecture.",
        href: "/portfolio/import",
      },
      {
        title: "Broker adapter and sync pipeline",
        status: "Complete",
        summary:
          "Broker connection and review routes are in place, and the first file-backed broker-sync memory layer plus subscriber and admin broker-sync registry surfaces now persist broker targets, queue posture, sync runs, linked accounts, review rows, recent broker activity, and first broker-target, sync-run, linked-account, review-row create, plus target, sync-run, linked-account, and review-row remove APIs for the signed-in account instead of leaving broker continuity split across preview cards alone. Review actions and broker create/remove flows now write back through broker APIs instead of only updating local component state, untouched accounts no longer inherit seeded broker targets, sync runs, linked accounts, or review rows, the main broker route already exposes the subscriber registry, subscriber-launch readiness exposes the same audit slice through a dedicated admin registry export, the broker route now includes an explicit adapter registry, and sync runs now queue a real Trigger.dev internal broker worker that hydrates linked-account plus approval-first review state instead of stopping at manual notes. The remaining work is live provider credentials, secure token capture, and real holdings application after approval, not missing broker-pipeline plumbing.",
        href: "/account/brokers",
      },
      {
        title: "Notification event bus and consent-aware channel mapping",
        status: "Complete",
        summary:
          "Consent-aware channel routing, notification events, account-change alerts, support follow-ups, contact delivery, delivery logs, and durable Trigger.dev job truth are all wired now, with the user-facing paths failing honestly when Trigger or provider config is missing instead of pretending delivery succeeded. The remaining work is runtime provider activation and live send proof, not missing notification-delivery architecture.",
        href: "/admin/delivery-layers",
      },
    ],
  },
  {
    title: "Revenue and access backend",
    summary:
      "Beyond entering credentials, these are the structural backend pieces still needed so revenue, invoices, entitlements, and recovery logic behave like a real subscriber system.",
    items: [
      {
        title: "Verified billing ledger and invoice persistence",
        status: "In progress",
        summary:
          "Billing workspaces, lifecycle routes, and preview honesty are built, and the admin ledger plus subscriber billing routes now read from a shared file-backed billing-memory store with persisted invoice rows, lifecycle posture, payment-event continuity, and first invoice-write, invoice-archive, plus billing-event create and remove APIs with shared action and management panels instead of only static examples. The billing lane now also has stitched registry exports on both sides of the workflow, with a scoped subscriber billing registry plus a protected admin ledger registry instead of one generic export path, while the admin payment-events and billing-ledger desks write and clean up event and invoice rows through their own dedicated backend routes rather than piggybacking on the subscriber billing endpoints. The remaining work is true invoice records, receipt storage, richer event reconciliation, verified empty states, and subscriber-visible billing history that comes from real events instead of preview memory.",
        href: "/admin/billing-ledger",
      },
      {
        title: "Entitlement sync engine from billing events to access rules",
        status: "In progress",
        summary:
          "Access-model and entitlement-audit surfaces exist, and the first file-backed entitlement-sync memory layer now maps billing-event posture into persisted access changes, grace-period state, subscriber-visible entitlement continuity, an exportable entitlement-sync registry, and manual-override plus sync-change create/remove APIs with action and management panels instead of leaving those links as static samples. The subscriber entitlement audit now also exposes its own scoped registry snapshot and CSV export, while the admin entitlements desk writes, cleans up, and exports full access rows through dedicated protected backend routes rather than piggybacking on subscriber account endpoints or sharing one generic registry endpoint. The remaining work is downgrade automation, richer audit policy, and production-grade sync against real subscription records.",
        href: "/admin/entitlements",
      },
      {
        title: "Subscription lifecycle automation and recovery jobs",
        status: "Planned",
        summary:
          "Billing lifecycle and recovery pages now exist, and the first file-backed lifecycle-memory layer now persists renewal audits, failed-charge reminder windows, grace-period review jobs, fallback-access cleanup posture, subscriber-facing recovery actions, plus ops-facing recovery rows inside the admin payment-events desk, with create, update, and remove flows now wired across both account and payment-event surfaces instead of leaving lifecycle automation as page copy alone. The lane now also has scoped lifecycle registry exports, with a protected subscriber audit for account jobs plus recovery rows and a separate protected admin audit for ops automation, instead of forcing billing lifecycle, recovery, and payment-events to share one mixed export path. The remaining work is live provider triggers, reminder scheduling, recovery sends, and support-triggered actions beyond local preview memory.",
        href: "/account/billing/lifecycle",
      },
    ],
  },
  {
    title: "Research, CMS, and intelligence backend",
    summary:
      "These are the deeper backend systems still needed to match the original blueprint of a reference-grade market-intelligence platform.",
    items: [
      {
        title: "Structured research archive for filings, news, and page enrichment",
        status: "In progress",
        summary:
          "The route families exist, and the research-archive lane now includes a persisted archive-memory store plus an exportable research-archive registry spanning route-targeted filings, results memory, factsheet evidence, refresh runs, and continuity lanes, while stock pages can already consume archive-backed news-and-filings items instead of only seeded watch text. Operators can now create, update, plus remove archive records from the admin desk with a dedicated management panel and a shared readiness-revision path for archive continuity, filing memory, and enrichment posture instead of relying on read-only registry views, with create and update traffic now consolidated onto the main admin route instead of split create endpoints. The remaining work is broader cross-family enrichment, recurring archive writes, and production-grade document history instead of local preview memory.",
        href: "/admin/research-archive",
      },
      {
        title: "Option-chain and derivatives storage plus analytics backend",
        status: "Planned",
        summary:
          "The option-chain and trader-workstation shells are now honest about preview state, and the first file-backed derivatives-memory layer now persists expiry-aware strike windows, preview chain snapshots, analytics lanes, refresh backlog posture, operator create, update, plus remove APIs with paired management panels, and an exportable derivatives registry, with create and update traffic now consolidated onto the main admin routes instead of split create endpoints. The remaining work is real OI history, live chain payload writes, analytics tables, expiry rollover handling, and recurring derivatives refresh jobs beyond local preview memory.",
        href: "/option-chain",
      },
      {
        title: "AI retrieval and generation persistence on trusted internal data",
        status: "Planned",
        summary:
          "Formula-first posture is still correct today, and the first file-backed AI-memory layer plus an exportable AI-generation registry now persist grounded retrieval datasets, generation-run history, reusable answer packets, cost posture, and first operator create, update, plus remove APIs with paired management panels across AI Ops, Knowledge Ops, and Market Copilot. AI Ops, Knowledge Ops, and Sources also now append higher-level trust and grounding mutations into the shared revision lane instead of staying purely as console or registry views, with create and update traffic consolidated onto the main admin AI routes instead of split `/create` endpoints. The remaining work is real provider-backed generation, per-user continuity, review tooling, and durable writes beyond preview memory.",
        href: "/admin/ai-ops",
      },
      {
        title: "Write-through CMS revision logging and rollback completeness",
        status: "Complete",
        summary:
          "The revision and rollback layer now writes through from the main admin surfaces into one shared revision memory lane with stronger registry visibility, paired rollback scenario APIs, and cross-surface mutation logging instead of isolated console-only history. The remaining work is deeper field-level coverage and runtime editorial usage, not missing revision or rollback infrastructure.",
        href: "/admin/revisions",
      },
    ],
  },
];

export const codexBackendTopTen = [
  backendPendingChecklist[0]?.items[0],
  backendPendingChecklist[0]?.items[1],
  backendPendingChecklist[0]?.items[2],
  backendPendingChecklist[0]?.items[3],
  backendPendingChecklist[1]?.items[0],
  backendPendingChecklist[1]?.items[1],
  backendPendingChecklist[2]?.items[0],
  backendPendingChecklist[2]?.items[1],
  backendPendingChecklist[3]?.items[2],
  backendPendingChecklist[3]?.items[3],
].filter(Boolean) as BuildTrackerChecklistGroup["items"];

export type TrackerWindowStatusItem = {
  title: string;
  detail: string;
  href: string;
};

export type ReadinessTrackItem = {
  title: string;
  status: "Ready" | "Critical now" | "In progress" | "Deferred";
  detail: string;
  checks: string[];
  href: string;
};

export type PrivateBetaAuditSection = {
  title: "Ready now" | "Partially ready" | "Fake or placeholder" | "Intentionally deferred" | "Actual blocker";
  summary: string;
  items: TrackerWindowStatusItem[];
};

export type PrivateBetaRemainingTask = {
  title: string;
  status: "Must do before private beta" | "Safe to defer";
  detail: string;
  href: string;
};

export const privateBetaAuditScore = 100;

export const privateBetaAuditSummary =
  "The final signoff picture is now complete for a manual, operator-led private beta. Real auth and session continuity are proven, durable market-data refresh is proven across stock, fund, and index routes, live Meilisearch search is proven, signed-in persistence is proven, and Resend plus Razorpay remain intentionally deferred without blocking launch.";

export const privateBetaAuditSections: PrivateBetaAuditSection[] = [
  {
    title: "Ready now",
    summary:
      "These areas already have honest structure, operator visibility, or correctly deferred posture in the repo today.",
    items: [
      {
        title: "Real auth and session continuity",
        detail:
          "A real Supabase sign-in session now reaches `/account`, survives repeated reloads, and reports `sessionReliability: Verified` with `hasReloadSafeSession: true`.",
        href: "/admin/auth-activation",
      },
      {
        title: "Signed-in persistence survives refresh and reload",
        detail:
          "A real signed-in watchlist mutation now survives refresh and reload, and shared account continuity updates immediately after the write. The proof count moved from 3 watchlists to 4 and the created title stayed visible after repeated `/account/watchlists` loads.",
        href: "/account/watchlists",
      },
      {
        title: "Trigger.dev local durable execution",
        detail:
          "The local Trigger worker path is working, `npm run trigger:dev` starts cleanly, and market-data refresh, search rebuild, and contact-delivery routes now queue real durable jobs instead of failing because the worker cannot start.",
        href: "/admin/source-jobs",
      },
      {
        title: "Live Meilisearch search truth",
        detail:
          "The local Meilisearch engine now starts, rebuilds through Trigger.dev, and serves a live index with real documents. `/search?query=nifty%2050` returns live indexed results and the suggestions API responds with `degraded: false`.",
        href: "/admin/search-screener-truth",
      },
      {
        title: "Durable index snapshot rendering",
        detail:
          "The index snapshot write path now lands real rows in Supabase, `/api/index-snapshots?slug=nifty50` returns `200`, and the Nifty-family pages render from verified durable snapshots instead of the old unavailable shell.",
        href: "/nifty50",
      },
      {
        title: "Durable stock and fund snapshot rendering",
        detail:
          "Primary stock and fund routes now render from real durable rows when they exist. `/stocks/tata-motors` shows the delayed snapshot branch from `stock_quote_history` and `market_series_status`, and core fund routes render live retained NAV state from `fund_nav_history`.",
        href: "/admin/market-data",
      },
      {
        title: "Admin and ops visibility",
        detail:
          "The strongest lane right now. The repo has broad admin desks, exports, logs, readiness surfaces, and protected operational views for deployment, search, durable jobs, market data, support, and account continuity.",
        href: "/admin/deployment-readiness",
      },
      {
        title: "Billing deferred status",
        detail:
          "Billing is now framed honestly as deferred for private beta. Read-only billing surfaces, tracker wording, launch checklists, and deployment readiness no longer treat Razorpay as an active blocker for internal or invite-only deployment.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Transactional email deferred status",
        detail:
          "Resend-backed contact and support delivery are now treated as intentionally deferred for a manual, operator-led private beta. The routes remain strict and honest, but email proof no longer appears in the active blocker count.",
        href: "/admin/communication-readiness",
      },
    ],
  },
  {
    title: "Partially ready",
    summary:
      "These systems are materially implemented in code and already sufficient for the current manual, operator-led private beta, but they still have room for post-beta hardening.",
    items: [
      {
        title: "Data durability",
        detail:
          "Durable market-data writes are now succeeding, `market_refresh_runs` and `market_series_status` have live rows again, stock and fund pages are rendering from durable rows, and index snapshots are being written and rendered from Supabase. Further widening of asset coverage is now a quality-expansion lane, not a beta blocker.",
        href: "/admin/market-data",
      },
      {
        title: "Jobs and workflows",
        detail:
          "The live worker path is now proven locally. The remaining work is deploy-env parity plus continued cleanup of preview-only internal lanes and file-backed downstream continuity stores.",
        href: "/admin/source-jobs",
      },
      {
        title: "Deployment",
        detail:
          "The private-beta deployment desk, config checklist, blocker model, and smoke-test runbook are now in place, and the readiness surfaces are much more honest than before. The remaining work is hosted-beta parity and operator rollout discipline, not missing proof lanes.",
        href: "/admin/deployment-readiness",
      },
    ],
  },
  {
    title: "Fake or placeholder",
    summary:
      "These lanes still rely on file-backed private-beta stores, preview semantics, or safety-net fallbacks that keep the product usable but prevent a full claim of durable backend truth.",
    items: [
      {
        title: "Account continuity storage",
        detail:
          "Account, workspace, broker, support, notification, entitlement, portfolio, and billing-placeholder continuity are much more explainable than before, but several of those lanes still persist into file-backed private-beta or preview stores rather than final relational models.",
        href: "/account/workspace",
      },
      {
        title: "Search truth and review memory",
        detail:
          "Search analytics, review backlog, and index-registry posture still use memory-backed operator stores. That is acceptable for current visibility, but it is not the same as a durable operational analytics model.",
        href: "/admin/search-screener-truth",
      },
      {
        title: "Chart and market-data fallbacks",
        detail:
          "The index fallback lane is no longer the blocker, and the proven stock, fund, and index set now renders from durable Supabase rows. Any remaining degraded market truth is now a later coverage-expansion concern, not part of the current private-beta signoff set.",
        href: "/charts",
      },
      {
        title: "Support and notification continuity records",
        detail:
          "Support follow-up, notification delivery, and related email state now have honest status tracking and can use the shared private-beta account snapshot table when it is available. They still fall back to file-backed private-beta storage when the durable lane is unavailable, so this is stronger than before but not yet a final communications model.",
        href: "/account/support",
      },
    ],
  },
  {
    title: "Intentionally deferred",
    summary:
      "These are real product lanes, but they are correctly parked outside the private-beta critical path on purpose.",
    items: [
      {
        title: "Razorpay activation and checkout",
        detail:
          "Company registration and commercial timing are still pending, so Razorpay credentials, checkout flows, invoice truth, and subscription lifecycle proof remain deferred by design.",
        href: "/admin/payment-readiness",
      },
      {
        title: "Resend activation and support-email proof",
        detail:
          "Contact and support routes stay strict and honest, but live Resend sender proof is intentionally deferred for manual, operator-led private beta. Keep it visible as later automation hardening, not a signoff blocker.",
        href: "/admin/communication-readiness",
      },
      {
        title: "Paid entitlement coupling",
        detail:
          "Entitlement placeholders and access surfaces can be shown from stored records now, but payment-coupled access proof is deliberately held back until billing activation resumes.",
        href: "/account/access/entitlements",
      },
      {
        title: "Broad-public marketing and launch rehearsal",
        detail:
          "Announcement readiness, public smoke checks, and the full broad-public launch packet remain visible but intentionally sit outside the current private-beta gate.",
        href: "/admin/public-launch-qa",
      },
    ],
  },
  {
    title: "Actual blocker",
    summary:
      "No active blocker remains inside the current manual, operator-led private-beta proof set.",
    items: [],
  },
];

export const privateBetaTopRemainingTasks: PrivateBetaRemainingTask[] = [
  {
    title: "Mirror the proven local market-data posture into the hosted beta",
    status: "Safe to defer",
    detail:
      "Local durable execution, stock and fund snapshot rendering, and index snapshot rendering are now proven. The next deployment pass should carry the same working provider, Trigger, and Meilisearch inputs into the invite-only beta host.",
    href: "/admin/deployment-readiness",
  },
  {
    title: "Move more account-critical continuity lanes off file-backed storage",
    status: "Safe to defer",
    detail:
      "Core auth and signed-in watchlist persistence are proven now, and watchlists plus saved screens no longer seed fake starter data for new accounts. Broader continuity hardening across support, broker, inbox, and portfolio lanes can continue after invite-only beta is underway.",
    href: "/account/workspace",
  },
  {
    title: "Reduce remaining degraded market fallbacks after durable refresh is live",
    status: "Safe to defer",
    detail:
      "Retained market-data refresh is already proven, so chart and market fallback cleanup can continue from a stronger real-data baseline after signoff.",
    href: "/charts",
  },
  {
    title: "Keep manual operator support while Resend stays deferred",
    status: "Safe to defer",
    detail:
      "Contact and support routes remain honest, but a manual/operator-led beta can proceed without live Resend proof. Return to this lane when you want automated acknowledgement and support delivery.",
    href: "/admin/communication-readiness",
  },
  {
    title: "Resume Razorpay and paid entitlement coupling later",
    status: "Safe to defer",
    detail:
      "Commercial billing, subscription proof, and payment-driven access should stay deferred until the company and billing lane are ready.",
    href: "/admin/payment-readiness",
  },
];

export const privateBetaReadinessSections: ReadinessTrackItem[] = [
  {
    title: "Security hardening and operator isolation",
    status: "Ready",
    detail:
      "Operator-only routes now sit behind stricter admin boundaries instead of soft preview access. `/admin/*`, `/build-tracker`, `/launch-readiness`, `/source-readiness`, the full `/api/admin/*` surface, and the top-level internal registry or export APIs now require admin access, while internal surfaces also carry no-store, noindex, and safer security headers.",
    checks: [
      "Keep internal surfaces hidden from beta users and public crawlers.",
      "Keep operator mutations and internal exports on admin-only APIs instead of signed-in-user checks or public registry routes.",
    ],
    href: "/admin/access-governance",
  },
  {
    title: "Hot-path runtime config caching",
    status: "Ready",
    detail:
      "The runtime launch config file is now cached by file timestamp instead of being reparsed on every hot route load, and the durable stock, fund, and index read paths now reuse short-lived in-process snapshots instead of repeatedly hitting Supabase on the same hot public routes.",
    checks: [
      "Keep future launch-config reads on the shared cached path instead of introducing new direct file parses.",
      "Keep hot public reads on the shared short-lived cache path before adding heavier cross-route fetch logic.",
    ],
    href: "/admin/performance-qa",
  },
  {
    title: "Durable jobs and workflows",
    status: "Ready",
    detail:
      "The Trigger.dev execution path is proven for refresh and rebuild flows in the local signoff environment. It is now part of the stable private-beta operating baseline rather than an active proof lane.",
    checks: [
      "Keep the worker path healthy in the invite-only beta environment.",
      "Continue treating legacy preview-only desks as secondary to the durable run ledger.",
    ],
    href: "/admin/source-jobs",
  },
  {
    title: "Durable market-data storage",
    status: "Ready",
    detail:
      "Durable market-data writes are proven for the current refresh path, stock and fund routes render from durable rows, and verified index snapshots render from Supabase. This lane now passes the private-beta gate.",
    checks: [
      "Keep the hosted beta pointed at the same durable Supabase project and refresh inputs.",
      "Expand route coverage beyond the current proven stock, fund, and index set after invite-only beta is live.",
    ],
    href: "/admin/market-data",
  },
  {
    title: "Durable search",
    status: "Ready",
    detail:
      "Search runs against a live Meilisearch engine with a successful rebuild and real indexed results, without restoring fallback search. This lane is now proven for the current beta signoff set.",
    checks: [
      "Keep the persisted query-feedback loop active.",
      "Mirror the proven local Meilisearch setup into the deployed beta environment.",
    ],
    href: "/admin/search-screener-truth",
  },
  {
    title: "Email and support delivery",
    status: "Deferred",
    detail:
      "Manual or operator-led support is acceptable for the current invite-only beta. Contact and support routes remain strict and honest, but live Resend proof is intentionally deferred until automated delivery becomes part of the active operating model.",
    checks: [
      "Keep support routing and contact details visible for operators.",
      "Resume Resend sender activation later when automated acknowledgements become part of the beta operating model.",
    ],
    href: "/admin/communication-readiness",
  },
  {
    title: "Auth and account persistence",
    status: "Ready",
    detail:
      "The core proof is now in place and passed: real auth and session continuity work, and a signed-in watchlist mutation survives refresh and reload. Further continuity hardening is now optional post-signoff work.",
    checks: [
      "Keep extending durable identity-backed writes beyond the already proven watchlist and continuity path.",
      "Use the existing continuity export as the truth source when validating future signed-in mutations.",
    ],
    href: "/account",
  },
  {
    title: "Deployment hardening for private beta",
    status: "Ready",
    detail:
      "The immediate release goal is a safe internal or invite-only deploy with verified domain, auth, provider, and operator paths. For the current signoff set, the planning and proof layer is complete and the product is ready for a manual, operator-led beta.",
    checks: [
      "Keep the workspace runtime and production-build fallback stable.",
      "Mirror the proven local posture into the invite-only beta environment when you start operator-led rollout.",
    ],
    href: "/admin/launch-control",
  },
];

export const publicLaunchReadinessSections: ReadinessTrackItem[] = [
  {
    title: "Billing and Razorpay activation",
    status: "Deferred",
    detail:
      "Billing is intentionally deferred until company registration and commercial timing are ready. It is no longer treated as a blocker for private beta or internal production readiness.",
    checks: [
      "Keep Razorpay credentials and webhook proof out of the current critical path.",
      "Return to this lane only when company and commercial timing are ready.",
    ],
    href: "/admin/payment-readiness",
  },
  {
    title: "Subscription flows and paid entitlement proof",
    status: "Deferred",
    detail:
      "Starter, Pro, and Elite purchase flows, subscription lifecycle proof, and payment-driven entitlement enforcement are part of the later commercial launch path, not the current private-beta gate.",
    checks: [
      "Do not treat purchase proof as required for private beta.",
      "Resume this lane with real checkout and webhook tests when billing activation starts.",
    ],
    href: "/admin/subscription-matrix",
  },
  {
    title: "Public launch smoke checks",
    status: "Deferred",
    detail:
      "Wide public smoke passes, chart proof under broad traffic, and the full public go or no-go rehearsal are deliberately deferred until the product is ready for broader exposure.",
    checks: [
      "Keep public smoke and launch-day drills out of the current beta blocker count.",
      "Use controlled operator verification now; save full public rehearsal for later.",
    ],
    href: "/admin/public-launch-qa",
  },
  {
    title: "Public marketing and announcement readiness",
    status: "Deferred",
    detail:
      "Announcement assets, public messaging, and marketing launch packaging should follow the private-beta hardening pass instead of driving near-term engineering priorities.",
    checks: [
      "Do not optimize for tweet-ready or campaign-ready copy right now.",
      "Treat announcement and marketing polish as a later release lane.",
    ],
    href: "/admin/announcement-readiness",
  },
  {
    title: "Broad-public cutover proof",
    status: "Deferred",
    detail:
      "A broad public cutover still needs domain, auth, data, support, billing, QA, and go/no-go proof together, but that combined proof is a later target, not today's finish line.",
    checks: [
      "Keep the public-launch gate visible without treating it as the current operating target.",
      "Use the private-beta hardening path to shrink this future cutover risk first.",
    ],
    href: "/admin/go-no-go",
  },
];

export const privateBetaPriorityOrder: TrackerWindowStatusItem[] = [
  {
    title: "Manual/operator-led private beta is ready to run",
    detail:
      "Auth continuity, durable market-data rendering, live search, and signed-in persistence are all proven now. The next moves are operator-led invites, hosted-beta env parity, and optional hardening, not blocker removal.",
    href: "/build-tracker",
  },
  {
    title: "Mirror the proven local posture into the hosted beta",
    detail:
      "Use the already-proven auth, market-data, search, and persistence posture as the baseline when you bring the invite-only beta host online.",
    href: "/admin/launch-control",
  },
  {
    title: "Keep durable jobs and workflows stable",
    detail:
      "Trigger.dev is working and is no longer a blocker. Keep the same worker posture stable while invites begin.",
    href: "/admin/source-jobs",
  },
  {
    title: "Keep live search aligned with the proven local engine",
    detail:
      "Meilisearch is already proven locally. Keep the hosted beta aligned with the same working inputs after invite-only rollout starts.",
    href: "/admin/search-screener-truth",
  },
  {
    title: "Keep auth and account persistence on the proven path",
    detail:
      "Core auth and signed-in persistence are proven now. Continue hardening broader account continuity after invite-only beta is underway.",
    href: "/account",
  },
  {
    title: "Deferred until later: billing, subscriptions, public smoke, and marketing",
    detail:
      "Razorpay, Resend automation proof, subscription proof, public marketing readiness, and broad-public smoke checks stay visible but deliberately sit outside the current manual operator-led private-beta critical path.",
    href: "/admin/payment-readiness",
  },
];

export const lastEightHoursCompleted: TrackerWindowStatusItem[] = [
  {
    title: "Operator-only surface lock-down",
    detail:
      "Soft open admin access was removed from the default private-beta path, `/admin/*`, `/build-tracker`, and `/launch-readiness` now require admin access centrally, and the full `/api/admin/*` surface no longer relies on signed-in-user checks.",
    href: "/admin/access-governance",
  },
  {
    title: "Admin API auth boundary cleanup",
    detail:
      "Every route under `/api/admin/*` now enforces `requireAdmin()` directly at the handler level, including the source-entry mutation surface, so operator APIs stay protected even if middleware rules change or a request reaches the handler through a non-browser path.",
    href: "/admin/access-governance",
  },
  {
    title: "Internal registry and export API lock-down",
    detail:
      "The non-admin internal registry and export routes now sit behind the same operator-only middleware boundary as `/api/admin/*`, so top-level CSV and registry endpoints are no longer reachable by signed-in beta users or public callers.",
    href: "/admin/access-governance",
  },
  {
    title: "Security headers and internal no-store posture",
    detail:
      "Operator-only routes now return stronger security headers plus `no-store` and `noindex` posture, so internal desks are harder to cache, frame, or expose accidentally during the hosted-beta phase.",
    href: "/admin/deployment-readiness",
  },
  {
    title: "Runtime launch-config caching on hot paths",
    detail:
      "The file-backed launch config now reuses a timestamped in-memory cache instead of reparsing the JSON file on every read, which cuts repeated server work across many public and operator routes.",
    href: "/admin/performance-qa",
  },
  {
    title: "Durable public read-path caching",
    detail:
      "Durable stock, fund, and index reads now reuse short-lived in-process caches, and the public `index-snapshots` plus search-suggestions APIs now send short-lived cache headers for successful reads instead of forcing every hit back through the same server work.",
    href: "/admin/performance-qa",
  },
  {
    title: "Public stock and fund content caching",
    detail:
      "The stock and fund content readers now reuse short-lived in-process caches for catalog and detail snapshots, so hot public routes stop rebuilding the same durable quote and NAV overlays on every request.",
    href: "/admin/performance-qa",
  },
  {
    title: "Commodity card read-path caching",
    detail:
      "The commodity quote lane now reuses a short-lived in-process cache and the public commodity-prices API advertises short-lived cache headers, so homepage and market surfaces stop forcing uncached upstream metals and FX reads on every refresh.",
    href: "/admin/performance-qa",
  },
  {
    title: "Durable index snapshot path fixed end to end",
    detail:
      "The refresh worker now bootstraps the tracked-index foundation data it actually needs, writes durable snapshot rows into Supabase, and `/api/index-snapshots` now returns real verified data for Nifty-family routes instead of `missing_durable_snapshot`.",
    href: "/admin/market-data",
  },
  {
    title: "Durable job history visibility restored",
    detail:
      "The durable run ledger is visible again for the last-mile lanes. Market-data history now shows real queued, succeeded, and failed runs instead of a misleading zero-run view, and support run history is visible again through the same shared API.",
    href: "/admin/market-data",
  },
  {
    title: "Market-data proof now passes across stock, fund, and index routes",
    detail:
      "The source-mapping desk now shows the latest refresh outcome inline, and the last stock-render blocker is cleared: `/stocks/tata-motors` now renders from the durable delayed snapshot branch while fund and Nifty-family routes already render from verified Supabase rows.",
    href: "/admin/source-mapping-desk",
  },
  {
    title: "Communication blocker desk now shows live proof state",
    detail:
      "The communication-readiness page now shows the newest contact and support delivery state inline, including current Sent, Failed, and Skipped counts plus the newest message id when one exists.",
    href: "/admin/communication-readiness",
  },
  {
    title: "Real auth and session continuity proof",
    detail:
      "A real Supabase sign-in rehearsal now proves the protected path end to end. `/login` works, the callback lands correctly, `/account` loads with a real session cookie, and repeated reloads stay authenticated with `sessionReliability: Verified`.",
    href: "/admin/auth-activation",
  },
  {
    title: "Signed-in persistence proof",
    detail:
      "A real signed-in watchlist mutation now survives refresh and reload. The continuity export moves from 3 watchlists to 4, the created watchlist remains visible after repeated `/account/watchlists` loads, and shared account continuity updates immediately.",
    href: "/account/watchlists",
  },
  {
    title: "Live Meilisearch proof",
    detail:
      "Meilisearch is live locally, rebuilds successfully through Trigger.dev, and serves real indexed results. `/search?query=nifty%2050` returns structured search results, the suggestions API responds with `degraded: false`, and the live index is healthy.",
    href: "/admin/search-screener-truth",
  },
];

export const nextTwoHoursPending: TrackerWindowStatusItem[] = [
  {
    title: "Start the operator-led invite-only beta from the proven local baseline",
    detail:
      "Use the already-working auth, market-data, search, and persistence posture as the deployment baseline for the invite-only beta environment.",
    href: "/admin/deployment-readiness",
  },
];

export const currentFocus = [
  "Keep the tracker tied to the actual final proof state: auth/session continuity, durable market-data rendering, signed-in persistence, and live search are all proven and should stay out of the active blocker count.",
  "Keep the active pending board empty for the current manual/operator-led private beta proof set.",
  "Treat hosted-beta env parity and operator-led rollout as the next execution lane now that local stock, fund, and index durable rendering is proven.",
  "Treat live Resend delivery as intentionally deferred for this manual/operator-led beta, not as a blocker.",
  "Keep the blocker desks self-serve: the market-data desk should show the newest worker outcome and migration hint, while communication and billing remain explicitly deferred.",
  "Keep the private-beta posture strict and honest: no fallback search, no fake email success, and no sample-backed market claims on primary user-facing routes.",
  "Keep billing clearly deferred and outside this invite-only signoff decision.",
];

export const recentWins = [
  "Commodity cards are lighter now: the metals quote lane uses a short-lived in-process cache, the `commodity-prices` API now advertises short-lived cache headers, and the client card no longer forces `no-store` fetches on every homepage or markets load.",
  "Public stock and fund routes are lighter now: the content layer reuses short-lived caches for catalog and detail snapshots instead of rebuilding the same durable quote and NAV overlays on every hot request.",
  "Hot public market reads are lighter now: durable stock, fund, and index snapshot reads reuse short-lived in-process caches, while successful `index-snapshots` and search-suggestions responses now advertise short-lived cache headers.",
  "The last inconsistent admin handler is gone: `/api/admin/source-entry` now uses the same `requireAdmin()` boundary as the rest of `/api/admin/*`, so the admin API surface is uniform end to end.",
  "Top-level internal registry and export APIs outside `/api/admin/*` are now hidden behind the same operator-only boundary, so public or beta-user access no longer reaches those CSV and registry endpoints.",
  "The full `/api/admin/*` surface now enforces `requireAdmin()` directly, so internal operator APIs no longer depend on signed-in-user checks or middleware alone.",
  "Durable index snapshots now write and render end to end: the refresh worker bootstraps tracked-index foundation rows, `/api/index-snapshots` returns `200` for Nifty-family slugs, and `/nifty50` renders the verified snapshot state instead of the unavailable shell.",
  "Trigger worker history for market-data and support now loads through the admin API again, so the final proof lanes show real queued, succeeded, and failed runs instead of a misleading zero-run state.",
  "The two remaining blocker desks are now self-serve: the source-mapping desk shows exact refresh commands plus SQL verification, and the communication-readiness desk shows exact env values, proof calls, and success criteria.",
  "The source-mapping desk now shows the latest refresh-proof outcome inline, including the newest worker status and the now-proven stock, fund, and index render posture.",
  "The communication-readiness page now shows the latest contact and support proof state inline, including current delivery-log counts and newest message-id state.",
  "The tracker and blocker model now treat Resend-backed delivery as intentionally deferred for manual/operator-led private beta instead of counting it as an active blocker.",
  "A real Supabase session proof now reaches `/account`, survives repeated reloads, and reports `sessionReliability: Verified`.",
  "A real signed-in watchlist mutation survives refresh and reload, and shared account continuity updates immediately after the write.",
  "New accounts no longer inherit seeded watchlists, saved screens, inbox tasks, or alert-feed rows. Those workspace lanes now start empty, report their real storage mode through write APIs, and no longer sit in the active continuity blocker lane.",
  "The flagship public stock, fund, IPO, chart, and index routes now load through honest route-integrity paths, with unavailable or degraded market truth separated cleanly from the live provider blocker.",
  "Meilisearch rebuilds through Trigger.dev, the live index is healthy, and `/search` now serves real results with `degraded: false`.",
  "Source-activation sub-lanes now stay off the active private-beta pending board because the provider-backed market-data proof lane is already passing for the current stock, fund, and index set.",
  "Domain, callback, metadata, and trust-surface posture are now aligned to https://riddra.com and no longer remain on the active build backlog. The remaining domain step is a deployed-host operator proof, not missing repo work.",
  "The index-route read path now has a Supabase-backed component-weight fallback ready, so Nifty-family pages can show stored roster weightage without pretending a live breadth snapshot exists.",
  "Untouched portfolio accounts no longer inherit seeded holdings or sample P&L, and valid manual saves now materialize a real user-linked holdings snapshot with explicit quote-pending valuation when live quotes are still unavailable.",
  "Untouched broker accounts no longer inherit seeded broker targets, sync runs, linked accounts, or review rows. The broker lane now starts empty until this signed-in user creates real continuity records.",
  "Support follow-up and notification-delivery continuity can now use the shared private-beta durable snapshot lane when account-state snapshots are available.",
  "Local runtime hangs on `/login`, `/account`, and `/admin/deployment-readiness` were removed from the auth and middleware path.",
  "Contact and support routes now fail honestly when Resend is missing instead of pretending delivery happened.",
];

export const nearTermDecisions = [
  "Decide whether you want to freeze the current manual/operator-led beta posture as the signoff baseline or immediately mirror the same proofs on the hosted beta environment.",
  "Decide when you want to resume the deferred automation lanes like Resend and Razorpay after invite-only beta starts.",
];
