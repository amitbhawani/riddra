import type { AdminFamilyKey } from "@/lib/admin-content-schema";

export type AdminSectionPresentation = {
  title?: string;
  description?: string;
  frontendSection?: string;
  advanced?: boolean;
  collapsedByDefault?: boolean;
};

export const advancedSectionKeys = new Set(["data_sources", "refresh_automation"]);

const wealthFamilies = new Set<AdminFamilyKey>(["etfs", "pms", "aif", "sif"]);
const editorialFamilies = new Set<AdminFamilyKey>(["learn", "newsletter", "research-articles"]);

export function getSectionOrderForFamily(family: AdminFamilyKey) {
  if (family === "courses") {
    return [
      "identity",
      "workflow",
      "structure",
      "lesson_content",
      "relations",
      "seo",
      "access_control",
      "publishing",
      "documents_links",
      "data_sources",
      "refresh_automation",
    ];
  }

  if (family === "webinars") {
    return [
      "identity",
      "workflow",
      "schedule_event",
      "frontend_fields",
      "relations",
      "seo",
      "access_control",
      "publishing",
      "documents_links",
      "data_sources",
      "refresh_automation",
    ];
  }

  if (editorialFamilies.has(family)) {
    return [
      "identity",
      "workflow",
      "frontend_fields",
      "relations",
      "seo",
      "access_control",
      "publishing",
      "documents_links",
      "data_sources",
      "refresh_automation",
    ];
  }

  return [
    "identity",
    "workflow",
    ...(family === "stocks"
      ? ["market_snapshot", "ownership_metrics", "financial_metrics"]
      : []),
    ...(family === "ipos" ? ["lifecycle"] : []),
    "frontend_fields",
    "seo",
    "access_control",
    "publishing",
    "documents_links",
    "data_sources",
    "refresh_automation",
  ];
}

