import { hasSupabaseEnv } from "@/lib/env";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export type LaunchMode =
  | "internal_review"
  | "launch_prep"
  | "private_beta"
  | "public_beta"
  | "full_launch";

type LaunchState = {
  mode: LaunchMode;
  label: string;
  publicMessage: string;
  operatorMessage: string;
};

function normalizeLaunchMode(value: string | undefined): LaunchMode {
  if (
    value === "internal_review" ||
    value === "private_beta" ||
    value === "public_beta" ||
    value === "full_launch"
  ) {
    return value;
  }
  return "launch_prep";
}

export function isPrivateBetaOrHigher(mode: string | undefined) {
  const normalized = normalizeLaunchMode(valueOrUndefined(mode));
  return normalized === "private_beta" || normalized === "public_beta" || normalized === "full_launch";
}

function valueOrUndefined(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function getLaunchState(): LaunchState {
  const mode = normalizeLaunchMode(getRuntimeLaunchConfig().launchMode);

  if (mode === "internal_review") {
    return {
      mode,
      label: "Internal review",
      publicMessage: "The platform is in internal review while launch-critical setup is completed.",
      operatorMessage: "Keep public promotion off and validate routes, providers, and trust copy internally.",
    };
  }

  if (mode === "private_beta") {
    return {
      mode,
      label: "Private beta",
      publicMessage: "The platform is in a private beta with controlled access and close operator monitoring.",
      operatorMessage:
        "Keep access curated, verify provider-backed flows, and tighten support continuity before any broader public rollout.",
    };
  }

  if (mode === "public_beta") {
    return {
      mode,
      label: "Public beta",
      publicMessage: "The platform is in a limited public beta with a curated launch scope.",
      operatorMessage: "Promote only the trusted launch surfaces and keep provider-linked risk contained.",
    };
  }

  if (mode === "full_launch") {
    return {
      mode,
      label: "Full launch",
      publicMessage: "The platform is configured for a full public launch state.",
      operatorMessage: "Keep monitoring, recovery, and support surfaces active while traffic scales.",
    };
  }

  return {
    mode,
    label: hasSupabaseEnv() ? "Launch prep" : "Build complete",
    publicMessage: hasSupabaseEnv()
      ? "The build is complete and the platform is in launch prep while final activation is verified."
      : "The build is complete and the platform is waiting on credentials and launch-scope activation.",
    operatorMessage:
      "Treat this as a controlled pre-launch state: confirm scope, apply credentials, and complete preflight before promotion.",
  };
}
