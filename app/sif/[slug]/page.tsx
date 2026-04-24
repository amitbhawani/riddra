import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WealthDetailHeader } from "@/components/wealth-detail-header";
import { WealthDetailSections } from "@/components/wealth-detail-sections";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWealthProductBySlug, getWealthProductsByFamily } from "@/lib/wealth-products";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const publishedSlugs = await getPublishableCmsSlugSet("sif");
  return getWealthProductsByFamily("sif")
    .filter((product) => publishedSlugs.has(product.slug))
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("sif", slug);
  if (!publishableRecord) return { title: "SIF not found" };
  const product = getWealthProductBySlug("sif", slug);
  if (!product) return { title: "SIF not found" };
  return { title: product.name, description: product.summary };
}

export default async function SifDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("sif", slug);
  if (!publishableRecord) notFound();
  const product = getWealthProductBySlug("sif", slug);
  if (!product) notFound();
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  return (
    <div className="py-10 sm:py-12">
      <WealthDetailHeader
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "SIF", href: "/sif" }, { name: product.name, href: `/sif/${product.slug}` }]}
        eyebrow={product.category}
        title={product.name}
        angle={product.angle}
        summary={product.summary}
        truthTitle="SIF detail route truth"
        truthDescription="Keep the detail route honest about continuity while still reading like a premium public research page."
        truthItems={getPublicTruthItems(truth, {
          continuitySubject: `${product.name} research`,
          handoffLabel: `${product.name} SIF-to-account handoff`,
          billingSubject: "premium SIF workflow language",
          supportSubject: "SIF users who convert into assisted workflows",
        })}
        supportStats={[
          { label: "Support rows", value: supportRegistry.total },
          { label: "In progress", value: supportRegistry.inProgress },
          { label: "Blocked", value: supportRegistry.blocked },
          { label: "Support", value: config.supportEmail || config.billingSupportEmail || "Not configured yet" },
        ]}
      />
      <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-4 lg:px-4 xl:px-5">
        <WealthDetailSections family="sif" product={product} />
      </div>
    </div>
  );
}
