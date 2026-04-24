import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { FieldDictionaryRevisionPanel } from "@/components/field-dictionary-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  fieldDictionaryFamilies,
  fieldDictionaryRules,
  fieldDictionarySummary,
} from "@/lib/field-dictionary";

export const metadata: Metadata = {
  title: "Field Dictionary",
  description: "Protected field-dictionary page for CMS validation rules, source-backed metrics, editorial fields, and lifecycle-aware data planning.",
};

export default async function FieldDictionaryPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Field Dictionary", href: "/admin/field-dictionary" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Schema governance</Eyebrow>
          <SectionHeading
            title="Field dictionary"
            description="This page tracks the field families and validation mindset that should keep source-backed metrics, editorial content, lifecycle states, and derived outputs clearly separated as the CMS grows."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Field families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldDictionarySummary.fieldFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Source-backed fields</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldDictionarySummary.sourceBackedFields}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Editorial fields</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldDictionarySummary.editorialFields}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Field families</h2>
          <div className="mt-5 grid gap-4">
            {fieldDictionaryFamilies.map((item) => (
              <div key={item.family} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.family}</h3>
                    <p className="mt-2 text-sm text-mist/66">{item.note}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Validation rules</h2>
          <div className="mt-5 grid gap-3">
            {fieldDictionaryRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <FieldDictionaryRevisionPanel items={fieldDictionaryFamilies} />
      </Container>
    </div>
  );
}
