# Riddra Admin-Client User Flow Refactor Report

Date: 2026-05-02  
Prompt: 117

## Goal

Move ordinary signed-in durable flows away from the `service_role` / admin-client path without loosening RLS and without changing the visible account UX.

## What changed

### 1. Clear access boundaries

Added explicit Supabase helper boundaries in [lib/supabase/access-helpers.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/access-helpers.ts):

- `createAdminServerHelper()`
- `createUserSessionHelper()`
- `createPublicReadHelper()`
- `hasAdminServerHelper()`
- `hasUserSessionHelper()`
- `hasPublicReadHelper()`

This makes the intended access path obvious at each callsite instead of silently falling back to admin access.

### 2. Session-scoped self-service durable helpers

Added session-scoped durable helpers in [lib/cms-durable-state.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/cms-durable-state.ts) for:

- `getSessionDurableUserProfileByAuthUserId`
- `saveSessionDurableUserProfile`
- `touchSessionDurableUserProfileLastActive`
- `listSessionDurableWatchlistItems`
- `saveSessionDurableWatchlistItem`
- `deleteSessionDurableWatchlistItem`
- `listSessionDurablePortfolioHoldings`
- `saveSessionDurablePortfolioHolding`
- `deleteSessionDurablePortfolioHolding`
- `getPublicDurableSystemSettings`
- `hasDurableUserSessionStateStore`
- `hasDurablePublicReadStateStore`

These use the session-scoped server client or the public read client instead of the admin client.

### 3. User self-service flows moved off admin client

Refactored [lib/user-product-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/user-product-store.ts) so ordinary signed-in flows now use the session-scoped durable helpers for:

- profile bootstrap/read
- last-active touch
- watchlist read/write/delete
- portfolio read/write/delete

### 4. Transitional legacy-row rescue path

Some legacy `product_user_profiles` rows may still need ownership repair because strict RLS is based on `auth_user_id = auth.uid()`.

To avoid breaking older accounts, a narrow transitional repair path remains:

- normal self-service uses session-scoped access first
- if a profile write fails because of a recoverable legacy conflict, the code does a one-time admin-backed ownership repair
- after that, the row is readable/writable through the session-scoped path

This keeps ordinary traffic on RLS while still recovering older rows safely.

### 5. Settings helper split

Refactored settings access so ordinary routes no longer need admin-backed settings reads:

- `getSystemSettings()` is now the user/public-facing helper
- `getAdminSystemSettings()` is now the explicit admin-only helper

Ordinary routes now use:

- public durable settings read when available
- safe fallback defaults when public durable settings are unavailable

Admin routes now use the admin-only helper.

Updated admin callsites:

- [app/admin/settings/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/settings/page.tsx)
- [app/api/admin/settings/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/settings/route.ts)
- [app/api/admin/media-library/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/media-library/route.ts)
- [app/api/admin/operator-console/previews/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/operator-console/previews/route.ts)

### 6. Removed one duplicate profile-save validation hop

[app/api/account/profile/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/account/profile/route.ts) no longer performs a duplicate username-availability check before calling the store layer. The store still validates, so UX stays the same while avoiding one extra lookup.

## Files changed

- [lib/supabase/access-helpers.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/access-helpers.ts)
- [lib/cms-durable-state.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/cms-durable-state.ts)
- [lib/user-product-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/user-product-store.ts)
- [app/api/account/profile/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/account/profile/route.ts)
- [app/admin/settings/page.tsx](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/admin/settings/page.tsx)
- [app/api/admin/settings/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/settings/route.ts)
- [app/api/admin/media-library/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/media-library/route.ts)
- [app/api/admin/operator-console/previews/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/admin/operator-console/previews/route.ts)

## Validation

### Static validation

- `npm run lint` -> PASS
- `npx tsc --noEmit` -> PASS

### Route sanity checks

Local route checks after the refactor:

- `GET /login` -> `200`
- `GET /account` -> `200`
- `GET /account/watchlists` -> `200`
- `GET /api/account/profile` -> `200`
- `GET /api/account/watchlist-items` -> `200`
- `GET /api/account/portfolio-holdings` -> `200`

These checks were done against the local dev runtime with the current local auth/runtime configuration.

## Security posture after refactor

Improved:

- ordinary signed-in profile/watchlist/portfolio CRUD now uses session-scoped access
- admin settings/media/preview flows now use an explicit admin-only helper
- ordinary routes no longer need admin-backed settings reads

Not changed:

- admin-only CMS and operator workflows still use admin/service-role access where intended
- no RLS loosening was introduced

## Honest residual note

One residual admin-backed lookup still exists in the broader account surface:

- username availability still relies on the admin-visible profile directory through `listUserProductProfiles()`

That means profile save validation is lighter than before, but not yet fully free of admin-backed directory reads. Finishing that cleanly would require one of:

- a public-safe username registry
- a DB-level unique username constraint plus conflict handling
- a dedicated public/session-safe username availability projection

## Result

Prompt 117 is substantially completed:

- self-service durable CRUD moved off the admin client
- helper boundaries are explicit
- admin-only settings flows are separated
- UX preserved
- RLS not loosened

Residual follow-up remains only for username-availability lookup hardening.
