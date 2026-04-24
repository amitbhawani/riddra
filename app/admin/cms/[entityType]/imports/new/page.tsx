import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createOperatorCmsImportBatchAction,
  previewOperatorCmsImportAction,
} from "@/app/admin/cms/import-actions";
import { OperatorCmsImportWorkspace } from "@/components/operator-cms-import-workspace";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getOperatorCmsEntityDefinition } from "@/lib/operator-cms";

type PageProps = {
  params: Promise<{ entityType: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType } = await params;

  return {
    title: `New ${entityType} import`,
    description: `Create a new operator-only import batch for ${entityType}.`,
  };
}

export default async function AdminCmsNewImportPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { entityType } = await params;
  const { error } = await searchParams;
  const entity = getOperatorCmsEntityDefinition(entityType);

  if (!entity) {
    notFound();
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{entity.label} imports</Eyebrow>
            <Link
              href={`/admin/cms/${entityType}/imports`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to batches
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Create import batch
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            Upload CSV or JSON, paste rows manually, map core fields, and preview row validation before
            the batch is saved.
          </p>
        </div>

        <GlowCard>
          <OperatorCmsImportWorkspace
            createAction={createOperatorCmsImportBatchAction}
            entityLabel={entity.label}
            entityType={entity.code}
            previewAction={previewOperatorCmsImportAction}
            queryError={error}
          />
        </GlowCard>
      </Container>
    </div>
  );
}
