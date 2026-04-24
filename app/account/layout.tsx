import type { Metadata } from "next";
import { headers } from "next/headers";

import { syncAccountContinuityRecord } from "@/lib/account-continuity-store";
import { requireBetaUser } from "@/lib/auth";
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
  const user = await requireBetaUser();
  const requestHeaders = await headers();
  const route = requestHeaders.get(REQUEST_PATH_HEADER) ?? "/account";

  await syncAccountContinuityRecord(user, {
    route,
    action: `Loaded account route: ${route}`,
  });

  return <div className="riddra-member-page">{children}</div>;
}
