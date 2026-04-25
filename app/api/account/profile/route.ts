import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getUserProductProfile,
  saveUserProductProfile,
  validateUsernameAvailability,
} from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    ok: true,
    profile: await getUserProductProfile(user),
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const currentProfile = await getUserProductProfile(user);
    const payload = (await request.json()) as {
      username?: string;
      name?: string;
      websiteUrl?: string;
      xHandle?: string;
      linkedinUrl?: string;
      instagramHandle?: string;
      youtubeUrl?: string;
    };

    const nextName = String(payload.name ?? currentProfile.name).trim();
    const requestedUsername = String(payload.username ?? "").trim();

    if (!nextName) {
      return badRequest("Name is required.");
    }

    const username = await validateUsernameAvailability(
      requestedUsername || currentProfile.username || nextName || currentProfile.email.split("@")[0],
      {
        excludeUserKey: currentProfile.userKey,
        allowAutoSuffix: !requestedUsername,
      },
    );

    const result = await saveUserProductProfile({
      email: currentProfile.email,
      name: nextName,
      username,
      websiteUrl: payload.websiteUrl,
      xHandle: payload.xHandle,
      linkedinUrl: payload.linkedinUrl,
      instagramHandle: payload.instagramHandle,
      youtubeUrl: payload.youtubeUrl,
      membershipTier: currentProfile.membershipTier,
      role: currentProfile.role,
      capabilities: currentProfile.capabilities,
      profileVisible: currentProfile.profileVisible,
    });

    return NextResponse.json({
      ok: true,
      profile: result.profile,
      savedAt: result.savedAt,
      storageMode: result.storageMode,
    });
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Could not update this profile right now.",
    );
  }
}
