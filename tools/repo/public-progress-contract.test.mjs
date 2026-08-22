import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const progress = JSON.parse(readFileSync(new URL("../../docs/state/public-progress.json", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("../../docs/state/public-progress.schema.json", import.meta.url), "utf8"));
const markdown = readFileSync(new URL("../../docs/state/public-progress.md", import.meta.url), "utf8");

const STATUS_IDS = ["achieved", "demonstrated", "in_progress", "not_yet", "preserved_failure"];
const STATUS_SET = new Set(STATUS_IDS);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

test("public progress exposes the stable v1 render contract", () => {
  assert.equal(progress.$schema, "./public-progress.schema.json");
  assert.equal(progress.schemaVersion, "fibre-public-progress-v1");
  assert.equal(progress.canonical, true);
  assert.deepEqual(progress.statusDefinitions.map(({ id }) => id), STATUS_IDS);
  assert.deepEqual(schema.$defs.status.enum, STATUS_IDS);
  assert.ok(schema.properties.$schema, "strict schema must allow the document's $schema pointer");
  assert.match(markdown, /machine-source: public-progress\.json/);
});

test("public capability cards are uniquely identified and always pair claims with limitations", () => {
  const ids = new Set();
  for (const capability of progress.capabilities) {
    assert.match(capability.id, /^[a-z0-9_]+$/);
    assert.equal(ids.has(capability.id), false, `duplicate capability id ${capability.id}`);
    ids.add(capability.id);
    assert.equal(STATUS_SET.has(capability.status), true, `unknown status ${capability.status}`);
    assert.equal(nonEmpty(capability.label), true);
    assert.equal(nonEmpty(capability.statement), true);
    assert.equal(nonEmpty(capability.limitation), true, `${capability.id} must state its important limitation`);
    assert.equal(Array.isArray(capability.evidence), true);
  }
});

test("public population snapshot distinguishes old evidence from unborn replacements", () => {
  const ids = new Set();
  for (const item of progress.population.items) {
    assert.equal(ids.has(item.id), false, `duplicate population id ${item.id}`);
    ids.add(item.id);
    assert.equal(Number.isSafeInteger(item.count) && item.count >= 0, true);
    assert.equal(STATUS_SET.has(item.status), true);
    assert.equal(nonEmpty(item.explanation), true);
  }
  const byId = new Map(progress.population.items.map((item) => [item.id, item]));
  assert.equal(byId.get("older_completed_life_artifacts")?.count, 3);
  assert.equal(byId.get("older_partial_failed_candidate")?.count, 1);
  assert.equal(byId.get("older_never_started_slot")?.count, 1);
  assert.equal(byId.get("replacement_unborn_threads")?.count, 5);
  assert.equal(byId.get("replacement_generated_lives")?.count, 0);
  assert.equal(progress.currentWork.finalLifeCognitionAuthorized, false);
});
