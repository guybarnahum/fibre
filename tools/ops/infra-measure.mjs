import { spawn, execFile as execFileCallback } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { repoRootFrom } from "../deployment/cloudflare-operator.mjs";

const execFile = promisify(execFileCallback);
const SERVICES = Object.freeze([
  "world-kernel",
  "thread-presentation",
  "birth-center",
  "asset-generator",
  "admin-dashboard",
]);
const COST_EVENTS = new Set(["world-state-cost", "d1-cost"]);

function parseArgs(argv) {
  const options = {
    environment:"staging",
    idleSeconds:60,
    skipMeeting:false,
    skipAdmin:false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") options.environment = argv[++index] ?? null;
    else if (arg === "--idle-seconds") options.idleSeconds = Number(argv[++index]);
    else if (arg === "--skip-meeting") options.skipMeeting = true;
    else if (arg === "--skip-admin") options.skipAdmin = true;
    else throw new TypeError(`unsupported argument ${arg}`);
  }
  if (!["staging", "production"].includes(options.environment)) {
    throw new TypeError("--env must be staging or production");
  }
  if (!Number.isFinite(options.idleSeconds) || options.idleSeconds < 0 || options.idleSeconds > 3600) {
    throw new TypeError("--idle-seconds must be between 0 and 3600");
  }
  return Object.freeze(options);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function numbers(event) {
  return {
    rowsRead:Number(event.rowsRead ?? 0),
    rowsWritten:Number(event.rowsWritten ?? 0),
    queries:Number(event.queries ?? 0),
  };
}

function operationName(event) {
  if (event.event === "d1-cost") return event.operation ?? "d1";
  if (event.kind === "alarm") return `alarm ${event.path ?? ""}`.trim();
  return `${event.method ?? ""} ${event.path ?? ""}`.trim() || "world";
}

export function summarizeCosts(events) {
  const grouped = new Map();
  const encounters = [];
  for (const event of events) {
    const key = `${event.phase}|${event.source}|${operationName(event)}`;
    const current = grouped.get(key) ?? {
      phase:event.phase,
      source:event.source,
      operation:operationName(event),
      calls:0,
      rowsRead:0,
      rowsWritten:0,
      queries:0,
    };
    const cost = numbers(event);
    current.calls += 1;
    current.rowsRead += cost.rowsRead;
    current.rowsWritten += cost.rowsWritten;
    current.queries += cost.queries;
    grouped.set(key, current);

    if (event.event === "world-state-cost" && event.path === "/internal/lived-encounter") {
      encounters.push(cost.rowsRead);
    }
  }
  const slope = encounters.length < 2
    ? null
    : (encounters.at(-1) - encounters[0]) / (encounters.length - 1);
  return Object.freeze({
    operations:Object.freeze([...grouped.values()]),
    encounterRowsRead:Object.freeze(encounters),
    encounterSlopeRowsReadPerTurn:slope,
  });
}

function findCostEvents(value, sink) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text.startsWith("{")) return;
    try { findCostEvents(JSON.parse(text), sink); } catch {}
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) findCostEvents(item, sink);
    return;
  }
  if (typeof value !== "object") return;
  if (COST_EVENTS.has(value.event)) sink(value);
  for (const nested of Object.values(value)) findCostEvents(nested, sink);
}

function consumeLines(stream, onLine) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    for (;;) {
      const newline = pending.indexOf("\n");
      if (newline < 0) break;
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      onLine(line);
    }
  });
  stream.on("end", () => {
    if (pending) onLine(pending);
  });
}

async function gitContext(repoRoot) {
  const [{ stdout:branch }, { stdout:head }, { stdout:status }] = await Promise.all([
    execFile("git", ["branch", "--show-current"], { cwd:repoRoot, encoding:"utf8" }),
    execFile("git", ["rev-parse", "HEAD"], { cwd:repoRoot, encoding:"utf8" }),
    execFile("git", ["status", "--porcelain"], { cwd:repoRoot, encoding:"utf8" }),
  ]);
  return Object.freeze({
    branch:branch.trim(),
    head:head.trim(),
    clean:status.trim() === "",
  });
}

async function requireResolvedConfigs(repoRoot, environment) {
  const configs = {};
  for (const service of SERVICES) {
    const path = resolve(repoRoot, ".fibre", "cloudflare", environment, "wrangler", `${service}.jsonc`);
    try { await access(path); }
    catch {
      throw new Error(
        `resolved ${environment} config is missing for ${service}; deploy/prepare that environment once before measuring`,
      );
    }
    configs[service] = path;
  }
  return Object.freeze(configs);
}

