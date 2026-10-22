import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createLocalInfraDriver } from "#infra/providers/local";

import { openWorldStore } from "../src/persistence.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { createLivedNowService, LivedNowCoverageError,planningLocalityForPlace } from "../src/lived-now-service.mjs";
import { auditLivedContinuity,createLivedBoundaryProcess,nextLivedBoundary } from "../src/lived-now-boundary.mjs";
import { createWorldReconciliationProcess,createWorldReconciliationRuntime } from "../src/world-reconciliation-process.mjs";
import { livedPlanId, livedSituationId, plannedPositionAt } from "../src/lived-now.mjs";
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

    const earned=[];
    const service = createLivedNowService({
      livedNowStore:lived,
      onSituationEnacted:(situation)=>earned.push(situation.situationId),
    });
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
    const refreshed=await service.ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:46:00Z",
    });
    assert.equal(refreshed.location.placeRef,constrained.location.placeRef,
      "same ordinary scene should remain the present");
    assert.deepEqual(earned,[moving.situationId,constrained.situationId],
      "World opportunities must follow genuine scene transitions, not refreshed timestamps");

    await assert.rejects(() => service.ensure({
      threadId: life.thread.threadId,
      at: "2026-09-10T05:50:00Z",
      activity: "Talk to the visitor instead.",
    }), /activity is not allowed/, "the caller must not author the Thread's scene");

    lived.close();
  }));

test("World enacts sleep and waking from Thread-owned plan facts, not activity wording",async()=>
  withDatabase(async(databasePath)=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    const plan=personalPlan(life);
    plan.stops[0].activity="Sleep.";
    plan.stops[0].wakefulness="asleep";
    plan.stops[1].wakefulness="awake";
    lived.recordPlan(plan);
    const service=createLivedNowService({livedNowStore:lived});
    const asleep=await service.ensure({threadId:life.thread.threadId,at:"2026-09-10T05:10:00Z"});
    assert.equal(asleep.wakefulness,"asleep","actual planned sleep must be enacted");
    const awake=await service.ensure({threadId:life.thread.threadId,at:"2026-09-10T05:35:00Z"});
    assert.equal(awake.wakefulness,"awake","later waking activity must replace sleep");

    const legacy=personalPlan(life);
    legacy.stops[0].activity="Sleep.";
    assert.equal(plannedPositionAt(legacy,"2026-09-10T05:10:00Z").wakefulness,"unknown",
    "historic plans without structured sleep must remain unknown");
    lived.close();
  }));

test("N6.3b keeps the displayed scene valid when enacted life frustrates the Flight Plan", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));
    const service = createLivedNowService({ livedNowStore:lived });

    const displayed = await service.ensure({
      threadId:life.thread.threadId,
      at:"2026-09-10T05:10:00Z",
    });
    const delayed = lived.enactCurrentSituation({
      threadId:life.thread.threadId,
      situationId:livedSituationId({
        kind:"n6_plan_frustrated",
        threadId:life.thread.threadId,
        at:"2026-09-10T05:20:00Z",
      }),
      establishedAt:"2026-09-10T05:20:00Z",
      observation:{
        phase:"at_place",
        location:{ kind:"place", placeRef:life.homeRef },
        mediatedContext:null,
        activity:displayed.activity,
        reason:"World evidence shows Maya is still finishing the fox sketch after the planned departure.",
        participantRefs:[],
        evidenceRefs:[life.sourceEvent],
      },
    });
    assert.equal(delayed.resolution.observedDivergence, true,
      "frustrated plan should remain visible as actual-life divergence");

    const validation = await service.validateDisplayedSituation({
      threadId:life.thread.threadId,
      situationId:displayed.situationId,
      at:"2026-09-10T05:21:00Z",
    });

    assert.equal(validation.applies, true,
      "actual continued life should outrank the Flight Plan");
    assert.equal(validation.currentSituation.situationId, delayed.situationId,
      "scene validation should not replace established actual life");
    assert.deepEqual(lived.getCurrentSituation(life.thread.threadId), delayed,
      "scene validation should not re-author established reality");

    lived.close();
  }));

test("N6.3b rejects the displayed scene after World enacts materially different life", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));
    const service = createLivedNowService({ livedNowStore:lived });

    const displayed = await service.ensure({
      threadId:life.thread.threadId,
      at:"2026-09-10T05:10:00Z",
    });
    const validation = await service.validateDisplayedSituation({
      threadId:life.thread.threadId,
      situationId:displayed.situationId,
      at:"2026-09-10T05:20:00Z",
    });

    assert.equal(validation.applies, false,
      "visitor must not remain in a scene after actual life changed");
    assert.equal(validation.currentSituation.phase, "in_transit",
      "World reconciliation should establish actual life before rejecting the scene");
    assert.notEqual(validation.currentSituation.situationId, displayed.situationId,
      "changed actual life should have its own situation witness");

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
                dimension:"contentment",
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

