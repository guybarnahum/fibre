// fibre-test-purpose: prove-an-accepted-inside-fibre-work-commitment-bends-future-lived-planning-without-rewriting-prior-intention

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openFibreCreditStore } from "../src/fibre-credit-store.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { createInsideFibreAvailabilityService } from "../src/inside-fibre-availability.mjs";
import { createInsideFibreWorkService } from "../src/inside-fibre-work.mjs";
import { openInsideFibreWorkStore } from "../src/inside-fibre-work-store.mjs";
import { createInsideFibreVisitorMeetingService } from "../src/inside-fibre-visitor-meeting.mjs";
import { normalizeLivedPlan } from "../src/lived-now.mjs";
import { createLivedNowService } from "../src/lived-now-service.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { canonicalJson, sha256 } from "../src/persistence-common.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { placeEpisodeId } from "../src/situated-life-domain.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const ACCEPTED_AT = "2026-09-23T17:00:00.000Z";
const WORK_START = "2026-09-23T19:00:00.000Z";
const WORK_END = "2026-09-23T20:00:00.000Z";
const PLAN_END = "2026-09-23T22:00:00.000Z";
const PURPOSE = "Meet insidefibre.com visitors during the agreed availability window.";
const MEDIATED_CONTEXT = "insidefibre:visitor-work";

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-inside-work-planning-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive:true, force:true });
  }
}

function seedThread(worldStore) {
  const thread = structuredClone(mina);
  thread.threadId = "thr_inside_work_planning";
  thread.identity = {
    ...thread.identity,
    name:"Ada Vale",
    selfDescription:"Ada has an ordinary life outside Inside Fibre.",
  };
  thread.currentState = {
    needs:[],
    feelings:[],
    selfModel:"I am Ada Vale.",
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
    createdAt:"2026-09-23T15:00:00.000Z",
    createdBy:"inside-fibre-work-planning-test",
  };
  worldStore.seedThread(thread);
  return worldStore.listEvents(thread.threadId)[0];
}

function cognitionWitness() {
  return {
    provider:"fixture",
    modelId:"fixture-work-choice",
    providerRequestId:"fixture-work-choice-1",
    implementationProfile:{ id:"interior-cognition-single-episode", version:"1" },
    sourceThreadVersion:1,
    selectedEvidenceRefs:["mem_private_work_choice"],
    evidenceRefs:["mem_private_work_choice"],
    contextDigest:`sha256:${"a".repeat(64)}`,
  };
}

function offerId(fibreCredits = 12) {
  return `work_offer_${sha256(canonicalJson({
    kind:"inside_fibre_visitor_availability",
    startAt:WORK_START,
    endAt:WORK_END,
    mediatedContext:MEDIATED_CONTEXT,
    purpose:PURPOSE,
    compensation:{ fibreCredits },
  })).slice(0, 48)}`;
}

function initialPlan(threadId, eventRef, placeRef) {
  return normalizeLivedPlan({
    planId:"lplan_inside_work_prior",
    kind:"personal",
    subjectThreadId:threadId,
    owner:{ partyId:threadId, kind:"thread" },
    authoredAt:"2026-09-23T16:00:00.000Z",
    horizonStart:"2026-09-23T16:00:00.000Z",
    horizonEnd:PLAN_END,
    stops:[{
      startAt:"2026-09-23T16:00:00.000Z",
      endAt:PLAN_END,
      physicalPlaceRef:placeRef,
      mediatedContext:null,
      activity:"Spend the afternoon reading and working quietly at home.",
      purpose:"Continue the ordinary day already underway.",
      companionRefs:[],
      travelFromPrevious:null,
    }],
    sourceReferences:[eventRef,placeRef],
    cognition:{
      provider:"fixture",
      modelId:"fixture-prior-plan",
      providerRequestId:"fixture-prior-plan-1",
      implementationProfile:{ id:"interior-cognition-single-episode", version:"1" },
      sourceThreadVersion:1,
      selectedEvidenceRefs:[],
      evidenceRefs:[],
      contextDigest:`sha256:${"b".repeat(64)}`,
    },
  });
}

