import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Membership tiers",
};

export default async function AdminNewMembershipPage() {
  redirect("/admin/memberships/free");
}
