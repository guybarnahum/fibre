import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_THREADS = 18;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(name + " is required");
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprint(value) {
  return sha256(JSON.stringify(value));
}

function jsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceGitSha() {
  const value = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd:REPO_ROOT,
    encoding:"utf8",
  }).trim().toLowerCase();
  if (!GIT_SHA.test(value)) throw new Error("interior baseline requires an exact Git SHA");
  return value;
}

function deploymentByService(record, serviceId) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error("deployment evidence must contain exactly one " + serviceId);
  return matches[0];
}

function remoteBase(name, value) {
  const url = new URL(required(name, value));
  if (
    url.protocol !== "https:"
    || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    || url.hostname.endsWith(".local")
  ) {
    throw new Error(name + " must be a remote HTTPS staging endpoint");
  }
  return url.toString().replace(/\/$/u, "");
}

function endpoint(baseUrl, pathname) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(label + " returned non-JSON HTTP " + response.status);
  return payload;
}

async function privateGet(baseUrl, pathname, privateToken, label) {
  const response = await fetch(endpoint(baseUrl, pathname), {
    headers:{
      Accept:"application/json",
      "x-fibre-private-token":privateToken,
    },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, label);
  if (!response.ok) {
    throw new Error(label + " failed HTTP " + response.status + ": " + (payload?.error?.code ?? payload?.error ?? "unknown"));
  }
  return payload;
}

async function publicThreads(baseUrl, viewerOrigin) {
  const url = endpoint(baseUrl, "/api/threads");
  url.searchParams.set("limit", "200");
  const response = await fetch(url, {
    headers:{ Accept:"application/json", Origin:viewerOrigin },
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await responseJson(response, "Thread discovery");
  if (!response.ok || !Array.isArray(payload?.threads)) {
    throw new Error("Thread discovery failed HTTP " + response.status);
  }
  return payload.threads;
}

function establishedAt(thread) {
  const parsed = Date.parse(thread?.currentPresent?.payload?.establishedAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentIdentityAssertions(observatory) {
  return (observatory?.identityView?.assertions ?? [])
    .filter((assertion) => assertion?.isCurrentRevision !== false)
    .sort((left, right) => String(left.assertionId).localeCompare(String(right.assertionId)));
}

function genomeLoci(observatory) {
  return (observatory?.symbolicGenomes ?? [])
    .flatMap((bundle) => bundle?.loci ?? [])
    .sort((left, right) => (left.ordinal ?? 0) - (right.ordinal ?? 0));
}

function semanticStates(observatory) {
  return [...(observatory?.semanticStates ?? [])]
    .sort((left, right) => String(left.stateId).localeCompare(String(right.stateId)));
}

function memories(observatory) {
  return [...(observatory?.memories ?? [])]
    .sort((left, right) => String(left.memoryId).localeCompare(String(right.memoryId)));
}

function relations(observatory) {
  return [...(observatory?.lifeRelations ?? [])]
    .sort((left, right) => String(left.relationId).localeCompare(String(right.relationId)));
}

function compactDomains(states) {
  const counts = {};
  for (const state of states) counts[state.domain] = (counts[state.domain] ?? 0) + 1;
  return counts;
}

function preview(observatory) {
  const loci = genomeLoci(observatory);
  const assertions = currentIdentityAssertions(observatory);
  const states = semanticStates(observatory);
  const memoryRecords = memories(observatory);
  const lifeRelations = relations(observatory);
  return Object.freeze({
    genome:loci.slice(0, 3).map((locus) => locus.value),
    identity:assertions.slice(0, 3).map((assertion) => assertion.meaning),
    semanticState:states.slice(0, 3).map((state) => ({
      domain:state.domain,
      dimension:state.dimension,
      state:state.state,
      target:state.target?.displayName ?? null,
    })),
    memory:memoryRecords.slice(0, 3).map((memory) =>
      memory.rememberedMeaning ?? memory.rememberedContent ?? null),
    relationships:lifeRelations.slice(0, 3).map((relation) => ({
      displayName:relation.relatedParty?.displayName ?? null,
      relationKind:relation.relationKind,
      facts:(relation.relationshipFacts ?? []).slice(0, 3),
    })),
  });
}

function threadBaseline(threadCard, observatory) {
  const thread = observatory.thread;
  const loci = genomeLoci(observatory);
  const assertions = currentIdentityAssertions(observatory);
  const states = semanticStates(observatory);
  const memoryRecords = memories(observatory);
  const lifeRelations = relations(observatory);
  const situation = observatory?.livedNow?.currentSituation ?? null;
  const currentState = thread?.currentState ?? {};
  const textualTraits = thread?.genome?.textualTraits ?? {};

  const authoritative = {
    genomeLocusCount:loci.length,
    identityAssertionCount:assertions.length,
    behavioralIdentityAssertionCount:assertions.filter((item) =>
      ["accepted_causal", "candidate_causal"].includes(item.behavioralStatus)).length,
    semanticStateCount:states.length,
    semanticStateDomains:compactDomains(states),
    memoryCount:memoryRecords.length,
    durableMeaningMemoryCount:memoryRecords.filter((memory) =>
      typeof memory.rememberedMeaning === "string" && memory.rememberedMeaning.trim() !== "").length,
    lifeRelationCount:lifeRelations.length,
  };

  const publishedShell = {
    textualTraitCount:Object.keys(textualTraits).length,
    needCount:(currentState.needs ?? []).length,
    feelingCount:(currentState.feelings ?? []).length,
    unresolvedIntentionCount:(currentState.unresolvedIntentions ?? []).length,
    selfModel:currentState.selfModel ?? null,
  };

  return Object.freeze({
    threadId:thread.threadId,
    name:threadCard.displayName ?? thread.identity?.name ?? null,
    lifecycleStatus:threadCard.lifecycleStatus ?? thread.status ?? null,
    publishedShell:Object.freeze(publishedShell),
    authoritative:Object.freeze(authoritative),
    fingerprints:Object.freeze({
      genome:fingerprint(loci.map((item) => item.value)),
      identity:fingerprint(assertions.map((item) => ({
        domain:item.domain,
        kind:item.kind,
        meaning:item.meaning,
        behavioralStatus:item.behavioralStatus,
      }))),
      semanticState:fingerprint(states.map((item) => ({
        domain:item.domain,
        dimension:item.dimension,
        state:item.state,
        target:item.target?.targetId ?? null,
      }))),
      memory:fingerprint(memoryRecords.map((item) => ({
        rememberedContent:item.rememberedContent ?? null,
        rememberedMeaning:item.rememberedMeaning ?? null,
        retentionState:item.retentionState ?? null,
      }))),
      relationships:fingerprint(lifeRelations.map((item) => ({
        partyId:item.relatedParty?.partyId ?? null,
        relationKind:item.relationKind,
        relationshipFacts:item.relationshipFacts ?? [],
      }))),
    }),
    livedNow:situation === null ? null : Object.freeze({
      situationId:situation.situationId,
      establishedAt:situation.establishedAt,
      phase:situation.phase,
      locationKind:situation.location?.kind ?? null,
      mediatedContext:situation.mediatedContext ?? null,
      activity:situation.activity,
      reason:situation.reason,
    }),
    preview:preview(observatory),
  });
}

function countWith(rows, predicate) {
  return rows.filter(predicate).length;
}

function distinct(rows, key) {
  return new Set(rows.map((row) => row.fingerprints[key])).size;
}

function summary(rows, skipped) {
  const neutralShell = (row) =>
    row.publishedShell.textualTraitCount === 0
    && row.publishedShell.needCount === 0
    && row.publishedShell.feelingCount === 0
    && row.publishedShell.unresolvedIntentionCount === 0;

  const developedEvidence = (row) =>
    row.authoritative.identityAssertionCount > 0
    || row.authoritative.semanticStateCount > 0
    || row.authoritative.memoryCount > 0
    || row.authoritative.lifeRelationCount > 0;

  return Object.freeze({
    inspectedThreadCount:rows.length,
    skippedThreadCount:skipped.length,
    neutralPublishedShellCount:countWith(rows, neutralShell),
    withSymbolicGenome:countWith(rows, (row) => row.authoritative.genomeLocusCount > 0),
    distinctGenomeFingerprints:distinct(rows, "genome"),
    withIdentityAssertions:countWith(rows, (row) => row.authoritative.identityAssertionCount > 0),
    withBehavioralIdentityAssertions:countWith(rows, (row) => row.authoritative.behavioralIdentityAssertionCount > 0),
    distinctIdentityFingerprints:distinct(rows, "identity"),
    withSemanticState:countWith(rows, (row) => row.authoritative.semanticStateCount > 0),
    distinctSemanticStateFingerprints:distinct(rows, "semanticState"),
    withAutobiographicalMemory:countWith(rows, (row) => row.authoritative.memoryCount > 0),
    withDurableRememberedMeaning:countWith(rows, (row) => row.authoritative.durableMeaningMemoryCount > 0),
    distinctMemoryFingerprints:distinct(rows, "memory"),
    withLifeRelations:countWith(rows, (row) => row.authoritative.lifeRelationCount > 0),
    distinctRelationshipFingerprints:distinct(rows, "relationships"),
    withAnyDevelopedEvidence:countWith(rows, developedEvidence),
    neutralShellWithDevelopedEvidence:countWith(rows, (row) => neutralShell(row) && developedEvidence(row)),
    withCurrentLivedNow:countWith(rows, (row) => row.livedNow !== null),
    distinctExactCurrentActivities:new Set(
      rows.flatMap((row) => row.livedNow === null ? [] : [row.livedNow.activity]),
    ).size,
  });
}

function writeReport(runId, report) {
  const path = resolve(REPO_ROOT, ".fibre", "interior-cognition", "baseline", runId, "report.json");
  mkdirSync(dirname(path), { recursive:true, mode:0o700 });
  writeFileSync(path, JSON.stringify(report, null, 2) + "\n", { mode:0o600 });
  return path;
}

export async function runInteriorCognitionStagingBaseline({
  environment = process.env,
  emit = (event) => process.stdout.write(JSON.stringify(event) + "\n"),
} = {}) {
  const privateToken = required("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const sourceSha = sourceGitSha();
  const deployment = jsonFile(resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json"));
  if (
    deployment.environment !== "staging"
    || deployment.sourceGitSha !== sourceSha
    || deployment.sourceTreeClean !== true
  ) {
    throw new Error("interior baseline requires staging deployment evidence for the exact clean checkout SHA");
  }

  const worldBaseUrl = remoteBase(
    "staging World",
    deploymentByService(deployment, "world-kernel").baseUrl,
  );
  const presentationBaseUrl = remoteBase(
    "staging Thread Presentation",
    deploymentByService(deployment, "thread-presentation").baseUrl,
  );
  const viewerOrigin = remoteBase("staging Viewer", deployment.externalViewerOrigin);
  const runId = "interior-baseline-" + Date.now().toString(36);

  emit({ event:"interior-baseline-start", runId, sourceGitSha:sourceSha });

  const discovered = await publicThreads(presentationBaseUrl, viewerOrigin);
  const cohort = [...discovered]
    .filter((thread) => !["genesis_candidate", "retired"].includes(thread?.lifecycleStatus))
    .sort((left, right) => establishedAt(right) - establishedAt(left))
    .slice(0, MAX_THREADS);

  const rows = [];
  const skipped = [];
  for (const thread of cohort) {
    try {
      const payload = await privateGet(
        worldBaseUrl,
        "/internal/threads/" + encodeURIComponent(thread.threadId) + "/observatory",
        privateToken,
        "World Observatory " + thread.threadId,
      );
      if (!payload?.observatory?.thread) throw new Error("observatory has no Thread");
      const row = threadBaseline(thread, payload.observatory);
      rows.push(row);
      emit({
        event:"interior-baseline-thread",
        threadId:row.threadId,
        name:row.name,
        publishedShell:row.publishedShell,
        authoritative:row.authoritative,
        livedNow:row.livedNow,
      });
      emit({
        event:"interior-baseline-preview",
        threadId:row.threadId,
        name:row.name,
        preview:row.preview,
      });
    } catch (error) {
      const item = Object.freeze({
        threadId:thread.threadId,
        reason:String(error?.message ?? error).slice(0, 300),
      });
      skipped.push(item);
      emit({ event:"interior-baseline-skipped", ...item });
    }
  }

  if (rows.length === 0) throw new Error("interior baseline found no inspectable staging Threads");

  const cohortSummary = summary(rows, skipped);
  const report = Object.freeze({
    contract:"fibre-interior-cognition-staging-baseline-v0.1",
    environment:"staging",
    runId,
    sourceGitSha:sourceSha,
    observedAt:new Date().toISOString(),
    readOnly:true,
    cohortSummary,
    threads:Object.freeze(rows),
    skipped:Object.freeze(skipped),
  });
  const reportPath = writeReport(runId, report);
  emit({
    event:"interior-baseline-complete",
    runId,
    sourceGitSha:sourceSha,
    ...cohortSummary,
    reportPath,
  });
  return Object.freeze({ report, reportPath });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runInteriorCognitionStagingBaseline().catch((error) => {
    process.stderr.write(JSON.stringify({
      event:"interior-baseline-failed",
      errorName:error?.constructor?.name ?? "Error",
      message:String(error?.message ?? error).slice(0, 1200),
    }) + "\n");
    process.exitCode = 1;
  });
}
