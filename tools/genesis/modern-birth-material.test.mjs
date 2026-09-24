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

test("modern births compose a new person instead of replaying prior birth material", () => {
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-001", slotCount:5 }), 1);
  assert.equal(selectModernBirthSlot({ requestId:"genesis-modern-reference-002", slotCount:5 }), 2);

  const first = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-001", material:material(1) });
  const laterSameWorld = composeModernSubjectIdentity({ requestId:"genesis-modern-reference-006", material:material(1) });
  assert.notEqual(first.femaleName, laterSameWorld.femaleName, "female birth identity was replayed");
  assert.notEqual(first.maleName, laterSameWorld.maleName, "male birth identity was replayed");
  assert.equal(first.birthCity, laterSameWorld.birthCity, "world context should remain reusable without reusing the person");

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


test("modern birth selects one concrete family-compatible phenotype before rendering", () => {
  const appearanceMaterial = {
    ...material(1),
    appearanceContext:"A family envelope spanning medium to deep brown skin, tightly coiled to curly dark hair, brown eyes, and ordinary variation in facial morphology.",
    appearanceLoci:{
      skin:["medium-brown skin", "deep warm-brown skin", "rich deep-brown skin", "medium neutral-brown skin"],
      hair:["dense tightly coiled near-black hair", "short tight dark curls", "dense dark-brown coils", "near-black springy curls"],
      eyes:["deep-brown almond-shaped eyes", "dark-brown round-almond eyes", "medium-brown slightly hooded eyes", "deep-brown gently rounded eyes"],
      face:["slightly long oval face", "balanced oval face", "broader midface with tapered jaw", "softly angular oval face"],
      brows:["dense gently arched brows", "straight full brows", "moderately thick low arches", "softly arched full brows"],
      nose:["medium bridge with broader rounded base", "straight medium-width bridge with rounded tip", "gently curved bridge with moderate base", "shorter bridge with broad rounded tip"],
      mouth:["full balanced lips", "medium-full lips with fuller lower lip", "wide mouth with full lower lip", "defined cupid's bow with full lips"],
      jaw:["moderately defined jaw with rounded chin", "soft jaw with compact rounded chin", "gently tapered jaw with rounded chin", "moderate jaw with broader chin"],
      build:["lean-to-average frame", "compact average frame", "slender frame", "average-to-broad frame"],
    },
  };

  const first = composeModernSubjectIdentity({ requestId:"visual-birth-001", material:appearanceMaterial });
  const replay = composeModernSubjectIdentity({ requestId:"visual-birth-001", material:appearanceMaterial });
  const sibling = composeModernSubjectIdentity({ requestId:"visual-birth-002", material:appearanceMaterial });

  assert.deepEqual(first, replay, "same birth changed inherited appearance");
  assert.match(first.appearanceContext, /^Concrete inherited phenotype selected for this individual:/u);
  assert.match(first.appearanceContext, /Family appearance envelope used only as plausibility evidence:/u);
  assert.notEqual(first.appearanceContext, sibling.appearanceContext, "different births collapsed to one inherited phenotype");
});
