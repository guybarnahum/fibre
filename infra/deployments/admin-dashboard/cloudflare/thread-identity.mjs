const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} must be a Fibre identifier`);
  return value;
}

function clean(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function presentationOrigin(environment) {
  if (environment === "production") return "https://api.insidefibre.com";
  if (environment === "staging") return "https://api.staging.insidefibre.com";
  throw new TypeError("FIBRE_ENVIRONMENT must be staging or production");
}

export async function resolveAdminThreadIdentity({ environment, threadId, fetchImpl = globalThis.fetch } = {}) {
  const resolvedThreadId = id("threadId", threadId);
  const origin = presentationOrigin(environment);
  if (typeof fetchImpl !== "function") throw new TypeError("Thread identity resolver requires fetch()");
  const response = await fetchImpl(`${origin}/api/threads/${encodeURIComponent(resolvedThreadId)}/snapshot`, {
    headers: { Accept:"application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Thread Presentation identity lookup failed with HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.pointer?.threadId !== resolvedThreadId) throw new Error("Thread Presentation returned a mismatched Thread identity");
  const presentation = payload?.snapshot?.presentation;
  if (!presentation || typeof presentation !== "object") throw new Error("Thread Presentation snapshot lacks public Presentation");
  return Object.freeze({
    threadId: resolvedThreadId,
    displayName: clean(presentation.subject?.displayName),
    fibreIdentityNumber: clean(presentation.civilIdentity?.fibreIdentityNumber),
    birthDate: clean(presentation.subject?.birthDate),
    lifecycleStatus: clean(presentation.manifest?.lifecycleStatus),
    provenance: Object.freeze({
      displayName: "resolved_after_fact",
      fibreIdentityNumber: "resolved_after_fact",
      source: "current_public_presentation",
    }),
  });
}
