const TOKEN_ENCODER = new TextEncoder();
const ROUTE = "/internal/births/initiate";
const PENDING_ROUTE = "/internal/births/pending";
const PLACES_ROUTE = "/internal/births/places";

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function json(status, payload) {
  return Response.json(payload, {
    status,
    headers:{ "cache-control":"no-store", "x-content-type-options":"nosniff" },
  });
}

function exactInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Thread birth request must be an object");
  }
  const allowed = new Set(["requestId","requestedAt","location","sex"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`Thread birth request.${key} is not allowed`);
  }
  for (const key of ["requestId","requestedAt"]) {
    if (typeof value[key] !== "string" || value[key].trim() === "") {
      throw new TypeError(`Thread birth request.${key} is required`);
    }
  }
  const location = value.location === null || value.location === undefined || value.location === ""
    ? null
    : value.location;
  if (location !== null && typeof location !== "string") throw new TypeError("Thread birth request.location must be a string or null");
  const sex = value.sex === null || value.sex === undefined || value.sex === ""
    ? null
    : value.sex;
  if (sex !== null && sex !== "female" && sex !== "male") {
    throw new TypeError("Thread birth request.sex must be female, male, or null");
  }
  return Object.freeze({
    requestId:value.requestId.trim(),
    requestedAt:value.requestedAt.trim(),
    location:location === null ? null : location.trim(),
    sex,
  });
}

export function createModernBirthInitiationApi({
  service,
  pendingBirths = null,
  birthplaces = null,
  requestStore = null,
  privateToken,
} = {}) {
  if (!service || typeof service.initiate !== "function") {
    throw new TypeError("modern birth API requires service.initiate()");
  }
  if (pendingBirths !== null && typeof pendingBirths !== "function") {
    throw new TypeError("modern birth API pendingBirths must be a function or null");
  }
  if (birthplaces !== null && !Array.isArray(birthplaces)) {
    throw new TypeError("modern birth API birthplaces must be an array or null");
  }
  if (requestStore !== null && (
    typeof requestStore.enqueue !== "function"
    || typeof requestStore.fail !== "function"
  )) {
    throw new TypeError("modern birth API requestStore must expose enqueue() and fail()");
  }
  if (typeof privateToken !== "string" || privateToken.length < 16) {
    throw new TypeError("modern birth API privateToken must be at least 16 characters");
  }

  return Object.freeze({
    async fetch(request, { defer = null } = {}) {
      if (defer !== null && typeof defer !== "function") {
        throw new TypeError("modern birth API defer must be a function or null");
      }
      const url = new URL(request.url);
      if (![ROUTE,PENDING_ROUTE,PLACES_ROUTE].includes(url.pathname)) return null;
      if (url.search !== "") return json(400, { error:"query_not_supported" });
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return json(403, { error:"private_token_required" });
      }
      if (url.pathname === PLACES_ROUTE) {
        if (request.method !== "GET") return json(405, { error:"method_not_allowed" });
        if (birthplaces === null) return json(503, { error:"birthplaces_not_configured" });
        return json(200, { ok:true, places:birthplaces });
      }
      if (url.pathname === PENDING_ROUTE) {
        if (request.method !== "GET") return json(405, { error:"method_not_allowed" });
        if (pendingBirths === null) return json(503, { error:"pending_births_not_configured" });
        try {
          return json(200, { ok:true, births:await pendingBirths() });
        } catch (error) {
          return json(500, {
            error:"pending_births_failed",
            detail:error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (request.method !== "POST") return json(405, { error:"method_not_allowed" });
      let input = null;
      let enqueued = false;
      try {
        let body;
        try { body = await request.json(); }
        catch { throw new TypeError("Thread birth request must be valid JSON"); }
        input = exactInput(body);
        if (requestStore !== null) {
          requestStore.enqueue(input);
          enqueued = true;
        }
        const work = service.initiate(input);
        if (defer !== null) {
          defer(work.catch((error) => {
            if (requestStore !== null) {
              try { requestStore.fail(input.requestId, error); } catch {}
            }
            return null;
          }));
          return json(202, {
            ok:true,
            birth:{
              requestId:input.requestId,
              status:"queued",
              location:input.location,
              sex:input.sex,
            },
          });
        }
        const birth = await work;
        return json(birth.development.status === "published" ? 200 : 202, { ok:true, birth });
      } catch (error) {
        if (enqueued && input !== null) {
          try { requestStore.fail(input.requestId, error); } catch {}
        }
        return json(error instanceof TypeError ? 400 : 500, {
          error:error instanceof TypeError ? "invalid_thread_birth" : "thread_birth_failed",
          detail:error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
