import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FIXTURE_ROOT = join(REPO_ROOT, "fixtures/thread-presentation");

export const DEFAULT_LIVE_FIXTURE = "can-tho";
export const DEFAULT_LIVE_MEDIA_ID = "media_place_market";

export function normalizeLiveFixtureName(value = DEFAULT_LIVE_FIXTURE) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new TypeError("fixture must be a simple fixtures/thread-presentation directory name");
  }
  return value;
}

export function normalizeLiveMediaId(value = DEFAULT_LIVE_MEDIA_ID) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new TypeError("media-id must be a Fibre media identifier");
  }
  return value;
}

export async function loadThreadPresentationLiveTarget({
  fixture = DEFAULT_LIVE_FIXTURE,
  mediaId = DEFAULT_LIVE_MEDIA_ID,
} = {}) {
  const fixtureName = normalizeLiveFixtureName(fixture);
  const targetMediaId = normalizeLiveMediaId(mediaId);
  const fixtureDirectory = join(FIXTURE_ROOT, fixtureName);
  const [presentation, media, provenance] = await Promise.all([
    readFile(join(fixtureDirectory, "presentation.json"), "utf8").then(JSON.parse),
    readFile(join(fixtureDirectory, "media.json"), "utf8").then(JSON.parse),
    readFile(join(fixtureDirectory, "provenance.json"), "utf8").then(JSON.parse),
  ]);
  const bundle = { presentation, media, provenance };
  const mediaAsset = media.assets?.find((candidate) => candidate.mediaId === targetMediaId) ?? null;
  assert.ok(mediaAsset, `fixture ${fixtureName} does not contain media ${targetMediaId}`);

  const memory = presentation.memories?.find((candidate) => candidate.mediaRefs?.includes(targetMediaId)) ?? null;
  const place = presentation.places?.find((candidate) => candidate.mediaRefs?.includes(targetMediaId)) ?? null;
  const label = memory?.title ?? place?.displayName ?? mediaAsset.role ?? targetMediaId;

  return {
    fixtureName,
    fixtureDirectory,
    bundle,
    mediaAsset,
    memory,
    place,
    label,
    threadId: presentation.manifest.threadId,
    presentationId: presentation.manifest.presentationId,
    lifecycleStatus: presentation.manifest.lifecycleStatus,
  };
}

export function parseLiveTargetArgs(argv) {
  const parsed = {
    fixture: DEFAULT_LIVE_FIXTURE,
    mediaId: DEFAULT_LIVE_MEDIA_ID,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (value === "--fixture") {
      if (index + 1 >= argv.length) throw new TypeError("--fixture requires a value");
      parsed.fixture = normalizeLiveFixtureName(argv[++index]);
      continue;
    }
    if (value === "--media-id") {
      if (index + 1 >= argv.length) throw new TypeError("--media-id requires a value");
      parsed.mediaId = normalizeLiveMediaId(argv[++index]);
      continue;
    }
    throw new TypeError(`unknown live asset argument: ${value}`);
  }
  return parsed;
}
