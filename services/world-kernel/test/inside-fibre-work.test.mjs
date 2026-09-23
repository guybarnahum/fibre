// fibre-test-purpose: prove-voluntary-paid-visitor-work-creates-a-durable-commitment-only-when-the-thread-accepts

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openFibreCreditStore } from "../src/fibre-credit-store.mjs";
import { createInsideFibreWorkService } from "../src/inside-fibre-work.mjs";
import { openInsideFibreWorkStore } from "../src/inside-fibre-work-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const AT = "2026-09-23T17:30:00.000Z";
const START = "2026-09-24T17:00:00.000Z";
const END = "2026-09-24T18:00:00.000Z";

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-inside-work-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive:true, force:true });
  }
}

function seedThread(worldStore, threadId, name) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.identity = {
    ...thread.identity,
    name,
    selfDescription:`${name} has an ordinary life outside Inside Fibre.`,
  };
  thread.currentState = {
    needs:[],
    feelings:[],
    selfModel:`I am ${name}.`,
    unresolvedIntentions:[],
  };
  thread.accounts = {
    fibreCredits:25,
    usdAvailable:0,
    modelTokensAvailable:1000,
  };
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt:"2026-09-20T08:00:00.000Z",
    createdBy:"inside-fibre-work-test",
  };
  worldStore.seedThread(thread);
}

function memory(threadId, suffix, meaning) {
  return {
    memoryId:`mem_${threadId}_${suffix}`,
    threadId,
    rememberedMeaning:meaning,
    status:"current",
    accessibility:"accessible",
    retentionState:"retained",
    salience:0.9,
    asOf:"2026-09-22T12:00:00.000Z",
  };
}

test("only voluntary acceptance creates durable Inside Fibre visitor work", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    seedThread(worldStore, "thr_inside_accept", "Ada Vale");
    seedThread(worldStore, "thr_inside_decline", "Ben Vale");

    let workStore = openInsideFibreWorkStore(storage);
    const fibreCreditStore = openFibreCreditStore(storage, { worldReader:worldStore });
    const memories = new Map([
      ["thr_inside_accept", [memory(
        "thr_inside_accept",
        "open",
        "I have enjoyed bounded public-facing work when I could choose the window in advance.",
      )]],
      ["thr_inside_decline", [memory(
        "thr_inside_decline",
        "protect",
        "I have learned to protect already-busy days from optional public-facing commitments.",
      )]],
    ]);

    let sharedExternal = null;
    let modelCalls = 0;
    const modelAdapter = {
      provider:"fixture",
      modelId:"fixture-inside-work",
      async invoke(call) {
        modelCalls += 1;
        assert.equal(call.input.concern.kind, "inside_fibre_work_offer");
        const external = call.input.concern.externalContext;
        assert.deepEqual(external.requiredConstraintsAtWorkWindow, [],
          "ordinary work choice should not invent rigid constraints");
        assert.deepEqual(external.localWorkWindow, {
          timeZone:"America/Phoenix",
          start:{ date:"2026-09-24", time:"10:00", weekday:"Thursday" },
          end:{ date:"2026-09-24", time:"11:00", weekday:"Thursday" },
        }, "work choice should receive the offered window in the Thread's local civil time");
        if (sharedExternal === null) {
          sharedExternal = structuredClone(external);
        } else {
          assert.deepEqual(external, sharedExternal, "the same work offer should reach both Threads");
        }
        const remembered = call.input.developedSelfEvidence.find((item) => item.kind === "memory");
        assert.ok(remembered, "work cognition should receive Thread-owned lived evidence");
        const accepts = remembered.ref.includes("thr_inside_accept");
        return {
          output:{
            result:{
              decision:accepts ? "accept" : "decline",
              reason:accepts
                ? "This bounded window fits the kind of public-facing work I have chosen before."
                : "I do not want to add this optional public-facing commitment.",
            },
            evidenceRefs:[remembered.ref],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{
            provider:"fixture",
            modelId:"fixture-inside-work",
            providerRequestId:call.clientRequestId,
          },
        };
      },
    };

    const livedNowStore = {
      getCurrentSituation() { return null; },
      latestPlan() { return null; },
      listPlans() { return []; },
      getWorldContext() { return { timeZone:"America/Phoenix" }; },
    };
    const identityStore = {
      getCurrentIdentityView(threadId) { return { threadId, assertions:[] }; },
    };
    const semanticStateStore = {
      listCurrentState() { return []; },
    };
    const memoryStore = {
      listCurrentMemories(threadId) { return structuredClone(memories.get(threadId) ?? []); },
    };
    const situatedLifeStore = {
      listCurrentLifeRelations() { return []; },
    };

    const service = createInsideFibreWorkService({
      worldReader:worldStore,
      livedNowStore,
      identityStore,
      semanticStateStore,
      memoryStore,
      situatedLifeStore,
      workStore,
      fibreCreditStore,
      modelAdapter,
    });
    const offer = {
      at:AT,
      startAt:START,
      endAt:END,
      fibreCredits:12,
    };

    const accepted = await service.considerOffer({ threadId:"thr_inside_accept", ...offer });
    const declined = await service.considerOffer({ threadId:"thr_inside_decline", ...offer });

    assert.equal(accepted.decision, "accept", "a Thread should be able to accept visitor work");
    assert.equal(declined.decision, "decline", "a Thread should be able to decline visitor work");
    assert.ok(accepted.commitment, "acceptance should create a work commitment");
    assert.equal(declined.commitment, null, "declining should create no work commitment");
    assert.deepEqual(
      workStore.listCommitments("thr_inside_accept").map((item) => item.commitmentId),
      [accepted.commitment.commitmentId],
      "accepted work should become durable",
    );
    assert.deepEqual(
      workStore.listCommitments("thr_inside_decline"),
      [],
      "declined work should leave no commitment",
    );
    assert.deepEqual(
      accepted.commitment.cognition.evidenceRefs,
      ["mem_thr_inside_accept_open"],
      "the accepted commitment should retain its private cognition witness",
    );
    assert.equal(
      Object.hasOwn(accepted.commitment, "reason"),
      false,
      "private decision rationale should not become the shared work fact",
    );

    const callsBeforeRetry = modelCalls;
    const retried = await service.considerOffer({ threadId:"thr_inside_accept", ...offer });
    assert.equal(retried.alreadyAccepted, true, "accepted work should survive retry");
    assert.equal(modelCalls, callsBeforeRetry, "retry should not ask the Thread to accept twice");
    assert.equal(
      retried.commitment.commitmentId,
      accepted.commitment.commitmentId,
      "retry should return the same commitment",
    );

    workStore.close();
    workStore = openInsideFibreWorkStore(storage);
    assert.equal(
      workStore.getCommitment(accepted.commitment.commitmentId).commitmentId,
      accepted.commitment.commitmentId,
      "accepted work should survive store restart",
    );

    fibreCreditStore.close();
    workStore.close();
    worldStore.close();
  }));


