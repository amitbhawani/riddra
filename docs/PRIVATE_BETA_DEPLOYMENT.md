# Private Beta Deployment

## Objective

Deploy Riddra as a private-beta or internal-production product with honest operator tooling.
Do not block deployment on Razorpay, subscription checkout, public marketing, or broad-public smoke work.

## Deployment Checklist

1. Set the canonical site URL and launch mode.
2. Keep `LOCAL_AUTH_BYPASS=false` in the deployed environment.
3. Configure Supabase public and service-role env values.
4. Confirm Google OAuth is enabled and marked configured in the launch-config console.
5. Configure Trigger.dev so market refresh, search rebuilds, support delivery, notifications, and reconciliation jobs can run in production.
6. Configure Meilisearch and run one successful protected rebuild from `/admin/search-screener-truth`.
7. Configure Resend and verify one real support-delivery run plus one logged provider-backed send.
8. Configure market-data provider URL, provider token, refresh secret, and cron secret.
9. Verify quote, OHLCV, index, and fund NAV feed coverage.
10. Run the smoke tests in this document before calling the deployment safe for private beta.

## Exact Setup Checklist

### `.env.local`

| Key | Purpose | Required | Safe example placeholder |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for auth callbacks, metadata, and deployment trust. | Required | `https://riddra.com` |
| `NEXT_PUBLIC_LAUNCH_MODE` | Activates the intended private-beta posture. | Required | `private_beta` |
| `OPEN_ADMIN_ACCESS` | Keeps admin or build-tracker surfaces open or closed pre-launch. Set this explicitly for real activation. | Optional but recommended | `false` |
| `LOCAL_AUTH_BYPASS` | Must stay off for real auth and session continuity. | Required | `false` |
| `ADMIN_EMAILS` | Controls admin authorization once open access is disabled. | Required for locked admin access | `ops@example.com,founder@example.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server auth client URL. | Required | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server auth anon key. | Required | `replace-with-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin writes, continuity writes, and durable backend activation. | Required | `replace-with-supabase-service-role-key` |
| `TRIGGER_SECRET_KEY` | Trigger.dev worker access. | Required | `replace-with-trigger-secret-key` |
| `TRIGGER_PROJECT_REF` | Trigger.dev run listing and task execution target. | Required | `replace-with-trigger-project-ref` |
| `MEILISEARCH_HOST` | Live indexed search backend. | Required | `https://search.example.com` |
| `MEILISEARCH_API_KEY` | Meilisearch admin API key for rebuilds and queries. | Required | `replace-with-meilisearch-api-key` |
| `MEILISEARCH_INDEX_PREFIX` | Stable index namespace for private beta. | Optional | `riddra_private_beta` |
| `RESEND_API_KEY` | Transactional email provider credential. | Required | `replace-with-resend-api-key` |
| `RESEND_FROM_EMAIL` | Verified sender used by support and transactional flows. | Required | `Riddra Beta <beta@updates.example.com>` |
| `RESEND_REPLY_TO_EMAIL` | Default reply-to for operator follow-up. | Optional | `support@example.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Visible support contact on public and account surfaces. | Required | `support@example.com` |
| `MARKET_DATA_PROVIDER_URL` | Normalized provider payload endpoint if env-driven. | Required unless set in launch-config | `https://market-data.example.com/v1/snapshot` |
| `MARKET_DATA_PROVIDER_TOKEN` | Provider bearer token if env-driven. | Required unless set in launch-config | `replace-with-market-data-provider-token` |
| `MARKET_DATA_REFRESH_SECRET` | Verified refresh or ingest secret. | Required unless set in launch-config | `replace-with-market-data-refresh-secret` |
| `CRON_SECRET` | Cron or backend-trigger auth for sync routes. | Optional but recommended | `replace-with-market-data-cron-secret` |

### `launch-config.json`

