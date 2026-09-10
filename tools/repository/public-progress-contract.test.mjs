import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const repoRoot = new URL("../../", import.meta.url);
const progress = JSON.parse(readFileSync(new URL("docs/state/public-progress.json", repoRoot), "utf8"));
const schema = JSON.parse(readFileSync(new URL("docs/state/public-progress.schema.json", repoRoot), "utf8"));
const markdown = readFileSync(new URL("docs/state/public-progress.md", repoRoot), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("package.json", repoRoot), "utf8"));

const STATUS_IDS = ["achieved", "demonstrated", "in_progress", "not_yet", "preserved_failure"];
const STATUS_SET = new Set(STATUS_IDS);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertTwoLevelClaim(value, label) {
  assert.equal(nonEmpty(value?.simple?.claim), true, `${label} simple claim is required`);
  assert.equal(nonEmpty(value?.simple?.limitation), true, `${label} simple limitation is required`);
  assert.equal(nonEmpty(value?.detail?.claim), true, `${label} detailed claim is required`);
  assert.equal(nonEmpty(value?.detail?.limitation), true, `${label} detailed limitation is required`);
}

function assertContains(text, expected, label) {
  assert.equal(text.includes(expected), true, `${label}: missing ${JSON.stringify(expected)}`);
}

function assertPattern(text, pattern, label) {
  assert.equal(pattern.test(text), true, `${label}: missing pattern ${pattern}`);
}

function requireItem(items, id, label) {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `${label}: missing ${id}; available=${items.map((candidate) => candidate.id).join(",")}`);
  return item;
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

test("public progress exposes one flattened canonical render contract", () => {
  assert.equal(progress.$schema, "./public-progress.schema.json");
  assert.equal(progress.contract, "fibre-public-progress");
  assert.equal(progress.canonical, true);
  assert.equal("schemaVersion" in progress, false, "public progress should not invent compatibility versions before a real consumer requires them");
  assert.equal(schema.$id, "fibre-public-progress");
  assert.equal(schema.properties.contract.const, "fibre-public-progress");
  assert.deepEqual(progress.statusDefinitions.map(({ id }) => id), STATUS_IDS);
  assert.deepEqual(schema.$defs.status.enum, STATUS_IDS);
  assertContains(markdown, "machine-source: public-progress.json", "public progress markdown");
  assertContains(markdown, "### M2-A — Meet a Thread", "public progress markdown");
  assertContains(
    markdown,
    "Build one Thread whose present life can be seen, entered, interacted with, remembered, and continued.",
    "public progress markdown",
  );
});

test("public capability cards always carry simple and accurate claims with limitations", () => {
  const ids = new Set();
  for (const capability of progress.capabilities) {
    assertPattern(capability.id, /^[a-z0-9_]+$/, `capability id ${capability.id}`);
    assert.equal(ids.has(capability.id), false, `duplicate capability id ${capability.id}`);
    ids.add(capability.id);
    assert.equal(STATUS_SET.has(capability.status), true, `unknown status ${capability.status}`);
    assert.equal(nonEmpty(capability.label), true, `${capability.id} label is required`);
    assertTwoLevelClaim(capability, capability.id);
    assert.equal(Array.isArray(capability.evidence), true, `${capability.id} evidence must be an array`);
  }
});

test("public progress evidence paths resolve in the repository", () => {
  for (const capability of progress.capabilities) {
    for (const evidencePath of capability.evidence) {
      assert.equal(
        existsSync(new URL(evidencePath, repoRoot)),
        true,
        `${capability.id} cites missing evidence path ${evidencePath}`,
      );
    }
  }
});

test("public progress advertises only existing npm scripts", () => {
  const scripts = packageJson.scripts ?? {};
  const advertised = new Set();
  for (const text of stringsIn(progress)) {
    for (const match of text.matchAll(/npm run\s+([a-zA-Z0-9:_-]+)/g)) advertised.add(match[1]);
  }
  for (const script of advertised) {
    assert.equal(Object.hasOwn(scripts, script), true, `public progress advertises missing npm script ${script}`);
  }
});

test("simple progress labels remain plain while precise status ids stay stable", () => {
  const labels = new Map(progress.statusDefinitions.map((item) => [item.id, item.simpleLabel]));
  assert.equal(labels.get("achieved"), "Done");
  assert.equal(labels.get("demonstrated"), "Shown working");
  assert.equal(labels.get("in_progress"), "Working on it");
  assert.equal(labels.get("not_yet"), "Not yet");
  assert.equal(labels.get("preserved_failure"), "Experiment failed — kept as evidence");
});

test("public population snapshot keeps the validated born cohort explicit", () => {
  const ids = new Set();
  for (const item of progress.population.items) {
    assert.equal(ids.has(item.id), false, `duplicate population id ${item.id}`);
    ids.add(item.id);
    assert.equal(Number.isSafeInteger(item.count) && item.count >= 0, true, `${item.id} count must be a non-negative integer`);
    assert.equal(STATUS_SET.has(item.status), true, `${item.id} has unknown status ${item.status}`);
    assert.equal(nonEmpty(item.simple), true, `${item.id} simple description is required`);
    assert.equal(nonEmpty(item.detail), true, `${item.id} detail description is required`);
  }
  const cohort = requireItem(progress.population.items, "validated_born_threads", "public population");
  assert.equal(cohort.count, 5);
  assert.equal(cohort.status, "achieved");
  assert.equal(progress.currentWork.finalLifeCognitionAuthorized, true);
});

test("public progress keeps visual and staging claims narrow", () => {
  const visual = requireItem(progress.capabilities, "canonical_visual_identity_publication", "public capabilities");
  const cloud = requireItem(progress.capabilities, "cloud_staging_runtime", "public capabilities");

  assert.equal(visual.status, "achieved");
  assertPattern(visual.simple.limitation, /not a lived person by itself/i, "visual capability limitation");

  assert.equal(cloud.status, "achieved");
  assertPattern(cloud.simple.claim, /deployed and healthy in staging/i, "cloud capability claim");
  assertContains(
    cloud.detail.claim,
    "ee749e07b58c2580e967c7ed62cda5ddc91021cd",
    "cloud capability deployment source",
  );
  assertPattern(cloud.detail.limitation, /H3-H9.*deferred/i, "cloud capability limitation");
});
