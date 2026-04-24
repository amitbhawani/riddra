const DEFAULT_SUPABASE_REQUEST_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 4000 : 8000;

function readSupabaseRequestTimeoutMs() {
  const override = Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS);

  if (Number.isFinite(override) && override >= 1000) {
    return override;
  }

  return DEFAULT_SUPABASE_REQUEST_TIMEOUT_MS;
}

const SUPABASE_REQUEST_TIMEOUT_MS = readSupabaseRequestTimeoutMs();

export function hasSupabaseAuthCookies(cookieNames: string[]) {
  return cookieNames.some((name) => name.startsWith("sb-") && name.includes("auth-token"));
}

export function createSupabaseTimedFetch(operation: string): typeof fetch {
  return async (input, init) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${SUPABASE_REQUEST_TIMEOUT_MS}ms.`));
      }, SUPABASE_REQUEST_TIMEOUT_MS);
    });

    try {
      return await Promise.race([fetch(input, init), timeout]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

export function logSupabaseServerWarning(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[supabase] ${operation}: ${detail}`);
}
