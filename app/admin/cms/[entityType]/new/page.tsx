import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { submitOperatorCmsRecordAction } from "@/app/admin/cms/actions";
import { OperatorCmsRecordForm } from "@/components/operator-cms-record-form";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getOperatorCmsRecordEditorData } from "@/lib/operator-cms-mutations";

type PageProps = {
  params: Promise<{ entityType: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType } = await params;

  return {
    title: `New ${entityType} CMS record`,
    description: `Create a new ${entityType} CMS record inside the operator backend.`,
  };
}

export default async function AdminCmsCreateRecordPage({ params }: PageProps) {
  await requireAdmin();
  const { entityType } = await params;
  const data = await getOperatorCmsRecordEditorData({ entityType });

  if (!data.entity || !data.config) {
    notFound();
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{data.entity.label}</Eyebrow>
            <Link
              href={`/admin/cms/${entityType}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to section
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Create {data.entity.label.toLowerCase()} record
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            Draft a new CMS record without making it public. Publish still requires a separate
            operator workflow step.
          </p>
        </div>

        {!data.schemaReady ? (
          <GlowCard className="border-amber-500/25 bg-amber-500/10">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Schema required</p>
            <p className="mt-3 text-sm leading-7 text-amber-50/90">{data.schemaError}</p>
          </GlowCard>
        ) : (
          <GlowCard className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Operator editor</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                Required fields for this content type:{" "}
                <span className="font-semibold text-white">
                  {data.config.requiredFieldLabels.join(", ")}
                </span>
              </p>
            </div>
            <OperatorCmsRecordForm
              action={submitOperatorCmsRecordAction}
              config={data.config}
              entityLabel={data.entity.label}
              entityType={data.entity.code}
              record={null}
            />
          </GlowCard>
        )}
      </Container>
    </div>
  );
}
