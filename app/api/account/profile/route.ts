import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getUserProductProfile,
  isUserProductStorageUnavailableError,
  saveUserProductProfile,
} from "@/lib/user-product-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      ok: true,
      profile: await getUserProductProfile(user),
    });
  } catch (error) {
    if (isUserProductStorageUnavailableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account profile storage is temporarily unavailable.",
        },
        { status: 503 },
      );
    }

    throw error;
  }
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

    const result = await saveUserProductProfile({
      authUserId: user.id,
      email: currentProfile.email,
      name: nextName,
      username: requestedUsername || currentProfile.username || nextName || currentProfile.email.split("@")[0],
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
    if (isUserProductStorageUnavailableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account profile storage is temporarily unavailable.",
        },
        { status: 503 },
      );
    }

    return badRequest(error instanceof Error ? error.message : "Could not update this profile right now.");
  }
}
