import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductPageContainer,
  ProductPageTwoColumnLayout,
} from "@/components/product-page-system";

export default async function PortfolioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebar = await getGlobalSidebarRail("portfolio");

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={<div className="riddra-legacy-light-surface min-w-0">{children}</div>}
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
