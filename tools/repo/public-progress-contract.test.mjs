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

function assertTwoLevelClaim(value, label) {
  assert.equal(nonEmpty(value?.simple?.claim), true, `${label} simple claim is required`);
  assert.equal(nonEmpty(value?.simple?.limitation), true, `${label} simple limitation is required`);
  assert.equal(nonEmpty(value?.detail?.claim), true, `${label} detailed claim is required`);
  assert.equal(nonEmpty(value?.detail?.limitation), true, `${label} detailed limitation is required`);
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
  assert.match(markdown, /machine-source: public-progress\.json/);
  assert.match(markdown, /Simple English/);
  assert.match(markdown, /More accurate description/);
});

test("public capability cards always carry simple and accurate claims with limitations", () => {
  const ids = new Set();
  for (const capability of progress.capabilities) {
    assert.match(capability.id, /^[a-z0-9_]+$/);
    assert.equal(ids.has(capability.id), false, `duplicate capability id ${capability.id}`);
    ids.add(capability.id);
    assert.equal(STATUS_SET.has(capability.status), true, `unknown status ${capability.status}`);
    assert.equal(nonEmpty(capability.label), true);
    assertTwoLevelClaim(capability, capability.id);
    assert.equal(Array.isArray(capability.evidence), true);
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

test("public population snapshot distinguishes old evidence from unborn replacements", () => {
  const ids = new Set();
  for (const item of progress.population.items) {
    assert.equal(ids.has(item.id), false, `duplicate population id ${item.id}`);
    ids.add(item.id);
    assert.equal(Number.isSafeInteger(item.count) && item.count >= 0, true);
    assert.equal(STATUS_SET.has(item.status), true);
    assert.equal(nonEmpty(item.simple), true);
    assert.equal(nonEmpty(item.detail), true);
  }
  const byId = new Map(progress.population.items.map((item) => [item.id, item]));
  assert.equal(byId.get("older_completed_life_artifacts")?.count, 3);
  assert.equal(byId.get("older_partial_failed_candidate")?.count, 1);
  assert.equal(byId.get("older_never_started_slot")?.count, 1);
  assert.equal(byId.get("replacement_unborn_threads")?.count, 5);
  assert.equal(byId.get("replacement_generated_lives")?.count, 0);
  assert.equal(progress.currentWork.finalLifeCognitionAuthorized, false);
});