| Key | Purpose | Required | Safe example placeholder |
| --- | --- | --- | --- |
| `basic.launchMode` | Stored launch posture used by operator tooling and runtime launch-state. | Required | `private_beta` |
| `basic.supportEmail` | Primary visible support route if different from env support email. | Required if no env support email fallback is used | `support@example.com` |
| `basic.adminEmails` | Admin allowlist fallback for operator surfaces. | Optional but recommended | `ops@example.com,founder@example.com` |
| `supabase.googleOAuthConfigured` | Tells readiness surfaces that Google auth is truly enabled. | Required for Google sign-in claims | `true` |
| `marketData.providerUrl` | Provider payload endpoint if the team manages provider setup through launch-config instead of env. | Required unless set in env | `https://market-data.example.com/v1/snapshot` |
| `marketData.providerToken` | Provider auth token if launch-config drives market-data sync. | Required unless set in env | `replace-with-market-data-provider-token` |
| `marketData.refreshSecret` | Refresh secret if launch-config drives market-data sync. | Required unless set in env | `replace-with-market-data-refresh-secret` |
| `marketData.cronSecret` | Cron auth secret for provider sync routes. | Optional but recommended | `replace-with-market-data-cron-secret` |
| `marketData.quoteEndpoint` | Quote endpoint for segmented refresh mode. | Required for segmented refresh | `https://market-data.example.com/v1/quotes` |
| `marketData.ohlcvEndpoint` | OHLCV endpoint for segmented refresh mode. | Required for segmented refresh | `https://market-data.example.com/v1/ohlcv` |
| `marketData.indexEndpoint` | Index snapshot endpoint for segmented refresh mode. | Required for segmented refresh | `https://market-data.example.com/v1/indexes` |
| `marketData.fundNavEndpoint` | Fund NAV endpoint for segmented refresh mode. | Required for segmented refresh | `https://market-data.example.com/v1/fund-nav` |
| `communications.contactEmail` | Public fallback contact destination. | Optional but recommended | `support@example.com` |
| `communications.feedbackInbox` | Central inbox for launch-day triage. | Optional but recommended | `feedback@example.com` |
| `billing.billingSupportEmail` | Dedicated billing or account-recovery inbox while billing stays deferred. | Optional | `billing@example.com` |

### Deferred for later commercial activation

| Key | Purpose | Required | Safe example placeholder |
| --- | --- | --- | --- |
| `RAZORPAY_KEY_ID` | Future checkout initialization. | Deferred | `replace-with-razorpay-key-id` |
| `RAZORPAY_KEY_SECRET` | Future secure billing operations. | Deferred | `replace-with-razorpay-key-secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Future billing webhook verification. | Deferred | `replace-with-razorpay-webhook-secret` |

## Active Private-Beta Blockers

- Missing site URL or unverified production deploy proof.
- Local auth bypass still enabled or Supabase auth not fully configured.
- Trigger.dev worker env missing or unverified.
- Meilisearch env missing or no successful rebuild proof.
- Resend sender or support destination missing or unverified.
- Market-data provider credentials or refresh secrets missing, or no verified refresh proof.

## Private-Beta Ready When Configured

- Supabase-backed sign-in and protected-route continuity.
- Trigger.dev durable jobs for refresh, search rebuilds, support delivery, notifications, and reconciliation.
- Meilisearch-backed search and protected rebuild flow.
- Resend-backed support acknowledgement, support follow-up, contact acknowledgement, notification summary, and account-change alerts.
- Durable market-data storage with retained history plus refresh metadata.
- Stored account continuity and workspace continuity exports.

## Intentionally Deferred

- Razorpay checkout and subscription lifecycle proof.
- Paid entitlement coupling to real purchase proof.
- Public marketing readiness.
- Broad-public smoke tests and wide-traffic launch rehearsal.

## Smoke Test Steps

### Sign In

1. Confirm `LOCAL_AUTH_BYPASS=false` in deployment.
2. Sign in through the real auth flow.
3. Refresh the browser and reopen `/account`.
4. Confirm the same signed-in account survives reload and protected-route navigation.

Success:
Auth survives sign-in, refresh, reload, and protected-route access without falling back to preview auth.

### Market Data Refresh

1. Queue a provider sync or market-data refresh from `/admin/market-data`.
2. Confirm the Trigger.dev run completes.
3. Open one stock route and one fund route after the run.
4. Confirm last-updated timestamps and retained series move forward.

Success:
Stored history updates cleanly and charts or reports reflect the newest durable data.

### Search

1. Queue a protected search rebuild from `/admin/search-screener-truth`.
2. Confirm the Trigger.dev search run completes.
3. Run real queries on `/search`.
4. Confirm search reads from the live Meilisearch index.

Success:
Search returns Meilisearch-backed results without falling back to local-only ranking.

### Support Email

1. Queue a support follow-up from `/account/support` or submit `/contact`.
2. Confirm the Trigger.dev task runs.
3. Check the email delivery log.
4. Confirm the requester acknowledgement and internal inbox notice were accepted by Resend.

Success:
Provider-backed sends are logged and the account-side support state matches the delivery log.

### Persistent User And Account State

1. Change a watchlist, alert preference, or consent setting.
2. Refresh and reopen `/account` and `/account/workspace`.
3. Open the continuity export route.
4. Confirm the changed record, timestamp, and continuity lane all match.

Success:
Account-linked state is explainable from stored continuity records instead of temporary UI state.
