"use client";

import { useEffect, useState, useTransition } from "react";

type LaunchConfigPayload = {
  basic: {
    siteUrl: string;
    launchMode: string;
    supportEmail: string;
    adminEmails: string;
  };
  supabase: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    googleClientId: string;
    googleClientSecret: string;
    googleOAuthConfigured: boolean;
  };
  marketData: {
    providerUrl: string;
    providerToken: string;
    refreshSecret: string;
    cronSecret: string;
  };
  billing: {
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
    resendApiKey: string;
  };
  updatedAt: string | null;
};

const emptyPayload: LaunchConfigPayload = {
  basic: {
    siteUrl: "",
    launchMode: "",
    supportEmail: "",
    adminEmails: "",
  },
  supabase: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    googleClientId: "",
    googleClientSecret: "",
    googleOAuthConfigured: false,
  },
  marketData: {
    providerUrl: "",
    providerToken: "",
    refreshSecret: "",
    cronSecret: "",
  },
  billing: {
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    resendApiKey: "",
  },
  updatedAt: null,
};

function inputClassName() {
  return "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-mist/44";
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

async function fetchPayload(): Promise<LaunchConfigPayload> {
  const response = await fetch("/api/admin/launch-config", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load launch config.");
  }

  return (await response.json()) as LaunchConfigPayload;
}

export function LaunchConfigConsoleClient() {
  const [payload, setPayload] = useState<LaunchConfigPayload>(emptyPayload);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      fetchPayload()
        .then(setPayload)
        .catch((loadError) => {
          setError(loadError instanceof Error ? loadError.message : "Unable to load launch config.");
        });
    });
  }, []);

  const saveSection = (section: string, data: Record<string, unknown>, message: string) => {
    setNotice(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/launch-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, data }),
        });
        const next = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof next.error === "string" ? next.error : "Save failed.");
        }

        setNotice(message);
        setPayload(await fetchPayload());
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Save failed.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {notice ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="rounded-[28px] border border-white/8 bg-black/15 p-5 text-sm text-mist/72">
        Last saved: <span className="text-white">{formatTimestamp(payload.updatedAt)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Basic launch settings</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Fill the public site URL, launch mode, support email, and admin emails here.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              saveSection(
                "basic",
                {
                  siteUrl: formData.get("siteUrl"),
                  launchMode: formData.get("launchMode"),
                  supportEmail: formData.get("supportEmail"),
                  adminEmails: formData.get("adminEmails"),
                },
                "Basic launch settings saved.",
              );
            }}
          >
            <input name="siteUrl" defaultValue={payload.basic.siteUrl} placeholder="https://yourdomain.com" className={inputClassName()} />
            <input name="launchMode" defaultValue={payload.basic.launchMode} placeholder="launch_prep or public_beta" className={inputClassName()} />
            <input name="supportEmail" defaultValue={payload.basic.supportEmail} placeholder="support@yourdomain.com" className={inputClassName()} />
            <textarea
              name="adminEmails"
              defaultValue={payload.basic.adminEmails}
              placeholder="amitbhawani@gmail.com, secondadmin@example.com"
              className={`${inputClassName()} min-h-[112px] resize-y`}
            />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save basic settings
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Supabase and auth</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Paste your Supabase public keys here, and mark whether Google sign-in has been configured. Service-role access now loads from environment variables only.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              saveSection(
                "supabase",
                {
                  supabaseUrl: formData.get("supabaseUrl"),
                  supabaseAnonKey: formData.get("supabaseAnonKey"),
                  googleClientId: formData.get("googleClientId"),
                  googleClientSecret: formData.get("googleClientSecret"),
                  googleOAuthConfigured: formData.get("googleOAuthConfigured") === "on",
                },
                "Supabase and auth settings saved.",
              );
            }}
          >
            <input name="supabaseUrl" defaultValue={payload.supabase.supabaseUrl} placeholder="Supabase project URL" className={inputClassName()} />
            <textarea name="supabaseAnonKey" defaultValue={payload.supabase.supabaseAnonKey} placeholder="Supabase anon key" className={`${inputClassName()} min-h-[96px] resize-y`} />
            <input name="googleClientId" defaultValue={payload.supabase.googleClientId} placeholder="Google client ID (optional)" className={inputClassName()} />
            <input name="googleClientSecret" defaultValue={payload.supabase.googleClientSecret} placeholder="Google client secret (optional)" className={inputClassName()} />
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
              <input type="checkbox" name="googleOAuthConfigured" defaultChecked={payload.supabase.googleOAuthConfigured} />
              Google OAuth configured in Supabase
            </label>
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save auth settings
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Market-data provider</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Paste the provider URL, token, and refresh secrets here for Phase 17 activation.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              saveSection(
                "marketData",
                {
                  providerUrl: formData.get("providerUrl"),
                  providerToken: formData.get("providerToken"),
                  refreshSecret: formData.get("refreshSecret"),
                  cronSecret: formData.get("cronSecret"),
                },
                "Market-data settings saved.",
              );
            }}
          >
            <input name="providerUrl" defaultValue={payload.marketData.providerUrl} placeholder="Provider API URL" className={inputClassName()} />
            <input name="providerToken" defaultValue={payload.marketData.providerToken} placeholder="Provider token" className={inputClassName()} />
            <input name="refreshSecret" defaultValue={payload.marketData.refreshSecret} placeholder="Refresh secret" className={inputClassName()} />
            <input name="cronSecret" defaultValue={payload.marketData.cronSecret} placeholder="Cron secret" className={inputClassName()} />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save market-data settings
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-lg font-semibold text-white">Billing and email delivery</h3>
          <p className="mt-2 text-sm leading-6 text-mist/72">Paste Razorpay and Resend values here for subscriber truth and transactional delivery.</p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              saveSection(
                "billing",
                {
                  razorpayKeyId: formData.get("razorpayKeyId"),
                  razorpayKeySecret: formData.get("razorpayKeySecret"),
                  razorpayWebhookSecret: formData.get("razorpayWebhookSecret"),
                  resendApiKey: formData.get("resendApiKey"),
                },
                "Billing and email settings saved.",
              );
            }}
          >
            <input name="razorpayKeyId" defaultValue={payload.billing.razorpayKeyId} placeholder="Razorpay key ID" className={inputClassName()} />
            <input name="razorpayKeySecret" defaultValue={payload.billing.razorpayKeySecret} placeholder="Razorpay key secret" className={inputClassName()} />
            <input name="razorpayWebhookSecret" defaultValue={payload.billing.razorpayWebhookSecret} placeholder="Razorpay webhook secret" className={inputClassName()} />
            <input name="resendApiKey" defaultValue={payload.billing.resendApiKey} placeholder="Resend API key" className={inputClassName()} />
            <button disabled={isPending} className="rounded-full bg-aurora px-4 py-3 text-sm font-medium text-ink transition hover:bg-[#75f0d3] disabled:cursor-not-allowed disabled:opacity-60">
              Save billing settings
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
