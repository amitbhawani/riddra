import { getActivationSequence } from "@/lib/activation-sequence";
import { getLiveSmokeTests } from "@/lib/live-smoke-tests";

export type LaunchExecutionQueueItem = {
  title: string;
  type: "Activation" | "Verification";
  status: "Ready to run" | "Blocked" | "Optional" | "Ready to test";
  owner: string;
  href: string;
  detail: string;
};

export function getLaunchExecutionQueue() {
  const sequence = getActivationSequence();
  const smokeTests = getLiveSmokeTests();

  const activationItems: LaunchExecutionQueueItem[] = sequence.steps.map((step) => ({
    title: step.step,
    type: "Activation",
    status: step.status,
    owner: step.owner,
    href: step.href,
    detail: step.detail,
  }));

  const verificationItems: LaunchExecutionQueueItem[] = smokeTests.tests.map((test) => ({
    title: test.title,
    type: "Verification",
    status: test.status,
    owner: "Shared",
    href: test.path,
    detail: test.summary,
  }));

  const items = [...activationItems, ...verificationItems];

  return {
    items,
    readyNow: items.filter((item) => item.status === "Ready to run" || item.status === "Ready to test").length,
    blocked: items.filter((item) => item.status === "Blocked").length,
    optional: items.filter((item) => item.status === "Optional").length,
  };
}
