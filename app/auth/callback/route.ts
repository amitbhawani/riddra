import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicSiteUrl } from "@/lib/public-site-url";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const siteUrl = getPublicSiteUrl();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/account";

  if (!hasRuntimeSupabaseEnv() || !code) {
    return NextResponse.redirect(new URL(`/login?error=Auth+callback+is+not+configured+yet.`, siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=Unable+to+complete+authentication.`, siteUrl));
  }

  return NextResponse.redirect(new URL(next, siteUrl));
}
