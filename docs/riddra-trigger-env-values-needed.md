# Riddra Trigger Env Values Needed

## Purpose

This is the short operator checklist for the two Trigger.dev Production values needed for Yahoo daily cron readiness.

This does **not** mean cron proof is complete yet.

## Values needed

### `TRIGGER_SECRET_KEY`

Where to get it:

- Trigger.dev dashboard
- open the correct Riddra Trigger project
- go to `API Keys`
- copy the Production secret key

What it usually looks like:

- `tr_prod_...`

### `TRIGGER_PROJECT_REF`

Where to get it:

- Trigger.dev dashboard
- open the correct Riddra Trigger project
- go to project settings or the project reference panel
- copy the exact project ref shown there

What it usually looks like:

- `proj_...`

Important:

- use the exact Trigger.dev value
- do not guess it from memory

## Where to add them in Vercel

Add both in the Riddra Vercel project:

- `Settings`
- `Environment Variables`
- environment: `Production`

Add:

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_REF`

## Exact UI steps

### Trigger.dev

1. Open the correct Trigger.dev project
2. Copy `TRIGGER_SECRET_KEY` from `API Keys`
3. Copy `TRIGGER_PROJECT_REF` from project settings / project reference

### Vercel

1. Open the Riddra Vercel project
2. Go to `Settings -> Environment Variables`
3. Add:
   - `TRIGGER_SECRET_KEY`
   - `TRIGGER_PROJECT_REF`
4. Save both for `Production`

## Exact CLI alternative

If using the Vercel CLI instead of the dashboard:

```bash
vercel env add TRIGGER_SECRET_KEY production
vercel env add TRIGGER_PROJECT_REF production
```

## After adding the envs

### Redeploy the web app

Use either:

- Vercel dashboard -> `Redeploy`

or:

```bash
vercel --prod
```

## Do Trigger tasks need deployment?

Yes.

The web app envs alone are not enough. Trigger tasks must also be deployed to the correct Trigger project.

Exact command:

```bash
npm run trigger:deploy
```

This uses:

- [trigger.config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/trigger.config.ts)

## Post-redeploy curl test

After Vercel redeploy and Trigger task deploy, run this diagnostics check:

```bash
curl -s \
  -H "x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>" \
  "https://www.riddra.com/api/cron/yahoo-daily-update?diagnostics=1"
```

## What success should look like

The response should be quick and should include:

- `"ok": true`
- `"mode": "diagnostics"`
- `"configured": true` inside readiness
- `readiness.durableJobs.configured = true`
- `readiness.durableJobs.missingEnv = []`
- `readiness.worker.maxItemsPerRun = 25`

## Still not complete yet

Even after the envs are added, do **not** mark cron proof complete until:

1. the diagnostics call passes
2. one real authenticated cron start is captured
3. the durable job is created or reused
4. worker progress is visible in the Import Control Center
