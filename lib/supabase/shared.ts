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

function shouldLogSupabaseTiming(durationMs: number) {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const threshold = Number(process.env.SUPABASE_SLOW_QUERY_LOG_MS ?? "250");
  return Number.isFinite(threshold) ? durationMs >= threshold : durationMs >= 250;
}

export function hasSupabaseAuthCookies(cookieNames: string[]) {
  return cookieNames.some((name) => name.startsWith("sb-") && name.includes("auth-token"));
}

export function createSupabaseTimedFetch(operation: string): typeof fetch {
  return async (input, init) => {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${SUPABASE_REQUEST_TIMEOUT_MS}ms.`));
      }, SUPABASE_REQUEST_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([fetch(input, init), timeout]);
      const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = Math.round(finishedAt - startedAt);

      if (shouldLogSupabaseTiming(durationMs)) {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : "url" in input
                ? String(input.url)
                : "unknown";
        console.info("[supabase] request timing", {
          operation,
          durationMs,
          requestUrl,
        });
      }

      return response;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

export async function withDevelopmentTiming<T>(
  operation: string,
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    return await task();
  } finally {
    const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.round(finishedAt - startedAt);
    if (shouldLogSupabaseTiming(durationMs)) {
      console.info("[perf] timing", {
        operation,
        durationMs,
      });
    }
  }
}

export function logSupabaseServerWarning(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[supabase] ${operation}: ${detail}`);
}
