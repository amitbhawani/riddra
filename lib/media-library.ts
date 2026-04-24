export const mediaLibrarySummary = {
  reusableAssets: 18,
  blockedUploads: 2,
  publishTargets: 6,
};

export const mediaAssetGroups = [
  {
    title: "Course media kit",
    status: "Live",
    summary: "Thumbnail packs, promo clips, note PDFs, and bundle graphics ready to be reused across course and signup surfaces.",
  },
  {
    title: "Webinar replay pack",
    status: "Live",
    summary: "Replay hero, clip markers, notes, and follow-up CTA blocks prepared for webinars, learn pages, and newsletters.",
  },
  {
    title: "Newsletter creative bank",
    status: "In progress",
    summary: "Reusable chart snapshots, market highlight blocks, and campaign cards for distribution loops.",
  },
  {
    title: "Learn article embeds",
    status: "In progress",
    summary: "Video and rich-media slots that map into evergreen learn pages without breaking the structured article flow.",
  },
];

export const mediaLibraryRules = [
  "Media should map to structured entities like course, webinar, learn article, stock page, or campaign rather than being uploaded as disconnected files.",
  "The same source asset should be reusable across public pages, newsletters, webinar replays, and app notifications later.",
  "Creator workflows should preserve ownership, publish status, and rollback-safe replacement history for every asset family.",
];
