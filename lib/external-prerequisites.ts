import { immediateUserInputs, launchControlItems } from "@/lib/launch-control";

export function getExternalPrerequisites() {
  const blockedControlItems = launchControlItems.filter((item) => item.owner !== "Codex" && item.status !== "Ready");

  return {
    openPrerequisites: blockedControlItems.length,
    userInputs: immediateUserInputs.length,
    sharedItems: blockedControlItems.filter((item) => item.owner === "Shared").length,
    items: blockedControlItems.map((item) => ({
      title: item.title,
      owner: item.owner,
      status: item.status,
      detail: item.note,
    })),
    checklist: immediateUserInputs,
  };
}