function startTail({ repoRoot, source, configPath, record }) {
  const child = spawn("npx", [
    "--yes",
    "wrangler@4.126.0",
    "tail",
    "--config", configPath,
    "--format", "json",
  ], {
    cwd:repoRoot,
    stdio:["ignore", "pipe", "pipe"],
  });

  consumeLines(child.stdout, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      findCostEvents(JSON.parse(trimmed), (event) => record(source, event));
    } catch {}
  });
  consumeLines(child.stderr, (line) => {
    if (/error|failed/iu.test(line)) process.stderr.write(`[${source}] ${line}\n`);
  });
  return child;
}

async function stopTails(children) {
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGINT");
  }
  await Promise.all(children.map((child) => new Promise((resolvePromise) => {
    if (child.exitCode !== null) return resolvePromise();
    child.once("exit", resolvePromise);
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGTERM");
      resolvePromise();
    }, 3000).unref();
  })));
}

async function runMeeting(repoRoot, environment) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [
      "tools/meet/thread-meet.mjs",
      "--env", environment,
      "--list",
    ], {
      cwd:repoRoot,
      stdio:"inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGINT") resolvePromise();
      else reject(new Error(`Thread meeting exited with code ${code}`));
    });
  });
}

function render(summary) {
  const lines = ["", "Fibre infrastructure measurement", ""];
  for (const row of summary.operations) {
    lines.push(
      `${row.phase.padEnd(16)} ${row.source.padEnd(20)} ${row.operation.padEnd(42)} calls=${String(row.calls).padStart(2)} read=${String(row.rowsRead).padStart(6)} write=${String(row.rowsWritten).padStart(5)} queries=${String(row.queries).padStart(4)}`,
    );
  }
  if (summary.encounterRowsRead.length > 0) {
    lines.push("");
    lines.push(`Encounter DO rows read: ${summary.encounterRowsRead.join(" → ")}`);
    if (summary.encounterSlopeRowsReadPerTurn !== null) {
      lines.push(`Encounter slope: ${summary.encounterSlopeRowsReadPerTurn.toFixed(2)} rows/turn`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function promptAction(terminal, label) {
  process.stdout.write(`\n${label}\n`);
  await terminal.question("Press Enter when done, or type s to skip: ");
  await sleep(1500);
}

async function main(argv) {
  const options = parseArgs(argv);
  const repoRoot = repoRootFrom(import.meta.url);
  const git = await gitContext(repoRoot);
  const configs = await requireResolvedConfigs(repoRoot, options.environment);
  let terminal = null;
  const events = [];
  let phase = "startup";
  const record = (source, event) => {
    events.push(Object.freeze({
      ...structuredClone(event),
      source,
      phase,
      observedAt:new Date().toISOString(),
    }));
  };
  const tails = SERVICES.map((source) => startTail({
    repoRoot,
    source,
    configPath:configs[source],
    record,
  }));

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const outputPath = resolve(tmpdir(), `fibre-infra-measurement-${stamp}.json`);
  process.stdout.write(
    `Fibre infra measure · ${options.environment}\nbranch ${git.branch}\nhead   ${git.head}\nworking tree ${git.clean ? "clean" : "DIRTY (measurement continues)"}\n\n`,
  );

  let failure = null;
  try {
    await sleep(3000);
    if (tails.some((child) => child.exitCode !== null)) {
      throw new Error("Cloudflare tail failed to start; check the messages above");
    }

    phase = "idle";
    process.stdout.write(`Idle baseline: ${options.idleSeconds}s. Do not use staging during this window.\n`);
    await sleep(options.idleSeconds * 1000);

    if (!options.skipMeeting) {
      phase = "meeting";
      process.stdout.write("\nChoose a Thread and have a few natural turns. Type :q when done.\n\n");
      await runMeeting(repoRoot, options.environment);
      await sleep(1500);
    }

    if (!options.skipAdmin) {
      terminal = createInterface({ input:process.stdin, output:process.stdout });
      process.stdout.write("\nUse one Admin tab for these measurements; leave other Admin tabs closed or idle.\n");
      phase = "threads";
      await promptAction(terminal, "Open the Admin Threads page once.");
      phase = "thread";
      await promptAction(terminal, "Open one Thread once. Do not press Check health yet.");
      phase = "health";
      await promptAction(terminal, "Optional: click Check health once, or type s to skip.");
      phase = "activity";
      await promptAction(terminal, "From the Thread page, click Activity ↗ once. It should open Raw Activity.");
    }
  } catch (error) {
    failure = error;
  } finally {
    phase = "settle";
    await sleep(2000);
    await stopTails(tails);
    terminal?.close();
  }

  const summary = summarizeCosts(events);
  const payload = Object.freeze({
    contract:"fibre-infra-measurement-v0.1",
    environment:options.environment,
    git,
    observedAt:new Date().toISOString(),
    events,
    summary,
    failure:failure === null ? null : String(failure?.message ?? failure),
  });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(render(summary));
  process.stdout.write(`\nEvidence: ${outputPath}\n`);
  if (failure !== null) throw failure;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