test("a rejected instantaneous journey is reconsidered by its Thread before World schedules life",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const lived=openLivedNowStore(storage);
    const world=openWorldStore(storage);
    const identity=openIdentityStore(storage);
    const semantic=openSemanticStateStore(storage);
    const memory=openAutobiographicalMemoryStore(storage);
    const situated=openSituatedLifeStore(storage);
    let calls=0;
    const requestIds=[];
    const at="2026-09-10T05:10:00Z";
    try{
      const service=createLivedNowService({
        livedNowStore:lived,worldStore:world,identityStore:identity,
        semanticStateStore:semantic,memoryStore:memory,situatedLifeStore:situated,
        modelAdapter:{async invoke(request){
          if(request.input?.interoception)return {
            output:{states:[]},
            provenance:{provider:"fixture",modelId:"fixture-regulation"},
          };
          calls++;
          requestIds.push(request.clientRequestId);
          const context=request.input.concern.externalContext;
          assert.equal(context.planningRejection===undefined,calls===1,
            "travel reconsideration did not carry World rejection evidence");
          if(calls===2)assert.ok(typeof context.planningRejection==="string"
            &&context.planningRejection.length>0,
            "the Thread did not receive a travel rejection reason");
          const from=context.startingPlaceRef;
          const to=from===life.homeRef?life.libraryRef:life.homeRef;
          assert.ok(context.availablePlaces.some(place=>place.ref===to),
            "the alternative destination must be World-grounded");
          const base={
            presenceMode:"physical",wakefulness:"awake",mediatedContext:"",
            activity:"Read quietly",purpose:"Continue an ordinary morning",
          };
          return {
            output:{
              result:{stops:[
                {...base,startAt:context.horizon.startAt,endAt:"2026-09-10T05:35:00Z",
                  physicalPlaceRef:from,travelFromPrevious:""},
                {...base,startAt:calls===1?"2026-09-10T05:35:00Z":"2026-09-10T05:50:00Z",
                  endAt:context.horizon.endAt,physicalPlaceRef:to,
                  travelFromPrevious:"Walk to the library"},
              ]},
              evidenceRefs:[],conflictingMotives:[],uncertainty:null,
            },
            provenance:{provider:"fixture",modelId:"fixture-lived-planning",
              providerRequestId:request.clientRequestId},
          };
        }},
        onSituationResolved(current){
          lived.scheduleNextLivedBoundary({
            threadId:current.threadId,situationId:current.situationId,
            dueAt:nextLivedBoundary(lived,current),
          });
        },
      });
      const current=await service.ensure({threadId:life.thread.threadId,at});
      const plans=lived.listPlans(life.thread.threadId,{kind:"personal"});
      assert.equal(calls,2,"a rejected journey was not reconsidered exactly once");
      assert.notEqual(requestIds[0],requestIds[1],
        "reconsideration reused the rejected cognition request");
      assert.equal(plans.length,1,"an inadmissible journey entered World history");
      assert.equal(current.location.placeRef,plans[0].stops[0].physicalPlaceRef,
        "World enacted the proposed destination before travel");
      assert.equal(plannedPositionAt(plans[0],"2026-09-10T05:40:00Z").kind,
        "in_transit","the renewed journey still has no real transit interval");
      assert.equal(Date.parse(lived.inspectLivedBoundary(life.thread.threadId)?.dueAt??""),
        Date.parse(plans[0].stops[0].endAt),
        "the admitted life was not scheduled to continue");
    }finally{
      situated.close();memory.close();semantic.close();identity.close();
      world.close();lived.close();
    }
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
                wakefulness:"awake",
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


test("a month without World wakes leaves an honest gap and resumes from the last witnessed place",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const lived=openLivedNowStore(storage);
    lived.recordPlan(personalPlan(life));
    const world=openWorldStore(storage);
    const identity=openIdentityStore(storage);
    const semantic=openSemanticStateStore(storage);
    const memory=openAutobiographicalMemoryStore(storage);
    const situated=openSituatedLifeStore(storage);
    let planningCalls=0;
    let unobservedSince=null;
    const service=createLivedNowService({
      livedNowStore:lived,worldStore:world,identityStore:identity,
      semanticStateStore:semantic,memoryStore:memory,situatedLifeStore:situated,
      modelAdapter:{async invoke(input){
        if(input.input?.interoception){
          return {output:{states:[]},provenance:{provider:"fixture",modelId:"gap-regulation",
            providerRequestId:input.clientRequestId}};
        }
        planningCalls++;
        const context=input.input.concern.externalContext;
        unobservedSince=context.unobservedSince??null;
        return {
          output:{result:{stops:[{
            startAt:context.horizon.startAt,endAt:context.horizon.endAt,
            physicalPlaceRef:context.startingPlaceRef,
            presenceMode:"physical",wakefulness:"awake",mediatedContext:"",
            activity:"Resume ordinary activities.",purpose:"Continue my chosen life.",
            travelFromPrevious:"",
          }]},evidenceRefs:[],conflictingMotives:[],uncertainty:null},
          provenance:{provider:"fixture",modelId:"gap-renewal",
            providerRequestId:input.clientRequestId},
        };
      }},
    });
    try{
      await service.ensure({threadId:life.thread.threadId,at:"2026-09-10T05:10:00Z"});
      const resumedAt="2026-10-21T05:10:00Z";
      const current=await service.ensure({threadId:life.thread.threadId,at:resumedAt});
      const plans=lived.listPlans(life.thread.threadId,{kind:"personal"});
      assert.equal(current.establishedAt,resumedAt,"World failed to resume the present");
      assert.equal(current.location.placeRef,life.homeRef,
        "World invented a destination during an unwitnessed month");
      assert.equal(plans.filter(plan=>plan.materialization?.mode==="retrospective").length,0,
        "World invented an unwitnessed month of biography");
      assert.equal(planningCalls,1,"one recovery required more than one new personal plan");
      assert.equal(unobservedSince,"2026-09-10T05:10:00Z",
        "the Thread was not told that its intervening life is unobserved");
      assert.ok(plans.some(plan=>plan.authoredAt===resumedAt
        &&plan.materialization===undefined),
        "a recovered Thread has no new self-authored future");
    }finally{
      situated.close();memory.close();semantic.close();identity.close();world.close();lived.close();
    }
  }));

