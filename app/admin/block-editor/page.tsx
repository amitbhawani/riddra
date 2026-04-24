import type { Metadata } from "next";

import { BlockEditorPublishPanel } from "@/components/block-editor-publish-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { blockEditorRules, blockEditorSamples, blockEditorSummary } from "@/lib/block-editor";
import { getEditorialRevisionMemory } from "@/lib/editorial-revision-memory-store";

export const metadata: Metadata = {
  title: "Block Editor",
  description: "Protected block-editor surface for structured page editing across stocks, IPOs, funds, and future route families.",
};

export const dynamic = "force-dynamic";

export default async function BlockEditorPage() {
  await requireUser();
  const revisionMemory = await getEditorialRevisionMemory();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Block Editor", href: "/admin/block-editor" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Editing execution</Eyebrow>
          <SectionHeading
            title="Block editor"
            description="This page models the real editing experience for structured page blocks so staff can update one controlled area at a time instead of touching raw page payloads."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Editable blocks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{blockEditorSummary.editableBlocks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Source-protected blocks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{blockEditorSummary.sourceProtectedBlocks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Hybrid blocks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{blockEditorSummary.hybridBlocks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Logged revisions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.loggedRevisions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback-ready assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.rollbackReadyAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review-ready changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.reviewReadyChanges}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Editing queue samples</h2>
          <div className="mt-5 grid gap-4">
            {blockEditorSamples.map((item) => (
              <div key={`${item.asset}-${item.block}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.asset}</h3>
                    <p className="mt-2 text-sm text-mist/66">{item.block}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.mode}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <BlockEditorPublishPanel items={blockEditorSamples} />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Revision-safe publish lane</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {revisionMemory.revisions.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{entry.asset}</h3>
                    <p className="mt-2 text-sm text-mist/66">{entry.changedFields}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {entry.revisionState}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{entry.reason}</p>
                <p className="mt-3 text-xs text-mist/60">
                  {entry.editor} · {entry.time} · rollback {entry.rollbackReady}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Editor rules</h2>
          <div className="mt-5 grid gap-3">
            {blockEditorRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
