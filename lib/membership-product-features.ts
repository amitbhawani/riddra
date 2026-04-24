export type MembershipFeatureKey =
  | "stocks_basic"
  | "stocks_forecasts"
  | "mutual_funds_basic"
  | "portfolio_tools"
  | "research_access"
  | "courses_access"
  | "premium_analytics";

export type MembershipFeatureAccess = Record<MembershipFeatureKey, boolean>;

export const membershipFeatureGroups: Array<{
  id: string;
  label: string;
  description: string;
  features: Array<{
    key: MembershipFeatureKey;
    label: string;
    note: string;
  }>;
}> = [
  {
    id: "stocks",
    label: "Stocks",
    description: "What the member can do on stock pages and stock-focused workflows.",
    features: [
      {
        key: "stocks_basic",
        label: "Stock basic info",
        note: "Share price, summary, key facts, and page navigation.",
      },
      {
        key: "stocks_forecasts",
        label: "Stock forecasts",
        note: "Forecast-style prompts, conviction cues, and guided next-step reads.",
      },
    ],
  },
  {
    id: "mutual-funds",
    label: "Mutual Funds",
    description: "What the member can access on fund pages and fund research surfaces.",
    features: [
      {
        key: "mutual_funds_basic",
        label: "Fund basic info",
        note: "NAV context, benchmark, category, and related route access.",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio Tools",
    description: "Portfolio tracking, watchlists, and account workspace tools.",
    features: [
      {
        key: "portfolio_tools",
        label: "Portfolio tools",
        note: "Portfolio holdings, dashboard summaries, and linked workspace actions.",
      },
    ],
  },
  {
    id: "research",
    label: "Research",
    description: "Editorial learning and research support layers.",
    features: [
      {
        key: "research_access",
        label: "Research access",
        note: "Learn articles, research-style explainers, and deeper editorial reads.",
      },
    ],
  },
  {
    id: "courses",
    label: "Courses",
    description: "Structured premium learning and guided content programs.",
    features: [
      {
        key: "courses_access",
        label: "Courses and webinars",
        note: "Courses, webinars, and guided premium education journeys.",
      },
    ],
  },
  {
    id: "premium-analytics",
    label: "Premium Analytics",
    description: "Advanced interpretation layers for power users.",
    features: [
      {
        key: "premium_analytics",
        label: "Premium analytics",
        note: "Deeper analytics cues and higher-signal route insights.",
      },
    ],
  },
];

export const allMembershipFeatureKeys = membershipFeatureGroups.flatMap((group) =>
  group.features.map((feature) => feature.key),
);

export function getDefaultMembershipFeatureAccess(
  tierSlug: string | null | undefined,
): MembershipFeatureAccess {
  const normalized = String(tierSlug ?? "").trim().toLowerCase();

  const freeAccess: MembershipFeatureAccess = {
    stocks_basic: true,
    stocks_forecasts: false,
    mutual_funds_basic: true,
    portfolio_tools: true,
    research_access: true,
    courses_access: false,
    premium_analytics: false,
  };

  if (normalized === "pro") {
    return {
      ...freeAccess,
      stocks_forecasts: true,
      courses_access: true,
    };
  }

  if (normalized === "pro-max" || normalized === "pro_max" || normalized === "promax") {
    return {
      ...freeAccess,
      stocks_forecasts: true,
      courses_access: true,
      premium_analytics: true,
    };
  }

  return freeAccess;
}

export function normalizeMembershipFeatureAccess(
  value: unknown,
  tierSlug: string | null | undefined,
): MembershipFeatureAccess {
  const fallback = getDefaultMembershipFeatureAccess(tierSlug);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as Record<string, unknown>;

  return allMembershipFeatureKeys.reduce<MembershipFeatureAccess>((acc, key) => {
    acc[key] = typeof raw[key] === "boolean" ? raw[key] : fallback[key];
    return acc;
  }, { ...fallback });
}

export function isMembershipFeatureEnabled(
  access: MembershipFeatureAccess | null | undefined,
  key: MembershipFeatureKey,
  tierSlug?: string | null,
) {
  return normalizeMembershipFeatureAccess(access, tierSlug)[key];
}

export function buildMembershipFeatureSummary(
  access: MembershipFeatureAccess | null | undefined,
  tierSlug?: string | null,
) {
  const normalized = normalizeMembershipFeatureAccess(access, tierSlug);
  const enabled = allMembershipFeatureKeys.filter((key) => normalized[key]);
  const disabled = allMembershipFeatureKeys.filter((key) => !normalized[key]);

  return {
    enabled,
    disabled,
    totalEnabled: enabled.length,
    totalAvailable: allMembershipFeatureKeys.length,
  };
}
