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

function assertTwoLevelText(value, label) {
  assert.equal(nonEmpty(value?.simple), true, `${label} simple text is required`);
  assert.equal(nonEmpty(value?.detail), true, `${label} detail text is required`);
}

function assertTwoLevelClaim(value, label) {
  assert.equal(nonEmpty(value?.simple?.claim), true, `${label} simple claim is required`);
  assert.equal(nonEmpty(value?.simple?.limitation), true, `${label} simple limitation is required`);
  assert.equal(nonEmpty(value?.detail?.claim), true, `${label} detailed claim is required`);
  assert.equal(nonEmpty(value?.detail?.limitation), true, `${label} detailed limitation is required`);
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

test("public progress obeys its canonical two-layer contract", () => {
  assert.equal(progress.$schema, "./public-progress.schema.json");
  assert.equal(progress.contract, "fibre-public-progress");
  assert.equal(progress.canonical, true);
  assert.equal("schemaVersion" in progress, false, "do not invent compatibility versions before a real consumer requires them");
  assert.match(progress.asOf, /^\d{4}-\d{2}-\d{2}$/u, "asOf must be an ISO date");
  assertTwoLevelText(progress.headline, "headline");
  assertTwoLevelText(progress.summary, "summary");
  assert.equal(schema.$id, "fibre-public-progress");
  assert.equal(schema.properties.contract.const, "fibre-public-progress");
  assert.deepEqual(progress.statusDefinitions.map(({ id }) => id), STATUS_IDS);
  assert.deepEqual(schema.$defs.status.enum, STATUS_IDS);
  assert.equal(markdown.includes("machine-source: public-progress.json"), true, "markdown companion must reference its machine source");
  assert.equal(Array.isArray(progress.truthRules) && progress.truthRules.length > 0, true, "truthRules must be non-empty");
});

test("every public capability carries plain-English and accurate claims with explicit limitations and valid evidence", () => {
  const ids = new Set();
  assert.ok(progress.capabilities.length > 0, "capabilities must be non-empty");
  for (const capability of progress.capabilities) {
    assert.match(capability.id, /^[a-z0-9_]+$/u, `capability id ${capability.id}`);
    assert.equal(ids.has(capability.id), false, `duplicate capability id ${capability.id}`);
    ids.add(capability.id);
    assert.equal(STATUS_SET.has(capability.status), true, `unknown status ${capability.status}`);
    assert.equal(nonEmpty(capability.label), true, `${capability.id} label is required`);
    assertTwoLevelClaim(capability, capability.id);
    assert.equal(Array.isArray(capability.evidence) && capability.evidence.length > 0, true, `${capability.id} must cite evidence`);
    for (const evidencePath of capability.evidence) {
      assert.equal(
        existsSync(new URL(evidencePath, repoRoot)),
        true,
        `${capability.id} cites missing evidence path ${evidencePath}`,
      );
    }
  }
});

test("public progress advertises only existing npm scripts and keeps status labels plain", () => {
  const scripts = packageJson.scripts ?? {};
  for (const text of stringsIn(progress)) {
    for (const match of text.matchAll(/npm run\s+([a-zA-Z0-9:_-]+)/gu)) {
      assert.equal(Object.hasOwn(scripts, match[1]), true, `public progress advertises missing npm script ${match[1]}`);
    }
  }
  const labels = new Map(progress.statusDefinitions.map((item) => [item.id, item.simpleLabel]));
  assert.equal(labels.get("achieved"), "Done");
  assert.equal(labels.get("demonstrated"), "Shown working");
  assert.equal(labels.get("in_progress"), "Working on it");
  assert.equal(labels.get("not_yet"), "Not yet");
  assert.equal(labels.get("preserved_failure"), "Experiment failed — kept as evidence");
});

test("public population posture stays explicit and non-negative", () => {
  assertTwoLevelText(progress.population.summary, "population.summary");
  assertTwoLevelText(progress.population.importantNote, "population.importantNote");
  const ids = new Set();
  assert.ok(progress.population.items.length > 0, "population items must be non-empty");
  for (const item of progress.population.items) {
    assert.equal(ids.has(item.id), false, `duplicate population id ${item.id}`);
    ids.add(item.id);
    assert.equal(Number.isSafeInteger(item.count) && item.count >= 0, true, `${item.id} count must be a non-negative integer`);
    assert.equal(STATUS_SET.has(item.status), true, `${item.id} has unknown status ${item.status}`);
    assert.equal(nonEmpty(item.simple), true, `${item.id} simple description is required`);
    assert.equal(nonEmpty(item.detail), true, `${item.id} detail description is required`);
  }
  assert.equal(typeof progress.currentWork.finalLifeCognitionAuthorized, "boolean");
});
