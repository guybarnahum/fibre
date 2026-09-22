import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { createLivedNowService, LivedNowCoverageError } from "../src/lived-now-service.mjs";
import { livedPlanId, livedSituationId } from "../src/lived-now.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import {
  lifeRelationId,
  placeEpisodeId,
} from "../src/situated-life-domain.mjs";
import {
  lifeRelationRevisionRef,
  placeEpisodeRevisionRef,
} from "../src/situated-life-evidence.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-ensure-lived-now-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function seedLife(databasePath) {
  const thread = structuredClone(mina);
  thread.threadId = "thr_ensure_maya";
  thread.identity = {
    ...thread.identity,
    name: "Maya Vale",
    selfDescription: "I like drawing animals and following through on plans I chose.",
  };
  thread.currentState = {
    ...thread.currentState,
    selfModel: "I notice details, make plans, and care about having enough time to finish what I start.",
    unresolvedIntentions: ["Return my library book after I finish drawing."],
  };
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-09-10T04:00:00Z",
    createdBy: "ensure-lived-now-test",
  };

  const world = openWorldStore(localWorldStateStorage(databasePath));
  const seeded = world.seedThread(thread).thread;
  const sourceEvent = world.listEvents(thread.threadId)[0].eventId;
  world.close();

  const situated = openSituatedLifeStore(localWorldStateStorage(databasePath));
  const place = (label, displayName) => {
    const record = situated.recordPlaceEpisode({
      episodeId: placeEpisodeId({ threadId: thread.threadId, label }),
      revision: 1,
      threadId: thread.threadId,
      episodeKind: label === "home" ? "residence" : "formative_presence",
      place: {
        placeId: `place.ensure.${label}`,
        displayName,
        countryCode: "US",
        region: "Arizona",
        locality: "Tucson",
        precision: "locality",
      },
      startAt: "2025-01-01T00:00:00Z",
      endAt: null,
      sourceReferences: [sourceEvent],
      visibility: "private",
      provenance: "thread_history",
      recordedAt: "2026-09-10T04:01:00Z",
    });
    return placeEpisodeRevisionRef(record);
  };
  const homeRef = place("home", "Home");
  const libraryRef = place("library", "Neighborhood library");

  const parent = situated.recordLifeRelation({
    relationId: lifeRelationId({ threadId: thread.threadId, parent: "mother" }),
    revision: 1,
    threadId: thread.threadId,
    relatedParty: {
      partyId: "human_maya_mother",
      kind: "human_source",
      displayName: "Maya's mother",
    },
    relationKind: "social_parent",
    geneticContributionRole: "none",
    relationshipFacts: ["She coordinates Maya's household care and appointments."],
    sourceReferences: [sourceEvent],
    validFrom: "2016-02-08T00:00:00Z",
    validTo: null,
    visibility: "private",
    provenance: "thread_history",
    recordedAt: "2026-09-10T04:02:00Z",
  });
  situated.close();

  return {
    thread: seeded,
    sourceEvent,
    homeRef,
    libraryRef,
    parentRef: lifeRelationRevisionRef(parent),
  };
}

