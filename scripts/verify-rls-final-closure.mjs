import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env.production.local"));

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

const publicReadTables = ["stocks_master", "stock_price_history", "stock_market_snapshot"];
const adminOnlyTables = [
  "market_data_import_batches",
  "market_data_import_rows",
  "market_data_sources",
  "market_refresh_runs",
  "raw_yahoo_imports",
  "stock_import_jobs",
  "stock_import_errors",
  "stock_import_coverage",
  "stock_import_activity_log",
  "stock_import_reconciliation",
  "stock_data_quality_summary",
  "stock_data_freshness",
  "stock_import_alerts",
  "cms_admin_records",
  "cms_admin_record_revisions",
  "cms_admin_global_modules",
  "cms_admin_global_revisions",
  "cms_admin_refresh_jobs",
  "cms_admin_activity_log",
  "cms_admin_editor_locks",
  "cms_admin_pending_approvals",
  "cms_admin_import_batches",
  "cms_admin_import_rows",
  "cms_launch_config_sections",
  "cms_media_assets",
  "cms_preview_sessions",
  "cms_record_versions",
  "cms_refresh_job_runs",
  "cms_membership_tiers",
  "product_system_settings",
];

const serviceClient = createServiceClient();
const anonClient = createAnonClient();
const DEFAULT_TIMEOUT_MS = 20000;

const checkedAt = new Date().toISOString();
const failures = [];
const notes = [];
const tempUserIds = [];
const tempProfileIds = [];
let ordinaryUserClient = null;

const result = {
  checkedAt,
  verdict: "PASS",
  sections: {
    serviceRoleAdminReads: [],
    anonPublicReads: [],
    anonPrivateRestrictions: [],
    selfService: {
      ownProfile: [],
      ownWatchlist: [],
      ownPortfolio: [],
      otherProfileRead: null,
      adminOnlyRestrictions: [],
    },
  },
  failedTables: [],
  failures,
  notes,
};

