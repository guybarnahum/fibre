import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openContactStore } from "../src/contact-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { configureWorldOrganismPolicy, socialContactEvidenceForLivedHistory } from "../src/lived-now-regulation.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { createThreadContactProcess } from "../src/thread-contact-process.mjs";

const seed = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));

// ---- Being among people, and each message (the social need) ----

const SELF = "thr_presence_self";
const locus = (variantId) => {
  const family = URGE_FAMILY_BY_NAME.get(variantId.replace(/_\d+$/u, ""));
  const variant = family.variants.find((item) => item.variantId === variantId);
  return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:variant.positions };
};
const body = (variantId) => ({ threadId:SELF, genome:{ runtimeBaselines:{},
  urgeProjection:variantId === null ? [] : [locus(variantId)] } });
// Home alone from 04:00, then the library from 06:00 until noon.
const situation = (at, placeRef) => ({ threadId:SELF, situationId:`sit_${at.slice(11, 13)}`, establishedAt:at,
  location:{ kind:"place", placeRef }, wakefulness:"awake" });
const day = [situation("2026-11-12T04:00:00.000Z", "wpl_home"), situation("2026-11-12T06:00:00.000Z", "wpl_library"),
  situation("2026-11-12T08:00:00.000Z", "wpl_library"), situation("2026-11-12T10:00:00.000Z", "wpl_library")];
const NOON = "2026-11-12T12:00:00.000Z";
const hoursUnmet = (thread, { company = "stranger", messages = [] } = {}) => socialContactEvidenceForLivedHistory({
  threadId:SELF, currentSituation:day.at(-1), asOf:NOON, thread,
  livedNowStore:{
    getPreviousSituation:(threadId, before) => [...day].reverse().find((item) => item.establishedAt < before) ?? null,
    getWorldPlace:(threadId, placeRef) => ({ physicalVenue:{ ref:placeRef } }),
    listCurrentVenueSituations:({ venueRef }) =>
      venueRef === "wpl_library" && company !== null ? [{ threadId:`thr_${company}` }] : [],
  },
  experienceStore:{
    listSocialInteractions:() => [], listAcceptedHumanMeetings:() => [], listReciprocalConversations:() => [],
    listSocialExposures:() => messages.map((at, i) => ({ kind:"message", ref:`msg_${i}`, at })).reverse(),
    listOpenDoors:(threadId, other) => other === "thr_friend" ? ["conversation"] : [],
  },
}).observedUnmetHours;

test("a morning among people eases a Body by what it inherited to want", () => {
  const near = (hours, expected, message) => assert.ok(Math.abs(hours - expected) < 1e-6, `${message} (${hours})`);
  near(hoursUnmet(body("social_contact_01")), 2, "the hum of strangers did not ease a Body that wants people around");
  near(hoursUnmet(body("social_contact_08")), 6.5, "people around eased a Body that wants talk more than a little");
  near(hoursUnmet(body("social_contact_04")), 8, "strangers eased a Body that wants someone familiar");
  near(hoursUnmet(body("social_contact_04"), { company:"friend" }), 2, "a friend there did not ease a Body that wants someone familiar");
  near(hoursUnmet(body("social_contact_09"), { company:null }), 8, "an empty library eased the need");
});

test("a run of messages eases missing someone far more than one, and never a Body that wants people around", () => {
  const run = Array.from({ length:16 }, (_, i) => new Date(Date.parse("2026-11-12T08:00:00.000Z") + i * 15 * 60_000).toISOString());
  const familiar = body("social_contact_04"), ambient = body("social_contact_01");
  const one = hoursUnmet(familiar, { company:null, messages:[run.at(-1)] });
  const many = hoursUnmet(familiar, { company:null, messages:run });
  assert.ok(many < one / 2, "sixteen messages eased no more than one");
  assert.equal(hoursUnmet(ambient, { company:null, messages:run }), hoursUnmet(ambient, { company:null }),
    "messages eased a Body whose wanting is for bustle around it");
});