async function setup(databasePath) {
  const storage = localWorldStateStorage(databasePath);
  const worldStore = openWorldStore(storage);
  const event = seedThread(worldStore);
  const identityStore = openIdentityStore(storage);
  const semanticStateStore = openSemanticStateStore(storage);
  const memoryStore = openAutobiographicalMemoryStore(storage);
  const situatedLifeStore = openSituatedLifeStore(storage);
  const livedNowStore = openLivedNowStore(storage);

  const place = situatedLifeStore.recordPlaceEpisode({
    episodeId:placeEpisodeId({ threadId:"thr_inside_work_planning", place:"home" }),
    revision:1,
    threadId:"thr_inside_work_planning",
    episodeKind:"residence",
    place:{
      placeId:"place.test.home",
      displayName:"Home",
      countryCode:"US",
      region:"Arizona",
      locality:"Tucson",
      precision:"locality",
    },
    startAt:"2026-09-23T15:00:00.000Z",
    endAt:null,
    sourceReferences:[event.eventId],
    visibility:"private",
    provenance:"thread_history",
    recordedAt:"2026-09-23T15:01:00.000Z",
  });
  const placeRef = placeEpisodeRevisionRef(place);
  const priorPlan = livedNowStore.recordPlan(
    initialPlan("thr_inside_work_planning", event.eventId, placeRef),
  );

  const workStore = openInsideFibreWorkStore(storage);
  const fibreCreditStore = openFibreCreditStore(storage, { worldReader:worldStore });
  const accepted = workStore.recordAcceptedCommitment({
    kind:"inside_fibre_visitor_availability",
    offerId:offerId(),
    threadId:"thr_inside_work_planning",
    acceptedAt:ACCEPTED_AT,
    startAt:WORK_START,
    endAt:WORK_END,
    mediatedContext:MEDIATED_CONTEXT,
    purpose:PURPOSE,
    compensation:{ fibreCredits:12 },
    cognition:cognitionWitness(),
  }).commitment;

  return {
    worldStore,
    identityStore,
    semanticStateStore,
    memoryStore,
    situatedLifeStore,
    livedNowStore,
    workStore,
    fibreCreditStore,
    event,
    placeRef,
    priorPlan,
    accepted,
  };
}

function closeAll(state) {
  state.fibreCreditStore.close();
  state.workStore.close();
  state.livedNowStore.close();
  state.situatedLifeStore.close();
  state.memoryStore.close();
  state.semanticStateStore.close();
  state.identityStore.close();
  state.worldStore.close();
}

