import type { AdminFamilyKey } from "@/lib/admin-content-schema";
import {
  canEditAdminFamily,
  type ProductUserCapability,
  type ProductUserRole,
} from "@/lib/product-permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  note?: string;
  requiredCapability?: ProductUserCapability;
  family?: AdminFamilyKey;
  adminOnly?: boolean;
};

export type AdminNavGroup = {
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: AdminNavItem[];
};

export const adminGlobalSiteSections = [
  {
    key: "header",
    label: "Header / top navigation",
    href: "/admin/global-site/header",
    description: "Manage the main sticky header announcement, top navigation, utility navigation, and primary CTA.",
  },
  {
    key: "footer",
    label: "Footer",
    href: "/admin/global-site/footer",
    description: "Manage footer summary text, footer links, and public trust copy from one editable screen.",
  },
  {
    key: "shared-blocks",
    label: "Shared sidebar/support blocks",
    href: "/admin/global-site/shared-blocks",
    description: "Manage reusable support cards, sidebar promos, and operator-controlled reusable blocks.",
  },
  {
    key: "page-sidebar",
    label: "Shared page sidebar",
    href: "/admin/global-site/page-sidebar",
    description:
      "Choose which shared sidebar blocks, like market snapshot, actions, route links, and short checklists, appear where supported.",
  },
  {
    key: "banners",
    label: "Global banners / notices",
    href: "/admin/global-site/banners",
    description: "Manage reusable notices, banners, and temporary global callouts with publish-state control.",
  },
  {
    key: "route-strips",
    label: "Reusable route strips / CTA modules",
    href: "/admin/global-site/route-strips",
    description: "Manage reusable route strips and CTA modules that can be enabled, disabled, and reordered.",
  },
  {
    key: "market-modules",
    label: "Market snapshot placement options",
    href: "/admin/global-site/market-modules",
    description: "Manage reusable market-context modules and placement presets where the product supports them.",
  },
] as const;

export const adminContentFamilies = [
  { label: "Stocks", href: "/admin/content/stocks", family: "stocks" },
  { label: "Mutual funds", href: "/admin/content/mutual-funds", family: "mutual-funds" },
  { label: "Indices", href: "/admin/content/indices", family: "indices" },
  { label: "ETFs", href: "/admin/content/etfs", family: "etfs" },
  { label: "IPOs", href: "/admin/content/ipos", family: "ipos" },
  { label: "PMS", href: "/admin/content/pms", family: "pms" },
  { label: "AIF", href: "/admin/content/aif", family: "aif" },
  { label: "SIF", href: "/admin/content/sif", family: "sif" },
  { label: "Courses", href: "/admin/content/courses", family: "courses" },
  { label: "Webinars", href: "/admin/content/webinars", family: "webinars" },
  { label: "Learn", href: "/admin/content/learn", family: "learn" },
  { label: "Newsletter", href: "/admin/content/newsletter", family: "newsletter" },
  { label: "Research / articles", href: "/admin/content/research-articles", family: "research-articles" },
] as const;

