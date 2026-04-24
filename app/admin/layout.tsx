import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireOperator } from "@/lib/auth";
import { getAdminSystemWarnings } from "@/lib/admin-system-health";
import { REQUEST_PATH_HEADER } from "@/lib/open-access";
import { canAccessAdminPagePath, getAdminLandingPath } from "@/lib/product-permissions";

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

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const route = requestHeaders.get(REQUEST_PATH_HEADER) ?? "/admin";
  const { user, role, capabilities } = await requireOperator();
  const systemWarnings = await getAdminSystemWarnings();

  if (!canAccessAdminPagePath(route, role, capabilities)) {
    redirect(getAdminLandingPath(role, capabilities));
  }

  return (
    <AdminShell
      userEmail={user.email}
      userRole={role}
      userCapabilities={capabilities}
      systemWarnings={systemWarnings}
    >
      {children}
    </AdminShell>
  );
}
