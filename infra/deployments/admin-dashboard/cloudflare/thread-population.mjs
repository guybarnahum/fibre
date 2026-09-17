const MAX_THREADS = 500;

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

function portraitUrl(diagnosis) {
  const objectRef = diagnosis?.presentation?.portraitObjectRef;
  return diagnosis?.exists === true && typeof objectRef === "string" && objectRef !== ""
    ? `/api/thread-assets/${encodeURIComponent(objectRef)}`
    : null;
}

export async function readAdminThreadPopulation({ activityLog, environment, resolveThreadHealth }) {
  if (!activityLog?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  if (typeof resolveThreadHealth !== "function") throw new TypeError("Thread population requires resolveThreadHealth()");

  const result = await activityLog.prepare(`
    SELECT thread_id, MAX(occurred_at) AS last_activity_at
    FROM fibre_activity_log
    WHERE environment = ? AND thread_id IS NOT NULL
    GROUP BY thread_id
    ORDER BY last_activity_at DESC, thread_id ASC
    LIMIT ?
  `).bind(environment, MAX_THREADS + 1).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const truncated = rows.length > MAX_THREADS;
  const threads = [];

  for (const row of rows.slice(0, MAX_THREADS)) {
    try {
      const health = await resolveThreadHealth(row.thread_id);
      const diagnosis = health.diagnosis ?? null;
      threads.push(Object.freeze({
        threadId:row.thread_id,
        admitted:diagnosis?.exists === true,
        lastActivityAt:row.last_activity_at ?? null,
        health:diagnosis?.health ?? "unavailable",
        identity:diagnosis?.identity ?? null,
        portraitUrl:portraitUrl(diagnosis),
        findings:diagnosis?.findings ?? [],
        reconciliation:health.reconciliation ?? null,
      }));
    } catch (error) {
      threads.push(Object.freeze({
        threadId:row.thread_id,
        admitted:null,
        lastActivityAt:row.last_activity_at ?? null,
        health:"unavailable",
        identity:null,
        portraitUrl:null,
        findings:[],
        reconciliation:null,
        error:error instanceof Error ? error.message : String(error),
      }));
    }
  }

  return Object.freeze({
    threads:Object.freeze(threads),
    summary:summarize(threads),
    truncated,
    limit:MAX_THREADS,
  });
}
