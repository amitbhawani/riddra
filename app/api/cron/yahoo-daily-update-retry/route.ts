import type { NextRequest } from "next/server";

import {
  executeYahooDailyUpdateCron,
  handleYahooDailyUpdateCronHead,
} from "@/app/api/cron/yahoo-daily-update/_shared";

export async function GET(request: NextRequest) {
  return executeYahooDailyUpdateCron(request, {
    cronWindow: "retry",
    source: "cron_get",
  });
}

export async function POST(request: NextRequest) {
  return executeYahooDailyUpdateCron(request, {
    cronWindow: "retry",
    source: "manual_post",
  });
}

export async function HEAD(request: NextRequest) {
  return handleYahooDailyUpdateCronHead(request);
}
