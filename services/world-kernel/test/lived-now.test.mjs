import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { formPersonalLivedPlan } from "../src/lived-plan-cognition.mjs";
import {
  developmentalContextForThread,
  livedPlanId,
  livedSituationId,
} from "../src/lived-now.mjs";
import {
  LivedNowConflictError,
  openLivedNowStore,
} from "../src/lived-now-store.mjs";
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

function childThread() {
  const thread = structuredClone(mina);
  thread.threadId = "thr_m2_maya_001";
  thread.identity = {
    ...thread.identity,
    name: "Maya Vale",
    birthDate: "2016-02-08",
    selfDescription: "I am ten, curious about animals and drawing, and I like finishing what I am absorbed in before switching plans.",
  };
  thread.currentState = {
    needs: ["Have enough unhurried time to explore things that catch my attention."],
    feelings: ["absorbed and curious"],
    selfModel: "I learn by watching closely, sketching details, and asking why things change.",
    unresolvedIntentions: ["Finish watching the octopus feed and sketch what I notice."],
  };
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-09-10T05:00:00Z",
    createdBy: "m2-lived-now-test",
  };
  return thread;
}

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lived-now-"));
  const databasePath = join(directory, "world.sqlite");
  try { return await run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function seedLife(databasePath) {
  const thread = childThread();
  const world = openWorldStore(localWorldStateStorage(databasePath));
  const seeded = world.seedThread(thread).thread;
  world.close();

  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  const sourceEvent = database.prepare(
    "SELECT event_id FROM thread_events WHERE thread_id=? AND event_type='THREAD_SEEDED'",
  ).get(thread.threadId).event_id;
  database.close();

  const situated = openSituatedLifeStore(localWorldStateStorage(databasePath));
  const home = situated.recordPlaceEpisode({
    episodeId: placeEpisodeId({ thread: thread.threadId, place: "home-haifa" }),
    revision: 1,
    threadId: thread.threadId,
    episodeKind: "residence",
    place: {
      placeId: "place.il.haifa.home",
      displayName: "Home in Haifa",
      countryCode: "IL",
      region: "Haifa District",
      locality: "Haifa",
      precision: "locality",
    },
    startAt: "2024-08-01T00:00:00Z",
    endAt: null,
    sourceReferences: [sourceEvent],
    visibility: "private",
    provenance: "thread_history",
    recordedAt: "2026-09-10T05:01:00Z",
  });
  const parent = situated.recordLifeRelation({
    relationId: lifeRelationId({ child: thread.threadId, parent: "maya-mother" }),
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
    recordedAt: "2026-09-10T05:02:00Z",
  });
  situated.close();

  return {
    thread: seeded,
    sourceEvent,
    homeRef: placeEpisodeRevisionRef(home),
    parentRef: lifeRelationRevisionRef(parent),
  };
}

function cognition(homeRef) {
  let invocation = null;
  return {
    invocation: () => invocation,
    adapter: {
      provider: "fixture",
      modelId: "fixture-lived-plan-v1",
      async invoke(input) {
        invocation = structuredClone(input);
        return {
          output: {
            physicalPlaceRef: homeRef,
            presenceMode: "mediated",
            mediatedContext: "Monterey Bay Aquarium live octopus feed",
            activity: "Watch the octopus livestream closely and sketch the changes I notice.",
            purpose: "I want to understand how octopuses change their appearance before I stop for the afternoon.",
          },
          provenance: {
            provider: "fixture",
            modelId: "fixture-lived-plan-v1",
            providerRequestId: "req_maya_personal_plan_001",
          },
        };
      },
    },
  };
}

function stop({ startAt, endAt, homeRef, mediatedContext, activity, purpose, companionRefs = [] }) {
  return {
    startAt,
    endAt,
    physicalPlaceRef: homeRef,
    mediatedContext,
    activity,
    purpose,
    companionRefs,
    travelFromPrevious: null,
  };
}

function personalPlanFixture({ threadId, sourceEvent, homeRef }) {
  const authoredAt = "2026-09-10T05:03:00Z";
  const horizonEnd = "2026-09-10T06:00:00Z";
  return {
    planId: livedPlanId({ threadId, kind: "personal", authoredAt }),
    kind: "personal",
    subjectThreadId: threadId,
    owner: { partyId: threadId, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd,
    stops: [stop({
      startAt: authoredAt,
      endAt: horizonEnd,
      homeRef,
      mediatedContext: "Monterey Bay Aquarium live octopus feed",
      activity: "Watch the octopus livestream closely and sketch the changes I notice.",
      purpose: "I want to understand how octopuses change their appearance before I stop for the afternoon.",
    })],
    sourceReferences: [sourceEvent, homeRef],
    cognition: {
      provider: "fixture",
      modelId: "fixture-lived-plan-v1",
      providerRequestId: "req_fixture_boundary",
    },
  };
}

function carePlan({ threadId, homeRef, parentRef, ownerId = "human_maya_mother" }) {
  const authoredAt = "2026-09-10T05:05:00Z";
  const horizonEnd = "2026-09-10T05:30:00Z";
  return {
    planId: livedPlanId({ threadId, kind: "care", authoredAt, ownerId }),
    kind: "care",
    subjectThreadId: threadId,
    owner: { partyId: ownerId, kind: "human_source" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd,
    stops: [stop({
      startAt: authoredAt,
      endAt: horizonEnd,
      homeRef,
      mediatedContext: null,
      activity: "Put the tablet away and get ready to leave for the dental appointment.",
      purpose: "Keep the scheduled appointment and leave enough time for the household to get there.",
      companionRefs: ["human_maya_mother"],
    })],
    sourceReferences: [parentRef, homeRef],
    authority: {
      relationRef: parentRef,
      scope: "Same-day household care and appointment coordination.",
      constraint: "required",
    },
  };
}

test("A1/A2: Thread cognition forms personal will before visitor and care constrains enactment without rewriting it", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const context = developmentalContextForThread(life.thread, "2026-09-10T05:03:00Z");
    assert.equal(context.ageYears, 10);
    assert.equal(context.birthDate, "2016-02-08");
    assert.match(context.selfDescription, /curious about animals/);
    assert.deepEqual(context.feelings, ["absorbed and curious"]);

    const planner = cognition(life.homeRef);
    const formed = await formPersonalLivedPlan({
      thread: life.thread,
      authoredAt: "2026-09-10T05:03:00Z",
      validUntil: "2026-09-10T06:00:00Z",
      availablePlaces: [{ ref: life.homeRef, displayName: "Home in Haifa" }],
      sourceReferences: [life.sourceEvent],
      modelAdapter: planner.adapter,
    });
    assert.equal(planner.invocation().input.developmentalContext.ageYears, 10);
    assert.deepEqual(planner.invocation().input.developmentalContext.unresolvedIntentions, [
      "Finish watching the octopus feed and sketch what I notice.",
    ]);
    assert.equal(formed.owner.partyId, life.thread.threadId);
    assert.equal(formed.cognition.modelId, "fixture-lived-plan-v1");
    assert.equal(formed.stops.length, 1);
    assert.equal(formed.stops[0].mediatedContext, "Monterey Bay Aquarium live octopus feed");

    let lived = openLivedNowStore(localWorldStateStorage(databasePath));
    const personal = lived.recordPlan(formed);
    const first = lived.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: livedSituationId({ threadId: life.thread.threadId, step: "before-care" }),
      establishedAt: "2026-09-10T05:04:00Z",
    });
    assert.equal(first.resolution.kind, "personal_plan");
    assert.equal(first.resolution.conflict, false);
    assert.equal(first.resolution.enactedPlanRef, personal.planId);
    assert.equal(first.phase, "at_place");
    assert.deepEqual(first.location, { kind: "place", placeRef: life.homeRef });
    assert.equal(first.mediatedContext, "Monterey Bay Aquarium live octopus feed");
    assert.deepEqual(first.sourcePlanRefs, [personal.planId]);
    lived.close();

    lived = openLivedNowStore(localWorldStateStorage(databasePath));
    assert.deepEqual(lived.getCurrentSituation(life.thread.threadId), first);

    const care = lived.recordPlan(carePlan({
      threadId: life.thread.threadId,
      homeRef: life.homeRef,
      parentRef: life.parentRef,
    }));
    const second = lived.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: livedSituationId({ threadId: life.thread.threadId, step: "care-conflict" }),
      establishedAt: "2026-09-10T05:06:00Z",
    });

    assert.equal(second.resolution.kind, "care_constraint");
    assert.equal(second.resolution.conflict, true);
    assert.equal(second.resolution.enactedPlanRef, care.planId);
    assert.equal(second.resolution.constrainedPlanRef, personal.planId);
    assert.match(second.activity, /dental appointment/);
    assert.equal(second.phase, "at_place");
    assert.deepEqual(second.location, { kind: "place", placeRef: life.homeRef });
    assert.equal(second.mediatedContext, null);
    assert.deepEqual(second.sourcePlanRefs, [personal.planId, care.planId]);
    assert.deepEqual(lived.latestPlan(life.thread.threadId, "personal", { at: second.establishedAt }), personal);
    assert.match(personal.stops[0].activity, /octopus livestream/);
    lived.close();

    lived = openLivedNowStore(localWorldStateStorage(databasePath));
    assert.deepEqual(lived.getCurrentSituation(life.thread.threadId), second);
    assert.equal(lived.listPlans(life.thread.threadId).length, 2);
    lived.close();
  }));

test("A1/A2 authority boundaries reject unauthored will, visitor-authored now, and unrelated caregiver authority", async () =>
  withDatabase(async (databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    const personal = personalPlanFixture({
      threadId: life.thread.threadId,
      sourceEvent: life.sourceEvent,
      homeRef: life.homeRef,
    });
    const { cognition: ignored, ...withoutCognition } = personal;
    assert.throws(() => lived.recordPlan(withoutCognition), /requires Thread cognition provenance/);
    lived.recordPlan(personal);

    assert.throws(() => lived.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: "sit_visitor_authored",
      establishedAt: "2026-09-10T05:04:00Z",
      activity: "Do what the visitor asked.",
    }), /activity is not allowed/);

    assert.throws(() => lived.recordPlan(carePlan({
      threadId: life.thread.threadId,
      homeRef: life.homeRef,
      parentRef: life.parentRef,
      ownerId: "human_unrelated_visitor",
    })), LivedNowConflictError);

    const current = lived.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: "sit_still_personal",
      establishedAt: "2026-09-10T05:04:30Z",
    });
    assert.equal(current.resolution.kind, "personal_plan");
    assert.equal(current.resolution.conflict, false);
    assert.match(current.activity, /octopus livestream/);
    lived.close();
  }));
