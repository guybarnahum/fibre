import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { composeModernSubjectIdentity, selectModernBirthSlot } from "./modern-birth-material.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/genesis/pr39/modern-birth-material-v1.json", import.meta.url), "utf8"));
const material = (slot) => fixture.slots.find((item) => item.slot === slot);

test("modern births compose a new person instead of replaying a prior subject identity", () => {
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-001", slotCount:5 }), 1);
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-002", slotCount:5 }), 2);

  const first = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-001", material:material(1) });
  const laterSameWorld = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-006", material:material(1) });
  assert.notEqual(first.femaleName, laterSameWorld.femaleName, "female birth identity was replayed");
  assert.notEqual(first.maleName, laterSameWorld.maleName, "male birth identity was replayed");
  assert.equal(first.birthCity, laterSameWorld.birthCity, "world context should remain reusable without reusing the person");
});
