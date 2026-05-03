import type { Metadata } from "next";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { getCurrentUser } from "@/lib/auth";
import { getAdminMembershipTiers } from "@/lib/admin-operator-store";
import {
  backfillUserProductProfileActivityForToday,
  listUserProductProfiles,
} from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage user profiles, roles, membership tiers, and activity.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const [tiers, currentUser] = await Promise.all([
    getAdminMembershipTiers(),
    getCurrentUser(),
  ]);
  await backfillUserProductProfileActivityForToday();
  const users = await listUserProductProfiles();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
        ]}
        eyebrow="Users"
        title="User profiles and roles"
        description="Manage member profiles, role assignments, membership tiers, and last-activity posture from one backend screen."
      />

      <AdminGuidanceCard
        title="Roles versus capabilities"
        description="Use role first, then narrow editor access with capabilities only when needed."
        items={[
          "Admin has full backend access.",
          "Editor can work inside allowed admin areas, and capabilities decide which editing or operator actions are visible.",
          "User has no admin access and should not appear in operator workflows except for profile, tier, and activity review.",
        ]}
        links={[
          { href: "/admin/help", label: "Help", tone: "primary" },
          { href: "/admin/activity-log", label: "Activity log" },
        ]}
      />

      <AdminUsersClient
        initialUsers={users}
        membershipTiers={tiers.map((tier) => tier.slug)}
        currentAdminEmail={currentUser?.email ?? null}
      />

      <AdminStorageStatusCard scope="users and role management" />
    </AdminPageFrame>
  );
}
