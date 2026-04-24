export type CommunityProgram = {
  slug: string;
  title: string;
  status: "In progress" | "Queued";
  summary: string;
  participationMode: string;
  rhythm: string;
  goal: string;
  loops: string[];
  supportBridges: string[];
  relatedRoutes: Array<{
    href: string;
    label: string;
    note: string;
  }>;
};

export const communityProgramsSummary = {
  programFamilies: 4,
  engagementLoops: 5,
  supportBridges: 3,
};

export const communityProgramsItems: CommunityProgram[] = [
  {
    slug: "mentorship-to-community-ladder",
    title: "Mentorship-to-community ladder",
    status: "In progress",
    summary:
      "Guided tracks, cohorts, office hours, and premium learning ladders can now connect into one clearer progression system instead of feeling like unrelated program ideas.",
    participationMode: "Ladder-based progression",
    rhythm: "Cohort close -> office hours -> guided follow-up",
    goal: "Carry momentum forward after a course or mentorship window ends so users do not drop back into passive browsing.",
    loops: [
      "Bring the learner from one guided program into a lower-friction community rhythm.",
      "Use office hours, replay notes, and focused follow-up prompts instead of generic participation asks.",
      "Keep the next recommended route visible after every guided touchpoint.",
    ],
    supportBridges: [
      "Connect community follow-up to the same support and success posture as mentorship.",
      "Keep upgrade language secondary to progression and clarity.",
      "Make it obvious when the ladder is still a guided preview rather than a live cohort engine.",
    ],
    relatedRoutes: [
      {
        href: "/mentorship/mentorship-and-cohort-formats",
        label: "Mentorship and cohort formats",
        note: "This is the strongest upstream route before the community ladder begins.",
      },
      {
        href: "/learn/tracks/trader-track",
        label: "Trader track",
        note: "Track pages can act as the pre-community intake layer for higher-intent learners.",
      },
      {
        href: "/webinars/chart-reading-bootcamp",
        label: "Chart reading bootcamp",
        note: "Live or replay events help transition users from solo learning into community rhythm.",
      },
    ],
  },
  {
    slug: "member-participation-loops",
    title: "Member participation loops",
    status: "In progress",
    summary:
      "Assignments, reminder cadence, replay access, and follow-up discussions can now be framed as one participation loop instead of four separate promises.",
    participationMode: "Repeatable member loop",
    rhythm: "Assignment -> reminder -> replay -> discussion",
    goal: "Make community-style learning feel active and measurable rather than content-heavy with no continuation.",
    loops: [
      "Every assignment should have one visible follow-up route or replay surface.",
      "Reminder cadence should nudge toward action, not only announce new content.",
      "Discussion prompts should connect back to a concrete product or learning route.",
    ],
    supportBridges: [
      "Participation loops should eventually attach to alerts, inbox, and newsletter logic.",
      "Replay context should preserve what the user was trying to learn or practice.",
      "Community loops should stay honest when they are still staged rather than fully live.",
    ],
    relatedRoutes: [
      {
        href: "/newsletter/investor-weekly",
        label: "Investor weekly",
        note: "Distribution can reinforce participation loops between live sessions or assignments.",
      },
      {
        href: "/reports/results-calendar",
        label: "Results calendar",
        note: "Event-led routes are good anchors for community prompts tied to real market moments.",
      },
      {
        href: "/tools/position-size-calculator",
        label: "Position size calculator",
        note: "A practical tool route helps the participation loop feel actionable instead of purely editorial.",
      },
    ],
  },
  {
    slug: "creator-and-support-moderation",
    title: "Creator and support moderation",
    status: "Queued",
    summary:
      "Community programs can later connect creator workflows, cohort ops, and support or user-success handling so participation can scale cleanly.",
    participationMode: "Moderated program operations",
    rhythm: "Session publish -> response handling -> escalation -> replay memory",
    goal: "Prevent community growth from becoming a support burden or a creator-only responsibility.",
    loops: [
      "Define who answers, who moderates, and who escalates when community activity grows.",
      "Keep replay memory and assignment context visible for follow-up conversations.",
      "Make moderation feel like part of one learning system instead of separate support work.",
    ],
    supportBridges: [
      "Support and creator teams should converge on one participation history.",
      "Cohort operations should inherit the same launch-truth discipline as subscriber workflows.",
      "Escalation paths should be visible before the community layer is marketed as live.",
    ],
    relatedRoutes: [
      {
        href: "/admin/cohort-ops",
        label: "Cohort ops",
        note: "The ops side should stay aligned with any public-facing community promises.",
      },
      {
        href: "/admin/support-ops",
        label: "Support ops",
        note: "Community moderation eventually needs handoff discipline, not only creator bandwidth.",
      },
      {
        href: "/admin/replay-memory",
        label: "Replay memory",
        note: "Recorded sessions and follow-ups should preserve enough context for later support or moderation.",
      },
    ],
  },
  {
    slug: "program-value-and-upgrade-framing",
    title: "Program value and upgrade framing",
    status: "Queued",
    summary:
      "Free learning, subscriber bundles, mentorship tracks, and deeper community programs can now be positioned as one clearer value ladder, but the public framing still needs more density.",
    participationMode: "Value ladder",
    rhythm: "Free education -> guided programs -> premium continuity",
    goal: "Keep community value coherent with pricing and premium learning instead of creating a disconnected second pitch.",
    loops: [
      "Free education should point toward one clear deeper participation path.",
      "Subscriber value should explain what guidance or continuity improves, not only what becomes unlocked.",
      "Community framing should increase trust before it increases pressure.",
    ],
    supportBridges: [
      "Pricing, education, and community should share one language around outcomes.",
      "The strongest community promises should map to real route depth, not only roadmap language.",
      "Upgrade framing should stay secondary to user success when public trust is still being built.",
    ],
    relatedRoutes: [
      {
        href: "/pricing",
        label: "Pricing",
        note: "The value ladder should match the actual plan narrative users already see.",
      },
      {
        href: "/mentorship/subscriber-bundle-pathways",
        label: "Subscriber bundle pathways",
        note: "Mentorship and community framing should stay aligned instead of diverging into two ladders.",
      },
      {
        href: "/account/workspace",
        label: "Account workspace",
        note: "Future premium community continuity should feel connected to the signed-in workspace.",
      },
    ],
  },
];

export const communityProgramsRules = [
  "Community should deepen the learning system rather than split it into another product.",
  "Participation loops matter more than simply adding more program pages.",
  "Creator, support, and subscriber-success workflows should converge around community delivery.",
];

export function getCommunityProgramBySlug(slug: string) {
  return communityProgramsItems.find((program) => program.slug === slug) ?? null;
}

export function getCommunityProgramRoutes() {
  return communityProgramsItems.map((program) => ({
    slug: program.slug,
    href: `/community/${program.slug}`,
  }));
}