export function getSectionPresentation(
  family: AdminFamilyKey,
  sectionKey: string,
): AdminSectionPresentation {
  if (sectionKey === "identity") {
    if (family === "stocks") {
      return {
        title: "Hero / identity",
        description:
          "Edit the company name, slug, symbol, sector, the single comparison index used in the hero and chart, and the checklist of index memberships shown for ops.",
        frontendSection: "Hero and company identity",
      };
    }

    if (family === "mutual-funds") {
      return {
        title: "Hero / fund identity",
        description:
          "Edit the fund name, slug, category, benchmark, and manager labels shown at the top of the page.",
        frontendSection: "Hero and fund identity",
      };
    }

    if (family === "indices") {
      return {
        title: "Hero / index identity",
        description:
          "Edit the index name, slug, shorthand, and route identity that anchor the public page.",
        frontendSection: "Hero and index identity",
      };
    }

    if (family === "courses") {
      return {
        title: "Hero / course summary",
        description:
          "Edit the title, subtitle, cover, instructor, and category details a learner sees first.",
        frontendSection: "Course hero and identity",
      };
    }

    if (family === "webinars") {
      return {
        title: "Hero / webinar summary",
        description:
          "Edit the title, subtitle, summary, speaker, and cover details shown in the webinar hero.",
        frontendSection: "Webinar hero and identity",
      };
    }

    if (editorialFamilies.has(family)) {
      return {
        title: "Hero / editorial identity",
        description:
          "Edit the title, author, category, and archive-facing identity details shown above the article body.",
        frontendSection: "Editorial hero and identity",
      };
    }

    if (wealthFamilies.has(family)) {
      return {
        title: "Hero / product identity",
        description:
          "Edit the product name, slug, benchmark, and structural identity details shown in the page header.",
        frontendSection: "Hero and product identity",
      };
    }
  }

  if (sectionKey === "frontend_fields") {
    if (family === "ipos") {
      return {
        title: "Issue details, GMP, and listing context",
        description:
          "Edit the public IPO summary, issue details, subscription watch, listing context, FAQs, and investor-facing support copy.",
        frontendSection: "IPO summary, issue detail, and listing watch",
      };
    }

    if (family === "stocks") {
      return {
        title: "Ratings, context, and support",
        description:
          "This section controls the opening brief, route context, FAQs, peer handoffs, and the supporting editorial copy shown lower on the stock page.",
        frontendSection:
          "Opening brief, route context, FAQ, and support blocks",
      };
    }

    if (family === "mutual-funds") {
      return {
        title: "Returns, holdings, and support",
        description:
          "Edit the public summary, returns framing, holdings or allocation context, FAQs, and related route support.",
        frontendSection: "Returns, composition, and fund support",
      };
    }

    if (family === "indices") {
      return {
        title: "Breadth, leadership, and composition",
        description:
          "Edit the narrative, breadth notes, leadership context, and composition support used on the public index route.",
        frontendSection: "Breadth, leadership, and composition",
      };
    }

    if (wealthFamilies.has(family)) {
      return {
        title: "Structure, risk, and suitability",
        description:
          "Edit the public summary, risk and strategy notes, ticket size, liquidity, taxation, and suitability framing.",
        frontendSection: "Structure, risk, and suitability",
      };
    }

    if (family === "webinars") {
      return {
        title: "Agenda, assets, and replay support",
        description:
          "Edit the long-form description, agenda, replay information, assets, and related public support content.",
        frontendSection: "Agenda, assets, and replay",
      };
    }

    if (editorialFamilies.has(family)) {
      return {
        title: "Summary, body, and support blocks",
        description:
          "Edit the summary, body, takeaways, related links, and archive-facing editorial support content.",
        frontendSection: "Summary, body, and support blocks",
      };
    }
  }

  if (sectionKey === "market_snapshot" && family === "stocks") {
    return {
      title: "Summary board: stock details and quick stats",
      description:
        "Edit the visible company numbers that feed the summary board: hero price, stock details, quick stats, and the headline valuation strip.",
      frontendSection: "Summary board, stock details, and quick stats",
    };
  }

  if (sectionKey === "financial_metrics" && family === "stocks") {
    return {
      title: "Quality: fundamentals snapshot",
      description:
        "Edit the core business and profitability rows used in the fundamentals snapshot and profitability lens.",
      frontendSection: "Fundamentals snapshot and profitability lens",
    };
  }

  if (sectionKey === "ownership_metrics" && family === "stocks") {
    return {
      title: "Quality: shareholding pattern",
      description:
        "Edit the visible promoter, FII, DII, and public ownership figures shown in the shareholding block on the summary and quality tabs.",
      frontendSection: "Shareholding pattern and ownership mix",
    };
  }

  if (sectionKey === "lifecycle") {
    return {
      title: "IPO to stock transition",
      description:
        "Set the listing date, stock destination, and automatic handoff posture. The cron job flips the redirect on once the listing date arrives.",
      frontendSection: "Internal lifecycle automation",
    };
  }

  if (sectionKey === "workflow") {
    return {
      title: "Workflow and assignment",
      description:
        "Set the content status, assign the owner, and add a real due date so managers can trust the queue without opening every record.",
      frontendSection: "Internal workflow only",
    };
  }

  if (sectionKey === "seo") {
    return {
      title: "SEO and sharing",
      description:
        "Edit the search result title, meta description, OG image, canonical URL, and noindex posture for this route. Use the media library for reusable image URLs.",
      frontendSection: "Search snippet and social sharing",
    };
  }

  if (sectionKey === "structure") {
    return {
      title: "Modules and lessons",
      description:
        "Edit the course structure, ordering, outcomes, prerequisites, and learning-path metadata.",
      frontendSection: "Modules and lesson structure",
    };
  }

  if (sectionKey === "lesson_content") {
    return {
      title: "Lesson content and embeds",
      description:
        "Edit lesson body blocks, YouTube embeds, downloads, callouts, external links, and preview lesson support.",
      frontendSection: "Lesson content and embeds",
    };
  }

  if (sectionKey === "schedule_event") {
    return {
      title: "Event timing and replay",
      description:
        "Edit the live date, timezone, registration status, replay posture, and ongoing event status.",
      frontendSection: "Event timing, registration, and replay",
    };
  }

  if (sectionKey === "relations") {
    return {
      title: "Related content and routes",
      description:
        "Link the route to nearby courses, webinars, learn articles, or other public surfaces that should appear together.",
      frontendSection: "Related content and routes",
    };
  }

  if (sectionKey === "access_control") {
    return {
      title: "Membership and access",
      description:
        "Control whether this page is public, login-only, tier-gated, teaser-enabled, or locked behind a CTA.",
      frontendSection: "Access, teaser, and lock state",
      collapsedByDefault: true,
    };
  }

  if (sectionKey === "publishing") {
    return {
      title: "Access and publishing",
      description:
        "Control page readiness, route visibility, publish posture, scheduling, and operator notes about whether the route should go live.",
      frontendSection: "Publishing, visibility, and route readiness",
      collapsedByDefault: true,
    };
  }

  if (sectionKey === "documents_links") {
    return {
      title: "Documents and traceable links",
      description:
        "Manage factsheets, filings, public references, and source links that support the visible page. This stays collapsed for now while the hosted document workflow is being prepared.",
      frontendSection: "Documents, filings, and references",
      collapsedByDefault: true,
    };
  }

  if (sectionKey === "data_sources") {
    return {
      title: "Uses source data and source mapping",
      description:
        "Advanced only. Use this when an operator needs to update source labels, source URLs, or deeper source tracing.",
      advanced: true,
    };
  }

  if (sectionKey === "refresh_automation") {
    return {
      title: "Refresh timing and source jobs",
      description:
        "Advanced only. Use this for refresh cadence, source dependencies, and deeper automation posture.",
      advanced: true,
    };
  }

  return {};
}
