import { isHostedAppRuntime } from "@/lib/durable-data-runtime";

export const DEFAULT_TRIGGER_PROJECT_REF = "riddra-private-beta";

export function getConfiguredTriggerProjectRef() {
  const value = process.env.TRIGGER_PROJECT_REF?.trim();
  if (value) {
    return value;
  }

  if (isHostedAppRuntime()) {
    return "";
  }

  return DEFAULT_TRIGGER_PROJECT_REF;
}
