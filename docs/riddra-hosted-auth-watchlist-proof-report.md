# Riddra Hosted Auth + Watchlist Proof

Date: 2026-05-02  
Environment: Hosted production at [https://www.riddra.com](https://www.riddra.com)

## Verdict

Partial PASS.

Hosted authenticated account, profile, watchlist-read, and portfolio-read flows are working in production with a real signed-in session.

I did not perform watchlist add/remove mutations because the available hosted session was Amit Bhawani's real production account, not a disposable test account. For a safe write/delete proof, Riddra should use a dedicated non-admin hosted test user.

## What Was Verified

### 1. Hosted login/account continuity

- Browser session already existed on hosted production.
- Opening `/account` loaded the signed-in member dashboard directly.
- Signed-in header showed `A Amit Bhawani`.
- Public shell check for unauthenticated access confirmed auth gating:
  - `curl -I -L https://www.riddra.com/account`
  - final result: `200 https://www.riddra.com/login`

Meaning:
- unauthenticated users are redirected to `/login`
- authenticated hosted session can reach `/account`

### 2. Profile read

Hosted session-scoped API proof:

- Route: `/api/account/profile`
- Result: JSON `ok: true`

Observed fields included:
- `id`
- `userKey: "amitbhawani@gmail.com"`
- `authUserId`
- `name: "Amit Bhawani"`
- `email: "amitbhawani@gmail.com"`
- `username: "amitbhawani"`
- `membershipTier: "pro-max"`
- `role: "admin"`

This proves hosted production can read the signed-in durable profile through the account API.

### 3. Watchlist read / existing watchlist view

Hosted session-scoped API proof:

- Route: `/api/account/watchlist-items`
- Result: `{"ok":true,"items":[]}`

Hosted UI proof:

- Route: `/account/watchlists`
- Page loaded successfully
- Empty-state UI rendered correctly:
  - `Tracked items 0`
  - `Stocks 0`
  - `Mutual funds 0`
  - `No stocks saved yet`
  - `No mutual funds saved yet`

This proves hosted production can render the member watchlist experience and read the current stored state.

### 4. Portfolio holdings endpoint

Hosted session-scoped API proof:

- Route: `/api/account/portfolio-holdings`
- Result: `{"ok":true,"holdings":[],"storageMode":"durable"}`

This proves hosted production can read durable portfolio state for the signed-in member.

## What Was Not Performed

### Watchlist add/remove

Not executed.

Reason:
- the available hosted session was a real production account
- add/remove would mutate cloud account data
- delete-style cleanup should not be done casually on a personal production account

Safe next step for full mutation proof:
1. create a dedicated non-admin hosted test user
2. sign in with that user
3. add one stock to watchlist
4. verify it appears in `/api/account/watchlist-items` and `/account/watchlists`
5. remove the same stock
6. verify the list returns to empty

## Ordinary User Flow Boundary Check

Repo audit confirms ordinary self-service routes are no longer on the admin-client path.

### Self-service route path

- [app/api/account/profile/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/account/profile/route.ts)
- [app/api/account/watchlist-items/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/account/watchlist-items/route.ts)
- [app/api/account/portfolio-holdings/route.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/api/account/portfolio-holdings/route.ts)

Each route:
- requires a signed-in user with `requireUser()`
- uses `lib/user-product-store.ts`

### Session-scoped helper boundary

- [lib/supabase/access-helpers.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/access-helpers.ts)

Explicit helpers:
- `createAdminServerHelper()`
- `createUserSessionHelper()`
- `createPublicReadHelper()`

### Session durable writes/reads

- [lib/cms-durable-state.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/cms-durable-state.ts)

Relevant session-scoped functions use `createUserSessionHelper()`:
- `getSessionDurableUserProfileByAuthUserId`
- `saveSessionDurableUserProfile`
- `listSessionDurableWatchlistItems`
- `deleteSessionDurableWatchlistItem`
- `listSessionDurablePortfolioHoldings`
- `saveSessionDurablePortfolioHolding`
- `deleteSessionDurablePortfolioHolding`

Conclusion:
- ordinary self-service profile/watchlist/portfolio flows are using session-scoped Supabase access
- admin-client durable helpers still exist, but they are no longer the main path for ordinary user self-service

## RLS Leak Check

### Hosted-session observation

From the hosted signed-in session:
- `/api/account/profile` returned only the current signed-in profile
- `/api/account/watchlist-items` returned only the current signed-in watchlist state
- `/api/account/portfolio-holdings` returned only the current signed-in portfolio state

No cross-user data appeared in hosted member UI or member API reads.

### Stronger live proof already completed earlier

The stronger cross-user RLS proof was completed in the live DB verification pass:
- temporary non-admin user could read/write only its own profile
- cross-profile read returned `null`
- anon access to self-service tables was denied

Reference:
- [docs/riddra-0057-rls-final-live-verification-report.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-0057-rls-final-live-verification-report.md)

### Limitation

The hosted browser session used here was an admin account, not a normal member account.

So this hosted proof confirms:
- authenticated session continuity
- member dashboard works
- member API reads work

But a clean hosted non-admin browser proof still needs a dedicated test user if you want a fully isolated ordinary-user hosted smoke pass.

## Final Status

### PASS

- hosted authenticated account page works
- hosted profile read works
- hosted watchlist read works
- hosted watchlist page works
- hosted portfolio holdings endpoint works
- self-service route path is session-scoped in code

### SAFE SKIP

- watchlist add/remove mutation on the real production account

### Recommended next action

For final hosted write/delete proof:
1. provision a dedicated non-admin hosted test account
2. re-run only watchlist add/remove and optional portfolio add/remove on that test user
3. capture one final hosted mutation proof report