test("a slightly delayed horizon alarm renews forward life without inventing retrospective intentions",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const lived=openLivedNowStore(storage);
    const world=openWorldStore(storage);
    const identity=openIdentityStore(storage);
    const semantic=openSemanticStateStore(storage);
    const memory=openAutobiographicalMemoryStore(storage);
    const situated=openSituatedLifeStore(storage);
    try{
      const initial=lived.recordPlan(personalPlan(life));
      let planningCalls=0;
      const service=createLivedNowService({
        livedNowStore:lived,worldStore:world,identityStore:identity,
        semanticStateStore:semantic,memoryStore:memory,situatedLifeStore:situated,
        modelAdapter:{
          async invoke(input){
            if(input.input?.concern?.kind==="lived_planning"){
              planningCalls++;
              const {horizon,startingPlaceRef}=input.input.concern.externalContext;
              return {
                output:{result:{stops:[{
                  startAt:horizon.startAt,endAt:horizon.endAt,
                  physicalPlaceRef:startingPlaceRef,presenceMode:"physical",
                  mediatedContext:"",wakefulness:"awake",
                  activity:"Continue reading at the library.",
                  purpose:"Follow my existing interest without inventing an elapsed journey.",
                  travelFromPrevious:"",
                }]},evidenceRefs:[],conflictingMotives:[],uncertainty:null},
                provenance:{provider:"fixture",modelId:"boundary-forward-renewal",
                  providerRequestId:input.clientRequestId},
              };
            }
            if(input.input?.interoception){
              return {output:{states:[]},provenance:{
                provider:"fixture",modelId:"boundary-interoception",
                providerRequestId:input.clientRequestId,
              }};
            }
            throw new Error("unexpected cognition at lived boundary");
          },
        },
      });
      await service.ensure({threadId:life.thread.threadId,at:"2026-09-10T05:10:00Z"});
      const delayedAt="2026-09-10T06:30:12.000Z";
      const renewed=await service.ensure({threadId:life.thread.threadId,at:delayedAt});
      assert.equal(renewed.location.placeRef,life.libraryRef,
        "minor alarm latency broke continuity with the last reached place");
      assert.equal(planningCalls,1,"minor alarm latency caused duplicate retrospective planning");
      const plans=lived.listPlans(life.thread.threadId,{kind:"personal"});
      assert.equal(plans.length,2,"minor alarm latency invented an extra lived biography");
      assert.ok(plans.every(plan=>plan.materialization===undefined),
        "a short delivery lag became an invented retrospective Flight Plan");
      assert.equal(plans[0].planId,initial.planId,"earlier Thread will was replaced");
      const boundary=lived.getSituation(livedSituationId({
        kind:"retrospective_lived_now_v1",
        threadId:life.thread.threadId,
        at:initial.horizonEnd,
        governingPlanRef:initial.planId,
        materializedAt:delayedAt,
      }));
      assert.equal(boundary.location.placeRef,life.libraryRef,
        "final admitted place was not preserved at the true horizon boundary");
      const repeat=await service.ensure({threadId:life.thread.threadId,at:delayedAt});
      assert.deepEqual(repeat,renewed,"repeated boundary reconciliation rewrote life");
      assert.equal(planningCalls,1,"repeated boundary reconciliation consumed cognition");
    }finally{
      situated.close();memory.close();semantic.close();identity.close();world.close();lived.close();
    }
  }));

test("E7.5 admitted Flight Plan boundaries advance life without polling",async()=>
  withDatabase(async(databasePath)=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));
    const enacted=[];
    const livedNow=createLivedNowService({
      livedNowStore:lived,
      onSituationEnacted:(situation)=>enacted.push(situation.phase),
      onSituationResolved:(situation)=>{
        lived.scheduleNextLivedBoundary({
          threadId:situation.threadId,situationId:situation.situationId,
          dueAt:nextLivedBoundary(lived,situation),
        });
      },
    });
    const at="2026-09-10T05:05:00Z";
    const initial=await livedNow.ensure({threadId:life.thread.threadId,at});
    assert.equal(initial.phase,"at_place");
    assert.equal(lived.nextLivedBoundaryAt(),"2026-09-10T05:15:00.000Z");
    assert.deepEqual(await livedNow.ensure({threadId:life.thread.threadId,at}),initial);
    const boundary=createLivedBoundaryProcess({
      livedNowStore:lived,livedNow,now:()=>"2026-09-10T05:15:00.000Z",
    });
    const advanced=await boundary.runOnce();
    assert.equal(advanced.failed,0,"Flight Plan advancement failed");
    assert.equal(advanced.attempted,1,"World advanced too many lives");
    assert.equal(lived.getCurrentSituation(life.thread.threadId).phase,"in_transit",
      "World did not enact the planned departure");
    assert.equal(advanced.nextDueAt,"2026-09-10T05:30:00.000Z",
      "World did not schedule the next arrival");
    assert.deepEqual(enacted,["at_place","in_transit"]);
    assert.equal((await boundary.runOnce()).attempted,0,
      "same Flight Plan boundary was replayed");
    lived.close();
  }));

test("an interrupted World's overdue life debt is paced, not awakened in a burst",async()=>{
  const at="2026-10-22T04:10:00Z";
  let ensured=0;
  const process=createLivedBoundaryProcess({
    livedNowStore:{
      listDueLivedBoundaries:()=>[{
        threadId:"thr_first",situationId:"sit_first",dueAt:"2026-09-25T04:00:00Z",
      }],
      nextLivedBoundaryAt:()=>"2026-09-25T04:15:00Z",
      settleLivedBoundary:()=>true,
      failLivedBoundary:()=>{throw new Error("unexpected failure");},
    },
    livedNow:{async ensure(){ensured++;return {situationId:"sit_advanced"};}},
    now:()=>at,
  });
  const result=await process.runOnce();
  assert.equal(ensured,1,"World woke more than one stranded Thread");
  assert.equal(Date.parse(result.nextDueAt)-Date.parse(at),10*60_000,
    "World scheduled an immediate stampede of overdue cognition");
});

test("an established legacy Thread without a wake frontier is adopted once",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const first=openLivedNowStore(storage);
    first.recordPlan(personalPlan(life));
    await createLivedNowService({livedNowStore:first}).ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
    });
    assert.equal(first.inspectLivedBoundary(life.thread.threadId),null);
    first.close();
    const oldDatabase=new DatabaseSync(databasePath);
    oldDatabase.exec("DROP TABLE lived_now_recovery_adopted");
    oldDatabase.close();
    const recovered=openLivedNowStore(storage);
    const boundary=recovered.inspectLivedBoundary(life.thread.threadId);
    assert.ok(boundary?.dueAt,"World failed to adopt an established stranded Thread");
    assert.ok(Date.parse(boundary.dueAt)>Date.now(),
      "recovery produced an immediate burst of legacy wake work");
    recovered.close();
    const repeated=openLivedNowStore(storage);
    assert.equal(repeated.inspectLivedBoundary(life.thread.threadId)?.dueAt,
      boundary.dueAt,"World repeatedly reset a recovered Thread's deadline");
    repeated.close();
  }));

