import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const triggerBin = process.platform === "win32"
  ? join(process.cwd(), "node_modules", ".bin", "trigger.cmd")
  : join(process.cwd(), "node_modules", ".bin", "trigger");

if (!existsSync(triggerBin)) {
  console.error("Trigger CLI is not installed locally. Run npm install first.");
  process.exit(1);
}

const child = spawn(
  triggerBin,
  ["dev", "--config", "trigger.config.ts", "--env-file", ".env.local", "--skip-update-check", "--skip-mcp-install"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  },
);

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

