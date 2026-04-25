import type { Metadata } from "next";
import { headers } from "next/headers";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductPageContainer,
  ProductPageTwoColumnLayout,
} from "@/components/product-page-system";
import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireUser } from "@/lib/auth";
import { REQUEST_PATH_HEADER } from "@/lib/open-access";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const requestHeaders = await headers();
  const route = requestHeaders.get(REQUEST_PATH_HEADER) ?? "/account";
  const sidebar = await getGlobalSidebarRail("account");

  await syncAccountContinuityRecord(user, {
    route,
    action: `Loaded account route: ${route}`,
  });

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
