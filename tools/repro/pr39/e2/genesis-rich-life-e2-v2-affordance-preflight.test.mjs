import test from "node:test";
import assert from "node:assert/strict";

import { assertPassAHistoryConsistency } from "../services/world-kernel/src/genesis-pass-a-consistency.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import { GENESIS_RICH_COUNTERPART_POLICY_VERSION } from "../services/world-kernel/src/genesis-rich-participation-policy.mjs";
import { buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import { E2_V2_A0_SEEDS } from "./genesis-rich-life-e2-v2-a0.mjs";
import { E2_V2_WORLD_FIXTURE } from "./genesis-rich-life-e2-v2-world.mjs";

test("E2-V2 rich preflight treats participatingRoles as alternatives while legacy all-role semantics remain unchanged", () => {
  const plan = buildE2A0Plan(E2_V2_WORLD_FIXTURE, E2_V2_A0_SEEDS[0]);
  const firstWindow = plan[0];
  const lostItem = firstWindow.offeredEntries.find(
    (entry) => entry.structure.structureId === "ges_v2_lost_small_item",
  );
  assert.ok(lostItem, "frozen E2-V2 seed must retain the offer that exposed the preflight defect");
  assert.deepEqual(lostItem.structure.participatingRoles, ["caregiver", "sibling", "peer"]);
  assert.equal(E2_V2_WORLD_FIXTURE.worldSpec.affordedRoles.includes("sibling"), false);
  assert.equal(E2_V2_WORLD_FIXTURE.worldSpec.affordedRoles.includes("caregiver"), true);
  assert.equal(E2_V2_WORLD_FIXTURE.worldSpec.affordedRoles.includes("peer"), true);

  const richInput = buildRichLifePassAInput({
    originMode: "de_novo",
    syntheticLineageWitness: null,
    worldSpec: E2_V2_WORLD_FIXTURE.worldSpec,
    subject: E2_V2_WORLD_FIXTURE.subject,
    developmentalWindow: firstWindow.developmentalWindow,
    chronologyEndsAt: firstWindow.developmentalWindow.endAt,
    initialRoster: E2_V2_WORLD_FIXTURE.initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: firstWindow.offeredEntries,
  });

  assert.doesNotThrow(() => assertPassAHistoryConsistency(richInput));

  const legacyPolicyInput = structuredClone(richInput);
  legacyPolicyInput.policyWitness.policyVersion = legacyPolicyInput.policyWitness.policyVersion
    .split("+")
    .filter((part) => part !== GENESIS_RICH_COUNTERPART_POLICY_VERSION)
    .join("+");

  assert.throws(
    () => assertPassAHistoryConsistency(legacyPolicyInput),
    (error) => error?.gate === "pass_a_structure_affordance"
      && /requires role sibling/.test(error.message),
  );
});
