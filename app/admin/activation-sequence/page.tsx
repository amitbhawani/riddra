import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ActivationSequenceRevisionPanel } from "@/components/activation-sequence-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActivationSequence } from "@/lib/activation-sequence";

export const metadata: Metadata = {
  title: "Activation Sequence",
  description:
    "Protected activation-sequence page for launch-critical env, auth, callback, deployment, and preflight steps in the right order.",
};

export default async function AdminActivationSequencePage() {
  await requireUser();

  const sequence = getActivationSequence();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Activation Sequence", href: "/admin/activation-sequence" },
            ]}
          />
          <Eyebrow>Execution order</Eyebrow>
          <SectionHeading
            title="Activation sequence"
            description="This page turns launch activation into a practical order of operations so provider setup happens once, in the right order, with fewer avoidable mistakes."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready to run</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sequence.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sequence.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Optional today</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sequence.optional}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {sequence.steps.map((step, index) => (
            <GlowCard key={step.step}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/60">Step {index + 1}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{step.step}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{step.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Owner: {step.owner} · Reference: {step.href}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {step.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <ActivationSequenceRevisionPanel items={sequence.steps} />
      </Container>
    </div>
  );
}