function personalPlan(life) {
  const authoredAt = "2026-09-10T05:00:00Z";
  return {
    planId: livedPlanId({ threadId: life.thread.threadId, kind: "personal", authoredAt }),
    kind: "personal",
    subjectThreadId: life.thread.threadId,
    owner: { partyId: life.thread.threadId, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T06:30:00Z",
    stops: [
      {
        startAt: "2026-09-10T05:00:00Z",
        endAt: "2026-09-10T05:15:00Z",
        physicalPlaceRef: life.homeRef,
        mediatedContext: null,
        activity: "Finish a fox sketch before leaving.",
        purpose: "I want to finish the expression while I still see what is wrong with it.",
        companionRefs: [],
        travelFromPrevious: null,
      },
      {
        startAt: "2026-09-10T05:30:00Z",
        endAt: "2026-09-10T06:30:00Z",
        physicalPlaceRef: life.libraryRef,
        mediatedContext: null,
        activity: "Return a book and look through animal drawing references.",
        purpose: "I want another look at how animals hold their ears and faces.",
        companionRefs: [],
        travelFromPrevious: "Walk to the neighborhood library.",
      },
    ],
    sourceReferences: [life.sourceEvent, life.homeRef, life.libraryRef],
    cognition: {
      provider: "fixture",
      modelId: "fixture-plan",
      providerRequestId: "req_ensure_personal",
    },
  };
}

function requiredCarePlan(life) {
  const authoredAt = "2026-09-10T05:25:00Z";
  return {
    planId: livedPlanId({ threadId: life.thread.threadId, kind: "care", authoredAt }),
    kind: "care",
    subjectThreadId: life.thread.threadId,
    owner: { partyId: "human_maya_mother", kind: "human_source" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T06:00:00Z",
    stops: [
      {
        startAt: "2026-09-10T05:30:00Z",
        endAt: "2026-09-10T06:00:00Z",
        physicalPlaceRef: life.homeRef,
        mediatedContext: null,
        activity: "Stay home and get ready for the dental appointment.",
        purpose: "Leave enough time for the household to reach the appointment.",
        companionRefs: ["human_maya_mother"],
        travelFromPrevious: null,
      },
    ],
    sourceReferences: [life.parentRef, life.homeRef],
    authority: {
      relationRef: life.parentRef,
      scope: "Same-day household care and appointment coordination.",
      constraint: "required",
    },
  };
}

test("N1 ensure-LivedNow advances the Thread from its own plans and preserves care authority", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));

    const service = createLivedNowService({ livedNowStore: lived });
    const moving = await service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:20:00Z",
    });
    assert.equal(moving.phase, "in_transit", "LivedNow should enact movement already implied by the Thread's plan");
    assert.equal(moving.location.fromPlaceRef, life.homeRef);
    assert.equal(moving.location.toPlaceRef, life.libraryRef);
    assert.ok(moving.location.progress > 0 && moving.location.progress < 1);

    lived.recordPlan(requiredCarePlan(life));
    const constrained = await service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:45:00Z",
    });
    assert.equal(constrained.resolution.kind, "care_constraint", "required care should govern enacted life without replacing personal will");
    assert.equal(constrained.location.placeRef, life.homeRef);
    assert.equal(constrained.resolution.observedDivergence, false);
    assert.match(constrained.activity, /dental appointment/);

    const retry = await service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:45:00Z",
    });
    assert.deepEqual(retry, constrained, "ensuring the same present should be idempotent");

    await assert.rejects(() => service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:50:00Z",
      activity: "Talk to the visitor instead.",
    }), /activity is not allowed/, "the caller must not author the Thread's scene");

    lived.close();
  }));

test("a real LivedNow transition can become current interior state exactly once", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const storage = localWorldStateStorage(databasePath);
    const lived = openLivedNowStore(storage);
    const world = openWorldStore(storage);
    const semantic = openSemanticStateStore(storage);
    lived.recordPlan(personalPlan(life));

    let interoceptionCalls = 0;
    const service = createLivedNowService({
      livedNowStore:lived,
      worldStore:world,
      semanticStateStore:semantic,
      modelAdapter:{
        async invoke(call) {
          assert.ok(call.input?.interoception, "only grounded interoception should wake cognition");
          interoceptionCalls += 1;
          return {
            output:{
              states:[{
                domain:"emotion",
                dimension:"felt_state",
                state:"I feel a small sense of arrival now that I am where I meant to be.",
              }],
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-lived-now-interoception",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });

    await service.ensure({
      threadId:life.thread.threadId,
      at:"2026-09-10T05:20:00Z",
    });
    assert.equal(interoceptionCalls, 0, "initial observation should not invent a transition");

    const arrived = await service.ensure({
      threadId:life.thread.threadId,
      at:"2026-09-10T05:30:00Z",
    });
    assert.equal(arrived.location.placeRef, life.libraryRef);
    assert.equal(interoceptionCalls, 1, "arrival should earn one grounded interior interpretation");

    const states = semantic.listCurrentState(life.thread.threadId);
    assert.equal(states.length, 1, "grounded arrival may become current semantic state");
    assert.match(states[0].state, /where I meant to be/u);

    await service.ensure({
      threadId:life.thread.threadId,
      at:"2026-09-10T05:30:00Z",
    });
    assert.equal(interoceptionCalls, 1, "retrying the same present must not rethink it");

    semantic.close();
    world.close();
    lived.close();
  }));

test("N1 refuses to present a stale scene when elapsed life has no plan coverage", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));

    const service = createLivedNowService({ livedNowStore: lived });
    const anchor = await service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:10:00Z",
    });

    await assert.rejects(() => service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-13T05:10:00Z",
    }), LivedNowCoverageError, "dormant gaps must wait for retrospective catch-up rather than reuse stale life");

    assert.deepEqual(
      lived.getCurrentSituation(life.thread.threadId),
      anchor,
      "failed reconciliation must not manufacture a replacement present",
    );
    lived.close();
  }));