test("work choice distinguishes movable Flight Plan intention from a rigid required constraint", async () =>
  withDatabase(async (databasePath) => {
    const storage = localWorldStateStorage(databasePath);
    const worldStore = openWorldStore(storage);
    seedThread(worldStore, "thr_inside_rigid", "Cara Vale");
    const workStore = openInsideFibreWorkStore(storage);
    const fibreCreditStore = openFibreCreditStore(storage, { worldReader:worldStore });

    const personalPlan = {
      planId:"lplan_personal_overlap",
      kind:"personal",
      horizonStart:"2026-09-24T16:00:00.000Z",
      horizonEnd:"2026-09-24T20:00:00.000Z",
      stops:[{
        startAt:"2026-09-24T16:00:00.000Z",
        endAt:"2026-09-24T20:00:00.000Z",
        activity:"Study at home.",
        purpose:"Make progress on a personally chosen goal.",
      }],
    };
    const requiredCarePlan = {
      planId:"lplan_required_care",
      kind:"care",
      authority:{ constraint:"required" },
      stops:[{
        startAt:"2026-09-24T17:30:00.000Z",
        endAt:"2026-09-24T18:30:00.000Z",
        activity:"Attend a required care appointment.",
        purpose:"Honor a non-movable care requirement.",
      }],
    };

    const service = createInsideFibreWorkService({
      worldReader:worldStore,
      livedNowStore:{
        getCurrentSituation() { return null; },
        latestPlan(_threadId, kind, { at }) {
          if (kind === "personal" && Date.parse(at) >= Date.parse(personalPlan.horizonStart)
            && Date.parse(at) <= Date.parse(personalPlan.horizonEnd)) return personalPlan;
          if (kind === "care"
            && Date.parse(at) >= Date.parse(requiredCarePlan.stops[0].startAt)
            && Date.parse(at) < Date.parse(requiredCarePlan.stops[0].endAt)) return requiredCarePlan;
          return null;
        },
        listPlans(_threadId, { kind }) {
          return kind === "care" ? [requiredCarePlan] : [];
        },
        getWorldContext() { return { timeZone:"America/Phoenix" }; },
      },
      identityStore:{ getCurrentIdentityView(threadId) { return { threadId, assertions:[] }; } },
      semanticStateStore:{ listCurrentState() { return []; } },
      memoryStore:{ listCurrentMemories() { return []; } },
      situatedLifeStore:{ listCurrentLifeRelations() { return []; } },
      workStore,
      fibreCreditStore,
      modelAdapter:{
        provider:"fixture",
        modelId:"fixture-rigid-work-choice",
        async invoke(call) {
          const external = call.input.concern.externalContext;
          assert.equal(external.flightPlanAtWorkWindow.planId, personalPlan.planId,
            "ordinary overlapping intention should remain visible to the Thread");
          assert.deepEqual(external.requiredConstraintsAtWorkWindow, [{
            kind:"required_care",
            startAt:"2026-09-24T17:30:00.000Z",
            endAt:"2026-09-24T18:30:00.000Z",
            activity:"Attend a required care appointment.",
            purpose:"Honor a non-movable care requirement.",
          }], "rigid authority should be presented separately from movable intention");
          return {
            output:{
              result:{
                decision:"decline",
                reason:"I can move the study block, but I cannot take a shift that overlaps the required appointment.",
              },
              evidenceRefs:[],
              conflictingMotives:[],
              uncertainty:null,
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-rigid-work-choice",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });

    const result = await service.considerOffer({
      threadId:"thr_inside_rigid",
      at:AT,
      startAt:START,
      endAt:END,
      fibreCredits:12,
    });
    assert.equal(result.decision, "decline");
    assert.deepEqual(workStore.listCommitments("thr_inside_rigid"), [],
      "a Thread declining because of a rigid constraint should create no work commitment");

    fibreCreditStore.close();
    workStore.close();
    worldStore.close();
  }));
