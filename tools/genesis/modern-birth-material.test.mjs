import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  composeModernSubjectIdentity,
  freshModernParticipants,
  selectModernBirthSlot,
} from "./modern-birth-material.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/genesis/pr39/modern-birth-material-v1.json", import.meta.url), "utf8"));
const material = (slot) => fixture.slots.find((item) => item.slot === slot);

function birthMaterial(slot = 1) {
  return {
    ...material(slot),
    languages:["Amharic", "English"],
    raisedLanguages:["Amharic"],
    physicalAncestry:{maternal:[{population:"Ethiopian family",share:1,referencePopulation:"afr_east"}],paternal:[{population:"Ethiopian family",share:1,referencePopulation:"afr_east"}]},
  };
}

test("modern births compose a new person instead of replaying prior birth material", () => {
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-001", slotCount:5 }), 1);
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-002", slotCount:5 }), 2);

  const first = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-001", material:birthMaterial(1) });
  const laterSameWorld = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-006", material:birthMaterial(1) });
  assert.notEqual(first.femaleName, laterSameWorld.femaleName, "female birth identity was replayed");
  assert.notEqual(first.maleName, laterSameWorld.maleName, "male birth identity was replayed");
  assert.equal(first.birthCity, laterSameWorld.birthCity, "world context should remain reusable without reusing the person");
  assert.deepEqual(first.languages, ["Amharic", "English"], "eventual spoken languages were lost");
  assert.deepEqual(first.raisedLanguages, ["Amharic"], "raised languages absorbed later acquisition");

  const templates = [{
    participantId:"caregiver_1",
    factualRoles:["caregiver"],
    relationshipFacts:["Lives with the subject."],
  }];
  const firstParticipants = freshModernParticipants({ requestId:"birth-1", participants:templates });
  const secondParticipants = freshModernParticipants({ requestId:"birth-2", participants:templates });
  assert.notEqual(firstParticipants[0].participantId, secondParticipants[0].participantId, "reused World should not replay the same family member");
  assert.deepEqual(firstParticipants[0].factualRoles, ["caregiver"]);
});


test("modern birth creates a deterministic heritable physical genome before rendering", () => {
  const appearanceMaterial = birthMaterial(1);

  const first = composeModernSubjectIdentity({ requestId:"visual-birth-001", material:appearanceMaterial });
  const replay = composeModernSubjectIdentity({ requestId:"visual-birth-001", material:appearanceMaterial });
  const sibling = composeModernSubjectIdentity({ requestId:"visual-birth-002", material:appearanceMaterial });

  assert.deepEqual(first, replay, "same birth changed inherited appearance");
  assert.equal(first.physicalGenome.version,"physical-genome-v0.1");
  assert.notDeepEqual(first.physicalGenome,sibling.physicalGenome,"different births collapsed to one physical genome");
});