test("accepted visitor work bends the forward Flight Plan while preserving prior intention", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);
    let observedCommitment = null;

    const service = createInsideFibreWorkService({
      worldReader:state.worldStore,
      livedNowStore:state.livedNowStore,
      identityStore:state.identityStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      situatedLifeStore:state.situatedLifeStore,
      workStore:state.workStore,
      fibreCreditStore:state.fibreCreditStore,
      modelAdapter:{
        provider:"fixture",
        modelId:"fixture-work-planning",
        async invoke(call) {
          const external = call.input.concern.externalContext;
          assert.equal(external.requiredWorkCommitments.length, 1);
          observedCommitment = structuredClone(external.requiredWorkCommitments[0]);
          return {
            output:{
              result:{
                stops:[
                  {
                    startAt:ACCEPTED_AT,
                    endAt:WORK_START,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the afternoon at home.",
                    purpose:"Keep the ordinary day underway before the accepted shift.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_START,
                    endAt:WORK_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"mediated",
                    mediatedContext:MEDIATED_CONTEXT,
                    activity:"Be available to meet Inside Fibre visitors.",
                    purpose:"Honor the visitor-availability work already accepted.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_END,
                    endAt:PLAN_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Return attention to the rest of the evening at home.",
                    purpose:"Continue ordinary life after the shift.",
                    travelFromPrevious:"",
                  },
                ],
              },
              evidenceRefs:[],
              conflictingMotives:[],
              uncertainty:null,
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-work-planning",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });
    const result = await service.reconcileAcceptedWork(state.accepted.commitmentId);

    assert.equal(result.state, "planned", "accepted work should produce a revised forward plan");
    assert.notEqual(result.plan.planId, state.priorPlan.planId, "accepted work should bend future intention");
    assert.equal(state.livedNowStore.listPlans(state.accepted.threadId, { kind:"personal" }).length, 2,
      "prior intention should remain durable");
    assert.equal(
      state.livedNowStore.latestPlan(state.accepted.threadId, "personal", { at:"2026-09-23T19:30:00.000Z" }).planId,
      result.plan.planId,
      "the revised plan should govern the accepted work window",
    );
    const workStop = result.plan.stops.find((stop) => stop.mediatedContext === MEDIATED_CONTEXT);
    assert.ok(workStop, "accepted work should become mediated presence in the Flight Plan");
    assert.equal(workStop.startAt, WORK_START);
    assert.equal(workStop.endAt, WORK_END);
    assert.ok(result.plan.sourceReferences.includes(state.accepted.commitmentId),
      "the revised plan should cite the accepted commitment");
    assert.equal(result.plan.sourceReferences.includes("mem_private_work_choice"), false,
      "private acceptance evidence must not become World plan authority");
    assert.equal(
      observedCommitment.commitmentId,
      state.accepted.commitmentId,
      "planning should receive the accepted work authority",
    );
    assert.equal(
      Object.hasOwn(observedCommitment, "cognition"),
      false,
      "private acceptance cognition must not become planning context",
    );

    closeAll(state);
  }));

test("Flight Planning cannot silently omit accepted visitor work", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);

    await assert.rejects(
      createInsideFibreWorkService({
        worldReader:state.worldStore,
        livedNowStore:state.livedNowStore,
        identityStore:state.identityStore,
        semanticStateStore:state.semanticStateStore,
        memoryStore:state.memoryStore,
        situatedLifeStore:state.situatedLifeStore,
        workStore:state.workStore,
        fibreCreditStore:state.fibreCreditStore,
        modelAdapter:{
          provider:"fixture",
          modelId:"fixture-work-planning-omits-shift",
          async invoke(call) {
            const external = call.input.concern.externalContext;
            return {
              output:{
                result:{
                  stops:[{
                    startAt:ACCEPTED_AT,
                    endAt:PLAN_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the ordinary afternoon at home.",
                    purpose:"Follow the day without entering mediated work.",
                    travelFromPrevious:"",
                  }],
                },
                evidenceRefs:[],
                conflictingMotives:[],
                uncertainty:null,
              },
              provenance:{
                provider:"fixture",
                modelId:"fixture-work-planning-omits-shift",
                providerRequestId:call.clientRequestId,
              },
            };
          },
        },
      }).reconcileAcceptedWork(state.accepted.commitmentId),
      TypeError,
      "an accepted commitment must be load-bearing in planning",
    );

    assert.equal(
      state.livedNowStore.listPlans(state.accepted.threadId, { kind:"personal" }).length,
      1,
      "a plan that drops accepted work must not be admitted",
    );

    closeAll(state);
  }));


