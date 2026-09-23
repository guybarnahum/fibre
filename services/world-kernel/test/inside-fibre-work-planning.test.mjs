// fibre-test-purpose: prove-an-accepted-inside-fibre-work-commitment-bends-future-lived-planning-without-rewriting-prior-intention

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openIdentityStore } from "../src/identity-store.mjs";
import { replanForAcceptedInsideFibreWork } from "../src/inside-fibre-work-planning.mjs";
import { openInsideFibreWorkStore } from "../src/inside-fibre-work-store.mjs";
import { normalizeLivedPlan } from "../src/lived-now.mjs";
import { openLivedNowStore } from "../src/lived-now-store.mjs";
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
    event,
    placeRef,
    priorPlan,
    accepted,
  };
}

function closeAll(state) {
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

    const result = await replanForAcceptedInsideFibreWork({
      commitmentId:state.accepted.commitmentId,
      workStore:state.workStore,
      livedNowStore:state.livedNowStore,
      worldStore:state.worldStore,
      identityStore:state.identityStore,
      semanticStateStore:state.semanticStateStore,
      memoryStore:state.memoryStore,
      situatedLifeStore:state.situatedLifeStore,
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
    assert.deepEqual(
      Object.keys(observedCommitment).sort(),
      ["commitmentId","compensation","endAt","mediatedContext","purpose","startAt"].sort(),
      "planning should receive the accepted work fact, not its private acceptance cognition",
    );

    closeAll(state);
  }));

test("Flight Planning cannot silently omit accepted visitor work", async () =>
  withDatabase(async (databasePath) => {
    const state = await setup(databasePath);

    await assert.rejects(
      replanForAcceptedInsideFibreWork({
        commitmentId:state.accepted.commitmentId,
        workStore:state.workStore,
        livedNowStore:state.livedNowStore,
        worldStore:state.worldStore,
        identityStore:state.identityStore,
        semanticStateStore:state.semanticStateStore,
        memoryStore:state.memoryStore,
        situatedLifeStore:state.situatedLifeStore,
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
      }),
      /must honor each accepted work commitment/u,
      "an accepted commitment must be load-bearing in planning",
    );

    assert.equal(
      state.livedNowStore.listPlans(state.accepted.threadId, { kind:"personal" }).length,
      1,
      "a plan that drops accepted work must not be admitted",
    );

    closeAll(state);
  }));
