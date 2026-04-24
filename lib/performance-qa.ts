export const performanceQaSummary = {
  qualityLanes: 4,
  monitoredSurfaces: 9,
  releaseSignals: 6,
};

export const performanceQaItems = [
  {
    title: "Public-page quality review",
    status: "In progress",
    summary:
      "Heavy research pages, charts, IPO routes, learning surfaces, and route hubs should later have a consistent quality review for responsiveness, layout stability, and readability.",
  },
  {
    title: "Discovery and crawl quality",
    status: "In progress",
    summary:
      "Metadata, schema, canonical paths, and sitemap-linked route groups should later be reviewed together so discovery quality does not degrade invisibly.",
  },
  {
    title: "Admin workflow performance",
    status: "Queued",
    summary:
      "Content, provider, campaign, and reliability surfaces should later be reviewed for operator efficiency so the backend does not become visually complete but practically slow.",
  },
  {
    title: "Release signoff quality gate",
    status: "Queued",
    summary:
      "Major releases should later pass through a compact quality gate that combines build health, route checks, discovery integrity, and operational readiness before promotion.",
  },
];

export const performanceQaRules = [
  "A passed build is not the same thing as a launch-quality experience.",
  "Public quality and operator quality should both matter in release signoff.",
  "Traffic, trust, and usability are all part of performance confidence.",
];
