import { cache } from "react";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ContentSection = {
  sectionKey: string;
  title: string;
  body: string;
  displayOrder: number;
};

const fallbackSections: Record<string, ContentSection[]> = {
  "stock:tata-motors": [
    {
      sectionKey: "overview",
      title: "Why this page matters",
      body: "Tata Motors is a strong template candidate because it combines retail search demand, cyclical sector context, and recurring interest in results, EV strategy, and peer comparison.",
      displayOrder: 1,
    },
    {
      sectionKey: "seo_angle",
      title: "SEO opportunity",
      body: "This route can support share price intent, comparison intent, result-day traffic, and event-led updates with one reusable page system.",
      displayOrder: 2,
    },
  ],
  "ipo:hero-fincorp": [
    {
      sectionKey: "overview",
      title: "IPO lifecycle value",
      body: "This IPO page should evolve into a full lifecycle route with offer details, GMP, subscription, allotment, listing, FAQs, and archive continuity.",
      displayOrder: 1,
    },
    {
      sectionKey: "source_confidence",
      title: "Source discipline",
      body: "Hero Fincorp IPO content should remain tied to official issue documents, exchange updates, and regulator-linked records before any higher-frequency overlays are added.",
      displayOrder: 2,
    },
  ],
  "mutual_fund:hdfc-mid-cap-opportunities": [
    {
      sectionKey: "overview",
      title: "Why this page matters",
      body: "This fund route is designed for evergreen search demand and should become a stable compare surface for category, benchmark, risk, and manager context.",
      displayOrder: 1,
    },
    {
      sectionKey: "data_strategy",
      title: "Data strategy",
      body: "Mutual fund pages should anchor on AMFI and AMC data while using one consistent layout for NAV, holdings, sector split, risk, and compare flows.",
      displayOrder: 2,
    },
  ],
};

export const getContentSections = cache(
  async (assetType: string, assetSlug: string): Promise<ContentSection[]> => {
    if (!hasSupabaseEnv()) {
      return fallbackSections[`${assetType}:${assetSlug}`] ?? [];
    }

    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("content_sections")
        .select("section_key, title, body, display_order")
        .eq("asset_type", assetType)
        .eq("asset_slug", assetSlug)
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return fallbackSections[`${assetType}:${assetSlug}`] ?? [];
      }

      return data.map((item) => ({
        sectionKey: item.section_key,
        title: item.title,
        body: item.body,
        displayOrder: item.display_order,
      }));
    } catch {
      return fallbackSections[`${assetType}:${assetSlug}`] ?? [];
    }
  },
);
