import http from "node:http";
import https from "node:https";

import { readLocalDevRuntimeStore } from "./local-dev-runtime-store.mjs";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_SETTLE_MS = 1_200;
const DEFAULT_LCP_BUDGET_MS = 2_000;
const DEFAULT_INTERACTION_BUDGET_MS = 200;
const DEFAULT_CLS_BUDGET = 0.1;
const DEFAULT_CHROME_DEBUG_URL = "http://127.0.0.1:9222";
const DEFAULT_ROUTE_PATHS = [
  "/",
  "/markets",
  "/markets/news",
  "/stocks",
  "/stocks/page/2",
  "/stocks/3m-india-limited",
  "/indices",
];
const CANDIDATE_BASE_URLS = [
  "http://127.0.0.1:3003",
  "http://localhost:3003",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3002",
  "http://localhost:3002",
];
const CONSOLE_ERROR_TYPES = new Set(["assert", "error"]);
const LOG_ERROR_LEVELS = new Set(["error"]);

function parseCliArgs(argv) {
  const parsed = {
    baseUrl: "",
    debugUrl: DEFAULT_CHROME_DEBUG_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    settleMs: DEFAULT_SETTLE_MS,
    lcpBudgetMs: DEFAULT_LCP_BUDGET_MS,
    interactionBudgetMs: DEFAULT_INTERACTION_BUDGET_MS,
    clsBudget: DEFAULT_CLS_BUDGET,
    routes: [...DEFAULT_ROUTE_PATHS],
    verbose: false,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      if (!parsed.baseUrl) {
        parsed.baseUrl = arg;
      }
      continue;
    }

    const [rawKey, ...valueParts] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = valueParts.join("=").trim();

    if (key === "base" && value) {
      parsed.baseUrl = value;
      continue;
    }

    if (key === "debug" && value) {
      parsed.debugUrl = value;
      continue;
    }

    if (key === "timeout") {
      const timeoutMs = Number(value);
      if (Number.isFinite(timeoutMs) && timeoutMs >= 1_000) {
        parsed.timeoutMs = Math.trunc(timeoutMs);
      }
      continue;
    }

    if (key === "settle") {
      const settleMs = Number(value);
      if (Number.isFinite(settleMs) && settleMs >= 100) {
        parsed.settleMs = Math.trunc(settleMs);
      }
      continue;
    }

    if (key === "lcp") {
      const lcpBudgetMs = Number(value);
      if (Number.isFinite(lcpBudgetMs) && lcpBudgetMs > 0) {
        parsed.lcpBudgetMs = Math.trunc(lcpBudgetMs);
      }
      continue;
    }

    if (key === "interaction") {
      const interactionBudgetMs = Number(value);
      if (Number.isFinite(interactionBudgetMs) && interactionBudgetMs > 0) {
        parsed.interactionBudgetMs = Math.trunc(interactionBudgetMs);
      }
      continue;
    }

    if (key === "cls") {
      const clsBudget = Number(value);
      if (Number.isFinite(clsBudget) && clsBudget >= 0) {
        parsed.clsBudget = clsBudget;
      }
      continue;
    }

    if (key === "routes" && value) {
      const routes = value
        .split(",")
        .map((route) => normalizeRoutePath(route))
        .filter(Boolean);
      if (routes.length > 0) {
        parsed.routes = routes;
      }
      continue;
    }

    if (key === "verbose") {
      parsed.verbose = value ? value !== "false" : true;
    }
  }

  return parsed;
}

