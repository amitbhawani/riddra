import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import {
  ensureUserProductProfile,
  isUserProductStorageUnavailableError,
} from "@/lib/user-product-store";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign-in required.",
      },
      { status: 401 },
    );
  }

  try {
    const profile = await ensureUserProductProfile(user);
    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (error) {
    console.error("[account-bootstrap] Durable account profile bootstrap failed", {
      stage: "ensure_user_product_profile",
      email: user.email ?? null,
      authUserIdPresent: Boolean(user.id),
      userId: user.id,
      hasSupabaseAdminEnv: hasRuntimeSupabaseAdminEnv(),
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    if (isUserProductStorageUnavailableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: hasRuntimeSupabaseAdminEnv()
            ? error.message
            : "Durable account profile storage is unavailable because SUPABASE_SERVICE_ROLE_KEY is missing in hosted runtime.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not finish account setup right now.",
      },
      { status: 500 },
    );
  }
}
