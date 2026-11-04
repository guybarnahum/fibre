import { mkdirSync, writeFileSync } from "node:fs";

const DAY = 86400;
const daysFlag = process.argv.indexOf("--days");
const days = daysFlag === -1 ? 7 : Number(process.argv[daysFlag + 1]);
if (!Number.isSafeInteger(days) || days < 1 || days > 31) {
  console.error("usage: npm run model:usage -- [--days 1-31]");
  process.exit(2);
}
const key = process.env.OPENAI_ADMIN_KEY;
if (!key) {
  console.error("Model usage needs an OpenAI organization Admin key: add OPENAI_ADMIN_KEY=sk-admin-... to .env");
  process.exit(2);
}
const start = (Math.floor(Date.now() / 1000 / DAY) - days + 1) * DAY;

async function organization(path) {
  const url = `https://api.openai.com/v1/organization/${path}&start_time=${start}&bucket_width=1d&limit=${days}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${key}` } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(`OpenAI ${path.split("?")[0]}: HTTP ${response.status} ${(body?.error?.message ?? "").slice(0, 160)}`);
    process.exit(1);
  }
  return body.data;
}

const costs = await organization("costs?group_by=line_item");
const usage = await organization("usage/completions?group_by=model");
const day = (bucket) => new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
const usd = (value) => Number(value ?? 0).toFixed(2);

console.log("== OpenAI cost by UTC day (USD)");
for (const bucket of costs) {
  const total = bucket.results.reduce((sum, row) => sum + Number(row.amount?.value ?? 0), 0);
  const items = bucket.results
    .filter((row) => Number(row.amount?.value) >= 0.005)
    .map((row) => `${row.line_item} ${usd(row.amount.value)}`)
    .join("; ");
  console.log(`${day(bucket)} ${usd(total).padStart(8)}  ${items}`);
}

console.log("== OpenAI completions by UTC day and model");
console.log(`${"day".padEnd(10)} ${"model".padEnd(28)} ${"requests".padStart(8)} ${"input".padStart(11)} ${"in/req".padStart(7)} ${"cached".padStart(7)} ${"output".padStart(9)}`);
for (const bucket of usage) {
  for (const row of bucket.results) {
    const requests = Number(row.num_model_requests ?? 0);
    const input = Number(row.input_tokens ?? 0);
    const cached = input === 0 ? 0 : Number(row.input_cached_tokens ?? 0) / input;
    console.log([
      day(bucket),
      String(row.model).padEnd(28),
      String(requests).padStart(8),
      String(input).padStart(11),
      String(requests === 0 ? 0 : Math.round(input / requests)).padStart(7),
      `${(cached * 100).toFixed(1)}%`.padStart(7),
      String(row.output_tokens ?? 0).padStart(9),
    ].join(" "));
  }
}

const directory = new URL("../../.fibre/model-usage/", import.meta.url);
mkdirSync(directory, { recursive: true });
const evidence = new URL(`openai-usage-${new Date().toISOString().slice(0, 10)}.json`, directory);
writeFileSync(evidence, `${JSON.stringify({ checkedAt: new Date().toISOString(), days, costs, usage }, null, 1)}\n`);
console.log(`Evidence: ${evidence.pathname}`);