try {
  await runServiceRoleAdminReadChecks();
  await runAnonChecks();
  await runOrdinaryUserChecks();
} catch (error) {
  recordFailure("runtime", null, `Verifier crashed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await cleanupTemporaryArtifacts();
}

result.failedTables = Array.from(
  new Set(failures.map((failure) => failure.table).filter(Boolean)),
);
result.verdict = failures.length === 0 ? "PASS" : "FAIL";

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

async function runServiceRoleAdminReadChecks() {
  logStage("service_role_admin_reads:start");
  for (const table of adminOnlyTables) {
    logStage(`service_role_probe:${table}`);
    const probe = await safeProbeTable(serviceClient, table);
    const ok = !probe.error;
    result.sections.serviceRoleAdminReads.push({
      table,
      ok,
      error: formatError(probe.error),
      rowCount: probe.rowCount,
      status: probe.status,
      statusText: probe.statusText,
    });

    if (!ok) {
      recordFailure("service_role_admin_read", table, probe.error?.message ?? "Service role read failed.");
    }
  }
  logStage("service_role_admin_reads:done");
}

async function runAnonChecks() {
  logStage("anon_checks:start");
  for (const table of publicReadTables) {
    logStage(`anon_public_probe:${table}`);
    const probe = await safeProbeTable(anonClient, table);
    const ok = !probe.error;
    result.sections.anonPublicReads.push({
      table,
      ok,
      error: formatError(probe.error),
      rowCount: probe.rowCount,
      status: probe.status,
      statusText: probe.statusText,
    });

    if (!ok) {
      recordFailure("anon_public_read", table, probe.error?.message ?? "Anon public read failed.");
    }
  }

  const privateOrAdminTables = ["product_user_profiles", ...adminOnlyTables];

  for (const table of privateOrAdminTables) {
    logStage(`anon_private_probe:${table}`);
    const probe = await safeProbeTable(anonClient, table);
    const ok = isDeniedOrEmpty(probe);
    result.sections.anonPrivateRestrictions.push({
      table,
      ok,
      error: formatError(probe.error),
      rowCount: probe.rowCount,
      status: probe.status,
      statusText: probe.statusText,
    });

    if (!ok) {
      recordFailure(
        "anon_private_restriction",
        table,
        probe.error?.message ?? `Anon unexpectedly read data from ${table}.`,
      );
    }
  }
  logStage("anon_checks:done");
}

async function runOrdinaryUserChecks() {
  logStage("ordinary_user_checks:start");
  const runId = Date.now().toString(36);
  const userOne = await createAuthUser(`rls-verify-${runId}-user1@example.com`, `verify-${runId}-one`);
  const userTwo = await createAuthUser(`rls-verify-${runId}-user2@example.com`, `verify-${runId}-two`);

  tempUserIds.push(userOne.id, userTwo.id);

  ordinaryUserClient = await signInAs(userOne.email, userOne.password);

  const usernameOne = await resolveUniqueUsername(`probe_${runId}_u1`);
  const usernameTwo = await resolveUniqueUsername(`probe_${runId}_u2`);

  const ownProfilePayload = {
    user_key: userOne.email.toLowerCase(),
    auth_user_id: userOne.id,
    email: userOne.email,
    name: "RLS Verify User One",
    username: usernameOne,
    role: "user",
    membership_tier: "free",
    profile_visible: true,
    capabilities: [],
  };

  const ownProfileInsert = await withTimeout("insert_own_profile", () =>
    ordinaryUserClient
      .from("product_user_profiles")
      .insert(ownProfilePayload)
      .select("id,user_key,auth_user_id,email,username,role,membership_tier,profile_visible")
      .single(),
  );

  pushSectionResult(result.sections.selfService.ownProfile, "insert_own_profile", ownProfileInsert);

  if (ownProfileInsert.error || !ownProfileInsert.data) {
    recordFailure("self_service_profile_insert", "product_user_profiles", ownProfileInsert.error?.message ?? "Own profile insert failed.");
    return;
  }

  const ownProfileId = ownProfileInsert.data.id;
  tempProfileIds.push(ownProfileId);

  const ownProfileRead = await withTimeout("read_own_profile", () =>
    ordinaryUserClient
      .from("product_user_profiles")
      .select("id,user_key,auth_user_id,email,username,role,membership_tier,profile_visible")
      .eq("auth_user_id", userOne.id)
      .single(),
  );

  pushSectionResult(result.sections.selfService.ownProfile, "read_own_profile", ownProfileRead);

  if (ownProfileRead.error || !ownProfileRead.data) {
    recordFailure("self_service_profile_read", "product_user_profiles", ownProfileRead.error?.message ?? "Own profile read failed.");
  }

  const ownProfileUpdate = await withTimeout("update_own_profile", () =>
    ordinaryUserClient
      .from("product_user_profiles")
      .update({
        name: "RLS Verify User One Updated",
        profile_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ownProfileId)
      .select("id,name,profile_visible")
      .single(),
  );

  pushSectionResult(result.sections.selfService.ownProfile, "update_own_profile", ownProfileUpdate);

  if (ownProfileUpdate.error || ownProfileUpdate.data?.profile_visible !== false) {
    recordFailure("self_service_profile_update", "product_user_profiles", ownProfileUpdate.error?.message ?? "Own profile update failed.");
  }

  await ensureForeignProfileExists({
    authUserId: userTwo.id,
    email: userTwo.email,
    username: usernameTwo,
  });

  const foreignProfileRead = await withTimeout("read_foreign_profile", () =>
    ordinaryUserClient
      .from("product_user_profiles")
      .select("id,email,auth_user_id")
      .eq("auth_user_id", userTwo.id)
      .maybeSingle(),
  );

  result.sections.selfService.otherProfileRead = {
    ok: !foreignProfileRead.error && !foreignProfileRead.data,
    error: formatError(foreignProfileRead.error),
    returnedRow: foreignProfileRead.data ?? null,
  };

  if (foreignProfileRead.error) {
    recordFailure("self_service_other_profile_read", "product_user_profiles", foreignProfileRead.error.message);
  } else if (foreignProfileRead.data) {
    recordFailure("self_service_other_profile_read", "product_user_profiles", "Ordinary user could read another user's profile.");
  }

  const watchlistInsert = await withTimeout("insert_own_watchlist", () =>
    ordinaryUserClient
      .from("product_user_watchlist_items")
      .insert({
        product_user_profile_id: ownProfileId,
        stock_slug: "reliance-industries",
        stock_symbol: "RELIANCE",
        stock_name: "Reliance Industries",
      })
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name")
      .single(),
  );

  pushSectionResult(result.sections.selfService.ownWatchlist, "insert_own_watchlist", watchlistInsert);

  if (watchlistInsert.error || !watchlistInsert.data) {
    recordFailure(
      "self_service_watchlist_insert",
      "product_user_watchlist_items",
      watchlistInsert.error?.message ?? "Own watchlist insert failed.",
    );
  } else {
    const watchlistRead = await withTimeout("read_own_watchlist", () =>
      ordinaryUserClient
        .from("product_user_watchlist_items")
        .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name")
        .eq("product_user_profile_id", ownProfileId)
        .eq("stock_slug", "reliance-industries")
        .single(),
    );

    pushSectionResult(result.sections.selfService.ownWatchlist, "read_own_watchlist", watchlistRead);

    if (watchlistRead.error || !watchlistRead.data) {
      recordFailure(
        "self_service_watchlist_read",
        "product_user_watchlist_items",
        watchlistRead.error?.message ?? "Own watchlist read failed.",
      );
    }

    const watchlistUpdate = await withTimeout("update_own_watchlist", () =>
      ordinaryUserClient
        .from("product_user_watchlist_items")
        .update({ stock_name: "Reliance Industries Ltd." })
        .eq("id", watchlistInsert.data.id)
        .select("id,stock_name")
        .single(),
    );

    pushSectionResult(result.sections.selfService.ownWatchlist, "update_own_watchlist", watchlistUpdate);

    if (watchlistUpdate.error || watchlistUpdate.data?.stock_name !== "Reliance Industries Ltd.") {
      recordFailure(
        "self_service_watchlist_update",
        "product_user_watchlist_items",
        watchlistUpdate.error?.message ?? "Own watchlist update failed.",
      );
    }
  }

  const portfolioInsert = await withTimeout("insert_own_portfolio", () =>
    ordinaryUserClient
      .from("product_user_portfolio_holdings")
      .insert({
        product_user_profile_id: ownProfileId,
        stock_slug: "tcs",
        stock_symbol: "TCS",
        stock_name: "Tata Consultancy Services",
        quantity: 3,
        buy_price: 3200,
      })
      .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price")
      .single(),
  );

  pushSectionResult(result.sections.selfService.ownPortfolio, "insert_own_portfolio", portfolioInsert);

  if (portfolioInsert.error || !portfolioInsert.data) {
    recordFailure(
      "self_service_portfolio_insert",
      "product_user_portfolio_holdings",
      portfolioInsert.error?.message ?? "Own portfolio insert failed.",
    );
  } else {
    const portfolioRead = await withTimeout("read_own_portfolio", () =>
      ordinaryUserClient
        .from("product_user_portfolio_holdings")
        .select("id,product_user_profile_id,stock_slug,stock_symbol,stock_name,quantity,buy_price")
        .eq("product_user_profile_id", ownProfileId)
        .eq("stock_slug", "tcs")
        .single(),
    );

    pushSectionResult(result.sections.selfService.ownPortfolio, "read_own_portfolio", portfolioRead);

    if (portfolioRead.error || !portfolioRead.data) {
      recordFailure(
        "self_service_portfolio_read",
        "product_user_portfolio_holdings",
        portfolioRead.error?.message ?? "Own portfolio read failed.",
      );
    }

    const portfolioUpdate = await withTimeout("update_own_portfolio", () =>
      ordinaryUserClient
        .from("product_user_portfolio_holdings")
        .update({ quantity: 5, buy_price: 3300, updated_at: new Date().toISOString() })
        .eq("id", portfolioInsert.data.id)
        .select("id,quantity,buy_price")
        .single(),
    );

    pushSectionResult(result.sections.selfService.ownPortfolio, "update_own_portfolio", portfolioUpdate);

    if (
      portfolioUpdate.error ||
      Number(portfolioUpdate.data?.quantity ?? 0) !== 5 ||
      Number(portfolioUpdate.data?.buy_price ?? 0) !== 3300
    ) {
      recordFailure(
        "self_service_portfolio_update",
        "product_user_portfolio_holdings",
        portfolioUpdate.error?.message ?? "Own portfolio update failed.",
      );
    }
  }

  for (const table of adminOnlyTables) {
    logStage(`ordinary_user_admin_probe:${table}`);
    const probe = await safeProbeTable(ordinaryUserClient, table);
    const ok = isDeniedOrEmpty(probe);
    result.sections.selfService.adminOnlyRestrictions.push({
      table,
      ok,
      error: formatError(probe.error),
      rowCount: probe.rowCount,
      status: probe.status,
      statusText: probe.statusText,
    });

    if (!ok) {
      recordFailure(
        "ordinary_user_admin_only_restriction",
        table,
        probe.error?.message ?? `Ordinary user unexpectedly accessed ${table}.`,
      );
    }
  }
  logStage("ordinary_user_checks:done");
}

async function ensureForeignProfileExists({ authUserId, email, username }) {
  const insert = await withTimeout("seed_foreign_profile", () =>
    serviceClient
      .from("product_user_profiles")
      .upsert(
        {
          user_key: email.toLowerCase(),
          auth_user_id: authUserId,
          email,
          name: "RLS Verify User Two",
          username,
          role: "user",
          membership_tier: "free",
          profile_visible: true,
          capabilities: [],
        },
        { onConflict: "user_key" },
      )
      .select("id")
      .single(),
  );

  if (insert.error || !insert.data) {
    recordFailure(
      "foreign_profile_seed",
      "product_user_profiles",
      insert.error?.message ?? "Could not seed second profile.",
    );
    return;
  }

  tempProfileIds.push(insert.data.id);
}

async function createAuthUser(email, password) {
  logStage(`create_auth_user:${email}`);
  const response = await withTimeout(`create_auth_user:${email}`, () =>
    serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        source: "verify-rls-final-closure",
      },
    }),
  );

  if (response.error || !response.data.user) {
    throw new Error(response.error?.message ?? `Could not create auth user for ${email}.`);
  }

  return {
    id: response.data.user.id,
    email,
    password,
  };
}

async function signInAs(email, password) {
  logStage(`sign_in:${email}`);
  const client = createAnonClient();
  const response = await withTimeout(`sign_in:${email}`, () =>
    client.auth.signInWithPassword({ email, password }),
  );

  if (response.error || !response.data.session) {
    throw new Error(response.error?.message ?? `Could not sign in as ${email}.`);
  }

  return client;
}

async function cleanupTemporaryArtifacts() {
  logStage("cleanup:start");
  if (ordinaryUserClient) {
    try {
      await withTimeout("sign_out", () => ordinaryUserClient.auth.signOut(), 10000);
    } catch {}
  }

  const uniqueProfileIds = Array.from(new Set(tempProfileIds.filter(Boolean)));
  if (uniqueProfileIds.length > 0) {
    await withTimeout("cleanup_watchlist_rows", () =>
      serviceClient.from("product_user_watchlist_items").delete().in("product_user_profile_id", uniqueProfileIds),
    );
    await withTimeout("cleanup_portfolio_rows", () =>
      serviceClient.from("product_user_portfolio_holdings").delete().in("product_user_profile_id", uniqueProfileIds),
    );
    await withTimeout("cleanup_profile_rows", () =>
      serviceClient.from("product_user_profiles").delete().in("id", uniqueProfileIds),
    );
  }

  for (const userId of Array.from(new Set(tempUserIds.filter(Boolean)))) {
    const { error } = await withTimeout(`delete_auth_user:${userId}`, () =>
      serviceClient.auth.admin.deleteUser(userId),
    );
    if (error) {
      notes.push(`Cleanup warning: could not delete auth user ${userId}: ${error.message}`);
    }
  }
  logStage("cleanup:done");
}

async function safeProbeTable(client, table) {
  const { count, error, status, statusText, data, success } = await withTimeout(`probe:${table}`, () =>
    client.from(table).select("*", { head: true, count: "planned" }),
  );
  return {
    data: Array.isArray(data) ? data : [],
    rowCount: typeof count === "number" ? count : null,
    error,
    status: typeof status === "number" ? status : null,
    statusText: statusText ?? null,
    success: typeof success === "boolean" ? success : null,
  };
}

function isDeniedOrEmpty(probe) {
  if (probe.status === 401 || probe.status === 403) {
    return true;
  }

  if (!probe.error) {
    return probe.rowCount === 0 || probe.status === 401 || probe.status === 403;
  }

  return isExpectedRestrictedError(probe.error);
}

function isExpectedRestrictedError(error) {
  if (!error) {
    return false;
  }

  const code = String(error.code ?? "").toLowerCase();
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  return (
    code === "42501" ||
    code === "401" ||
    code === "403" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("not authorized") ||
    message.includes("unauthorized") ||
    message.includes("insufficient privileges")
  );
}

function pushSectionResult(section, action, response) {
  section.push({
    action,
    ok: !response.error,
    error: formatError(response.error),
    data: response.data ?? null,
  });
}

function recordFailure(check, table, message) {
  failures.push({
    check,
    table,
    message,
  });
}

function formatError(error) {
  if (!error) {
    return null;
  }

  return {
    message: error.message ?? null,
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function createServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function resolveUniqueUsername(base) {
  const normalized = normalizeUsernameCandidate(base);
  const { data, error } = await withTimeout("resolve_unique_username", () =>
    serviceClient
      .from("product_user_profiles")
      .select("username")
      .like("username", `${normalized}%`),
  );

  if (error) {
    throw new Error(`Could not resolve unique username: ${error.message}`);
  }

  const existing = new Set(
    (data ?? [])
      .map((row) => String(row.username ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existing.has(normalized)) {
    return normalized;
  }

  let suffix = 1;
  while (existing.has(`${normalized}_${suffix}`)) {
    suffix += 1;
  }

  return `${normalized}_${suffix}`.slice(0, 24);
}

function normalizeUsernameCandidate(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "rls_probe";
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function withTimeout(label, operation, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

function logStage(message) {
  console.error(`[verify-rls-final-closure] ${message}`);
}
