import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for normal user bootstrap smoke test.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const targetEmail = "advicesmedia@gmail.com";
const fakeAuthUserId = "00000000-0000-4000-8000-000000000001";
const createdAt = new Date().toISOString();
const baseUsername = "advicesmedia";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeUsernameCandidate(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

async function resolveUniqueUsername(base) {
  const normalized = normalizeUsernameCandidate(base) || "advicesmedia";
  const { data, error } = await supabase
    .from("product_user_profiles")
    .select("username")
    .like("username", `${normalized}%`);

  if (error) {
    throw error;
  }

  const existing = new Set((data ?? []).map((row) => String(row.username ?? "").trim().toLowerCase()));

  if (!existing.has(normalized)) {
    return normalized;
  }

  const suffix = Date.now().toString(36).slice(-4);
  return `${normalized}_${suffix}`.slice(0, 24);
}

const existingProfileResponse = await supabase
  .from("product_user_profiles")
  .select("id,user_key,email,auth_user_id,username")
  .eq("user_key", targetEmail)
  .maybeSingle();

if (existingProfileResponse.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: "existing_profile_lookup",
        error: existingProfileResponse.error,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (existingProfileResponse.data) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        skipped: true,
        reason:
          "A durable profile row already exists for advicesmedia@gmail.com. Skipping destructive smoke insert.",
        existingProfile: existingProfileResponse.data,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const username = await resolveUniqueUsername(baseUsername);
const payload = {
  user_key: targetEmail,
  auth_user_id: fakeAuthUserId,
  email: targetEmail,
  name: targetEmail,
  username,
  role: "user",
  membership_tier: "free",
  profile_visible: true,
  capabilities: [],
  created_at: createdAt,
  updated_at: createdAt,
  last_active_at: createdAt,
};

const insertResponse = await supabase
  .from("product_user_profiles")
  .upsert(payload, { onConflict: "user_key" })
  .select("id,user_key,auth_user_id,email,username,role,membership_tier,profile_visible")
  .single();

if (insertResponse.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: "insert",
        payload,
        error: insertResponse.error,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const readResponse = await supabase
  .from("product_user_profiles")
  .select("id,user_key,auth_user_id,email,username,role,membership_tier,profile_visible")
  .eq("user_key", targetEmail)
  .single();

if (readResponse.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: "read_back",
        error: readResponse.error,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const deleteResponse = await supabase.from("product_user_profiles").delete().eq("user_key", targetEmail);

if (deleteResponse.error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: "cleanup",
        error: deleteResponse.error,
        insertedProfile: readResponse.data,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      payload,
      insertedProfile: insertResponse.data,
      readBackProfile: readResponse.data,
      cleanup: "deleted",
    },
    null,
    2,
  ),
);
