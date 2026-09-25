import { logD1Cost } from "../../cloudflare-d1-cost.mjs";

const MAX_ADMITTED_THREADS = 5000;
const MAX_ACTIVITY_THREADS = 200;
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
    stillborn:0,
  };
  for (const thread of threads) {
    if (thread.health === "unrecoverable") summary.stillborn += 1;
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
  } else {
    findings.push(Object.freeze({
      code:"NAME",
      state:"healthy",
      identityAction:Object.freeze({
        id:"change_name",
        label:"Change name",
        input:Object.freeze({ fields:Object.freeze([
          Object.freeze({ name:"name", label:"Name", kind:"text", required:true, default:clean(entry.displayName) }),
        ]) }),
      }),
    }));
  }
  if (clean(entry.sex) === null) findings.push(Object.freeze({ code:"SEX_MISSING", state:"attention" }));
  if (clean(entry.birthDate) === null) {
    findings.push(Object.freeze({
      code:"BIRTH_DATE_MISSING",
      state:"operator_decision_required",
      reason:"This Thread does not yet have an authoritative birth date",
      identityAction:Object.freeze({
        id:"set_birth_date",
        label:"Set birth date",
        input:Object.freeze({ fields:Object.freeze([
          Object.freeze({ name:"birthDate", label:"Birth date", kind:"date", required:true }),
        ]) }),
      }),
    }));
  } else {
    findings.push(Object.freeze({
      code:"BIRTH_DATE",
      state:"healthy",
      identityAction:Object.freeze({
        id:"change_birth_date",
        label:"Change birth date",
        input:Object.freeze({ fields:Object.freeze([
          Object.freeze({ name:"birthDate", label:"Birth date", kind:"date", required:true, default:clean(entry.birthDate) }),
        ]) }),
      }),
    }));
  }
  const spokenLanguages = Array.isArray(entry.languages)
    ? entry.languages.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
    : [];
  findings.push(Object.freeze({
    code:"SPOKEN_LANGUAGES",
    state:"healthy",
    authoritative:Object.freeze([...spokenLanguages]),
  }));

  const raisedLanguages = Array.isArray(entry.raisedAs?.languages)
    ? entry.raisedAs.languages.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
    : [];
  const raisedLanguageAction = Object.freeze({
    id:raisedLanguages.length === 0 ? "set_raised_languages" : "change_raised_languages",
    label:raisedLanguages.length === 0 ? "Set raised languages" : "Change raised languages",
    command:"raised_languages",
    input:Object.freeze({ fields:Object.freeze([
      Object.freeze({
        name:"languages",
        label:"Raised languages",
        kind:"string_list",
        required:true,
        ...(raisedLanguages.length === 0 ? {} : { default:raisedLanguages.join(", ") }),
        placeholder:"Hebrew, Russian",
      }),
    ]) }),
  });
  if (raisedLanguages.length === 0 || raisedLanguages.length > 3) {
    findings.push(Object.freeze({
      code:raisedLanguages.length === 0 ? "RAISED_LANGUAGES_MISSING" : "RAISED_LANGUAGES_NEED_REVIEW",
      state:"operator_decision_required",
      reason:raisedLanguages.length === 0
        ? "Genesis has no raised-language context"
        : "Genesis raised languages should describe this person's household, civic, and schooling path rather than a country's demographic language inventory",
      identityAction:raisedLanguageAction,
    }));
  } else {
    findings.push(Object.freeze({
      code:"RAISED_LANGUAGES",
      state:"healthy",
      authoritative:Object.freeze([...raisedLanguages]),
      identityAction:raisedLanguageAction,
    }));
  }
  if (clean(entry.fibreIdentityNumber) === null) findings.push(Object.freeze({ code:"FIN_MISSING", state:"attention" }));
  return Object.freeze(findings);
}

