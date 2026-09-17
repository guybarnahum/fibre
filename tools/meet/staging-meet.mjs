import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const BASE_URL = "https://api.staging.insidefibre.com";

async function body(response) {
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? `HTTP ${response.status}`);
  return value;
}

export async function listStagingThreads({ fetchImpl = globalThis.fetch } = {}) {
  return body(await fetchImpl(`${BASE_URL}/api/threads?limit=50`, { headers:{ Accept:"application/json" } }));
}

export async function meetStagingThread({ threadId, utterance, fetchImpl = globalThis.fetch }) {
  if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("threadId is required");
  if (typeof utterance !== "string" || utterance.trim() === "") throw new TypeError("utterance is required");

  const encoded = encodeURIComponent(threadId.trim());
  const snapshot = await body(await fetchImpl(`${BASE_URL}/api/threads/${encoded}/snapshot`, {
    headers:{ Accept:"application/json" },
  }));
  const situationId = snapshot?.currentPresent?.payload?.situationId;
  if (typeof situationId !== "string" || situationId === "") throw new Error("Thread has no published current situation");

  const result = await body(await fetchImpl(`${BASE_URL}/api/threads/${encoded}/encounter`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify({ situationId, utterance:utterance.trim() }),
  }));
  if (result?.situationId !== situationId) throw new Error("Encounter left the published situation");

  return Object.freeze({
    threadId:threadId.trim(),
    situationId,
    responseText:result.responseText ?? null,
  });
}

async function main(args) {
  if (args[0] === "--list") {
    console.log(JSON.stringify(await listStagingThreads(), null, 2));
    return;
  }
  const [threadId, ...words] = args;
  if (!threadId || words.length === 0) {
    throw new Error('usage: npm run meet:staging -- <thread-id> "<utterance>" | --list');
  }
  console.log(JSON.stringify(await meetStagingThread({ threadId, utterance:words.join(" ") }), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
