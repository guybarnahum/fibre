import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const BASE_URL = "https://api.staging.insidefibre.com";

async function body(response) {
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? `HTTP ${response.status}`);
  return value;
}

function placeText(place) {
  if (!place?.displayName) return null;
  return place.region ? `${place.displayName}, ${place.region}` : place.displayName;
}

function locationText(location) {
  if (location?.kind === "place") return placeText(location.place);
  if (location?.kind === "transit") {
    const from = placeText(location.from) ?? "somewhere";
    const to = placeText(location.to) ?? "somewhere";
    return `${from} → ${to} (${Math.round(Number(location.progress ?? 0) * 100)}%)`;
  }
  return null;
}

function publicScene(present) {
  return Object.freeze({
    establishedAt:present.establishedAt ?? null,
    phase:present.phase ?? null,
    location:locationText(present.location),
    activity:present.activity ?? null,
    reason:present.reason ?? null,
    mediatedContext:present.mediatedContext ?? null,
    participants:Object.freeze([...(present.participants ?? [])]),
  });
}

function printScene(meeting) {
  const scene = meeting.scene;
  console.log(`Meeting ${meeting.threadId} · ${meeting.situationId}`);
  console.log("Right now:");
  if (scene.location) console.log(`  setting: ${scene.location}`);
  if (scene.activity) console.log(`  doing:   ${scene.activity}`);
  if (scene.reason) console.log(`  reason:  ${scene.reason}`);
  if (scene.mediatedContext) console.log(`  context: ${scene.mediatedContext}`);
  if (scene.participants.length > 0) console.log(`  with:    ${scene.participants.join(", ")}`);
  if (scene.establishedAt) console.log(`  since:   ${scene.establishedAt}`);
  console.log("Type :q to leave the meeting without adding another encounter.");
}

export async function listStagingThreads({ fetchImpl = globalThis.fetch } = {}) {
  return body(await fetchImpl(`${BASE_URL}/api/threads?limit=50`, { headers:{ Accept:"application/json" } }));
}

export async function openStagingMeeting({ threadId, fetchImpl = globalThis.fetch }) {
  if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("threadId is required");
  const selectedThreadId = threadId.trim();
  const encoded = encodeURIComponent(selectedThreadId);
  const snapshot = await body(await fetchImpl(`${BASE_URL}/api/threads/${encoded}/snapshot`, {
    headers:{ Accept:"application/json" },
  }));
  const present = snapshot?.currentPresent?.payload;
  const situationId = present?.situationId;
  if (typeof situationId !== "string" || situationId === "") throw new Error("Thread has no published current situation");

  return Object.freeze({
    threadId:selectedThreadId,
    situationId,
    scene:publicScene(present),
    async say(utterance) {
      if (typeof utterance !== "string" || utterance.trim() === "") throw new TypeError("utterance is required");
      const result = await body(await fetchImpl(`${BASE_URL}/api/threads/${encoded}/encounter`, {
        method:"POST",
        headers:{ "content-type":"application/json", Accept:"application/json" },
        body:JSON.stringify({ situationId, utterance:utterance.trim() }),
      }));
      if (result?.situationId !== situationId) throw new Error("Encounter left the published situation");
      return Object.freeze({
        threadId:selectedThreadId,
        situationId,
        responseText:result.responseText ?? null,
      });
    },
  });
}

export async function meetStagingThread({ threadId, utterance, fetchImpl = globalThis.fetch }) {
  return (await openStagingMeeting({ threadId, fetchImpl })).say(utterance);
}

async function interactiveMeeting(threadId) {
  const meeting = await openStagingMeeting({ threadId });
  const terminal = createInterface({ input:process.stdin, output:process.stdout });
  printScene(meeting);
  try {
    for (;;) {
      let utterance;
      try { utterance = (await terminal.question("you> ")).trim(); }
      catch { break; }
      if (utterance === "") continue;
      if (utterance === ":q") break;
      const result = await meeting.say(utterance);
      console.log(`thread> ${result.responseText ?? ""}`);
    }
  } finally {
    terminal.close();
  }
}

async function main(args) {
  if (args[0] === "--list") {
    console.log(JSON.stringify(await listStagingThreads(), null, 2));
    return;
  }
  const [threadId, ...words] = args;
  if (!threadId) throw new Error("usage: node tools/meet/staging-meet.mjs <thread-id> [utterance] | --list");
  if (words.length > 0) {
    console.log(JSON.stringify(await meetStagingThread({ threadId, utterance:words.join(" ") }), null, 2));
    return;
  }
  await interactiveMeeting(threadId);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