test("a lost or obsolete life deadline is repaired without rewriting the Thread",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    let lived=openLivedNowStore(storage);
    lived.recordPlan(personalPlan(life));
    const initial=await createLivedNowService({livedNowStore:lived}).ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
    });
    const originalDue="2026-09-10T05:15:00.000Z";
    lived.scheduleNextLivedBoundary({
      threadId:life.thread.threadId,situationId:initial.situationId,dueAt:originalDue,
    });
    const auditAt="2026-10-22T04:00:00Z";
    assert.equal(lived.repairLostLivedBoundaries({at:auditAt}).repaired.length,0,
      "continuity audit disturbed an existing life deadline");
    lived.close();

    const database=new DatabaseSync(databasePath);
    database.prepare("DELETE FROM lived_now_next_boundaries WHERE thread_id=?")
      .run(life.thread.threadId);
    database.close();

    lived=openLivedNowStore(storage);
    const missing=lived.repairLostLivedBoundaries({at:auditAt});
    assert.equal(missing.repaired.length,1,"a missing wake left an established life stranded");
    assert.equal(missing.nextWakeAt,"2026-10-22T04:15:00.000Z",
      "lost life was not given a paced recovery deadline");
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId)?.situationId,
      initial.situationId,"recovery was not attached to the enacted present");
    assert.equal(lived.repairLostLivedBoundaries({at:auditAt}).repaired.length,0,
      "repeated audit rescheduled an already recovered Thread");

    lived.close();
    const clearedDatabase=new DatabaseSync(databasePath);
    clearedDatabase.prepare(
      "UPDATE lived_now_next_boundaries SET due_at=NULL WHERE thread_id=?",
    ).run(life.thread.threadId);
    clearedDatabase.close();
    lived=openLivedNowStore(storage);
    assert.equal(lived.repairLostLivedBoundaries({at:"2026-10-22T04:20:00Z"})
      .repaired.length,1,"a cleared wake permanently stopped established life");
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId)?.dueAt,
      "2026-10-22T04:35:00.000Z","a cleared wake was not given a future recovery");

    const current=await createLivedNowService({livedNowStore:lived}).ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:35:00Z",
    });
    assert.notEqual(current.situationId,initial.situationId,
      "fixture did not advance the enacted situation");
    const stale=lived.repairLostLivedBoundaries({at:"2026-10-22T05:00:00Z"});
    assert.equal(stale.repaired.length,1,
      "a wake attached to an old situation left current life unscheduled");
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId)?.situationId,
      current.situationId,"obsolete wake was not reconciled with current life");
    assert.equal(lived.listPlans(life.thread.threadId,{kind:"personal"}).length,1,
      "repair invented a new Flight Plan instead of scheduling existing life");
    assert.equal(lived.getCurrentSituation(life.thread.threadId).situationId,
      current.situationId,"repair rewrote the Thread's enacted history");
    lived.close();
  }));

test("continuity repair preserves failure retries and never revives retired Threads",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    let lived=openLivedNowStore(storage);
    lived.recordPlan(personalPlan(life));
    const situation=await createLivedNowService({livedNowStore:lived}).ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
    });
    const initialDue="2026-09-10T05:15:00.000Z";
    lived.scheduleNextLivedBoundary({
      threadId:life.thread.threadId,situationId:situation.situationId,dueAt:initialDue,
    });
    lived.failLivedBoundary({
      threadId:life.thread.threadId,situationId:situation.situationId,
      dueAt:initialDue,at:initialDue,message:"provider unavailable",
    });
    const retry=lived.inspectLivedBoundary(life.thread.threadId);
    assert.equal(lived.repairLostLivedBoundaries({at:"2026-10-22T04:00:00Z"})
      .repaired.length,0,"continuity audit replaced an existing retry");
    assert.deepEqual(lived.inspectLivedBoundary(life.thread.threadId),retry,
      "continuity audit reset the Thread's failure history");
    lived.close();

    const database=new DatabaseSync(databasePath);
    database.prepare("DELETE FROM lived_now_next_boundaries WHERE thread_id=?")
      .run(life.thread.threadId);
    database.prepare("UPDATE threads SET status='retired' WHERE thread_id=?")
      .run(life.thread.threadId);
    database.close();
    lived=openLivedNowStore(storage);
    assert.equal(lived.repairLostLivedBoundaries({at:"2026-10-22T04:00:00Z"})
      .repaired.length,0,"retired Thread was revived by continuity audit");
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId),null,
      "retired Thread was assigned a wake");
    lived.close();
  }));

test("World audits lost life daily and preserves restored deadlines between checks",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const lived=openLivedNowStore(storage);
    lived.recordPlan(personalPlan(life));
    const original=await createLivedNowService({livedNowStore:lived}).ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
    });
    const at="2026-10-22T05:00:00.000Z";
    assert.equal(lived.continuityAuditDue(at),true,
      "World did not recognize the first life audit");
    const result=lived.repairLostLivedBoundaries({at});
    assert.equal(result.repaired.length,1,"World did not recover a lost life deadline");
    const deadline=lived.inspectLivedBoundary(life.thread.threadId)?.dueAt;
    const nextAudit=lived.recordContinuityAudit({at,hasMore:result.hasMore});
    assert.equal(lived.continuityAuditDue("2026-10-23T04:00:00.000Z"),false,
      "World re-audited healthy lives before the daily checkpoint");
    assert.equal(lived.continuityAuditDue(nextAudit),true,
      "World failed to schedule its next life continuity check");
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId)?.dueAt,deadline,
      "daily checkpoint changed the Thread's earned wake");
    assert.equal(lived.getCurrentSituation(life.thread.threadId).situationId,
      original.situationId,"auditing manufactured new life");

    const nextBatch=lived.recordContinuityAudit({at,hasMore:true});
    assert.equal(lived.continuityAuditDue("2026-10-22T05:59:59.000Z"),false,
      "a bounded batch was immediately retried");
    assert.equal(lived.continuityAuditDue(nextBatch),true,
      "World stranded the remainder of a bounded recovery batch");
    lived.close();
  }));

