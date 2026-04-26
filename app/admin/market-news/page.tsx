import type { Metadata } from "next";

import { AdminMarketNewsClient } from "@/components/admin/admin-market-news-client";
import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
} from "@/components/admin/admin-primitives";
import { requireAdmin } from "@/lib/auth";
import { getAdminMarketNewsDashboardState } from "@/lib/market-news/queries";

export const metadata: Metadata = {
  title: "Admin Market News",
  description: "Moderate rewritten market news articles, manage sources, and review recent ingestion status.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketNewsPage() {
  await requireAdmin();
  const state = await getAdminMarketNewsDashboardState();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market News", href: "/admin/market-news" },
        ]}
        eyebrow="Market News"
        title="Market News moderation"
        description="Review ready articles, live stories, rejected items, failed rewrites, source health, and the latest ingestion runs from one admin route."
        actions={
          <>
            <AdminActionLink href="/markets/news" label="Open public news" />
            <AdminActionLink href="/api/admin/market-news" label="Open API" />
          </>
        }
      />

      <AdminMarketNewsClient initialState={state} />
    </AdminPageFrame>
  );
}
