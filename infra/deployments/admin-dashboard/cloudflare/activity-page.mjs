import { normalizeActivityRecord } from "#infra/telemetry";

const MODES = new Set(["raw", "causal"]);
const PAGE_SIZE = 25;
const DIRECTIONS = new Set(["next", "prev"]);
const EDGES = new Set(["first", "last"]);

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
  const direction = url.searchParams.get("direction") ?? "next";
  const edge = url.searchParams.get("edge") ?? "first";
  if (!MODES.has(mode)) throw new TypeError("unsupported activity mode");
  if (!DIRECTIONS.has(direction)) throw new TypeError("unsupported activity page direction");
  if (!EDGES.has(edge)) throw new TypeError("unsupported activity page edge");
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (edge === "last" && cursor !== null) throw new TypeError("last page does not accept a cursor");
  if (direction === "prev" && cursor === null) throw new TypeError("previous activity page requires a cursor");
  return Object.freeze({ mode, size:PAGE_SIZE, direction, edge, cursor });
}

function activityClauses({ environment, query, page }) {
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
  if (query.before) add("occurred_at < ?", query.before);
  if (page.mode === "causal") clauses.push("status <> 'started'");
  return { clauses, bindings };
}

function cursorClause(op) {
  return `(occurred_at ${op} ? OR (occurred_at = ? AND recorded_at ${op} ?) OR (occurred_at = ? AND recorded_at = ? AND activity_id ${op} ?))`;
}

export function buildAdminActivityPageSql({ environment, query, page }) {
  const { clauses, bindings } = activityClauses({ environment, query, page });
  const logicalAscending = ["request", "genesis", "thread"].includes(query.kind);
  const reverse = page.edge === "last" || page.direction === "prev";
  const scanAscending = reverse ? !logicalAscending : logicalAscending;

  if (page.cursor) {
    const op = scanAscending ? ">" : "<";
    clauses.push(cursorClause(op));
    bindings.push(
      page.cursor.occurredAt,
      page.cursor.occurredAt, page.cursor.recordedAt,
      page.cursor.occurredAt, page.cursor.recordedAt, page.cursor.activityId,
    );
  }

  bindings.push(page.size + 1);
  const direction = scanAscending ? "ASC" : "DESC";
  return Object.freeze({
    sql:`SELECT activity_id, occurred_at, recorded_at, record_json FROM fibre_activity_log WHERE ${clauses.join(" AND ")} ORDER BY occurred_at ${direction}, recorded_at ${direction}, activity_id ${direction} LIMIT ?`,
    bindings:Object.freeze(bindings),
    reverse,
  });
}

function buildCountSql({ environment, query, page }) {
  const { clauses, bindings } = activityClauses({ environment, query, page });
  return { sql:`SELECT COUNT(*) AS total FROM fibre_activity_log WHERE ${clauses.join(" AND ")}`, bindings };
}

export async function queryAdminActivityPage(env, environment, query, page) {
  if (!env.ACTIVITY_LOG?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  const built = buildAdminActivityPageSql({ environment, query, page });
  const count = buildCountSql({ environment, query, page });
  const [result, countResult] = await Promise.all([
    env.ACTIVITY_LOG.prepare(built.sql).bind(...built.bindings).all(),
    env.ACTIVITY_LOG.prepare(count.sql).bind(...count.bindings).all(),
  ]);

  const rows = Array.isArray(result?.results) ? result.results : [];
  const total = Number(countResult?.results?.[0]?.total ?? 0);
  const lastPageSize = total === 0 ? 0 : (total % page.size || page.size);
  const take = page.edge === "last" ? lastPageSize : page.size;
  const scanned = rows.slice(0, take);
  if (built.reverse) scanned.reverse();
  const records = scanned.map((row) => normalizeActivityRecord(JSON.parse(row.record_json)));
  const extra = rows.length > page.size;
  const cameFromCursor = page.cursor !== null;
  const hasPrev = page.edge === "last" ? total > records.length : page.direction === "prev" ? extra : cameFromCursor;
  const hasNext = page.edge === "last" ? false : page.direction === "prev" ? cameFromCursor : extra;

  return Object.freeze({
    records:Object.freeze(records),
    prevCursor:hasPrev && records.length ? encodeCursor(records[0]) : null,
    nextCursor:hasNext && records.length ? encodeCursor(records.at(-1)) : null,
    total,
    totalPages:Math.max(1, Math.ceil(total / page.size)),
    pageSize:page.size,
  });
}