function normalizeRoutePath(route) {
  const trimmed = `${route ?? ""}`.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestText(urlInput, { method = "GET", timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = urlInput instanceof URL ? urlInput : new URL(urlInput);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method,
        headers: {
          accept: "application/json,text/plain,*/*",
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms.`));
    });
    request.on("error", reject);
    request.end();
  });
}

async function findHealthyBaseUrl(requestedBaseUrl, timeoutMs) {
  const runtime = await readLocalDevRuntimeStore();
  const runtimeUrl = typeof runtime.url === "string" ? runtime.url.trim() : "";
  const candidates = [
    requestedBaseUrl,
    runtimeUrl,
    ...CANDIDATE_BASE_URLS,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await requestText(new URL("/", candidate), {
        method: "HEAD",
        timeoutMs,
      });

      if (response.status >= 200 && response.status < 400) {
        return candidate;
      }
    } catch {}
  }

  throw new Error(
    `Unable to find a healthy local base URL. Checked: ${candidates.join(", ") || "none"}.`,
  );
}

async function ensureChromeDebugger(debugUrl, timeoutMs) {
  try {
    const response = await requestText(new URL("/json/version", debugUrl), {
      method: "GET",
      timeoutMs,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Chrome DevTools responded with ${response.status}.`);
    }

    return JSON.parse(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Chrome DevTools is not available at ${debugUrl}. Start Chrome with remote debugging first, for example: open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/riddra-chrome-perf about:blank. ${message}`,
    );
  }
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket) {
      return;
    }

    const socket = new WebSocket(this.webSocketUrl);

    await new Promise((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", (event) => {
        reject(event.error ?? new Error("Unable to connect to Chrome DevTools."));
      }, { once: true });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);

      if (payload.id) {
        const pending = this.pending.get(payload.id);
        if (!pending) {
          return;
        }

        this.pending.delete(payload.id);

        if (payload.error) {
          pending.reject(new Error(payload.error.message));
        } else {
          pending.resolve(payload.result ?? {});
        }

        return;
      }

      const listeners = this.listeners.get(payload.method);
      if (!listeners || listeners.size === 0) {
        return;
      }

      for (const listener of listeners) {
        listener(payload.params ?? {});
      }
    });

    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("Chrome DevTools connection closed."));
      }
      this.pending.clear();
    });

    this.socket = socket;
  }

  async send(method, params = {}) {
    if (!this.socket) {
      throw new Error("Chrome DevTools session is not connected.");
    }

    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(handler);
    this.listeners.set(method, listeners);

    return () => {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.listeners.delete(method);
      }
    };
  }

  waitForEvent(method, predicate = () => true, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);

      const unsubscribe = this.on(method, (params) => {
        if (!predicate(params)) {
          return;
        }

        clearTimeout(timeout);
        unsubscribe();
        resolve(params);
      });
    });
  }

  async close() {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

    if (socket.readyState === WebSocket.CLOSED) {
      return;
    }

    await new Promise((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
      socket.close();
    });
  }
}

async function createTarget(debugUrl, url = "about:blank") {
  const response = await requestText(
    `${new URL("/json/new", debugUrl).toString()}?${encodeURIComponent(url)}`,
    {
      method: "PUT",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Unable to create a Chrome target (${response.status}).`);
  }

  return JSON.parse(response.body);
}

async function closeTarget(debugUrl, targetId) {
  if (!targetId) {
    return;
  }

  try {
    await requestText(new URL(`/json/close/${targetId}`, debugUrl), {
      method: "PUT",
      timeoutMs: 5_000,
    });
  } catch {}
}

function browserProbeSource() {
  return `(() => {
    window.__riddraBrowserPerf = {
      cls: 0,
      fcpMs: null,
      lcpMs: null,
      longTaskCount: 0,
      longTaskMs: 0,
      interactions: [],
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          window.__riddraBrowserPerf.fcpMs = entry.startTime;
        }
      }
    }).observe({ type: "paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__riddraBrowserPerf.lcpMs = entry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__riddraBrowserPerf.cls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__riddraBrowserPerf.interactions.push({
            duration: entry.duration,
            interactionId: entry.interactionId ?? 0,
            name: entry.name,
            startTime: entry.startTime,
          });
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    } catch (error) {
      window.__riddraBrowserPerf.eventObserverError = String(error);
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__riddraBrowserPerf.longTaskCount += 1;
          window.__riddraBrowserPerf.longTaskMs += entry.duration;
        }
      }).observe({ type: "longtask", buffered: true });
    } catch (error) {
      window.__riddraBrowserPerf.longTaskObserverError = String(error);
    }
  })();`;
}

async function evaluateJson(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  return JSON.parse(result.result?.value ?? "null");
}

function extractConsoleText(params) {
  const renderedArguments = (params.args ?? [])
    .map((argument) => {
      if (typeof argument.value === "string") {
        return argument.value;
      }

      if (typeof argument.value === "number" || typeof argument.value === "boolean") {
        return String(argument.value);
      }

      if (argument.unserializableValue) {
        return argument.unserializableValue;
      }

      return argument.description ?? argument.type ?? "unknown";
    })
    .filter(Boolean);

  return renderedArguments.join(" ").trim();
}

function roundMetric(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function formatMetric(value, suffix = "ms") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }

  return `${value}${suffix}`;
}

function formatCls(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }

  return value.toFixed(3);
}

