export const moduleActivationSummary = {
  activatableModules: 7,
  setupChecklists: 6,
  readinessStates: 4,
};

export const moduleActivationItems = [
  {
    title: "Module activation checklists",
    status: "In progress",
    summary:
      "Each module family should eventually expose a readiness checklist so operators can confirm data, CMS, routes, and rollout rules before it is treated as active.",
  },
  {
    title: "Dependency-aware activation",
    status: "In progress",
    summary:
      "Module activation should eventually respect source, provider, and editorial dependencies instead of allowing partially wired launches to look complete.",
  },
  {
    title: "Operator-ready defaults",
    status: "Queued",
    summary:
      "Starter kits should later ship with safe defaults for SEO, workflow states, and admin visibility so activation becomes predictable.",
  },
  {
    title: "Activation audit memory",
    status: "Queued",
    summary:
      "Every activation should eventually record what was enabled, by whom, and under which readiness assumptions before scale increases operational risk.",
  },
];

export const moduleActivationRules = [
  "A module should not be called active until its routes, content model, and operator touchpoints all exist together.",
  "Activation needs checklist discipline, not only route generation.",
  "Operator defaults should reduce confusion rather than expose raw internal complexity.",
];
