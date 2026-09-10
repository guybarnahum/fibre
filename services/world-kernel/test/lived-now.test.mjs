import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
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

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lived-now-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function seedLife(databasePath) {
  const thread = childThread();
  const world = openWorldStore(localWorldStateStorage(databasePath));
  const seeded = world.seedThread(thread);
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

function personalPlan({ threadId, sourceEvent, homeRef }) {
  return {
    planId: livedPlanId({ threadId, kind: "personal", authoredAt: "2026-09-10T05:03:00Z" }),
    kind: "personal",
    subjectThreadId: threadId,
    owner: { partyId: threadId, kind: "thread" },
    authoredAt: "2026-09-10T05:03:00Z",
    validUntil: "2026-09-10T06:00:00Z",
    physicalPlaceRef: homeRef,
    presenceMode: "mediated",
    mediatedContext: "Monterey Bay Aquarium live octopus feed",
    activity: "Watch the octopus livestream closely and sketch the changes I notice.",
    purpose: "I want to understand how octopuses change their appearance before I stop for the afternoon.",
    companionRefs: [],
    sourceReferences: [sourceEvent, homeRef],
  };
}

function carePlan({ threadId, homeRef, parentRef, ownerId = "human_maya_mother" }) {
  return {
    planId: livedPlanId({ threadId, kind: "care", authoredAt: "2026-09-10T05:05:00Z", ownerId }),
    kind: "care",
    subjectThreadId: threadId,
    owner: { partyId: ownerId, kind: "human_source" },
    authoredAt: "2026-09-10T05:05:00Z",
    validUntil: "2026-09-10T05:30:00Z",
    physicalPlaceRef: homeRef,
    presenceMode: "physical",
    mediatedContext: null,
    activity: "Put the tablet away and get ready to leave for the dental appointment.",
    purpose: "Keep the scheduled appointment and leave enough time for the household to get there.",
    companionRefs: ["human_maya_mother"],
    sourceReferences: [parentRef, homeRef],
    authority: {
      relationRef: parentRef,
      scope: "Same-day household care and appointment coordination.",
      constraint: "required",
    },
  };
}

test("A1/A2: personal will exists before the visitor and care can constrain enactment without rewriting it", () =>
  withDatabase((databasePath) => {
    const life = seedLife(databasePath);
    const context = developmentalContextForThread(life.thread, "2026-09-10T05:03:00Z");
    assert.equal(context.ageYears, 10);
    assert.equal(context.birthDate, "2016-02-08");
    assert.match(context.selfDescription, /curious about animals/);

    let lived = openLivedNowStore(localWorldStateStorage(databasePath));
    const personal = lived.recordPlan(personalPlan({
      threadId: life.thread.threadId,
      sourceEvent: life.sourceEvent,
      homeRef: life.homeRef,
    }));
    const first = lived.enactCurrentSituation({
      threadId: life.thread.threadId,
      situationId: livedSituationId({ threadId: life.thread.threadId, step: "before-care" }),
      establishedAt: "2026-09-10T05:04:00Z",
    });
    assert.equal(first.resolution.kind, "personal_plan");
    assert.equal(first.presenceMode, "mediated");
    assert.equal(first.physicalPlaceRef, life.homeRef);
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
    assert.match(second.activity, /dental appointment/);
    assert.equal(second.presenceMode, "physical");
    assert.deepEqual(second.sourcePlanRefs, [personal.planId, care.planId]);
    assert.deepEqual(lived.latestPlan(life.thread.threadId, "personal", { at: second.establishedAt }), personal);
    assert.match(personal.activity, /octopus livestream/);
    lived.close();

    lived = openLivedNowStore(localWorldStateStorage(databasePath));
    assert.deepEqual(lived.getCurrentSituation(life.thread.threadId), second);
    assert.equal(lived.listPlans(life.thread.threadId).length, 2);
    lived.close();
  }));

test("A1/A2 authority boundaries reject visitor-authored now and unrelated caregiver authority", () =>
  withDatabase((databasePath) => {
    const life = seedLife(databasePath);
    const lived = openLivedNowStore(localWorldStateStorage(databasePath));
    lived.recordPlan(personalPlan({
      threadId: life.thread.threadId,
      sourceEvent: life.sourceEvent,
      homeRef: life.homeRef,
    }));

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
    assert.match(current.activity, /octopus livestream/);
    lived.close();
  }));