async function auditRoute(baseUrl, debugUrl, routePath, options) {
  const routeUrl = new URL(routePath, baseUrl).toString();
  const target = await createTarget(debugUrl);
  const session = new CdpSession(target.webSocketDebuggerUrl);
  const consoleErrors = [];
  const logErrors = [];
  const networkFailures = [];
  const runtimeExceptions = [];

  try {
    await session.connect();

    session.on("Runtime.consoleAPICalled", (params) => {
      if (!CONSOLE_ERROR_TYPES.has(params.type)) {
        return;
      }

      consoleErrors.push(extractConsoleText(params));
    });

    session.on("Log.entryAdded", (params) => {
      const entry = params.entry ?? {};
      if (!LOG_ERROR_LEVELS.has(entry.level)) {
        return;
      }

      logErrors.push(entry.text ?? "Log error");
    });

    session.on("Runtime.exceptionThrown", (params) => {
      runtimeExceptions.push(
        params.exceptionDetails?.text ??
          params.exceptionDetails?.exception?.description ??
          "Runtime exception",
      );
    });

    session.on("Network.responseReceived", (params) => {
      const response = params.response ?? {};
      const status = Number(response.status);
      if (!Number.isFinite(status) || status < 400) {
        return;
      }

      networkFailures.push(
        `${status} ${response.url ?? "unknown resource"}${params.type ? ` (${params.type})` : ""}`,
      );
    });

    await Promise.all([
      session.send("Page.enable"),
      session.send("Runtime.enable"),
      session.send("Log.enable"),
      session.send("Network.enable"),
    ]);
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await session.send("Network.setCacheDisabled", {
      cacheDisabled: true,
    });
    await session.send("Network.clearBrowserCache");
    await session.send("Page.addScriptToEvaluateOnNewDocument", {
      source: browserProbeSource(),
    });
    await session.send("Page.bringToFront");

    const loadPromise = session.waitForEvent("Page.loadEventFired", () => true, options.timeoutMs);
    const navigateResult = await session.send("Page.navigate", { url: routeUrl });

    if (navigateResult.errorText) {
      throw new Error(navigateResult.errorText);
    }

    await loadPromise;

    await evaluateJson(
      session,
      `JSON.stringify((async () => {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        return true;
      })())`,
    );
    await delay(options.settleMs);

    const probePoint = await evaluateJson(
      session,
      `JSON.stringify((() => {
        const id = "__riddra_perf_probe__";
        let button = document.getElementById(id);

        if (!button) {
          button = document.createElement("button");
          button.id = id;
          button.type = "button";
          button.textContent = "Perf probe";
          button.setAttribute("aria-label", "Perf probe");
          Object.assign(button.style, {
            position: "fixed",
            right: "16px",
            bottom: "16px",
            zIndex: "2147483647",
            padding: "8px 10px",
            border: "0",
            borderRadius: "9999px",
            background: "#111111",
            color: "#ffffff",
            opacity: "0.01",
            pointerEvents: "auto",
          });
          button.addEventListener("click", () => {
            document.body.dataset.riddraPerfProbe = String(Date.now());
            document.body.style.outline = document.body.style.outline ? "" : "1px solid transparent";
          });
          document.body.appendChild(button);
        }

        const rect = button.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      })())`,
    );

    for (const params of [
      { type: "mouseMoved", x: probePoint.x, y: probePoint.y, button: "none", buttons: 0 },
      { type: "mousePressed", x: probePoint.x, y: probePoint.y, button: "left", buttons: 1, clickCount: 1 },
      { type: "mouseReleased", x: probePoint.x, y: probePoint.y, button: "left", buttons: 0, clickCount: 1 },
    ]) {
      await session.send("Input.dispatchMouseEvent", params);
    }

    await delay(400);

    const measured = await evaluateJson(
      session,
      `JSON.stringify((() => {
        const navigationEntry = performance.getEntriesByType("navigation")[0];
        const perf = window.__riddraBrowserPerf ?? {};
        const interactionMs = Array.isArray(perf.interactions)
          ? perf.interactions.reduce((maximum, entry) => {
              const duration = Number(entry.duration) || 0;
              return entry.interactionId ? Math.max(maximum, duration) : maximum;
            }, 0)
          : 0;

        return {
          title: document.title,
          currentUrl: location.pathname + location.search,
          fcpMs: perf.fcpMs,
          lcpMs: perf.lcpMs,
          cls: perf.cls,
          interactionMs: interactionMs || null,
          longTaskCount: perf.longTaskCount ?? 0,
          longTaskMs: perf.longTaskMs ?? 0,
          eventSample: Array.isArray(perf.interactions) ? perf.interactions.slice(-5) : [],
          navigation: navigationEntry
            ? {
                responseStartMs: navigationEntry.responseStart,
                domContentLoadedMs: navigationEntry.domContentLoadedEventEnd,
                loadEventMs: navigationEntry.loadEventEnd,
              }
            : null,
        };
      })())`,
    );

    const lcpMs = roundMetric(measured.lcpMs);
    const fcpMs = roundMetric(measured.fcpMs);
    const interactionMs = roundMetric(measured.interactionMs);
    const cls = roundMetric(measured.cls, 3);
    const navigation = measured.navigation
      ? {
          responseStartMs: roundMetric(measured.navigation.responseStartMs),
          domContentLoadedMs: roundMetric(measured.navigation.domContentLoadedMs),
          loadEventMs: roundMetric(measured.navigation.loadEventMs),
        }
      : null;
    const longTaskCount = Number.isFinite(measured.longTaskCount) ? measured.longTaskCount : 0;
    const longTaskMs = roundMetric(measured.longTaskMs);
    const allErrors = [
      ...consoleErrors,
      ...logErrors,
      ...networkFailures,
      ...runtimeExceptions,
    ].filter(Boolean);

    return {
      routePath,
      routeUrl,
      title: measured.title ?? "",
      lcpMs,
      fcpMs,
      interactionMs,
      cls,
      navigation,
      longTaskCount,
      longTaskMs,
      consoleErrorCount: allErrors.length,
      errors: allErrors,
      eventSample: measured.eventSample ?? [],
      lcpBudgetOk: lcpMs !== null && lcpMs <= options.lcpBudgetMs,
      interactionBudgetOk:
        interactionMs !== null && interactionMs <= options.interactionBudgetMs,
      clsBudgetOk: cls !== null && cls <= options.clsBudget,
      errorBudgetOk: allErrors.length === 0,
    };
  } catch (error) {
    return {
      routePath,
      routeUrl,
      title: "",
      lcpMs: null,
      fcpMs: null,
      interactionMs: null,
      cls: null,
      navigation: null,
      longTaskCount: 0,
      longTaskMs: null,
      consoleErrorCount: 1,
      errors: [error instanceof Error ? error.message : String(error)],
      eventSample: [],
      lcpBudgetOk: false,
      interactionBudgetOk: false,
      clsBudgetOk: false,
      errorBudgetOk: false,
    };
  } finally {
    await session.close().catch(() => {});
    await closeTarget(debugUrl, target.id);
  }
}

