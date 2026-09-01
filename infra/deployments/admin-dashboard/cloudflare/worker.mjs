import { normalizeActivityRecord } from "../../../telemetry.mjs";

export const ADMIN_DASHBOARD_VERSION = "fibre-admin-dashboard-v0.1";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const STATUSES = new Set(["started", "succeeded", "failed", "retrying"]);
const ACCESS_CACHE = new Map();

function json(status, payload, cacheControl = "no-store") {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":cacheControl, "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" } });
}
function id(name, value) { if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} must be a Fibre identifier`); return value; }
function iso(name, value) { if (value === null) return null; if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`); return new Date(value).toISOString(); }
function positiveLimit(value) { const parsed = Number.parseInt(value ?? "100", 10); if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) throw new TypeError("limit must be between 1 and 200"); return parsed; }

export function parseAdminActivityQuery(url) {
  const kind = url.searchParams.get("kind") ?? "recent";
  if (!["recent","failures","request","genesis","thread"].includes(kind)) throw new TypeError("unsupported activity view");
  const rawValue = url.searchParams.get("value");
  const value = ["request","genesis","thread"].includes(kind) ? id("activity identity", rawValue) : null;
  const service = url.searchParams.get("service");
  const stage = url.searchParams.get("stage");
  const status = url.searchParams.get("status");
  if (service !== null && service !== "") id("service", service);
  if (stage !== null && stage !== "") id("stage", stage);
  if (status !== null && status !== "" && !STATUSES.has(status)) throw new TypeError("unsupported activity status");
  return Object.freeze({ kind, value, service: service || null, stage: stage || null, status: status || null, before: iso("before", url.searchParams.get("before")), limit: positiveLimit(url.searchParams.get("limit")) });
}

export function buildAdminActivitySql({ environment, query }) {
  id("environment", environment);
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
  const chronological = ["request","genesis","thread"].includes(query.kind);
  bindings.push(query.limit);
  return Object.freeze({ sql:`SELECT record_json FROM fibre_activity_log WHERE ${clauses.join(" AND ")} ORDER BY occurred_at ${chronological ? "ASC" : "DESC"}, recorded_at ${chronological ? "ASC" : "DESC"}, rowid ${chronological ? "ASC" : "DESC"} LIMIT ?`, bindings:Object.freeze(bindings), chronological });
}

function summary(records) {
  const failures = records.filter((record) => record.status === "failed");
  const retrying = records.filter((record) => record.status === "retrying");
  const recovered = new Set();
  for (const failed of failures) if (records.some((record) => record.service === failed.service && record.stage === failed.stage && record.status === "succeeded" && record.occurredAt >= failed.occurredAt)) recovered.add(`${failed.service}:${failed.stage}`);
  let description = `${records.length} record(s)`;
  if (records.length === 0) description = "No matching activity";
  else if (failures.length === 0) description = "No recorded failures in this view";
  else if (recovered.size === failures.length) description = `${failures.length} failure event(s); all represented failed stages recovered`;
  else description = `${failures.length} failure event(s); ${recovered.size} failed stage(s) recovered`;
  return Object.freeze({ records:records.length, failures:failures.length, retrying:retrying.length, recovered:recovered.size, description });
}

async function queryActivity(env, environment, query) {
  if (!env.ACTIVITY_LOG?.prepare) throw new Error("ACTIVITY_LOG binding is unavailable");
  const built = buildAdminActivitySql({ environment, query });
  const result = await env.ACTIVITY_LOG.prepare(built.sql).bind(...built.bindings).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return Object.freeze(rows.map((row) => {
    if (typeof row?.record_json !== "string") throw new Error("Activity row lacks record_json");
    return normalizeActivityRecord(JSON.parse(row.record_json));
  }));
}

function base64UrlBytes(value) { const padded = value.replace(/-/gu,"+").replace(/_/gu,"/").padEnd(Math.ceil(value.length / 4) * 4,"="); const raw = atob(padded); return Uint8Array.from(raw, (char) => char.charCodeAt(0)); }
function base64UrlJson(value) { return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))); }
function normalizedTeamDomain(value) { if (typeof value !== "string" || value.trim() === "") return null; const url = new URL(value.startsWith("https://") ? value : `https://${value}`); return `${url.protocol}//${url.host}`; }
function expectedAudience(claim, expected) { return Array.isArray(claim) ? claim.includes(expected) : claim === expected; }

export function validateAccessClaims(claims, { audience, issuer, nowSeconds = Math.floor(Date.now()/1000) }) {
  if (!claims || typeof claims !== "object") return false;
  if (!expectedAudience(claims.aud, audience)) return false;
  if (claims.iss !== issuer && claims.iss !== `${issuer}/`) return false;
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) return false;
  if (Number.isFinite(claims.nbf) && claims.nbf > nowSeconds + 30) return false;
  return true;
}

async function jwks(teamDomain, fetchImpl) {
  const cached = ACCESS_CACHE.get(teamDomain);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await fetchImpl(`${teamDomain}/cdn-cgi/access/certs`, { headers:{ Accept:"application/json" } });
  if (!response.ok) throw new Error("Cloudflare Access certificate fetch failed");
  const payload = await response.json();
  if (!Array.isArray(payload?.keys)) throw new Error("Cloudflare Access certificate response is invalid");
  ACCESS_CACHE.set(teamDomain, { keys:payload.keys, expiresAt:Date.now()+300000 });
  return payload.keys;
}

export async function authenticateAccessRequest(request, env, { fetchImpl = globalThis.fetch } = {}) {
  const audience = env.FIBRE_ACCESS_AUD;
  const teamDomain = normalizedTeamDomain(env.FIBRE_ACCESS_TEAM_DOMAIN);
  if (typeof audience !== "string" || audience.trim() === "" || teamDomain === null) return null;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;
  const parts = token.split("."); if (parts.length !== 3) return null;
  let header, claims;
  try { header = base64UrlJson(parts[0]); claims = base64UrlJson(parts[1]); } catch { return null; }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const keys = await jwks(teamDomain, fetchImpl);
  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid || !validateAccessClaims(claims, { audience, issuer:teamDomain })) return null;
  return claims;
}

function secureAsset(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options","nosniff"); headers.set("Referrer-Policy","no-referrer"); headers.set("X-Frame-Options","DENY");
  headers.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
}

export function createAdminDashboardWorker({ authenticate = authenticateAccessRequest } = {}) {
  return Object.freeze({
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/healthz") return json(200, { ok:true, service:"admin-dashboard", version:ADMIN_DASHBOARD_VERSION });
      let principal = null;
      try { principal = await authenticate(request, env); } catch { principal = null; }
      if (!principal) return json(403, { error:"access_required" });
      if (url.pathname === "/api/activity" && request.method === "GET") {
        try {
          const query = parseAdminActivityQuery(url);
          const environment = id("FIBRE_ENVIRONMENT", env.FIBRE_ENVIRONMENT);
          const records = await queryActivity(env, environment, query);
          return json(200, { contract:ADMIN_DASHBOARD_VERSION, environment, queriedAt:new Date().toISOString(), query, summary:summary(records), records });
        } catch (error) { return json(error instanceof TypeError ? 400 : 503, { error:error instanceof TypeError ? "invalid_query" : "activity_unavailable", detail:error.message }); }
      }
      if (url.pathname.startsWith("/api/")) return json(404, { error:"not_found" });
      if (!env.ASSETS?.fetch) return json(503, { error:"assets_unavailable" });
      return secureAsset(await env.ASSETS.fetch(request));
    },
  });
}

export default createAdminDashboardWorker();