test("Inside Fibre availability is derived from enacted committed presence", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);
    const workService = createInsideFibreWorkService({
      worldReader:state.worldStore,
      livedNowStore:state.livedNowStore,
      identityStore:state.identityStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      situatedLifeStore:state.situatedLifeStore,
      workStore:state.workStore,
      fibreCreditStore:state.fibreCreditStore,
      modelAdapter:{
        provider:"fixture",
        modelId:"fixture-work-planning-presence",
        async invoke(call) {
          const external = call.input.concern.externalContext;
          return {
            output:{
              result:{
                stops:[
                  {
                    startAt:ACCEPTED_AT,
                    endAt:WORK_START,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the ordinary afternoon.",
                    purpose:"Live the day before the accepted shift.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_START,
                    endAt:WORK_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"mediated",
                    mediatedContext:MEDIATED_CONTEXT,
                    activity:"Meet Inside Fibre visitors.",
                    purpose:"Honor the accepted visitor-availability work.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_END,
                    endAt:PLAN_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the evening.",
                    purpose:"Resume ordinary life after work.",
                    travelFromPrevious:"",
                  },
                ],
              },
              evidenceRefs:[],
              conflictingMotives:[],
              uncertainty:null,
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-work-planning-presence",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });
    const replanned = await workService.reconcileAcceptedWork(state.accepted.commitmentId);
    assert.equal(replanned.state, "planned");

    const livedNow = createLivedNowService({ livedNowStore:state.livedNowStore });
    const availability = createInsideFibreAvailabilityService({
      livedNow,
      livedNowStore:state.livedNowStore,
      workStore:state.workStore,
    });

    assert.equal(
      await availability.current({
        threadId:state.accepted.threadId,
        at:"2026-09-23T18:30:00.000Z",
      }),
      null,
      "accepted future work should not make the Thread available early",
    );

    const during = await availability.current({
      threadId:state.accepted.threadId,
      at:"2026-09-23T19:30:00.000Z",
    });
    assert.ok(during, "the enacted accepted shift should make the Thread available");
    assert.equal(during.commitmentId, state.accepted.commitmentId);
    assert.equal(during.planId, replanned.plan.planId);

    const current = state.livedNowStore.getCurrentSituation(state.accepted.threadId);
    assert.equal(current.situationId, during.situationId);
    assert.equal(current.mediatedContext, MEDIATED_CONTEXT);
    assert.equal(
      current.location.placeRef,
      state.placeRef,
      "mediated work should preserve the Thread's real physical presence",
    );
    assert.ok(
      current.evidenceRefs.includes(state.accepted.commitmentId),
      "the enacted present should retain the commitment authority",
    );

    assert.equal(
      await availability.current({
        threadId:state.accepted.threadId,
        at:"2026-09-23T20:30:00.000Z",
      }),
      null,
      "availability should end with the committed window",
    );

    closeAll(state);
  }));

test("a mediated-context label alone cannot manufacture Inside Fibre availability", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);
    state.livedNowStore.recordPlan(normalizeLivedPlan({
      planId:"lplan_uncommitted_inside_context",
      kind:"personal",
      subjectThreadId:state.accepted.threadId,
      owner:{ partyId:state.accepted.threadId, kind:"thread" },
      authoredAt:ACCEPTED_AT,
      horizonStart:ACCEPTED_AT,
      horizonEnd:PLAN_END,
      stops:[{
        startAt:ACCEPTED_AT,
        endAt:PLAN_END,
        physicalPlaceRef:state.placeRef,
        mediatedContext:MEDIATED_CONTEXT,
        activity:"Keep an Inside Fibre page open while doing something else.",
        purpose:"Ordinary mediated activity, not accepted visitor work.",
        companionRefs:[],
        travelFromPrevious:null,
      }],
      sourceReferences:[state.event.eventId,state.placeRef],
      cognition:{
        provider:"fixture",
        modelId:"fixture-uncommitted-mediated-context",
        providerRequestId:"fixture-uncommitted-mediated-context-1",
        implementationProfile:{ id:"interior-cognition-single-episode", version:"1" },
        sourceThreadVersion:1,
        selectedEvidenceRefs:[],
        evidenceRefs:[],
        contextDigest:`sha256:${"c".repeat(64)}`,
      },
    }));

    const availability = createInsideFibreAvailabilityService({
      livedNow:createLivedNowService({ livedNowStore:state.livedNowStore }),
      livedNowStore:state.livedNowStore,
      workStore:state.workStore,
    });

    const result = await availability.current({
      threadId:state.accepted.threadId,
      at:"2026-09-23T19:30:00.000Z",
    });
    assert.equal(
      result,
      null,
      "Inside Fibre availability must trace to the accepted commitment, not a context string",
    );

    closeAll(state);
  }));


