import {
  formatIstTimestamp,
  readLocalDevRuntimeStore,
  updateLocalDevRuntimeStore,
} from "./local-dev-runtime-store.mjs";

const routes = ["/build-tracker", "/admin/launch-config-console", "/admin/launch-control"];
const requestedBase = process.argv[2] || process.env.LOCAL_DEV_URL;
const candidateBaseUrls = requestedBase
  ? [requestedBase]
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
    ];

async function checkRoute(baseUrl, route) {
  const url = `${baseUrl}${route}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
    });

    return {
      url,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: "ERR",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  let foundHealthyBase = false;
  const routeSummaries = [];

  for (const baseUrl of candidateBaseUrls) {
    const results = await Promise.all(routes.map((route) => checkRoute(baseUrl, route)));
    const allHealthy = results.every((result) => result.ok);

    console.log(baseUrl);
    for (const result of results) {
      console.log(`  ${String(result.status).padEnd(3)} ${result.url}${result.error ? ` (${result.error})` : ""}`);
      routeSummaries.push({
        route: result.url.replace(baseUrl, ""),
        url: result.url,
        status: String(result.status),
      });
    }

    if (allHealthy) {
      foundHealthyBase = true;
      console.log(`  OK  all tracked routes responded successfully on ${baseUrl}`);
      await updateLocalDevRuntimeStore((store) => ({
        ...store,
        url: store.url ?? baseUrl,
        status: store.status === "running" ? "running" : "healthy",
        lastHealthcheckAt: formatIstTimestamp(),
        note:
          store.status === "running"
            ? `Local healthcheck passed on ${baseUrl}.`
            : `Local healthcheck passed on ${baseUrl}, so the localhost fallback is healthy even though the guarded dev runtime is not currently active.`,
        routes: results.map((result) => ({
          route: result.url.replace(baseUrl, ""),
          url: result.url,
          status: String(result.status),
        })),
      }));
      break;
    }
  }

  if (!foundHealthyBase) {
    const currentRuntime = await readLocalDevRuntimeStore();
    await updateLocalDevRuntimeStore((store) => ({
      ...store,
      url: currentRuntime.url,
      lastHealthcheckAt: formatIstTimestamp(),
      note: "Local healthcheck failed on every checked localhost base URL.",
      routes: routeSummaries,
    }));
    console.error("[dev-health] localhost is not healthy on the checked base URLs.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[dev-health] unable to run local healthcheck");
  console.error(error);
  process.exitCode = 1;
});
