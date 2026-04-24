import { defineConfig } from "@trigger.dev/sdk/v3";
import { DEFAULT_TRIGGER_PROJECT_REF } from "./lib/trigger-config";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? DEFAULT_TRIGGER_PROJECT_REF,
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 300,
  tsconfig: "./tsconfig.json",
});