test("with inherited spread at zero, every Body is eased the species way", () => {
  configureWorldOrganismPolicy({ ...DEFAULT_ORGANISM_POLICY, inheritedSpread:0 });
  try {
    for (const company of ["stranger", "friend"])
      assert.equal(hoursUnmet(body("social_contact_01"), { company }), hoursUnmet(body(null), { company }),
        "an inherited orientation acted with spread at zero");
  } finally { configureWorldOrganismPolicy(DEFAULT_ORGANISM_POLICY); }
});

// ---- Going over to someone here ----

const VISIT = "2026-11-12T09:00:00.000Z";
function person(threadId, name) {
  const value = structuredClone(seed);
  Object.assign(value, { threadId, relationshipRefs:[], memoryRefs:[],
    provenance:{ createdAt:"2026-11-01T00:00:00.000Z", createdBy:"fibre.test", lastEventId:`evt_${threadId}` } });
  value.identity.name = name;
  return value;
}
const at = (minute) => new Date(Date.parse(VISIT) + minute * 60_000).toISOString();
const here = (threadId) => ({ threadId, situationId:`sit_${threadId}`, establishedAt:VISIT, wakefulness:"awake",
  location:{ kind:"place", placeRef:"wpl_library" }, outwardActivity:"reading at a corner table" });

function afterthought(store, threadId, minute, text) {
  const story = { storyVersion:"encounter-story-v0.1",
    beats:[{ actorThreadId:threadId, kind:"action", text:"The Thread turns a page." }] };
  const occurredAt = at(minute);
  const recorded = store.recordEncounterStory({ occurredAt, threadPresence:[{ threadId, situationId:`sit_${threadId}` }],
    story, visualization:createEncounterVisualization({ occurredAt, story, scene:"A reading room.",
      sourceReferences:[`sit_${threadId}`], depictedThreadRefs:[threadId] }) });
  const attention = store.recordThreadEncounterAttention({ threadId, encounterRef:recorded.encounterId,
    situationId:`sit_${threadId}`, occurredAt, outcome:"noticed", experienceText:"A thought stayed with me." });
  store.queueThreadExperienceConsolidation({ experienceId:attention.experience.experienceId, queuedAt:occurredAt });
  const consolidation = store.createThreadExperienceConsolidation({ threadId,
    experienceRefs:[attention.experience.experienceId], startedAt:at(minute + 1) });
  store.recordThreadExperienceConsolidationStage({ consolidationId:consolidation.consolidationId, stage:"decision",
    recordedAt:at(minute + 1), payload:{ journalEntry:null, afterthoughts:[{ kind:"question", text }],
      memory:{ outcome:"not_remembered", rememberedContent:null, rememberedMeaning:null, confidence:null,
        salience:null, uncertainty:[] } } });
  store.recordThreadExperienceConsolidationStage({ consolidationId:consolidation.consolidationId, stage:"complete",
    recordedAt:at(minute + 1), payload:{ journalEntryId:null, memoryOutcome:"not_remembered", memoryId:null,
      afterthoughtCount:1 } });
}

