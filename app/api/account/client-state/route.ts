import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getMembershipFeatureAccessForProfile, getUserProductProfile } from "@/lib/user-product-store";

export async function GET() {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
  };

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      ok: true,
      isSignedIn: false,
      accountLabel: null,
      featureAccess: null,
    }, { headers });
  }

  try {
    const profile = await getUserProductProfile(user);
    const featureAccess = await getMembershipFeatureAccessForProfile(profile).catch(() => null);

    return NextResponse.json({
      ok: true,
      isSignedIn: true,
      accountLabel: profile.name || profile.username || profile.email || user.email || null,
      featureAccess,
    }, { headers });
  } catch {
    return NextResponse.json({
      ok: true,
      isSignedIn: true,
      accountLabel: user.email ?? null,
      featureAccess: null,
    }, { headers });
  }
}
