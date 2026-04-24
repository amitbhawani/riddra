export type MentorshipTrack = {
  slug: string;
  title: string;
  status: "In progress" | "Queued";
  summary: string;
  audience: string;
  format: string;
  goal: string;
  sequence: string[];
  outcomes: string[];
  relatedRoutes: Array<{
    href: string;
    label: string;
    note: string;
  }>;
};

export const mentorshipSummary = {
  programTracks: 4,
  cohortModes: 3,
  creatorInputs: 5,
};

export const mentorshipTracks: MentorshipTrack[] = [
  {
    slug: "guided-learning-tracks",
    title: "Guided learning tracks",
    status: "In progress",
    summary:
      "Courses, webinars, tools, and learn articles now map into a clearer progression route instead of staying as isolated content units.",
    audience: "High-intent learners who want structure after the first course or webinar",
    format: "Track-led progression",
    goal: "Turn educational curiosity into repeat practice across courses, webinars, tools, and product routes.",
    sequence: [
      "Start from a beginner or trader course so the learner enters with one clear objective.",
      "Reinforce that lesson with one webinar, one tool workflow, and one track-specific report or route handoff.",
      "Move the learner into a review cadence so learning translates into repeated product visits.",
    ],
    outcomes: [
      "Clearer handoff from self-serve education into guided repetition",
      "Better mapping between learn pages, tools, and account-side next moves",
      "A stronger bridge into newsletter, mentorship, or subscriber ladders",
    ],
    relatedRoutes: [
      {
        href: "/learn/tracks/beginner-investor-track",
        label: "Beginner investor track",
        note: "Use the learn track as the first public entry point before moving into structured guidance.",
      },
      {
        href: "/courses/stock-market-foundation",
        label: "Stock market foundation",
        note: "Anchor the first guided sequence on a concrete starter course instead of abstract learning promises.",
      },
      {
        href: "/webinars/chart-reading-bootcamp",
        label: "Chart reading bootcamp",
        note: "Add one repeatable live or replay touchpoint so the path feels guided instead of static.",
      },
    ],
  },
  {
    slug: "mentorship-and-cohort-formats",
    title: "Mentorship and cohort formats",
    status: "In progress",
    summary:
      "The platform can now frame time-bound mentorship cohorts, office-hour loops, and guided accountability around real public learning destinations.",
    audience: "Users who need check-ins, assignments, and a stronger accountability rhythm",
    format: "Cohort plus office-hours loop",
    goal: "Create measurable progression through time-boxed sessions instead of leaving high-intent users in self-serve mode forever.",
    sequence: [
      "Use a fixed cohort window with one operating theme and one expected outcome.",
      "Pair office hours with assignment review so sessions feel useful even when markets are quiet.",
      "Follow each cohort phase with replay, checklist, and route handoffs that keep the habit alive.",
    ],
    outcomes: [
      "A clearer reason for advanced learners to stay engaged after basic courses",
      "Better continuity between live sessions, replays, and product workflows",
      "A cleaner future bridge into premium bundle or subscriber positioning",
    ],
    relatedRoutes: [
      {
        href: "/community/member-participation-loops",
        label: "Member participation loops",
        note: "Community continuity should follow the cohort instead of being a disconnected layer.",
      },
      {
        href: "/webinars/ipo-analysis-live",
        label: "IPO analysis live",
        note: "Use a live event route as the public-facing intake for more structured cohort participation.",
      },
      {
        href: "/tools/breakout-checklist",
        label: "Breakout checklist",
        note: "Attach one practical tool workflow to the cohort so learning becomes repeatable behavior.",
      },
    ],
  },
  {
    slug: "creator-led-milestone-planning",
    title: "Creator-led milestone planning",
    status: "Queued",
    summary:
      "Mentorship tracks can already point to creator media, assignments, reminders, and replay resources, but the operating rhythm still needs more visible public structure.",
    audience: "Learners who follow mentors or creators and need a milestone-based path",
    format: "Milestone-led creator roadmap",
    goal: "Turn creator visibility into a stepwise learning experience instead of scattered announcements or session cards.",
    sequence: [
      "Define one milestone for each stage of the learner journey.",
      "Attach one creator asset, one practice task, and one replay or notes link to every milestone.",
      "Use support and community follow-ups to close the loop after milestone completion.",
    ],
    outcomes: [
      "Creator output becomes part of one coherent educational system",
      "Learners can see why each session or assignment exists",
      "The replay-memory and community layers become more useful over time",
    ],
    relatedRoutes: [
      {
        href: "/newsletter/subscriber-upsell-and-win-back",
        label: "Subscriber lifecycle newsletter",
        note: "Lifecycle messaging should reinforce milestone progression instead of generic nudges.",
      },
      {
        href: "/community/creator-and-support-moderation",
        label: "Creator and support moderation",
        note: "Operations matter once the milestone path creates more cohort and community touchpoints.",
      },
      {
        href: "/learn/events/amc-nav-refresh",
        label: "AMFI refresh event archive",
        note: "Archive-style event pages can hold milestone context when live sessions become replays.",
      },
    ],
  },
  {
    slug: "subscriber-bundle-pathways",
    title: "Subscriber bundle pathways",
    status: "Queued",
    summary:
      "Free courses, subscriber bundles, and premium guided programs can now be framed as one ladder, but the bundle logic still needs stronger public progression cues.",
    audience: "Returning users exploring whether guided learning should become a paid journey",
    format: "Bundle and upgrade ladder",
    goal: "Make upgrades feel like a natural continuation of learning momentum instead of a disconnected paywall moment.",
    sequence: [
      "Map free education into one clear subscriber next step.",
      "Pair bundle value with concrete routes, assignments, or office-hours access instead of vague premium copy.",
      "Keep the upgrade narrative tied to learner outcomes, not only feature access.",
    ],
    outcomes: [
      "A cleaner conversion path from education to subscription",
      "Better alignment between pricing, education, and premium workflow promises",
      "More honest expectation-setting for guided premium value",
    ],
    relatedRoutes: [
      {
        href: "/pricing",
        label: "Pricing",
        note: "The bundle ladder should align with the actual public plan narrative instead of standing apart from it.",
      },
      {
        href: "/courses/options-and-open-interest-playbook",
        label: "Advanced options course",
        note: "Advanced course depth should be one of the clearest bundle-upgrade reasons.",
      },
      {
        href: "/account/access",
        label: "Account access",
        note: "Protected workspace access is where the bundle story should eventually become operational.",
      },
    ],
  },
];

export const mentorshipRules = [
  "Guided learning should increase perceived value, not create a confusing second product line.",
  "Cohorts and mentorship should reuse the same creator, course, and webinar foundations already in the platform.",
  "The learning ladder should feel intentional from free education through deeper subscriber programs.",
];

export function getMentorshipTrackBySlug(slug: string) {
  return mentorshipTracks.find((track) => track.slug === slug) ?? null;
}

export function getMentorshipTrackRoutes() {
  return mentorshipTracks.map((track) => ({
    slug: track.slug,
    href: `/mentorship/${track.slug}`,
  }));
}
