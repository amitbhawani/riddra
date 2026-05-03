function cleanString(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

const yahooSymbol = (process.argv[2] ?? "RELIANCE.NS").trim().toUpperCase();
const baseUrl = cleanString(
  process.env.RIDDRA_DRY_RUN_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
  2000,
);

async function main() {
  const response = await fetch(`${baseUrl}/api/admin/market-data/stocks/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "import_selected",
      yahooSymbols: [yahooSymbol],
      dryRun: true,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Dry-run route failed with status ${response.status}. ${cleanString(json?.error, 4000) || "Unknown route failure."}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        baseUrl,
        yahooSymbol,
        result: json,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-yahoo-dry-run] failed", error);
  process.exitCode = 1;
});
