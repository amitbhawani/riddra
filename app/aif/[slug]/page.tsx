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
  const publishedSlugs = await getPublishableCmsSlugSet("aif");
  return getWealthProductsByFamily("aif")
    .filter((product) => publishedSlugs.has(product.slug))
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("aif", slug);
  if (!publishableRecord) return { title: "AIF not found" };
  const product = getWealthProductBySlug("aif", slug);
  if (!product) return { title: "AIF not found" };
  return { title: product.name, description: product.summary };
}

export default async function AifDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("aif", slug);
  if (!publishableRecord) notFound();
  const product = getWealthProductBySlug("aif", slug);
  if (!product) notFound();
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const sidebar = await getGlobalSidebarRail("aif");

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <WealthDetailHeader
                breadcrumbs={[{ name: "Home", href: "/" }, { name: "AIF", href: "/aif" }, { name: product.name, href: `/aif/${product.slug}` }]}
                eyebrow={product.category}
                title={product.name}
                angle={product.angle}
                summary={product.summary}
                truthTitle="AIF detail route truth"
                truthDescription="Keep the detail route honest about continuity while still reading like a premium public research page."
                truthItems={getPublicTruthItems(truth, {
                  continuitySubject: `${product.name} research`,
                  handoffLabel: `${product.name} AIF-to-account handoff`,
                  billingSubject: "premium AIF workflow language",
                  supportSubject: "AIF users who convert into assisted workflows",
                })}
                supportStats={[
                  { label: "Support rows", value: supportRegistry.total },
                  { label: "In progress", value: supportRegistry.inProgress },
                  { label: "Blocked", value: supportRegistry.blocked },
                  { label: "Support", value: config.supportEmail || config.billingSupportEmail || "Not configured yet" },
                ]}
                contained={false}
              />
              <WealthDetailSections family="aif" product={product} />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
