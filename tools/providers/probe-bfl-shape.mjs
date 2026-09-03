import { readFile } from "node:fs/promises";

import {
  inspectBflPollShape,
  inspectBflSubmissionShape,
} from "./bfl-shape-contract.mjs";

const ENDPOINT = "https://api.bfl.ai/v1/flux-2-pro";
const DEFAULT_PROMPT = "Neutral studio photograph of a simple gray geometric sculpture on a plain background.";
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 180;
const TERMINAL = new Set(["Ready", "Error", "Request Moderated", "Content Moderated"]);

function parseArgs(argv) {
  const parsed = { referenceFile: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--reference-file") {
      const path = argv[index + 1];
      if (!path || path.startsWith("--")) throw new TypeError("--reference-file requires a path");
      parsed.referenceFile = path;
      index += 1;
      continue;
    }
    throw new TypeError(`unsupported argument ${value}`);
  }
  return parsed;
}

function requireSecret() {
  const key = process.env.BFL_API_KEY;
  if (typeof key !== "string" || key.trim() === "") throw new TypeError("BFL_API_KEY is required");
  return key;
}

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function responseJson(response) {
  try { return await response.json(); }
  catch { return null; }
}

function emit(label, value) {
  console.log(`${label} ${JSON.stringify(value)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = requireSecret();
  const body = {
    prompt: DEFAULT_PROMPT,
    disable_pup: true,
    width: 1024,
    height: 1024,
    safety_tolerance: 2,
    output_format: "png",
  };
  if (args.referenceFile !== null) {
    body.input_image = base64(await readFile(args.referenceFile));
  }

  console.log(`BFL PROBE endpoint=${ENDPOINT} reference=${args.referenceFile === null ? "none" : "present"}`);
  console.log("BFL PROBE NOTE this creates one real flux-2-pro generation task; no generated image bytes are downloaded or persisted");

  const submission = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  const submissionPayload = await responseJson(submission);
  const submissionShape = inspectBflSubmissionShape({ status: submission.status, payload: submissionPayload });
  emit("SUBMISSION", submissionShape);

  if (!submission.ok) {
    process.exitCode = 1;
    return;
  }
  const pollingUrl = typeof submissionPayload?.polling_url === "string" ? submissionPayload.polling_url : null;
  if (pollingUrl === null) {
    process.exitCode = 2;
    return;
  }

  for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(pollingUrl, {
      method: "GET",
      headers: { accept: "application/json", "x-key": apiKey },
    });
    const payload = await responseJson(response);
    const shape = inspectBflPollShape({ status: response.status, payload });
    if (attempt === 1 || TERMINAL.has(shape.status) || attempt % 10 === 0) {
      emit(`POLL attempt=${attempt}`, shape);
    }
    if (TERMINAL.has(shape.status)) {
      process.exitCode = shape.status === "Ready" ? 0 : 3;
      return;
    }
  }

  console.error(`BFL PROBE timed out after ${MAX_POLLS} polls`);
  process.exitCode = 4;
}

await main();
