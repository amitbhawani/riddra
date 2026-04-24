import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { env } from "@/lib/env";
import { isHostedAppRuntime, isLocalDevRuntime } from "@/lib/durable-data-runtime";
import { getHostedRuntimeRequirements } from "@/lib/runtime-launch-config";

const CLOUD_TRIGGER_API_URL = "https://api.trigger.dev";
const DEFAULT_TRIGGER_PROFILE = "default";

type TriggerCliProfile = {
  accessToken?: string;
  apiUrl?: string;
};

type TriggerCliConfig = {
  currentProfile?: string;
  profiles?: Record<string, TriggerCliProfile>;
};

function readJsonFile(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as TriggerCliConfig;
  } catch {
    return null;
  }
}

function readTriggerCliProfile() {
  const configPath = join(homedir(), "Library", "Preferences", "trigger", "config.json");
  const config = existsSync(configPath) ? readJsonFile(configPath) : null;

  if (!config) {
    return null;
  }

  const profileName = config.currentProfile ?? DEFAULT_TRIGGER_PROFILE;
  const profile = config.profiles?.[profileName];

  if (!profile?.accessToken) {
    return null;
  }

  return {
    profileName,
    accessToken: profile.accessToken,
    apiUrl: profile.apiUrl ?? CLOUD_TRIGGER_API_URL,
  };
}

export function getTriggerAuthConfig() {
  if (env.triggerSecretKey) {
    return {
      configured: true,
      accessToken: env.triggerSecretKey,
      apiUrl: CLOUD_TRIGGER_API_URL,
      source: "env" as const,
      profileName: null,
    };
  }

  if (isLocalDevRuntime()) {
    const cliProfile = readTriggerCliProfile();

    if (cliProfile) {
      return {
        configured: true,
        accessToken: cliProfile.accessToken,
        apiUrl: cliProfile.apiUrl,
        source: "cli_profile" as const,
        profileName: cliProfile.profileName,
      };
    }
  }

  const hostedRequirements = getHostedRuntimeRequirements();

  return {
    configured: false,
    accessToken: null,
    apiUrl: CLOUD_TRIGGER_API_URL,
    source: "missing" as const,
    profileName: null,
    missingEnv: hostedRequirements.missingTrigger,
  };
}

export function getTriggerCliAuthConfig() {
  if (isHostedAppRuntime()) {
    return null;
  }

  const cliProfile = readTriggerCliProfile();

  if (!cliProfile) {
    return null;
  }

  return {
    configured: true,
    accessToken: cliProfile.accessToken,
    apiUrl: cliProfile.apiUrl,
    source: "cli_profile" as const,
    profileName: cliProfile.profileName,
  };
}