test("a committed website visitor enters the existing lived scene and becomes an Encounter Story", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);
    const workService = createInsideFibreWorkService({
      worldReader:state.worldStore,
      livedNowStore:state.livedNowStore,
      identityStore:state.identityStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      situatedLifeStore:state.situatedLifeStore,
      workStore:state.workStore,
      fibreCreditStore:state.fibreCreditStore,
      modelAdapter:{
        provider:"fixture",
        modelId:"fixture-work-plan-for-visitor-meeting",
        async invoke(call) {
          const external = call.input.concern.externalContext;
          return {
            output:{
              result:{
                stops:[
                  {
                    startAt:ACCEPTED_AT,
                    endAt:WORK_START,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the afternoon.",
                    purpose:"Live the day before the accepted shift.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_START,
                    endAt:WORK_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"mediated",
                    mediatedContext:MEDIATED_CONTEXT,
                    activity:"Meet Inside Fibre visitors.",
                    purpose:"Honor the visitor-availability work already accepted.",
                    travelFromPrevious:"",
                  },
                  {
                    startAt:WORK_END,
                    endAt:PLAN_END,
                    physicalPlaceRef:external.startingPlaceRef,
                    presenceMode:"physical",
                    mediatedContext:"",
                    activity:"Continue the evening.",
                    purpose:"Resume ordinary life after work.",
                    travelFromPrevious:"",
                  },
                ],
              },
              evidenceRefs:[],
              conflictingMotives:[],
              uncertainty:null,
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-work-plan-for-visitor-meeting",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });
    await workService.reconcileAcceptedWork(state.accepted.commitmentId);

    const livedNow = createLivedNowService({ livedNowStore:state.livedNowStore });
    const availability = createInsideFibreAvailabilityService({
      livedNow,
      livedNowStore:state.livedNowStore,
      workStore:state.workStore,
    });
    const experienceStore = openLivedExperienceStore(localWorldStateStorage(databasePath));
    const modelAdapter = {
      provider:"fixture",
      modelId:"fixture-visitor-meeting",
      async invoke(call) {
        if (call.clientRequestId.startsWith("lived-encounter_")) {
          return {
            output:{ responseText:"Hello. I’m here for my Inside Fibre shift." },
            provenance:{
              provider:"fixture",
              modelId:"fixture-visitor-response",
              providerRequestId:call.clientRequestId,
            },
          };
        }
        if (call.clientRequestId.startsWith("encounter-experience_")) {
          return {
            output:{ experienceText:"I notice the visitor arriving and turn my attention toward the conversation." },
            provenance:{
              provider:"fixture",
              modelId:"fixture-visitor-experience",
              providerRequestId:call.clientRequestId,
            },
          };
        }
        if (call.clientRequestId.startsWith("encounter-reflection_")) {
          return {
            output:{ journalEntry:null },
            provenance:{
              provider:"fixture",
              modelId:"fixture-visitor-journal",
              providerRequestId:call.clientRequestId,
            },
          };
        }
        if (call.clientRequestId.startsWith("lived-memory_")) {
          return {
            output:{
              outcome:"not_remembered",
              rememberedContent:null,
              rememberedMeaning:null,
              confidence:null,
              salience:null,
              uncertainty:[],
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-visitor-memory",
              providerRequestId:call.clientRequestId,
            },
          };
        }
        throw new Error("unexpected visitor-meeting cognition");
      },
    };
    const meeting = createInsideFibreVisitorMeetingService({
      availability,
      worldReader:state.worldStore,
      livedNowStore:state.livedNowStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      experienceStore,
      workStore:state.workStore,
      fibreCreditStore:state.fibreCreditStore,
      modelAdapter,
    });

    const entered = await meeting.enter({
      threadId:state.accepted.threadId,
      at:"2026-09-23T19:30:00.000Z",
    });
    assert.ok(entered, "an active accepted shift should admit a website visitor");

    const result = await meeting.encounter({
      threadId:state.accepted.threadId,
      expectedSituationId:entered.situation.situationId,
      utterance:"Hi — are you free to talk for a moment?",
      at:"2026-09-23T19:31:00.000Z",
    });
    assert.ok(result, "the admitted visitor should be able to speak into the committed scene");
    assert.equal(result.situationId, entered.situation.situationId);
    assert.equal(result.encounterStory.story.beats[0].actorThreadId, null,
      "the human visitor must not be fabricated as a Thread");
    assert.equal(result.encounterStory.story.beats[1].actorThreadId, state.accepted.threadId,
      "the Thread's reply should be attributable to the Thread");
    assert.equal(result.attention.outcome, "noticed",
      "direct participation should become a real Thread Experience");
    assert.equal(result.attention.experience.encounterRef, result.encounterStory.encounterId);
    assert.equal(
      experienceStore.listEncounterStories(state.accepted.threadId)
        .some((story) => story.encounterId === result.encounterStory.encounterId),
      true,
      "the website meeting should use the general Encounter Story authority",
    );
    assert.equal(result.settlement.created, true,
      "the first real visitor encounter should settle the accepted work");
    assert.equal(result.settlement.entry.amount, 12);
    assert.equal(state.fibreCreditStore.balance(state.accepted.threadId), 37,
      "completed work should durably increase Fibre Credits");

    const continued = await meeting.encounter({
      threadId:state.accepted.threadId,
      expectedSituationId:entered.situation.situationId,
      utterance:"What has your day been like?",
      at:"2026-09-23T19:32:00.000Z",
    });
    assert.ok(continued, "the same committed meeting should continue normally");
    assert.equal(continued.settlement.created, false,
      "later turns must not pay the same work commitment twice");
    assert.equal(state.fibreCreditStore.listEntries(state.accepted.threadId).length, 1,
      "one accepted work commitment should have one compensation entry");
    assert.equal(state.fibreCreditStore.balance(state.accepted.threadId), 37,
      "continuing the conversation should not mint more Fibre Credits");

    let resourcesSeen = null;
    const laterWork = createInsideFibreWorkService({
      worldReader:state.worldStore,
      livedNowStore:state.livedNowStore,
      identityStore:state.identityStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      situatedLifeStore:state.situatedLifeStore,
      workStore:state.workStore,
      fibreCreditStore:state.fibreCreditStore,
      modelAdapter:{
        provider:"fixture",
        modelId:"fixture-later-work-choice",
        async invoke(call) {
          assert.equal(call.input.concern.kind, "inside_fibre_work_offer");
          resourcesSeen = structuredClone(call.input.concern.externalContext.currentResources);
          return {
            output:{
              result:{
                decision:"decline",
                reason:"I do not want another shift tomorrow.",
              },
              evidenceRefs:[],
              conflictingMotives:[],
              uncertainty:null,
            },
            provenance:{
              provider:"fixture",
              modelId:"fixture-later-work-choice",
              providerRequestId:call.clientRequestId,
            },
          };
        },
      },
    });
    await laterWork.considerOffer({
      threadId:state.accepted.threadId,
      at:"2026-09-23T20:40:00.000Z",
      startAt:"2026-09-24T19:00:00.000Z",
      endAt:"2026-09-24T20:00:00.000Z",
      fibreCredits:10,
    });
    assert.equal(resourcesSeen?.fibreCredits, 37,
      "earned Fibre Credits should enter the Thread's next work decision");

    assert.equal(
      await meeting.encounter({
        threadId:state.accepted.threadId,
        expectedSituationId:entered.situation.situationId,
        utterance:"Are you still working?",
        at:"2026-09-23T20:30:00.000Z",
      }),
      null,
      "the old meeting scene must stop admitting visitor turns after the work window",
    );

    experienceStore.close();
    closeAll(state);
  }));
