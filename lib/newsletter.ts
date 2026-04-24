export type NewsletterTrack = {
  slug: string;
  title: string;
  cadence: string;
  audience: string;
  summary: string;
  objective: string;
  sections: string[];
  linkedSurfaces: string[];
};

export const newsletterSummary = {
  distributionLoops: 4,
  primarySegments: 5,
  launchChannels: 3,
  archiveTemplates: 4,
};

export const newsletterTracks: NewsletterTrack[] = [
  {
    slug: "market-open-brief",
    title: "Market open brief",
    cadence: "Weekdays",
    audience: "Daily market users",
    summary: "Index tone, key movers, event radar, and quick links into charts, markets, and stock pages.",
    objective: "Turn daily curiosity into repeat product visits before the market session develops.",
    sections: ["Index mood", "Top movers", "Event radar", "Fast links into charts and stocks"],
    linkedSurfaces: ["/markets", "/indices", "/charts", "/stocks"],
  },
  {
    slug: "ipo-and-listings-watch",
    title: "IPO and listings watch",
    cadence: "Event driven",
    audience: "IPO-focused users",
    summary:
      "Upcoming issue reminders, allotment windows, listing transitions, GMP-linked caution, and links into lifecycle pages.",
    objective: "Keep IPO users inside the lifecycle from application window to listed-stock follow-through.",
    sections: ["Upcoming issues", "Allotment windows", "Listing radar", "Lifecycle links"],
    linkedSurfaces: ["/ipo", "/ipo/sme", "/tools/ipo-lot-calculator"],
  },
  {
    slug: "investor-weekly",
    title: "Investor weekly",
    cadence: "Weekly",
    audience: "Funds and wealth users",
    summary: "Mutual funds, ETFs, investor tools, education bundles, and long-form trust-building content.",
    objective: "Deepen investor trust through category education, tools, and repeatable wealth content.",
    sections: ["Fund ideas", "ETF and wealth layer", "Investor tools", "Learning bundle"],
    linkedSurfaces: ["/mutual-funds", "/wealth", "/tools", "/courses"],
  },
  {
    slug: "subscriber-upsell-and-win-back",
    title: "Subscriber upsell and win-back",
    cadence: "Lifecycle based",
    audience: "Signed-up users",
    summary:
      "Saved-portfolio nudges, course bundles, alert highlights, and premium feature reminders without forcing hard paywalls early.",
    objective: "Turn signups into returning users and future buyers through relevance instead of pressure.",
    sections: ["Portfolio nudges", "Alert highlights", "Bundle reminders", "Workstation prompts"],
    linkedSurfaces: ["/portfolio", "/alerts", "/courses", "/trader-workstation"],
  },
];

export const newsletterRules = [
  "Distribution should be segment-aware so IPO readers, traders, investors, and subscribers do not all receive the same generic message.",
  "Every newsletter loop should connect back into owned product surfaces like tools, learn pages, alerts, courses, and portfolio workflows.",
  "Email is the first channel, but the same campaign logic should be reusable for WhatsApp, SMS, and future app push notifications later.",
];

export function getNewsletterTrackBySlug(slug: string) {
  return newsletterTracks.find((track) => track.slug === slug);
}
