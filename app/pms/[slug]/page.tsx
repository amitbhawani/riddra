import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { ProductPageContainer, ProductPageTwoColumnLayout } from "@/components/product-page-system";
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
  const publishedSlugs = await getPublishableCmsSlugSet("pms");
  return getWealthProductsByFamily("pms")
    .filter((product) => publishedSlugs.has(product.slug))
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("pms", slug);
  if (!publishableRecord) return { title: "PMS not found" };
  const product = getWealthProductBySlug("pms", slug);
  if (!product) return { title: "PMS not found" };
  return { title: product.name, description: product.summary };
}

export default async function PmsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("pms", slug);
  if (!publishableRecord) notFound();
  const product = getWealthProductBySlug("pms", slug);
  if (!product) notFound();
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const sidebar = await getGlobalSidebarRail("pms");

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <WealthDetailHeader
                breadcrumbs={[{ name: "Home", href: "/" }, { name: "PMS", href: "/pms" }, { name: product.name, href: `/pms/${product.slug}` }]}
                eyebrow={product.category}
                title={product.name}
                angle={product.angle}
                summary={product.summary}
                truthTitle="PMS detail route truth"
                truthDescription="Keep the detail route honest about continuity while still reading like a premium public research page."
                truthItems={getPublicTruthItems(truth, {
                  continuitySubject: `${product.name} research`,
                  handoffLabel: `${product.name} PMS-to-account handoff`,
                  billingSubject: "premium PMS workflow language",
                  supportSubject: "PMS users who convert into assisted workflows",
                })}
                supportStats={[
                  { label: "Support rows", value: supportRegistry.total },
                  { label: "In progress", value: supportRegistry.inProgress },
                  { label: "Blocked", value: supportRegistry.blocked },
                  { label: "Support", value: config.supportEmail || config.billingSupportEmail || "Not configured yet" },
                ]}
                contained={false}
              />
              <WealthDetailSections family="pms" product={product} />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
