import type { ReactNode } from "react";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductPageContainer,
  ProductPageTwoColumnLayout,
} from "@/components/product-page-system";
import type { SharedSidebarPageCategory } from "@/lib/shared-sidebar-config";

export async function GlobalSidebarPageShell({
  category,
  children,
  className = "space-y-3.5 sm:space-y-4",
  leftClassName = "riddra-legacy-light-surface space-y-6",
}: {
  category: SharedSidebarPageCategory;
  children: ReactNode;
  className?: string;
  leftClassName?: string;
}) {
  const sidebar = await getGlobalSidebarRail(category);

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
      <ProductPageContainer className={className}>
        <ProductPageTwoColumnLayout
          left={<div className={leftClassName}>{children}</div>}
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