test("periodic recovery restores a lost Thread wake through World into continuing life",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const storage=localWorldStateStorage(databasePath);
    const plan=personalPlan(life);
    const planAt="2030-06-01T05:00:00Z";
    plan.planId=livedPlanId({
      threadId:life.thread.threadId,kind:"personal",authoredAt:planAt,
    });
    plan.authoredAt=planAt;
    plan.horizonStart=planAt;
    plan.horizonEnd="2030-06-01T06:30:00Z";
    plan.stops[0].startAt=planAt;
    plan.stops[0].endAt="2030-06-01T05:15:00Z";
    plan.stops[1].startAt="2030-06-01T05:30:00Z";
    plan.stops[1].endAt=plan.horizonEnd;

    let lived=openLivedNowStore(storage);
    lived.recordPlan(plan);
    const start=await createLivedNowService({livedNowStore:lived}).ensure({
      threadId:life.thread.threadId,at:"2030-06-01T05:05:00Z",
    });
    lived.scheduleNextLivedBoundary({
      threadId:life.thread.threadId,situationId:start.situationId,
      dueAt:nextLivedBoundary(lived,start),
    });
    lived.close();
    const damaged=new DatabaseSync(databasePath);
    damaged.prepare("DELETE FROM lived_now_next_boundaries WHERE thread_id=?")
      .run(life.thread.threadId);
    damaged.close();

    lived=openLivedNowStore(storage);
    const livedNow=createLivedNowService({
      livedNowStore:lived,
      onSituationResolved:situation=>lived.scheduleNextLivedBoundary({
        threadId:situation.threadId,situationId:situation.situationId,
        dueAt:nextLivedBoundary(lived,situation),
      }),
    });
    let clock=Date.parse("2030-06-01T05:08:00Z");
    const infra=createLocalInfraDriver({
      stateScopes:{world:":memory:"},
      schedulerScopes:{world:{onWake:async()=>{}}},
    });
    const process=createWorldReconciliationProcess({
      livedBoundaryProcess:createLivedBoundaryProcess({
        livedNowStore:lived,livedNow,now:()=>new Date(clock).toISOString(),
      }),
    });
    const runtime=createWorldReconciliationRuntime({
      infraDriver:infra,process,now:()=>clock,
      retryState:{get:async()=>0,set:async()=>{}},
    });
    try{
      const at=new Date(clock).toISOString();
      await assert.rejects(auditLivedContinuity({
        livedNowStore:lived,at,
        reconciliationRuntime:{requestWakeAt:async()=>{throw new Error("alarm unavailable");}},
      }),/alarm unavailable/);
      assert.equal(lived.continuityAuditDue(at),true,
        "failed alarm handoff falsely completed World continuity audit");
      assert.ok(lived.inspectLivedBoundary(life.thread.threadId)?.dueAt,
        "failed alarm handoff discarded the repaired Thread's wake");

      const retry=await auditLivedContinuity({
        livedNowStore:lived,reconciliationRuntime:runtime,at,
      });
      assert.equal(retry.audited,true,"World never retried lost-life recovery");
      assert.equal(retry.repaired,0,
        "scheduler retry rewrote the Thread's already restored obligation");
      assert.equal(await infra.scheduler.get("world"),
        Date.parse("2030-06-01T05:23:00Z"),
        "World did not re-arm durable life after a failed scheduler handoff");
      assert.equal(lived.continuityAuditDue(at),false,
        "successful recovery did not checkpoint the audit");
      assert.equal(lived.getCurrentSituation(life.thread.threadId).situationId,
        start.situationId,"the audit invented a life transition");

      clock=Date.parse("2030-06-01T05:23:00Z");
      const departure=await runtime.handleWake();
      const moving=lived.getCurrentSituation(life.thread.threadId);
      assert.equal(departure.livedBoundary.result.attempted,1,
        "World did not run the restored autonomous life obligation");
      assert.equal(moving.phase,"in_transit",
        "recovered Thread failed to enact its own planned departure");
      assert.equal(await infra.scheduler.get("world"),
        Date.parse("2030-06-01T05:30:00Z"),
        "World did not schedule life after the repaired wake");

      clock=Date.parse("2030-06-01T05:30:00Z");
      const arrival=await runtime.handleWake();
      const arrived=lived.getCurrentSituation(life.thread.threadId);
      assert.equal(arrival.livedBoundary.result.attempted,1,
        "World did not continue beyond the recovery boundary");
      assert.equal(arrived.location.placeRef,life.libraryRef,
        "recovered Thread did not reach its own planned destination");
      assert.notEqual(arrived.situationId,moving.situationId,
        "continuing life failed to establish a new present");
      assert.ok(Date.parse(lived.inspectLivedBoundary(life.thread.threadId).dueAt)
        >clock,"continuing life lost its next autonomous wake");
      assert.equal(lived.listPlans(life.thread.threadId,{kind:"personal"}).length,1,
        "recovery fabricated a new Flight Plan");
    }finally{
      await runtime.stop();
      lived.close();
    }
  }));