function admittedThread(entry, lastActivityAt) {
  const findings = registryFindings(entry);
  const unresolved = findings.filter((finding) => finding.state !== "healthy");
  return Object.freeze({
    threadId:entry.threadId,
    admitted:true,
    lastActivityAt:lastActivityAt ?? null,
    health:unresolved.length === 0 ? "healthy" : unresolved.some((finding) => finding.state === "operator_decision_required")
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
      birthLocation:entry.birthLocation === null || entry.birthLocation === undefined
        ? null
        : structuredClone(entry.birthLocation),
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
    currentLocation:entry.currentLocation === null || entry.currentLocation === undefined
      ? null
      : structuredClone(entry.currentLocation),
    portraitUrl:null,
    findings,
    reconciliation:entry.reconciliation === null || entry.reconciliation === undefined
      ? null
      : structuredClone(entry.reconciliation),
  });
}

function activityOnly(row) {
  return Object.freeze({
    threadId:row.thread_id,
    admitted:false,
    lastActivityAt:row.last_activity_at ?? null,
    health:"unrecoverable",
    identity:null,
    currentLocation:null,
    portraitUrl:null,
    findings:Object.freeze([]),
    reconciliation:null,
  });
}

function missingActivityHeads(error) {
  return /no such table:\s*fibre_activity_thread_heads/iu.test(error?.message ?? String(error));
}

async function readActivityHeads(activityLog, environment) {
  try {
    const result = await activityLog.prepare(`
      SELECT thread_id, last_activity_at
      FROM fibre_activity_thread_heads
      WHERE environment = ?
      ORDER BY last_activity_at DESC, thread_id ASC
      LIMIT ?
    `).bind(environment, MAX_ACTIVITY_THREADS + 1).all();
    return Object.freeze({ result, operation:"admin.thread_population.activity" });
  } catch (error) {
    if (!missingActivityHeads(error)) throw error;
    const result = await activityLog.prepare(`
      SELECT thread_id, MAX(occurred_at) AS last_activity_at
      FROM fibre_activity_log
      WHERE environment = ? AND thread_id IS NOT NULL
      GROUP BY thread_id
      ORDER BY last_activity_at DESC, thread_id ASC
      LIMIT ?
    `).bind(environment, MAX_ACTIVITY_THREADS + 1).all();
    return Object.freeze({ result, operation:"admin.thread_population.activity_fallback" });
  }
}

export async function readAdminThreadPopulation({
  activityLog,
  environment,
  readRegistry,
} = {}) {
  if (!activityLog?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  if (typeof readRegistry !== "function") throw new TypeError("Thread population requires readRegistry()");

  const [registryEntries, activity] = await Promise.all([
    readRegistry(MAX_ADMITTED_THREADS),
    readActivityHeads(activityLog, environment),
  ]);
  if (!Array.isArray(registryEntries)) throw new Error("World Thread Registry returned an invalid population");

  const activityResult = activity.result;
  logD1Cost({
    database:"activity-log",
    service:"admin-dashboard",
    operation:activity.operation,
    result:activityResult,
  });
  const activityRows = Array.isArray(activityResult?.results) ? activityResult.results : [];
  const activityByThread = new Map(activityRows.map((row) => [row.thread_id, row.last_activity_at ?? null]));
  const admittedIds = new Set(registryEntries.map((entry) => entry.threadId));
  const threads = registryEntries.map((entry) => admittedThread(entry, activityByThread.get(entry.threadId)));
  for (const row of activityRows.slice(0, MAX_ACTIVITY_THREADS)) {
    if (!admittedIds.has(row.thread_id)) threads.push(activityOnly(row));
  }

  const stillborn = threads.filter((thread) => thread.health === "unrecoverable");
  const admittedPopulation = threads.filter((thread) => thread.health !== "unrecoverable");
  const truncated = registryEntries.length >= MAX_ADMITTED_THREADS || activityRows.length > MAX_ACTIVITY_THREADS;
  return Object.freeze({
    threads:Object.freeze(admittedPopulation),
    stillborn:Object.freeze(stillborn),
    summary:summarize(threads),
    truncated,
    limit:MAX_ADMITTED_THREADS,
  });
}
