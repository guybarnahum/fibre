import { logD1Cost } from "../../cloudflare-d1-cost.mjs";

const MAX_THREADS = 200;
const PLACEHOLDER_NAMES = new Set(["fibre thread", "fiber thread"]);

function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function unfinishedName(value) {
  const normalized = clean(value)?.toLocaleLowerCase("en-US") ?? null;
  return normalized === null || PLACEHOLDER_NAMES.has(normalized);
}

function sexBucket(value) {
  if (value === "female" || value === "male") return value;
  return "unknown";
}

function summarize(threads) {
  const summary = {
    observed:threads.length,
    total:0,
    activityOnly:0,
    female:0,
    male:0,
    unknownSex:0,
    healthy:0,
    attention:0,
    deadLetter:0,
    migrationsAvailable:0,
  };
  for (const thread of threads) {
    if (thread.admitted !== true) {
      summary.activityOnly += 1;
      continue;
    }
    summary.total += 1;
    const sex = sexBucket(thread.identity?.sex);
    summary[sex === "unknown" ? "unknownSex" : sex] += 1;
    if (thread.health === "healthy") summary.healthy += 1;
    else summary.attention += 1;
    if (thread.reconciliation?.state === "dead_letter") summary.deadLetter += 1;
    if ((thread.findings ?? []).some((finding) => finding?.migration?.id)) summary.migrationsAvailable += 1;
  }
  return Object.freeze(summary);
}

function registryFindings(entry) {
  const findings = [];
  if (unfinishedName(entry.displayName)) {
    findings.push(Object.freeze({
      code:"NAME_UNFINISHED",
      state:"operator_decision_required",
      reason:"This Thread does not yet have a finished personal name",
      identityAction:Object.freeze({
        id:"set_name",
        label:"Set name",
        input:Object.freeze({ fields:Object.freeze([
          Object.freeze({ name:"name", label:"Name", kind:"text", required:true }),
        ]) }),
      }),
    }));
  }
  if (clean(entry.sex) === null) findings.push(Object.freeze({ code:"SEX_MISSING", state:"attention" }));
  if (clean(entry.fibreIdentityNumber) === null) findings.push(Object.freeze({ code:"FIN_MISSING", state:"attention" }));
  return Object.freeze(findings);
}

function admittedThread(entry, lastActivityAt) {
  const findings = registryFindings(entry);
  return Object.freeze({
    threadId:entry.threadId,
    admitted:true,
    lastActivityAt:lastActivityAt ?? null,
    health:findings.length === 0 ? "healthy" : findings.some((finding) => finding.state === "operator_decision_required")
      ? "operator_decision_required"
      : "attention",
    identity:Object.freeze({
      name:unfinishedName(entry.displayName) ? null : clean(entry.displayName),
      storedName:clean(entry.displayName),
      sex:clean(entry.sex),
      fibreIdentityNumber:clean(entry.fibreIdentityNumber),
      originOrientation:clean(entry.originOrientation),
      birthDate:clean(entry.birthDate),
      birthPlace:clean(entry.birthPlace),
      culture:Object.freeze([...(entry.culture ?? [])]),
      languages:Object.freeze([...(entry.languages ?? [])]),
      raisedAs:entry.raisedAs === null ? null : structuredClone(entry.raisedAs),
      lifecycleStatus:clean(entry.status),
    }),
    registry:Object.freeze({
      version:entry.version ?? null,
      stateHash:clean(entry.stateHash),
      updatedAt:clean(entry.updatedAt),
    }),
    portraitUrl:null,
    findings,
    reconciliation:null,
  });
}

function activityOnly(row) {
  return Object.freeze({
    threadId:row.thread_id,
    admitted:false,
    lastActivityAt:row.last_activity_at ?? null,
    health:"unrecoverable",
    identity:null,
    portraitUrl:null,
    findings:Object.freeze([]),
    reconciliation:null,
  });
}

export async function readAdminThreadPopulation({ activityLog, environment, readRegistry }) {
  if (!activityLog?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  if (typeof readRegistry !== "function") throw new TypeError("Thread population requires readRegistry()");

  const activityPromise = activityLog.prepare(`
    SELECT thread_id, MAX(occurred_at) AS last_activity_at
    FROM fibre_activity_log
    WHERE environment = ? AND thread_id IS NOT NULL
    GROUP BY thread_id
    ORDER BY last_activity_at DESC, thread_id ASC
    LIMIT ?
  `).bind(environment, MAX_THREADS + 1).all();
  const [registryEntries, activityResult] = await Promise.all([
    readRegistry(MAX_THREADS),
    activityPromise,
  ]);
  logD1Cost({
    database:"activity-log",
    service:"admin-dashboard",
    operation:"admin.thread_population.activity",
    result:activityResult,
  });
  if (!Array.isArray(registryEntries)) throw new Error("World Thread Registry returned an invalid population");

  const activityRows = Array.isArray(activityResult?.results) ? activityResult.results : [];
  const activityByThread = new Map(activityRows.map((row) => [row.thread_id, row.last_activity_at ?? null]));
  const admittedIds = new Set(registryEntries.map((entry) => entry.threadId));
  const threads = registryEntries.map((entry) => admittedThread(entry, activityByThread.get(entry.threadId)));
  for (const row of activityRows.slice(0, MAX_THREADS)) {
    if (!admittedIds.has(row.thread_id)) threads.push(activityOnly(row));
  }

  const truncated = registryEntries.length >= MAX_THREADS || activityRows.length > MAX_THREADS;
  return Object.freeze({
    threads:Object.freeze(threads),
    summary:summarize(threads),
    truncated,
    limit:MAX_THREADS,
  });
}