test("a failed Thread wake retains a quiet recovery deadline and eventually resumes life",async()=>
  withDatabase(async(databasePath)=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));
    const service=createLivedNowService({
      livedNowStore:lived,
      onSituationResolved:situation=>lived.scheduleNextLivedBoundary({
        threadId:situation.threadId,situationId:situation.situationId,
        dueAt:nextLivedBoundary(lived,situation),
      }),
    });
    const situation=await service.ensure({
      threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
    });
    let clock=nextLivedBoundary(lived,situation);
    let attempts=0;
    const process=createLivedBoundaryProcess({
      livedNowStore:lived,
      livedNow:{async ensure(input){
        attempts++;
        if(attempts<=3)throw new Error("provider temporarily unavailable");
        return service.ensure(input);
      }},
      now:()=>clock,
    });
    for(let i=0;i<3;i++){
      const result=await process.runOnce();
      assert.equal(result.attempted,1,"World missed its recoverable wake");
      const next=lived.inspectLivedBoundary(life.thread.threadId)?.dueAt;
      assert.ok(Date.parse(next)>Date.parse(clock),
        "a failed Thread was abandoned instead of rescheduled");
      clock=next;
    }
    assert.equal(lived.inspectLivedBoundary(life.thread.threadId)?.blockedReason,
      "provider temporarily unavailable","World lost the failure explanation");
    assert.equal(attempts,3,"recovery ran unbounded cognition");
    const resumed=await process.runOnce();
    assert.equal(resumed.attempted,1,"World never retried the stranded Thread");
    const recovered=lived.inspectLivedBoundary(life.thread.threadId);
    assert.equal(recovered.blockedReason,null,"life stayed blocked after successful recovery");
    assert.equal(recovered.failedAttempts,0,"life retained the previous failure streak");
    assert.ok(recovered.dueAt!==null,"life resumed without its next autonomous wake");
    lived.close();
  }));

test("an admitted later situation re-arms an exhausted life frontier without rewriting past",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan(life));
    const service=createLivedNowService({
      livedNowStore:lived,
      onSituationResolved:situation=>lived.scheduleNextLivedBoundary({
        threadId:situation.threadId,situationId:situation.situationId,
        dueAt:nextLivedBoundary(lived,situation),
      }),
    });
    try{
      const original=await service.ensure({
        threadId:life.thread.threadId,at:"2026-09-10T05:05:00Z",
      });
      let dueAt=nextLivedBoundary(lived,original);
      for(let i=0;i<3;i++){
        lived.failLivedBoundary({
          threadId:life.thread.threadId,situationId:original.situationId,
          dueAt,at:dueAt,message:"prior cognition unavailable",
        });
        dueAt=lived.inspectLivedBoundary(life.thread.threadId).dueAt;
      }
      assert.equal(lived.inspectLivedBoundary(life.thread.threadId).failedAttempts,3);
      assert.ok(lived.nextLivedBoundaryAt()!==null,
        "a failed life lost its durable recovery obligation");
      const progressed=await service.ensure({
        threadId:life.thread.threadId,at:"2026-09-10T05:30:00Z",
      });
      assert.notEqual(progressed.situationId,original.situationId,
        "a real later situation did not advance World continuity");
      const recovery=lived.inspectLivedBoundary(life.thread.threadId);
      assert.equal(recovery.situationId,progressed.situationId);
      assert.equal(recovery.failedAttempts,0,
        "successful life progression inherited exhausted retries");
      assert.equal(recovery.blockedReason,null,
        "a recovered life remained labeled blocked");
      assert.ok(recovery.dueAt!==null,
        "successful recovery left the next autonomous boundary unarmed");
    }finally{lived.close();}
  }));

test("an admitted personal public-visit plan enacts transit, empty stay and return home",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    try{
      const library=lived.admitPublicPlace({
        venueIdentity:"fixture:tucson-public-reading",
        displayName:"Tucson public reading room",
        streetAddress:"7 Example Reading Street, Tucson",
        locality:"Tucson",country:"United States",countryCode:"US",
        lat:32.222,long:-110.975,timeZone:"America/Phoenix",
        evidenceRef:"https://example.org/public-reading-room",
        affordances:["Reading","Public discussion"],
      });
      // The World consumes a completed personal intention. Fixture-authored
      // choice is not evidence of a live Thread deciding to leave home.
      const threadId=life.thread.threadId;
      const authoredAt="2026-10-14T16:00:00.000Z";
      const stops=[
        {
          startAt:authoredAt,endAt:"2026-10-14T16:20:00.000Z",
          physicalPlaceRef:life.homeRef,activity:"Finish a sketch at home.",
          purpose:"Complete private work.",travelFromPrevious:null,
        },
        {
          startAt:"2026-10-14T16:40:00.000Z",
          endAt:"2026-10-14T17:40:00.000Z",
          physicalPlaceRef:library.ref,activity:"Read at the library.",
          purpose:"Seek intellectual stimulation without expecting company.",
          travelFromPrevious:"Travel across the city.",
        },
        {
          startAt:"2026-10-14T18:00:00.000Z",
          endAt:"2026-10-14T19:00:00.000Z",
          physicalPlaceRef:life.homeRef,activity:"Reflect at home.",
          purpose:"Spend some time alone.",travelFromPrevious:"Return home.",
        },
      ].map(stop=>({
        ...stop,mediatedContext:null,wakefulness:"awake",companionRefs:[],
      }));
      const plan=lived.recordPlan({
        planId:livedPlanId({threadId,kind:"personal",authoredAt}),
        kind:"personal",subjectThreadId:threadId,
        owner:{partyId:threadId,kind:"thread"},
        authoredAt,horizonStart:authoredAt,
        horizonEnd:"2026-10-14T19:00:00.000Z",
        stops,sourceReferences:[life.sourceEvent,life.homeRef,library.ref],
        cognition:{provider:"fixture",modelId:"public-visit-enactment",providerRequestId:"fixture-public-trip"},
      });
      assert.ok(plan.sourceReferences.includes(library.ref),
        "the destination lacks World place authority");
      const scenes=[];
      let dueAt=authoredAt;
      const service=createLivedNowService({
        livedNowStore:lived,
        onSituationEnacted:situation=>scenes.push(situation),
        onSituationResolved:situation=>{
          lived.scheduleNextLivedBoundary({
            threadId:situation.threadId,situationId:situation.situationId,
            dueAt:nextLivedBoundary(lived,situation),
          });
        },
      });
      const atHome=await service.ensure({
        threadId,at:"2026-10-14T16:10:00.000Z",
      });
      assert.equal(atHome.location.placeRef,life.homeRef);
      assert.equal(lived.nextLivedBoundaryAt(),"2026-10-14T16:20:00.000Z");
      const times=[
        "2026-10-14T16:20:00.000Z",
        "2026-10-14T16:40:00.000Z",
        "2026-10-14T17:40:00.000Z",
        "2026-10-14T18:00:00.000Z",
      ];
      const progressed=[];
      for(const at of times){
        dueAt=at;
        const boundary=createLivedBoundaryProcess({
          livedNowStore:lived,livedNow:service,now:()=>dueAt,
        });
        const outcome=await boundary.runOnce();
        assert.equal(outcome.failed,0,"an ordinary travel boundary failed");
        assert.equal(outcome.attempted,1,"travel needed an invented extra wake");
        progressed.push(lived.getCurrentSituation(threadId));
        if(at==="2026-10-14T16:40:00.000Z"){
          const duringStay=await service.ensure({
            threadId,at:"2026-10-14T17:20:00.000Z",
          });
          assert.equal(duringStay.location.placeRef,library.ref,
            "time spent reading displaced the Thread from the actual library");
          assert.equal(scenes.length,3,
            "time spent in the same place triggered a false scene change");
          assert.deepEqual(lived.listCurrentVenueSituations({
            venueRef:library.physicalVenue.ref,
            at:"2026-10-14T17:20:00.000Z",excludeThreadId:threadId,
          }),[],"an empty afternoon manufactured someone to meet");
        }
      }
      assert.deepEqual(progressed.map(scene=>scene.phase),[
        "in_transit","at_place","in_transit","at_place",
      ],"the visit skipped travel or failed to come home");
      assert.equal(progressed[0].location.toPlaceRef,library.ref);
      assert.equal(progressed[1].location.placeRef,library.ref);
      assert.equal(progressed[2].location.fromPlaceRef,library.ref);
      assert.equal(progressed[3].location.placeRef,life.homeRef);
      assert.ok(lived.listRecentSituations(threadId).some(scene=>
        scene.phase==="at_place"&&scene.location.placeRef===library.ref),
        "the completed library stay disappeared from actual World history");
      assert.deepEqual(lived.listCurrentVenueSituations({
        venueRef:library.physicalVenue.ref,at:"2026-10-14T17:00:00.000Z",
        excludeThreadId:threadId,
      }),[],"an empty venue manufactured someone to meet");
      assert.deepEqual(lived.listCurrentVenueSituations({
        venueRef:library.physicalVenue.ref,at:"2026-10-14T18:00:00.000Z",
      }),[],"departed visitor remained at the library");
      assert.equal(scenes.length,5,
        "an unchanged stay generated extra situation callbacks");
      assert.equal(lived.nextLivedBoundaryAt(),"2026-10-14T19:00:00.001Z");
    }finally{lived.close();}
  }));

