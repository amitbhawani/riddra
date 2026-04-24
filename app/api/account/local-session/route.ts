import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  LOCAL_BYPASS_EMAIL_COOKIE,
  isLocalAuthBypassEnabled,
  sanitizeLocalBypassEmail,
} from "@/lib/local-auth-bypass";
import { isTrustedLocalRequestHost } from "@/lib/open-access";

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertLocalBypassSessionControl() {
  if (!isLocalAuthBypassEnabled()) {
    throw new Error("Local auth bypass is not enabled.");
  }

  const requestHeaders = await headers();
  if (!isTrustedLocalRequestHost(requestHeaders.get("host"))) {
    throw new Error("Local session switching is limited to trusted localhost requests.");
  }
}

export async function GET() {
  try {
    await assertLocalBypassSessionControl();
    const cookieStore = await cookies();
    const email = sanitizeLocalBypassEmail(cookieStore.get(LOCAL_BYPASS_EMAIL_COOKIE)?.value);
    return NextResponse.json({
      ok: true,
      email,
      mode: "local_bypass",
    });
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Local session control is unavailable.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await assertLocalBypassSessionControl();
    const payload = (await request.json()) as { email?: string | null };
    const nextEmail = sanitizeLocalBypassEmail(payload.email ?? null);

    if (payload.email && !nextEmail) {
      return badRequest("A valid email is required to switch the local session.");
    }

    const response = NextResponse.json({
      ok: true,
      email: nextEmail,
      mode: "local_bypass",
    });

    if (nextEmail) {
      response.cookies.set(LOCAL_BYPASS_EMAIL_COOKIE, nextEmail, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    } else {
      response.cookies.delete(LOCAL_BYPASS_EMAIL_COOKIE);
    }

    return response;
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Local session control is unavailable.");
  }
}
