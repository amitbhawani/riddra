import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { publicMarketNav, publicUtilityNav } from "@/lib/site";

export type ManagedNavLink = {
  label: string;
  href: string;
};

export type SharedSidebarBlock =
  | "market_snapshot"
  | "page_actions"
  | "route_links"
  | "workflow_checklist";

const adminOnlyFooterHrefPatterns = [/^\/launch-readiness$/i, /^\/methodology$/i];
const adminOnlyFooterLabelPatterns = [/launch/i, /readiness/i, /methodology/i, /beta/i];

export type PageFamily = "stock" | "fund" | "ipo" | "index";
export type SidebarMode = "research" | "compare" | "support" | "conversion" | "timeline" | "weightage" | "hidden";

type ManagedSidebarConfig = {
  family: PageFamily;
  mode: SidebarMode;
  badgeLabel: string;
  title: string;
  description: string;
  links: ManagedNavLink[];
};

const defaultHeaderQuickLinks: ManagedNavLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "Search", href: "/search" },
  { label: "Markets", href: "/markets" },
  { label: "Tools", href: "/tools" },
];

const defaultFooterLinks: ManagedNavLink[] = [
  { label: "Launch Readiness", href: "/launch-readiness" },
  { label: "Methodology", href: "/methodology" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

const defaultSharedSidebarBlocks: SharedSidebarBlock[] = [
  "market_snapshot",
  "route_links",
  "page_actions",
  "workflow_checklist",
];

function sanitizeHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\/+/, "")}`;
}

export function parseManagedLinks(raw: string, fallback: ManagedNavLink[]) {
  const parsed = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, hrefPart] = line.split("|");
      const label = labelPart?.trim() ?? "";
      const href = sanitizeHref(hrefPart?.trim() ?? "");

      if (!label || !href) {
        return null;
      }

      return { label, href };
    })
    .filter((item): item is ManagedNavLink => Boolean(item));

  return parsed.length > 0 ? parsed : fallback;
}

function normalizeSidebarMode(value: string, fallback: SidebarMode): SidebarMode {
  switch (value.trim().toLowerCase()) {
    case "research":
    case "compare":
    case "support":
    case "conversion":
    case "timeline":
    case "weightage":
    case "hidden":
      return value.trim().toLowerCase() as SidebarMode;
    default:
      return fallback;
  }
}

function normalizeSharedSidebarBlock(value: string): SharedSidebarBlock | null {
  switch (value.trim().toLowerCase()) {
    case "market_snapshot":
      return "market_snapshot";
    case "page_actions":
      return "page_actions";
    case "route_links":
      return "route_links";
    case "workflow_checklist":
      return "workflow_checklist";
    default:
      return null;
  }
}

function getDefaultSidebarLinks(family: PageFamily, mode: SidebarMode): ManagedNavLink[] {
  const baseByFamily: Record<PageFamily, ManagedNavLink[]> = {
    stock: [
      { label: "Stocks Hub", href: "/stocks" },
      { label: "Charts", href: "/charts" },
      { label: "Search", href: "/search" },
    ],
    fund: [
      { label: "Mutual Funds", href: "/mutual-funds" },
      { label: "Fund Categories", href: "/fund-categories" },
      { label: "Methodology", href: "/methodology" },
    ],
    ipo: [
      { label: "IPO Hub", href: "/ipo" },
      { label: "SME IPOs", href: "/ipo/sme" },
      { label: "Contact", href: "/contact" },
    ],
    index: [
      { label: "Indices Hub", href: "/indices" },
      { label: "Nifty 50", href: "/nifty50" },
      { label: "Sensex", href: "/sensex" },
    ],
  };

  const modeOverrides: Partial<Record<SidebarMode, ManagedNavLink[]>> = {
    compare: [
      { label: "Search", href: "/search" },
      { label: "Stocks Hub", href: "/stocks" },
      { label: "Markets", href: "/markets" },
    ],
    support: [
      { label: "Support", href: "/account/support" },
      { label: "Contact", href: "/contact" },
      { label: "Help", href: "/help" },
    ],
    conversion: [
      { label: "Pricing", href: "/pricing" },
      { label: "Get Started", href: "/get-started" },
      { label: "Sign Up", href: "/signup" },
    ],
    timeline: [
      { label: "IPO Hub", href: "/ipo" },
      { label: "SME IPOs", href: "/ipo/sme" },
      { label: "Markets", href: "/markets" },
    ],
    weightage: [
      { label: "Indices Hub", href: "/indices" },
      { label: "Nifty 50", href: "/nifty50" },
      { label: "Bank Nifty", href: "/banknifty" },
    ],
  };

  return modeOverrides[mode] ?? baseByFamily[family];
}

function getDefaultSidebarTitle(family: PageFamily, mode: SidebarMode) {
  const modeLabelMap: Record<SidebarMode, string> = {
    research: "Research",
    compare: "Compare",
    support: "Support",
    conversion: "Conversion",
    timeline: "Timeline",
    weightage: "Weightage",
    hidden: "Hidden",
  };
  const familyLabelMap: Record<PageFamily, string> = {
    stock: "Stock",
    fund: "Mutual-fund",
    ipo: "IPO",
    index: "Index",
  };

  return `${familyLabelMap[family]} ${modeLabelMap[mode]} sidebar`;
}

function getSidebarDescription(family: PageFamily, mode: SidebarMode, assetName?: string) {
  const assetLabel = assetName?.trim() || "this page";

  switch (mode) {
    case "compare":
      return `Keep peer-discovery and next-step navigation close while someone is reviewing ${assetLabel}.`;
    case "support":
      return `Keep help, contact, and support actions visible from ${assetLabel} without editing each page separately.`;
    case "conversion":
      return `Use one backend-managed CTA set when ${assetLabel} should hand off into signup, pricing, or workspace flows.`;
    case "timeline":
      return `Keep issue-stage navigation and related IPO routes easy to swap from one backend-controlled place.`;
    case "weightage":
      return `Keep index-hub and component-weight navigation consistent across the index family from one backend control lane.`;
    case "hidden":
      return `The managed sidebar is hidden for ${assetLabel}.`;
    case "research":
    default:
      return `Use one backend-managed research sidebar so route-family actions stay consistent as ${assetLabel} evolves.`;
  }
}

export function getSiteChromeConfig() {
  const config = getRuntimeLaunchConfig();

  return {
    headerAnnouncement: config.headerAnnouncement,
    headerQuickLinks: parseManagedLinks(config.headerQuickLinks, defaultHeaderQuickLinks),
    headerMarketNav: parseManagedLinks(config.headerMarketNav, publicMarketNav),
    headerUtilityNav: parseManagedLinks(config.headerUtilityNav, publicUtilityNav),
    primaryCta:
      config.headerPrimaryCtaLabel && config.headerPrimaryCtaHref
        ? {
            label: config.headerPrimaryCtaLabel,
            href: sanitizeHref(config.headerPrimaryCtaHref),
          }
        : null,
    footerSummary:
      config.footerSummary ||
      "Built on Next.js, Vercel, and Supabase with official-source-first data planning and controlled launch execution.",
    footerLinks: parseManagedLinks(config.footerLinks, defaultFooterLinks),
  };
}

export function getManagedSharedSidebarBlocks() {
  const config = getRuntimeLaunchConfig();
  const parsed = config.sharedSidebarVisibleBlocks
    .split(/[\n,]+/)
    .map((value) => normalizeSharedSidebarBlock(value))
    .filter((value): value is SharedSidebarBlock => Boolean(value));

  if (!parsed.length) {
    return defaultSharedSidebarBlocks;
  }

  return defaultSharedSidebarBlocks.filter((block) => parsed.includes(block));
}

export function hasManagedSharedSidebarBlock(block: SharedSidebarBlock) {
  return getManagedSharedSidebarBlocks().includes(block);
}

export function isAdminOnlyFooterLink(link: ManagedNavLink) {
  const normalizedHref = link.href.trim();
  const normalizedLabel = link.label.trim();

  return (
    adminOnlyFooterHrefPatterns.some((pattern) => pattern.test(normalizedHref)) ||
    adminOnlyFooterLabelPatterns.some((pattern) => pattern.test(normalizedLabel))
  );
}

export function getManagedSidebarConfig(family: PageFamily, assetName?: string): ManagedSidebarConfig | null {
  const config = getRuntimeLaunchConfig();

  const rawByFamily: Record<
    PageFamily,
    { mode: string; title: string; links: string; fallbackMode: SidebarMode }
  > = {
    stock: {
      mode: config.stockSidebarMode,
      title: config.stockSidebarTitle,
      links: config.stockSidebarLinks,
      fallbackMode: "compare",
    },
    fund: {
      mode: config.fundSidebarMode,
      title: config.fundSidebarTitle,
      links: config.fundSidebarLinks,
      fallbackMode: "research",
    },
    ipo: {
      mode: config.ipoSidebarMode,
      title: config.ipoSidebarTitle,
      links: config.ipoSidebarLinks,
      fallbackMode: "timeline",
    },
    index: {
      mode: config.indexSidebarMode,
      title: config.indexSidebarTitle,
      links: config.indexSidebarLinks,
      fallbackMode: "weightage",
    },
  };

  const familyConfig = rawByFamily[family];
  const mode = normalizeSidebarMode(familyConfig.mode, familyConfig.fallbackMode);

  if (mode === "hidden") {
    return null;
  }

  return {
    family,
    mode,
    badgeLabel: mode.replaceAll("_", " "),
    title: familyConfig.title || getDefaultSidebarTitle(family, mode),
    description: getSidebarDescription(family, mode, assetName),
    links: parseManagedLinks(familyConfig.links, getDefaultSidebarLinks(family, mode)),
  };
}