test("World rejects a rushed cross-city arrival and autonomous life completes a feasible journey",async()=>
  withDatabase(async databasePath=>{
    const life=seedLife(databasePath);
    const lived=openLivedNowStore(localWorldStateStorage(databasePath));
    try{
      const threadId=life.thread.threadId;
      const city=(name,country,countryCode,lat,long,timeZone)=>
        lived.resolvePlace({
          threadId,name,kind:"city",city:name,country,
          geography:{locality:name,country,countryCode,lat,long,timeZone,
            evidenceRef:"fixture:city-"+name},
        }).place;
      const lisbon=city("Lisbon","Portugal","PT",38.72509,-9.1498,"Europe/Lisbon");
      const madrid=city("Madrid","Spain","ES",40.4168,-3.7038,"Europe/Madrid");
      const start="2026-10-20T09:00:00.000Z";
      const travelPlan=(arrival)=>({
        planId:livedPlanId({threadId,kind:"personal",authoredAt:start}),
        kind:"personal",subjectThreadId:threadId,
        owner:{partyId:threadId,kind:"thread"},
        authoredAt:start,horizonStart:start,
        horizonEnd:"2026-10-20T18:00:00.000Z",
        stops:[
          {
            startAt:start,endAt:"2026-10-20T09:30:00.000Z",
            physicalPlaceRef:lisbon.ref,mediatedContext:null,
            activity:"Prepare for the visit.",wakefulness:"awake",
            purpose:"Leave Lisbon in good time.",companionRefs:[],
            travelFromPrevious:null,
          },
          {
            startAt:arrival,endAt:"2026-10-20T18:00:00.000Z",
            physicalPlaceRef:madrid.ref,mediatedContext:null,
            activity:"Explore Madrid.",wakefulness:"awake",
            purpose:"Spend the afternoon in Madrid.",companionRefs:[],
            travelFromPrevious:"Travel from Lisbon to Madrid.",
          },
        ],
        sourceReferences:[life.sourceEvent,lisbon.ref,madrid.ref],
        cognition:{provider:"fixture",modelId:"city-journey",providerRequestId:"fixture-city-journey"},
      });
      assert.throws(()=>lived.recordPlan(travelPlan("2026-10-20T09:40:00.000Z")),
        /arrival is too soon/,
        "World admitted a ten-minute Lisbon-to-Madrid journey");
      assert.equal(lived.listPlans(threadId).length,0,
        "rejected travel was written into the Thread's future");

      lived.recordPlan(travelPlan("2026-10-20T13:30:00.000Z"));
      const observed=[];
      const service=createLivedNowService({
        livedNowStore:lived,
        onSituationEnacted:situation=>observed.push(situation.phase),
        onSituationResolved:situation=>lived.scheduleNextLivedBoundary({
          threadId,situationId:situation.situationId,
          dueAt:nextLivedBoundary(lived,situation),
        }),
      });
      const before=await service.ensure({threadId,at:"2026-10-20T09:10:00.000Z"});
      assert.equal(before.location.placeRef,lisbon.ref);
      assert.equal(lived.currentLocationTimeZone(threadId),"Europe/Lisbon");
      let now="2026-10-20T09:30:00.000Z";
      const scheduler=createLivedBoundaryProcess({
        livedNowStore:lived,livedNow:service,now:()=>now,
      });
      assert.equal((await scheduler.runOnce()).failed,0);
      const journey=lived.getCurrentSituation(threadId);
      assert.equal(journey.phase,"in_transit","cross-city travel skipped its transit interval");
      assert.equal(journey.location.toPlaceRef,madrid.ref);
      assert.equal(lived.currentLocationTimeZone(threadId),"Europe/Lisbon",
        "destination time zone was adopted before arriving");

      now="2026-10-20T13:30:00.000Z";
      assert.equal((await scheduler.runOnce()).failed,0);
      const arrived=lived.getCurrentSituation(threadId);
      assert.equal(arrived.location.placeRef,madrid.ref,
        "the autonomous boundary failed to enact the intended arrival");
      assert.equal(lived.currentLocationTimeZone(threadId),"Europe/Madrid",
        "the arrived Thread retained its departed city's time zone");
      assert.deepEqual(planningLocalityForPlace({
        livedNowStore:lived,threadId,placeRef:madrid.ref,placeEpisodes:[],
      }),{locality:"Madrid",countryCode:"ES"},
      "World did not carry the arrived city into subsequent local opportunities");
      assert.equal(lived.listWorldPlaces(threadId).some(place=>place.ref===madrid.ref),true,
        "the enacted World city disappeared from current directory inspection");
      assert.deepEqual(observed,["at_place","in_transit","at_place"],
        "cross-city travel generated a false scene or skipped a real one");
    }finally{lived.close();}
  }));

