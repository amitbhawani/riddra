export const setupPlaybookSteps = [
  {
    title: "Connect Supabase environment",
    steps: [
      "Add NEXT_PUBLIC_SUPABASE_URL to .env.local",
      "Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local",
      "Confirm /admin/system-status shows Supabase public and admin env as configured",
    ],
  },
  {
    title: "Enable auth providers",
    steps: [
      "Enable Google provider inside Supabase Auth",
      "Enable email magic-link or OTP auth inside Supabase Auth",
      "Add the callback URL for /auth/callback",
      "Test /signup and /login end to end",
    ],
  },
  {
    title: "Run database setup",
    steps: [
      "Run db/migrations/0001_phase_0_1_foundation.sql",
      "Run db/migrations/0002_content_sections.sql",
      "Run db/migrations/0003_index_tracker_foundation.sql",
      "Run db/migrations/0004_portfolio_foundation.sql",
      "Run db/migrations/0005_billing_foundation.sql",
      "Run db/migrations/0006_editorial_cms_foundation.sql",
      "Run db/migrations/0007_asset_relationships_foundation.sql",
      "Run db/migrations/0008_asset_registry_foundation.sql",
      "Run db/migrations/0009_phase_2_execution_foundation.sql",
      "Run db/seeds/0001_seed_foundation.sql",
      "Run db/seeds/0002_content_sections.sql",
      "Run db/seeds/0003_index_tracker_foundation.sql",
      "Run db/seeds/0004_billing_foundation.sql",
      "Run db/seeds/0005_editorial_cms_foundation.sql",
      "Run db/seeds/0006_asset_relationships_foundation.sql",
      "Run db/seeds/0007_asset_registry_foundation.sql",
      "Run db/seeds/0008_phase_2_execution_foundation.sql",
    ],
  },
  {
    title: "Verify app activation",
    steps: [
      "Confirm /login, /signup, and /account/setup work with the real auth provider",
      "Confirm DB-backed content loads where available instead of fallback data",
      "Review /admin/launch-control and /admin/system-status after setup",
      "Prepare Vercel project env values for deployment",
    ],
  },
];
