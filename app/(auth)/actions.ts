"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthCallbackUrl, getAuthSessionUrl } from "@/lib/public-site-url";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  return { email, fullName };
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email } = readCredentials(formData);

  if (!hasRuntimeSupabaseEnv()) {
    return {
      error: "Add Supabase keys in .env.local or launch-config before logging in.",
    };
  }

  if (!email) {
    return {
      error: "Email is required.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthSessionUrl("/account/setup"),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Check your email for the secure login link.",
  };
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, fullName } = readCredentials(formData);

  if (!hasRuntimeSupabaseEnv()) {
    return {
      error: "Add Supabase keys in .env.local or launch-config before signing up.",
    };
  }

  if (!fullName || !email) {
    return {
      error: "Full name and email are required.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        full_name: fullName,
      },
      shouldCreateUser: true,
      emailRedirectTo: getAuthSessionUrl("/account/setup"),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Check your email for the verification link to finish signup.",
  };
}

export async function googleAuthAction() {
  if (!hasRuntimeSupabaseEnv()) {
    redirect("/login?error=Add+Supabase+keys+in+.env.local+or+launch-config+before+using+Google+login.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl("/account"),
    },
  });

  if (error || !data.url) {
    redirect("/login?error=Google+login+is+not+configured+yet.");
  }

  redirect(data.url);
}

export async function signoutAction() {
  if (hasRuntimeSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/");
}