test("a Thread can consider local public places from a hidden but attested Genesis sibling",()=>{
  const threadId="thr_local_choice";
  const place=(kind)=>({
    episodeId:"plce_"+kind,revision:1,threadId,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:"place_modern_4572b13ec97a_"+kind,
      displayName:"Personal "+kind+" place",countryCode:null,
      region:null,locality:null,precision:"unspecified"},
    startAt:"2026-01-01T10:00:00.000Z",endAt:null,
    sourceReferences:["evt_birth"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  });
  const home=place("home"),transit=place("transit");
  const homeRef=placeEpisodeRevisionRef(home);
  let anchorReads=0;
  const livedNowStore={
    getPrivatePlace:()=>null,
    getPublicPlace:()=>null,
    listLocatedGenesisContexts:(ids)=>{
      anchorReads++;
      assert.deepEqual(ids,[threadId]);
      return [{placeEpisode:transit,privatePlace:{
        threadId,placeRef:placeEpisodeRevisionRef(transit),
        locality:"London",country:"United Kingdom",countryCode:"GB",
        publicGranularity:"hidden",
      }}];
    },
  };
  const locality=planningLocalityForPlace({
    livedNowStore,placeEpisodes:[home],threadId,placeRef:homeRef,
  });
  assert.deepEqual(locality,{locality:"London",countryCode:"GB"},
    "the private mind could not discover its own locality from grounded World evidence");
  assert.equal(anchorReads,1,
    "local discovery repeatedly scanned historical places");
  assert.deepEqual(planningLocalityForPlace({
    livedNowStore,placeEpisodes:[place("school")],threadId,placeRef:homeRef,
  }),null,"an ungrounded place was assigned another place's city");
  assert.equal(anchorReads,1,"unrelated place triggered unnecessary locality lookup");
  assert.equal(planningLocalityForPlace({
    livedNowStore:{...livedNowStore,
      getPrivatePlace:()=>({locality:"Tbilisi",countryCode:"GE"})},
    placeEpisodes:[home],threadId,placeRef:homeRef,
  }).locality,"Tbilisi","direct World evidence was ignored in favor of sibling inference");
  assert.equal(anchorReads,1,"direct World locality incurred avoidable lookup");
});

test("local discovery survives travel from a grounded home to its Genesis learning place",()=>{
  const threadId="thr_chen",seed="eb39aeda7e03";
  const worldPlace={
    ref:"wpl_legacy_learning",authority:"live-world-place-admission-v1",
    sourceWorldRef:"world_chen",
    sourcePlaceId:`place_modern_${seed}_learning`,
    placeKind:"library_or_learning",displayName:"A place to browse books",
  };
  const transit={
    threadId,episodeId:"plce_transit",revision:1,
    episodeKind:"formative_presence",provenance:"genesis_created",
    place:{placeId:`place_modern_${seed}_transit`,
      displayName:"Local transit",countryCode:null,locality:null,
      region:null,precision:"unspecified"},
    startAt:"2026-01-01T10:00:00.000Z",endAt:null,
    sourceReferences:["evt_origin"],visibility:"private",
    recordedAt:"2026-10-17T03:38:00.000Z",
  };
  let anchorReads=0;
  const livedNowStore={
    getPrivatePlace:()=>null,getPublicPlace:()=>null,
    getWorldPlace:(id,ref)=>{
      assert.equal(id,threadId);
      return ref===worldPlace.ref?worldPlace:null;
    },
    listLocatedGenesisContexts:()=>{
      anchorReads++;
      return [{placeEpisode:transit,privatePlace:{
        threadId,placeRef:"per:plce_transit:1",
        locality:"Kaohsiung",country:"Taiwan",countryCode:"TW",
        publicGranularity:"hidden",
      }}];
    },
  };
  assert.deepEqual(planningLocalityForPlace({
    livedNowStore,placeEpisodes:[],threadId,placeRef:worldPlace.ref,
  }),{locality:"Kaohsiung",countryCode:"TW"},
  "a real learning-world visit severed the Thread from local social destinations");
  assert.equal(anchorReads,1,
    "one local City Guide choice required repeated history queries");
  assert.equal(planningLocalityForPlace({
    livedNowStore,placeEpisodes:[],threadId,placeRef:"wpl_unrelated",
  }),null,"an unrelated shared place acquired the Thread's city");
  assert.equal(anchorReads,1,
    "ungrounded shared place required a needless context lookup");
});