export const adminPrimaryNavigation: AdminNavGroup[] = [
  {
    title: "Main",
    defaultOpen: true,
    items: [
      { label: "Dashboard", href: "/admin", note: "Assigned work, incomplete pages, stale data, and recent edits." },
      { label: "Content", href: "/admin/content", note: "Search, manage, and edit every public content family." },
      { label: "Sitemap", href: "/admin/sitemap", note: "Tree view of public pages, internal routes, and cleanup candidates.", adminOnly: true },
      { label: "New", href: "/admin/new", note: "Create a new record without hunting through families first." },
      { label: "Media", href: "/admin/media-library", note: "Upload, reuse, and manage shared images for content, SEO, and campaigns.", requiredCapability: "can_manage_media" },
    ],
  },
  {
    title: "Review",
    defaultOpen: true,
    items: [
      { label: "Approvals", href: "/admin/approvals", note: "Review, approve, or reject editor-submitted content changes before they go live.", adminOnly: true },
      { label: "Market News", href: "/admin/market-news", note: "Moderate market news articles, failed rewrites, and ingestion health.", adminOnly: true },
      { label: "Activity Log", href: "/admin/activity-log", note: "Recent admin actions grouped for easy review and quick follow-through." },
      { label: "Change Log", href: "/admin/change-log", note: "Filter all saved changes by user, page, and action." },
      { label: "Help", href: "/admin/help", note: "Plain-language editing guidance for content, approvals, memberships, refresh jobs, and global-site surfaces." },
    ],
  },
  {
    title: "People and Access",
    collapsible: true,
    items: [
      { label: "Users", href: "/admin/users", note: "Profiles, roles, membership tiers, and account activity.", adminOnly: true },
      { label: "Memberships", href: "/admin/memberships", note: "Tiers, access plans, gated-content posture, and future paid-access readiness.", requiredCapability: "can_manage_memberships" },
      { label: "Settings", href: "/admin/settings", note: "Site name, default SEO, support, membership defaults, and global switches.", requiredCapability: "can_manage_settings" },
    ],
  },
  {
    title: "Shared Site",
    collapsible: true,
    items: [
      { label: "Global Site", href: "/admin/global-site", note: "Header, footer, banners, shared modules, and route strips.", adminOnly: true },
      { label: "Documents / Sources", href: "/admin/documents", note: "Factsheets, links, source labels, source dates, and source URLs.", adminOnly: true },
    ],
  },
  {
    title: "Browse Families",
    collapsible: true,
    defaultOpen: false,
    items: adminContentFamilies.map((item) => ({
      label: item.label,
      href: item.href,
      family: item.family,
    })),
  },
  {
    title: "Advanced and Ops",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Readiness", href: "/admin/readiness", note: "What is done, what is blocked, and what still needs hosted follow-through.", adminOnly: true },
      { label: "System Health", href: "/admin/system-health", note: "Plain-language warnings for stale data, failing jobs, and missing support data.", adminOnly: true },
      { label: "Refresh Jobs", href: "/admin/refresh-jobs", note: "Run, review, and troubleshoot source refresh jobs.", requiredCapability: "can_manage_refresh_jobs" },
      { label: "Imports", href: "/admin/imports", note: "Review imported rows and decide what should be applied or left alone.", requiredCapability: "can_manage_imports" },
      { label: "Overrides", href: "/admin/overrides", note: "Manual control rules for cases where source data should not win.", adminOnly: true },
      { label: "Search", href: "/admin/search", note: "Find content, users, memberships, and media from one admin search surface.", adminOnly: true },
      { label: "Market Data", href: "/admin/market-data", adminOnly: true },
      { label: "Search / Screener Truth", href: "/admin/search-screener-truth", adminOnly: true },
      { label: "Public Launch QA", href: "/admin/public-launch-qa", adminOnly: true },
      { label: "Launch Config", href: "/admin/launch-config-console", adminOnly: true },
    ],
  },
];

export function getVisibleAdminNavigation(
  role: ProductUserRole,
  capabilities: ProductUserCapability[],
) {
  if (role === "editor") {
    const editorWorkspaceHrefs = new Set([
      "/admin",
      "/admin/content",
      "/admin/new",
      "/admin/media-library",
      "/admin/activity-log",
      "/admin/change-log",
      "/admin/help",
    ]);

    return adminPrimaryNavigation
      .filter((group) => group.title === "Main" || group.title === "Review")
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!editorWorkspaceHrefs.has(item.href)) {
            return false;
          }

          if (item.requiredCapability) {
            return capabilities.includes(item.requiredCapability);
          }

          if (item.href === "/admin/content" || item.href === "/admin/new") {
            return adminContentFamilies.some((familyItem) =>
              canEditAdminFamily(role, capabilities, familyItem.family),
            );
          }

          return true;
        }),
      }))
      .filter((group) => group.items.length);
  }

  return adminPrimaryNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly) {
          return role === "admin";
        }

        if (item.family) {
          return canEditAdminFamily(role, capabilities, item.family);
        }

        if (item.requiredCapability) {
          return capabilities.includes(item.requiredCapability) || role === "admin";
        }

        if (item.href === "/admin/content" || item.href === "/admin/new") {
          return adminContentFamilies.some((familyItem) =>
            canEditAdminFamily(role, capabilities, familyItem.family),
          );
        }

        return true;
      }),
    }))
    .filter((group) => group.items.length);
}
