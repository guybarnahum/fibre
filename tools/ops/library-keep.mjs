// Asks the World to keep its library's books now, from where it runs, so a
// Thread's reading never waits on the catalogue being up, and so access to
// books is proven, not assumed. A few books per request, spaced out; says what
// happened to each. Changes only the library's own copies of public-domain texts.
import { pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

const USAGE = "usage: library:keep -- --env staging [--limit 6] [--rounds 4]";

function options(argv) {
  const config = { env: null, limit: 6, rounds: 4 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") config.env = normalizeCloudflareEnvironment(argv[++i]);
    else if (argv[i] === "--limit") config.limit = Number(argv[++i]);
    else if (argv[i] === "--rounds") config.rounds = Number(argv[++i]);
    else throw new TypeError(USAGE);
  }
  if (config.env === null || !(config.limit >= 1 && config.limit <= 12) || !(config.rounds >= 1 && config.rounds <= 20)) throw new TypeError(USAGE);
  return config;
}

async function main(argv) {
  const args = options(argv);
  const token = process.env.FIBRE_PRIVATE_TOKEN;
  if (!token) throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const url = new URL("/internal/library/keep", topology(args.env).worldBaseUrl);
  let library = null, failedRounds = 0;
  for (let round = 1; round <= args.rounds; round++) {
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(120_000),
      headers: { "content-type": "application/json", "x-fibre-private-token": token },
      body: JSON.stringify({ limit: args.limit }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload === null) throw new Error(`library keep failed HTTP ${response.status}: ${JSON.stringify(payload?.error ?? "")}`);
    library = payload.library;
    for (const item of payload.results) {
      console.log(item.kept ? `  kept   ${item.title ?? item.workRef} (${Math.round(item.bytes / 1024)} KB from ${item.fetchedFrom})`
        : `  failed ${item.title ?? item.workRef}: ${item.error ?? "not kept"}`);
    }
    if (payload.results.length === 0 || library.kept >= library.works) break;
    if (payload.results.every((item) => !item.kept) && ++failedRounds >= 2) break;
  }
  console.log(`Library: ${library.kept} of ${library.works} books kept by World.`);
  if (library.kept === 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`Library keep: ${error.message}\n`); process.exitCode = 1; });
}