function printSummary(baseUrl, debugUrl, results, options) {
  const failingRoutes = results.filter(
    (result) =>
      !result.lcpBudgetOk ||
      !result.interactionBudgetOk ||
      !result.clsBudgetOk ||
      !result.errorBudgetOk,
  );
  const lcpMisses = results.filter((result) => !result.lcpBudgetOk).length;
  const interactionMisses = results.filter((result) => !result.interactionBudgetOk).length;
  const clsMisses = results.filter((result) => !result.clsBudgetOk).length;
  const errorMisses = results.filter((result) => !result.errorBudgetOk).length;

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Chrome DevTools: ${debugUrl}`);
  console.log(
    `Audited ${results.length} browser routes. ${failingRoutes.length} need attention, ${lcpMisses} missed the <${options.lcpBudgetMs}ms LCP budget, ${interactionMisses} missed the <${options.interactionBudgetMs}ms interaction budget, ${clsMisses} missed the CLS <= ${options.clsBudget} budget, ${errorMisses} reported console/runtime errors.`,
  );
  console.log("");

  const rowsToPrint = options.verbose
    ? results
    : failingRoutes.length > 0
      ? failingRoutes
      : results;

  for (const result of rowsToPrint) {
    const status =
      result.lcpBudgetOk &&
      result.interactionBudgetOk &&
      result.clsBudgetOk &&
      result.errorBudgetOk
        ? "PASS"
        : "FAIL";

    const metrics = [
      `${status.padEnd(4)} ${result.routePath}`,
      `LCP=${formatMetric(result.lcpMs)}`,
      `FCP=${formatMetric(result.fcpMs)}`,
      `INP(sample)=${formatMetric(result.interactionMs)}`,
      `CLS=${formatCls(result.cls)}`,
      `errors=${result.consoleErrorCount}`,
    ];

    if (result.navigation) {
      metrics.push(`DOMContentLoaded=${formatMetric(result.navigation.domContentLoadedMs)}`);
      metrics.push(`load=${formatMetric(result.navigation.loadEventMs)}`);
    }

    console.log(metrics.join("  "));

    if (options.verbose && result.longTaskCount > 0) {
      console.log(
        `      longTasks=${result.longTaskCount}  longTaskMs=${formatMetric(result.longTaskMs)}`,
      );
    }

    if (result.errors.length > 0) {
      for (const error of result.errors.slice(0, 3)) {
        console.log(`      error: ${error}`);
      }
    }
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const [baseUrl, chromeVersion] = await Promise.all([
    findHealthyBaseUrl(options.baseUrl, options.timeoutMs),
    ensureChromeDebugger(options.debugUrl, Math.min(options.timeoutMs, 5_000)),
  ]);

  if (options.verbose) {
    console.log(`Using browser ${chromeVersion.Browser ?? "Chrome"} for audit.`);
  }

  const results = [];

  for (const routePath of options.routes) {
    results.push(await auditRoute(baseUrl, options.debugUrl, routePath, options));
  }

  printSummary(baseUrl, options.debugUrl, results, options);

  if (
    results.some(
      (result) =>
        !result.lcpBudgetOk ||
        !result.interactionBudgetOk ||
        !result.clsBudgetOk ||
        !result.errorBudgetOk,
    )
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
