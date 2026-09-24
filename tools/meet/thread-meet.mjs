import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ENVIRONMENT_URLS = Object.freeze({
  local:"http://localhost:8788",
  staging:"https://api.staging.insidefibre.com",
  production:"https://api.insidefibre.com",
  prod:"https://api.insidefibre.com",
});

async function body(response) {
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.error ?? `HTTP ${response.status}`);
  return value;
}

function meetingBaseUrl({ environment = "staging", baseUrl = null } = {}) {
  if (baseUrl !== null) return String(baseUrl).replace(/\/$/, "");
  const resolved = ENVIRONMENT_URLS[environment];
  if (!resolved) throw new TypeError(`unsupported environment ${environment}`);
  return resolved;
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

function printScene(meeting) {
  const scene = meeting.scene;
  console.log(`Meeting ${meeting.threadId} · ${meeting.situationId}`);
  console.log("Right now:");
  const location = locationText(scene.location);
  if (location) console.log(`  setting: ${location}`);
  if (scene.activity) console.log(`  doing:   ${scene.activity}`);
  if (scene.participants.length > 0) console.log(`  with:    ${scene.participants.join(", ")}`);
  if (scene.establishedAt) console.log(`  since:   ${scene.establishedAt}`);
  if (scene.encounterAvailability?.endAt) {
    console.log(`  available until: ${scene.encounterAvailability.endAt}`);
  }
  console.log("Type :q to leave the meeting without adding another encounter.");
}

export async function listThreads({ environment, baseUrl, fetchImpl = globalThis.fetch } = {}) {
  const api = meetingBaseUrl({ environment, baseUrl });
  return body(await fetchImpl(`${api}/api/threads?limit=50`, { headers:{ Accept:"application/json" } }));
}

function threadLine(thread, index) {
  const present = thread.currentPresent?.payload;
  const name = thread.displayName ?? thread.threadId;
  const place = locationText(present?.location) ?? "location unknown";
  const activity = present?.activity ?? "activity unknown";
  return `${String(index + 1).padStart(2, " ")}. ${name} · ${place} · ${activity}`;
}

async function chooseThread(options) {
  const result = await listThreads(options);
  const threads = Array.isArray(result?.threads) ? result.threads : [];
  if (threads.length === 0) throw new Error("No public Threads are available");
  for (const [index, thread] of threads.entries()) console.log(threadLine(thread, index));

  const terminal = createInterface({ input:process.stdin, output:process.stdout });
  try {
    for (;;) {
      const answer = (await terminal.question("meet> ")).trim();
      if (answer === ":q") return null;
      const index = Number(answer) - 1;
      if (Number.isInteger(index) && index >= 0 && index < threads.length) return threads[index];
      console.log(`Choose 1-${threads.length}, or :q.`);
    }
  } finally {
    terminal.close();
  }
}

export async function openThreadMeeting({
  threadId,
  environment,
  baseUrl,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof threadId !== "string" || threadId.trim() === "") throw new TypeError("threadId is required");
  const selectedThreadId = threadId.trim();
  const encoded = encodeURIComponent(selectedThreadId);
  const api = meetingBaseUrl({ environment, baseUrl });
  const entry = await body(await fetchImpl(`${api}/api/threads/${encoded}/meet`, {
    method:"POST",
    headers:{ Accept:"application/json" },
  }));
  const scene = entry?.livedScene;
  const situationId = scene?.situationId;
  if (typeof situationId !== "string" || situationId === "") throw new Error("Thread has no public lived scene");

  return Object.freeze({
    threadId:selectedThreadId,
    situationId,
    scene:Object.freeze(scene),
    async say(utterance) {
      if (typeof utterance !== "string" || utterance.trim() === "") throw new TypeError("utterance is required");
      const result = await body(await fetchImpl(`${api}/api/threads/${encoded}/encounter`, {
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

async function interactiveMeeting(options) {
  const meeting = await openThreadMeeting(options);
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

function parseArgs(args) {
  const options = { environment:"staging", baseUrl:null, list:false, json:false, threadId:null, utterance:null };
  const words = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--env") options.environment = args[++index];
    else if (arg === "--base-url") options.baseUrl = args[++index];
    else if (arg === "--list") options.list = true;
    else if (arg === "--json") options.json = true;
    else if (options.threadId === null) options.threadId = arg;
    else words.push(arg);
  }
  options.utterance = words.length > 0 ? words.join(" ") : null;
  return options;
}

async function main(args) {
  const options = parseArgs(args);
  if (options.list) {
    if (options.json) {
      console.log(JSON.stringify(await listThreads(options), null, 2));
      return;
    }
    for (;;) {
      const selected = await chooseThread(options);
      if (selected === null) return;
      try {
        await interactiveMeeting({
          ...options,
          threadId:selected.threadId,
        });
        return;
      } catch (error) {
        if (error?.message !== "Thread has no public lived scene") throw error;
        const name = selected.displayName ?? selected.threadId;
        console.log(`${name} is not currently in a published situation. Choose another Thread.\n`);
      }
    }
  }
  if (!options.threadId) {
    throw new Error("usage: npm run thread:meet -- [--env local|staging|production] [--base-url URL] <thread-id> [utterance] | --list [--json]");
  }
  if (options.utterance !== null) {
    const meeting = await openThreadMeeting(options);
    console.log(JSON.stringify(await meeting.say(options.utterance), null, 2));
    return;
  }
  await interactiveMeeting(options);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