test("a Thread can go over to someone it has seen here instead of writing, carrying what it had on its mind, at most three times a visit", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-presence-"));
  const storage = { infraDriver:createSqliteStateInfraDriver({ scopes:{ world:join(directory, "world.sqlite") } }),
    stateScopeId:"world" };
  const world = openWorldStore(storage), experienceStore = openLivedExperienceStore(storage);
  const contactStore = openContactStore(storage), situatedLifeStore = openSituatedLifeStore(storage);
  try {
    const [kaleb, bontu, iris, tomas] = [["thr_p_kaleb", "Kaleb"], ["thr_p_bontu", "Bontu"],
      ["thr_p_iris", "Iris"], ["thr_p_tomas", "Tomas"]].map(([id, name]) => person(id, name));
    for (const item of [kaleb, bontu, iris, tomas]) world.seedThread(item);
    situatedLifeStore.recordLifeRelation({ relationId:lifeRelationId({ threadId:kaleb.threadId, partyId:bontu.threadId, role:"peer" }),
      revision:1, threadId:kaleb.threadId, relatedParty:{ partyId:bontu.threadId, kind:"thread", displayName:"Bontu" },
      relationKind:"social_contact", geneticContributionRole:"none", factualRoleRefs:["peer"],
      relationshipFacts:["Bontu is someone Kaleb has talked with."], sourceReferences:[world.getThread(kaleb.threadId).provenance.lastEventId],
      validFrom:"2026-11-01T00:00:00.000Z", validTo:null, visibility:"restricted", provenance:"world_recorded",
      recordedAt:"2026-11-01T00:00:00.000Z" });
    // Kaleb arrives and sees Bontu and Iris; Tomas is in the building, unseen.
    const arrival = { storyVersion:"encounter-story-v0.1", beats:[
      { actorThreadId:kaleb.threadId, kind:"action", text:"Kaleb arrives at the library." },
      { actorThreadId:bontu.threadId, kind:"occurrence", text:"Bontu is reading." },
      { actorThreadId:iris.threadId, kind:"occurrence", text:"Iris is reading." }] };
    experienceStore.recordEncounterStory({ occurredAt:VISIT, story:arrival,
      threadPresence:[kaleb, bontu, iris].map(({ threadId }) => ({ threadId, situationId:`sit_${threadId}` })),
      visualization:createEncounterVisualization({ occurredAt:VISIT, story:arrival, scene:"A reading room.",
        sourceReferences:[`sit_${kaleb.threadId}`], depictedThreadRefs:[] }) });
    for (const minute of [10, 20, 30, 40])
      afterthought(experienceStore, kaleb.threadId, minute, `What does a hedge do to a claim? (${minute})`);

    const offered = [], approaches = [];
    let clock = 60;
    const process = createThreadContactProcess({
      worldReader:world, situatedLifeStore, experienceStore, contactStore,
      semanticStateStore:openSemanticStateStore(storage), memoryStore:openAutobiographicalMemoryStore(storage),
      livedNow:{ ensure:async ({ threadId, at:now }) => ({ ...here(threadId), establishedAt:now }) },
      livedNowStore:{
        getPreviousSituation:() => null, getCurrentSituation:here, inspectLivedBoundary:() => null,
        getWorldPlace:(threadId, placeRef) => ({ physicalVenue:{ ref:placeRef } }),
        listCurrentVenueSituations:({ excludeThreadId }) =>
          [bontu, iris, tomas].map(({ threadId }) => here(threadId)).filter((item) => item.threadId !== excludeThreadId),
      },
      modelAdapter:{ async invoke(call) {
        const parties = call.input.routableKnownParties;
        offered.push(parties);
        const toBontu = parties.find((item) => item.partyId === bontu.threadId && item.here);
        return { output:toBontu ? { decision:"go_over", recipientPartyId:bontu.threadId, reason:"She is right here." }
          : { decision:"keep_private", recipientPartyId:null, reason:"Not now." }, provenance:{ provider:"fixture" } };
      } },
      meetingService:{ async meet(input) {
        approaches.push(input);
        return { outcome:"met", attempts:[{ outcome:"met", encounterStory:{ encounterId:"story_went_over" } }] };
      } },
      now:() => at(clock++),
    });
    const result = await process.runOnce();

    const first = new Map(offered[0].map((item) => [item.partyId, item]));
    assert.ok(first.get(bontu.threadId)?.here && first.get(bontu.threadId).canWrite, "a friend here was not offered both ways");
    assert.ok(first.get(iris.threadId)?.here && !first.get(iris.threadId).canWrite, "someone seen here, with no way to write, was not offered going over");
    assert.ok(!first.has(tomas.threadId), "someone never seen this visit was treated as here");
    assert.equal(approaches.length, 3, "going over was not held to three times a visit");
    assert.ok(approaches.every((input) => input.counterpartyThreadId === bontu.threadId && input.sourceKind === "intention"
      && input.cameOverToSay[0].text.startsWith("What does a hedge")), "going over lost whom it was for or what was on its mind");
    assert.ok(offered[3].find((item) => item.partyId === bontu.threadId)?.here === undefined, "a fourth approach was offered");
    assert.equal(contactStore.listSent(kaleb.threadId).length, 0, "going over wrote a message");
    assert.deepEqual(result.results.map((item) => item.outcome), ["went_over", "went_over", "went_over", "kept_private"]);
  } finally {
    world.close(); experienceStore.close(); contactStore.close(); situatedLifeStore.close();
    rmSync(directory, { recursive:true, force:true });
  }
});
