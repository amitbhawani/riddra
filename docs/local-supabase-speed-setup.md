# Local Supabase Speed Setup

This project currently talks to a remote Supabase project by default. That is fine for shared state and production-like verification, but it is usually the biggest reason localhost feels slow during development.

## Why localhost feels slow

- Every server render and admin read still crosses the network to Supabase.
- If the Supabase project is hosted far from India, each request can add noticeable latency.
- Hot reload plus multiple server components can multiply that delay quickly.

For local development, the best speed fix is to run Supabase locally through Docker and point `.env.local` at the local stack.

## Prerequisites

1. Install Docker Desktop and make sure it is running.
2. Install the Supabase CLI.

Example commands:

```bash
brew install supabase/tap/supabase
supabase --version
docker --version
```

## Link the repo to the cloud project

If you need to pull the live schema first:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

## Pull schema from the cloud project

This keeps local migrations and generated schema in sync with the live project.

```bash
supabase db pull
```

If you already maintain migrations in `db/migrations`, keep using those as the source of truth and only pull when you need to reconcile live drift.

## Start local Supabase

If this repo does not yet have a committed Supabase project folder, initialize one first:

```bash
supabase init
```

Then start the local stack:

```bash
supabase start
```

Useful commands:

```bash
supabase status
supabase stop
supabase db reset
```

## `.env.local` values for localhost

Do not overwrite existing env files automatically. Update them manually.

When using local Supabase, your `.env.local` should point to the local stack values shown by `supabase status`.

Typical local values look like:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

Only switch the Supabase variables. Do not blindly replace unrelated production/provider credentials.

## Switch back to cloud Supabase

When you need to verify against the real cloud project again:

1. Restore the cloud `NEXT_PUBLIC_SUPABASE_URL`
2. Restore the cloud `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Restore the cloud `SUPABASE_SERVICE_ROLE_KEY`
4. Restart the Next.js dev server

## Safe workflow for local speed

Recommended daily loop:

1. Use local Supabase while developing UI, loaders, and admin flows.
2. Run `npm run dev` against local Supabase for fast iteration.
3. Use the cloud project only for final verification, shared-data checks, and production-like import tests.

## Region latency note

- If the Supabase project is hosted far from India, every query from localhost can feel slower even when the app code is fine.
- Supabase region choice is not a simple toggle after a project is already live.
- For production, use the closest practical region to your main users and operators.
- For local development, local Supabase via Docker is the fastest and safest fix.

## Security warning

- Never commit real production keys.
- Never paste production service-role keys into committed files.
- Keep local-only secrets in `.env.local` or another ignored local file.

## Manual checks after switching

After changing environments:

```bash
npm run dev
curl -I http://127.0.0.1:3000
```

Then verify:

- a public stock page loads
- an admin page loads
- auth/session flows still behave as expected
- server-side reads are hitting the intended Supabase target