test("N2 restores a multi-day dormant Thread with historically honest bounded catch-up", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const storage = localWorldStateStorage(databasePath);
    const lived = openLivedNowStore(storage);
    const initialPlan = lived.recordPlan(personalPlan(life));

    const world = openWorldStore(storage);
    const identity = openIdentityStore(storage);
    const semantic = openSemanticStateStore(storage);
    const memory = openAutobiographicalMemoryStore(storage);
    const situated = openSituatedLifeStore(storage);
    let invocations = 0;
    const modelAdapter = {
      async invoke(input) {
        invocations += 1;
        if (input.input?.interoception) {
          return {
            output:{ states:[] },
            provenance:{
              provider:"fixture",
              modelId:"fixture-continuity-interoception",
              providerRequestId:input.clientRequestId,
            },
          };
        }
        const context = input.input.concern.externalContext;
        const placeRef = context.startingPlaceRef ?? context.availablePlaces[0].ref;
        return {
          output: {
            result: {
              stops: [{
                startAt: context.horizon.startAt,
                endAt: context.horizon.endAt,
                physicalPlaceRef: placeRef,
                presenceMode: "physical",
                mediatedContext: "",
                activity: "Continue ordinary life from the place already reached.",
                purpose: "Carry forward existing intentions without inventing a visitor or exceptional event.",
                travelFromPrevious: "",
              }],
            },
            evidenceRefs: [],
            conflictingMotives: [],
            uncertainty: null,
          },
          provenance: {
            provider: "fixture",
            modelId: "fixture-continuity-plan",
            providerRequestId: input.clientRequestId,
          },
        };
      },
    };

    const service = createLivedNowService({
      livedNowStore: lived,
      worldStore: world,
      identityStore: identity,
      semanticStateStore: semantic,
      memoryStore: memory,
      situatedLifeStore: situated,
      modelAdapter,
    });
    const anchor = await service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:10:00Z",
    });
    assert.equal(anchor.location.placeRef, life.homeRef);

    const targetAt = "2026-09-13T05:10:00Z";
    const current = await service.ensure({
      threadId: life.thread.threadId,
      at: targetAt,
    });

    assert.equal(current.establishedAt, targetAt);
    assert.equal(current.location.placeRef, life.libraryRef, "catch-up should continue from the last place actually reached");
    assert.equal(current.materialization, undefined, "the requested present is current rather than retrospectively backdated");

    const plans = lived.listPlans(life.thread.threadId, { kind: "personal" });
    const retrospective = plans.filter((plan) => plan.materialization?.mode === "retrospective");
    assert.equal(retrospective.length, 3, "a three-day gap should be reconstructed sparsely rather than minute by minute");
    assert.ok(retrospective.length <= 4, "dormant reconciliation must remain bounded");
    assert.ok(retrospective.every((plan) => plan.materialization.materializedAt === targetAt));
    assert.ok(retrospective.every((plan) =>
      Date.parse(plan.materialization.materializedAt) >= Date.parse(plan.horizonEnd)));
    assert.equal(retrospective[0].stops[0].physicalPlaceRef, life.libraryRef, "retrospective planning must not teleport from the prior lived boundary");

    const fresh = plans.find((plan) =>
      plan.authoredAt === targetAt &&
      plan.materialization === undefined &&
      Date.parse(plan.horizonEnd) > Date.parse(targetAt));
    assert.ok(fresh, "catch-up should leave a forward Flight Plan, not only a reconstructed past");
    assert.deepEqual(current.sourcePlanRefs, [fresh.planId]);

    const historicalBoundaries = [
      {
        at: initialPlan.horizonEnd,
        governingPlanRef: initialPlan.planId,
      },
      ...retrospective.slice(0, -1).map((plan) => ({
        at: plan.horizonEnd,
        governingPlanRef: plan.planId,
      })),
    ];
    const historicalSituations = historicalBoundaries.map(({ at, governingPlanRef }) =>
      lived.getSituation(livedSituationId({
        kind: "retrospective_lived_now_v1",
        threadId: life.thread.threadId,
        at,
        governingPlanRef,
        materializedAt: targetAt,
      })));
    assert.ok(historicalSituations.length >= 2);
    assert.ok(historicalSituations.every((situation) =>
      situation.materialization?.mode === "retrospective" &&
      situation.materialization.materializedAt === targetAt &&
      Date.parse(situation.establishedAt) < Date.parse(targetAt)));

    const callsAfterCatchUp = invocations;
    const retry = await service.ensure({
      threadId: life.thread.threadId,
      at: targetAt,
    });
    assert.deepEqual(retry, current, "reconciling the same present should be idempotent");
    assert.equal(invocations, callsAfterCatchUp, "retry must not regenerate elapsed life");

    situated.close();
    memory.close();
    semantic.close();
    identity.close();
    world.close();
    lived.close();
  }));
