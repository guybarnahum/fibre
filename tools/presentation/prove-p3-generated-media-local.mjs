import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.FIBRE_PRESENTATION_URL ?? "http://127.0.0.1:8787";
const signerBase = process.env.FIBRE_C2PA_SIGNER_URL ?? "http://127.0.0.1:8790";
const threadId = "thr_pr39_g2_04";
const mediaId = "media_place_market";
const timeoutMs = Number(process.env.P3_PROOF_TIMEOUT_MS ?? 10 * 60 * 1000);
const pollMs = Number(process.env.P3_PROOF_POLL_MS ?? 2000);

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const health = await jsonFetch(`${signerBase}/healthz`);
if (health.format !== "c2pa") throw new Error("local signer is not reporting C2PA format");

const scheduled = await jsonFetch(`${base}/__p3/fixtures/can-tho/generate-market`, { method: "POST" });
const started = Date.now();
let readyEvent = null;
let workflow = scheduled.workflow;

while (Date.now() - started < timeoutMs) {
  const status = await jsonFetch(`${base}/__p3/workflows/${encodeURIComponent(scheduled.jobId)}`);
  workflow = status.workflow;
  if (["errored", "terminated"].includes(workflow.status)) {
    throw new Error(`asset workflow ended as ${workflow.status}`);
  }

  const events = await jsonFetch(`${base}/api/threads/${threadId}/events?after=0`);
  readyEvent = events.events.find((event) => event.kind === "media.ready" && event.payload?.mediaId === mediaId) ?? null;
  if (readyEvent) break;

  process.stdout.write(`P3 asset workflow ${workflow.status}; stream head ${events.head}\n`);
  await sleep(pollMs);
}

if (!readyEvent) throw new Error(`timed out waiting for ${mediaId} media.ready`);
if (readyEvent.sequence !== 1) throw new Error(`expected first generated media event at sequence 1, got ${readyEvent.sequence}`);
if (readyEvent.payload.objectRef !== scheduled.objectRef) throw new Error("media.ready objectRef does not match scheduled job");

const mediaUrl = `${base}/api/assets/${encodeURIComponent(readyEvent.payload.objectRef)}`;
const mediaResponse = await fetch(mediaUrl);
if (!mediaResponse.ok) throw new Error(`generated asset fetch failed ${mediaResponse.status}`);
if (mediaResponse.headers.get("x-fibre-provenance") !== "generated_reconstruction") {
  throw new Error("generated media is missing generated_reconstruction serving classification");
}
const mediaType = mediaResponse.headers.get("content-type");
const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
if (bytes.length === 0) throw new Error("generated media is empty");

const verification = await jsonFetch(`${signerBase}/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bytesBase64: Buffer.from(bytes).toString("base64"),
    mediaType,
  }),
});
if (verification.valid !== true) throw new Error(`C2PA verification failed: ${verification.failureReason}`);
if (verification.assertion?.provenanceClass !== "generated_reconstruction") {
  throw new Error("embedded C2PA assertion does not classify asset as generated_reconstruction");
}
if (verification.assertion?.promptDisclosure?.mode !== "digest_only") {
  throw new Error("P3 proof must not publish exact prompt text in C2PA");
}
if (verification.assertion.promptDisclosure.semanticBrief !== null
  || verification.assertion.promptDisclosure.providerRequest !== null) {
  throw new Error("digest_only C2PA unexpectedly contains prompt text");
}

await mkdir("artifacts/generated", { recursive: true });
const extension = mediaType === "image/png" ? "png" : mediaType === "image/jpeg" ? "jpg" : "bin";
const output = `artifacts/generated/p3-can-tho-market-credentialed.${extension}`;
await writeFile(output, bytes);

console.log(JSON.stringify({
  ok: true,
  threadId,
  lifecycleStatus: "genesis_candidate",
  fixture: true,
  mediaId,
  demandId: scheduled.demandId,
  jobId: scheduled.jobId,
  workflowStatus: workflow.status,
  presentationPublication: "queue_completion_handoff",
  assetServing: "provider_neutral_generic_route",
  eventSequence: readyEvent.sequence,
  eventId: readyEvent.eventId,
  objectRef: readyEvent.payload.objectRef,
  finalAssetDigest: readyEvent.payload.digest,
  mediaType,
  byteLength: bytes.length,
  c2pa: {
    valid: true,
    signerId: verification.signerId,
    manifestDigest: verification.manifestDigest,
    provenanceClass: verification.assertion.provenanceClass,
    provider: verification.assertion.provider,
    model: verification.assertion.model,
    promptDisclosure: verification.assertion.promptDisclosure.mode,
  },
  savedTo: output,
}, null, 2));
