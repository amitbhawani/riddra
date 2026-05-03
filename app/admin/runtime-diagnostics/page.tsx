import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeDiagnosticsSnapshot } from "@/lib/runtime-diagnostics";

export const metadata: Metadata = {
  title: "Runtime Diagnostics",
  description: "Protected runtime diagnostics for the hosted private beta.",
};

function statusTone(status: "healthy" | "degraded" | "failed") {
  if (status === "healthy") {
    return "text-emerald-300 border-emerald-400/20 bg-emerald-500/10";
  }

  if (status === "degraded") {
    return "text-amber-200 border-amber-400/20 bg-amber-500/10";
  }

  return "text-rose-200 border-rose-400/20 bg-rose-500/10";
}

function formatStructuredValue(value: string | boolean | number | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "None";
}

export default async function RuntimeDiagnosticsPage() {
  const snapshot = await getRuntimeDiagnosticsSnapshot();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Runtime Diagnostics", href: "/admin/runtime-diagnostics" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Runtime diagnostics</Eyebrow>
          <SectionHeading
            title="Hosted beta system checks"
            description="This page keeps the four most critical hosted systems visible from one operator-safe surface: Supabase, Trigger.dev, Meilisearch, and market-data refresh."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Overall</p>
            <p className="mt-2 text-3xl font-semibold text-white capitalize">{snapshot.overallStatus}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Healthy</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {snapshot.checks.filter((item) => item.status === "healthy").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Degraded</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {snapshot.checks.filter((item) => item.status === "degraded").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Failed</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {snapshot.checks.filter((item) => item.status === "failed").length}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {snapshot.checks.map((check) => (
            <GlowCard key={check.key}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">{check.label}</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusTone(check.status)}`}
                >
                  {check.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/76">{check.summary}</p>
              <div className="mt-5 space-y-3 text-sm text-mist/72">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/50">Detail</p>
                  <p className="mt-1 leading-7">{check.detail}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/50">Latest signal</p>
                  <p className="mt-1 leading-7">{check.latestSignal ?? "No recent signal recorded."}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/50">Missing env</p>
                  <p className="mt-1 leading-7">
                    {check.missingEnv.length > 0 ? check.missingEnv.join(", ") : "None"}
                  </p>
                </div>
                {check.structuredState ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-mist/50">Structured state</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(check.structuredState).map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                        >
                          <p className="text-[11px] uppercase tracking-[0.14em] text-mist/45">{key}</p>
                          <p className="mt-1 text-sm leading-6 text-mist/78">
                            {formatStructuredValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Operator endpoints</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">
                Use the public health endpoint for coarse uptime checks, and the protected diagnostics JSON when an operator needs the actual failing system and latest signal.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/api/health"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open /api/health
              </Link>
              <Link
                href="/api/admin/runtime-diagnostics"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open diagnostics JSON
              </Link>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
