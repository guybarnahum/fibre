import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { publicBirthPlaceFromPresentation } from "fibre/thread-presentation/thread-directory";
import {
  normalizeCloudflareEnvironment,
  readCloudflareOperatorState,
  repoRootFrom,
  runWrangler,
} from "../deployment/cloudflare-operator.mjs";

function sql(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function wranglerRows(stdout) {
  const results = JSON.parse(stdout);
  return (Array.isArray(results) ? results : [results])
    .flatMap((entry) => entry.results ?? []);
}

function options(args) {
  let environment = null;
  let apply = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--env") environment = args[++i] ?? null;
    else if (args[i] === "--apply") apply = true;
    else throw new TypeError("Unknown argument " + args[i]);
  }
  if (!environment) throw new TypeError("Use --env staging|production [--apply]");
  return { environment:normalizeCloudflareEnvironment(environment), apply };
}

export async function migratePublicBirthplaces({
  repoRoot,
  environment,
  apply = false,
  runner = runWrangler,
  fetchImpl = fetch,
  print = console.log,
} = {}) {
  const state = await readCloudflareOperatorState({ repoRoot, environment });
  const catalog = state.resources.d1.find((item) => item.binding === "PRESENTATION_CATALOG");
  if (!catalog?.name) throw new Error("No Presentation catalog D1 database for " + environment);

  const deployment = JSON.parse(await readFile(
    resolve(repoRoot, ".fibre/cloudflare", environment, "deployment.json"), "utf8",
  ));
  if (deployment.environment !== environment) throw new Error("Deployment environment mismatch");
  const base = deployment.deployments.find((item) => item.serviceId === "thread-presentation")?.baseUrl;
  if (!base) throw new Error("No deployed public Thread Presentation URL");

  // Select only previously published public entries missing the indexed fact.
  const query = `SELECT catalog_key,
      json_extract(value_json, '$.threadId') AS thread_id,
      json_extract(value_json, '$.latestSnapshotDigest') AS snapshot_digest
    FROM fibre_catalog
    WHERE catalog_key LIKE 'presentation:%'
      AND json_extract(value_json, '$.publiclyVisible') = 1
      AND json_type(value_json, '$.publicDirectory') = 'object'
      AND json_type(value_json, '$.publicDirectory.birthPlace') IS NULL
      AND COALESCE(json_extract(value_json, '$.publicDirectory.identityCardVisibility'), 'public') = 'public'
    ORDER BY catalog_key`;
  const output = await runner([
    "d1", "execute", catalog.name, "--remote", "--command", query, "--json",
  ], { cwd:repoRoot });
  const candidates = wranglerRows(output.stdout);

  const changes = [];
  let missing = 0;
  let skipped = 0;

  // Eight bounded reads at a time; only public snapshots, with no World/runtime cognition.
  for (let offset = 0; offset < candidates.length; offset += 8) {
    await Promise.all(candidates.slice(offset, offset + 8).map(async ({
      catalog_key:key, thread_id:threadId, snapshot_digest:digest,
    }) => {
      if (!threadId || !digest) { skipped += 1; return; }
      const response = await fetchImpl(new URL(
        `/api/threads/${encodeURIComponent(threadId)}/snapshot`, base,
      ));
      if (response.status === 404) { skipped += 1; return; }
      if (!response.ok) throw new Error(`Snapshot ${threadId}: HTTP ${response.status}`);
      const published = await response.json();
      if (published.pointer?.threadId !== threadId
        || published.pointer?.snapshotDigest !== digest
        || published.snapshot?.presentation?.manifest?.threadId !== threadId) {
        skipped += 1;
        return;
      }
      const birthPlace = publicBirthPlaceFromPresentation(published.snapshot.presentation);
      if (birthPlace === null) missing += 1;
      const statement = `UPDATE fibre_catalog
        SET value_json = json_set(value_json, '$.publicDirectory.birthPlace', json(${sql(JSON.stringify(birthPlace))})),
            updated_at = CURRENT_TIMESTAMP
        WHERE catalog_key = ${sql(key)}
          AND json_extract(value_json, '$.latestSnapshotDigest') = ${sql(digest)}
          AND json_extract(value_json, '$.publiclyVisible') = 1
          AND json_type(value_json, '$.publicDirectory.birthPlace') IS NULL;`;
      changes.push({ key, statement });
    }));
  }

  const summary = {
    environment,
    mode:apply ? "apply" : "preview",
    candidates:candidates.length,
    ready:changes.length,
    mapped:changes.length - missing,
    withoutPublishedBirthplace:missing,
    skipped,
  };
  print(JSON.stringify(summary, null, 2));
  if (!apply || changes.length === 0) return summary;

  const directory = await mkdtemp(join(tmpdir(), "fibre-birthplace-index-"));
  try {
    const path = join(directory, "reindex.sql");
    await writeFile(path, changes.map(({ statement }) => statement).join("\n") + "\n");
    await runner(["d1", "execute", catalog.name, "--remote", "--file", path], {
      cwd:repoRoot,
    });
  } finally {
    await rm(directory, { recursive:true, force:true });
  }
  print("Birthplace catalog index update complete; no Worker deployment required.");
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { environment, apply } = options(process.argv.slice(2));
  migratePublicBirthplaces({
    repoRoot:repoRootFrom(import.meta.url), environment, apply,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
