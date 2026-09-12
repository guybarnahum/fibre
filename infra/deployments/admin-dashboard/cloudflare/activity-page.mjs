import { normalizeActivityRecord } from "#infra/telemetry";

export const ADMIN_ACTIVITY_PAGE_SIZE = 25;

const MODES = new Set(["raw", "causal"]);

function encodeCursor(record) {
  return btoa(JSON.stringify([record.occurredAt, record.recordedAt, record.activityId]))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const [occurredAt, recordedAt, activityId] = JSON.parse(atob(padded));
    if (typeof occurredAt !== "string" || Number.isNaN(Date.parse(occurredAt))) throw new Error();
    if (typeof recordedAt !== "string" || Number.isNaN(Date.parse(recordedAt))) throw new Error();
    if (typeof activityId !== "string" || activityId.length === 0) throw new Error();
    return { occurredAt, recordedAt, activityId };
  } catch {
    throw new TypeError("invalid activity cursor");
  }
}

export function parseAdminActivityPage(url) {
  const mode = url.searchParams.get("mode") ?? "raw";
  if (!MODES.has(mode)) throw new TypeError("unsupported activity mode");
  return Object.freeze({ mode, cursor:decodeCursor(url.searchParams.get("cursor")) });
}

export function buildAdminActivityPageSql({ environment, query, page }) {
  const clauses = ["environment = ?"];
  const bindings = [environment];
  const add = (clause, value) => { clauses.push(clause); bindings.push(value); };

  if (query.kind === "request") add("request_id = ?", query.value);
  if (query.kind === "genesis") add("genesis_id = ?", query.value);
  if (query.kind === "thread") add("thread_id = ?", query.value);
  if (query.kind === "failures") clauses.push("status IN ('failed','retrying')");
  if (query.service) add("service = ?", query.service);
  if (query.stage) add("stage = ?", query.stage);
  if (query.status) add("status = ?", query.status);
  if (page.mode === "causal") clauses.push("status <> 'started'");

  const ascending = ["request", "genesis", "thread"].includes(query.kind);
  if (page.cursor) {
    const op = ascending ? ">" : "<";
    clauses.push(`(occurred_at ${op} ? OR (occurred_at = ? AND recorded_at ${op} ?) OR (occurred_at = ? AND recorded_at = ? AND activity_id ${op} ?))`);
    bindings.push(
      page.cursor.occurredAt,
      page.cursor.occurredAt, page.cursor.recordedAt,
      page.cursor.occurredAt, page.cursor.recordedAt, page.cursor.activityId,
    );
  }

  bindings.push(ADMIN_ACTIVITY_PAGE_SIZE + 1);
  const direction = ascending ? "ASC" : "DESC";
  return Object.freeze({
    sql:`SELECT activity_id, occurred_at, recorded_at, record_json FROM fibre_activity_log WHERE ${clauses.join(" AND ")} ORDER BY occurred_at ${direction}, recorded_at ${direction}, activity_id ${direction} LIMIT ?`,
    bindings:Object.freeze(bindings),
  });
}

export async function queryAdminActivityPage(env, environment, query, page) {
  if (!env.ACTIVITY_LOG?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  const built = buildAdminActivityPageSql({ environment, query, page });
  const result = await env.ACTIVITY_LOG.prepare(built.sql).bind(...built.bindings).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const visible = rows.slice(0, ADMIN_ACTIVITY_PAGE_SIZE);
  const records = visible.map((row) => normalizeActivityRecord(JSON.parse(row.record_json)));
  return Object.freeze({
    records:Object.freeze(records),
    nextCursor:rows.length > ADMIN_ACTIVITY_PAGE_SIZE && records.length ? encodeCursor(records.at(-1)) : null,
  });
}
