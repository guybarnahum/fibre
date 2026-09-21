import assert from "node:assert/strict";
import test from "node:test";

import { createReciprocalMeetingService } from "../src/lived-reciprocal-meeting.mjs";

const AT = "2026-09-21T18:00:00.000Z";

function thread(threadId, name, selfDescription) {
  return {
    threadId,
    identity:{ name, selfDescription },
    currentState:{
      selfModel:selfDescription,
      unresolvedIntentions:[],
    },
    genome:{ textualTraits:{ temperament:`${name} has a distinct social rhythm.` } },
  };
}

const mina = thread("thr_n5_mina", "Mina", "I notice small emotional shifts and prefer unforced closeness.");
const noor = thread("thr_n5_noor", "Noor", "I am warm but protective of my quiet and my time.");

function situation(threadId, activity) {
  return {
    situationId:`sit_${threadId}`,
    threadId,
    establishedAt:AT,
    location:{ kind:"place", placeRef:"plce_shared_cafe" },
    mediatedContext:null,
    activity,
  };
}

function plan(threadId) {
  return {
    subjectThreadId:threadId,
    horizonEnd:"2026-09-21T23:00:00.000Z",
  };
}

function relations(threadId) {
  if (threadId === mina.threadId) {
    return [{
      relationId:"lrel_mina_noor",
      relatedParty:{ partyId:noor.threadId, displayName:"Noor" },
      relationKind:"social_contact",
      relationshipFacts:["Noor is someone Mina likes and is comfortable being quiet with."],
    }];
  }
  return [{
    relationId:"lrel_noor_mina",
    relatedParty:{ partyId:mina.threadId, displayName:"Mina" },
    relationKind:"social_contact",
    relationshipFacts:["Noor likes Mina but sometimes needs space when already absorbed in something."],
  }];
}

function service({ stanceFor = () => "accept" } = {}) {
  const situations = new Map([
    [mina.threadId, situation(mina.threadId, "Reading over coffee.")],
    [noor.threadId, situation(noor.threadId, "Sketching at the same café table.")],
  ]);
  const histories = [];
  const journals = [];
  const bookWrites = [];
  const memories = [];
  const shared = [];
  const ensured = [];
  const calls = [];

  const modelAdapter = {
    async invoke(call) {
      calls.push(structuredClone(call));
      const kind = call.clientRequestId.split("_")[0];
      if (kind === "meeting-stance") {
        const name = call.input.thread.name;
        return {
          output:{ decision:stanceFor(name), expression:null, suggestedAt:null },
          provenance:{ provider:"fixture", modelId:"fixture-n5" },
        };
      }
      if (kind === "meeting-opening") {
        return {
          output:{ responseText:"Hey Noor — mind if I sit with you for a minute?" },
          provenance:{ provider:"fixture", modelId:"fixture-n5" },
        };
      }
      if (kind === "lived-encounter") {
        const isNoor = call.input.thread.threadId === noor.threadId;
        return {
          output:{
            responseText:isNoor
              ? "Sure. I’m in the middle of this sketch, but quiet company sounds nice."
              : "That works for me. I like being here without having to fill the silence.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-n5" },
        };
      }
      if (kind === "lived-reflection") {
        const isNoor = call.input.thread.name === "Noor";
        return {
          output:{
            journalEntry:isNoor
              ? "I was a little annoyed at the interruption before I looked up. Then it was Mina, and the annoyance softened. I liked that she didn’t make me stop drawing."
              : "Sitting with Noor felt easy today. I noticed how relieved I was that neither of us had to perform conversation. The quiet felt companionable instead of empty.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-n5" },
        };
      }
      if (kind === "lived-memory") {
        const isMina = call.input.thread.selfDescription.startsWith("I notice");
        return {
          output:isMina ? {
            outcome:"retained",
            rememberedContent:"I remember sitting quietly with Noor while she sketched.",
            rememberedMeaning:"Quiet company with her can feel intimate without demanding anything.",
            confidence:0.9,
            salience:0.7,
            uncertainty:[],
          } : {
            outcome:"not_remembered",
            rememberedContent:null,
            rememberedMeaning:null,
            confidence:null,
            salience:null,
            uncertainty:[],
          },
          provenance:{ provider:"fixture", modelId:"fixture-n5" },
        };
      }
      throw new Error(`unexpected cognition ${call.clientRequestId}`);
    },
  };

  const meeting = createReciprocalMeetingService({
    worldReader:{
      getThread(threadId) {
        if (threadId === mina.threadId) return structuredClone(mina);
        if (threadId === noor.threadId) return structuredClone(noor);
        return null;
      },
    },
    livedNow:{
      async ensure(input) {
        ensured.push(structuredClone(input));
        return structuredClone(situations.get(input.threadId));
      },
    },
    livedNowStore:{
      getCurrentSituation(threadId) { return structuredClone(situations.get(threadId)); },
      latestPlan(threadId) { return structuredClone(plan(threadId)); },
    },
    situatedLifeStore:{
      listCurrentLifeRelations(threadId) { return structuredClone(relations(threadId)); },
    },
    semanticStateStore:{
      listCurrentState(threadId) {
        return threadId === mina.threadId
          ? [{ stateId:"sem_mina", domain:"emotion", dimension:"felt_state", target:null, state:"open and quietly affectionate" }]
          : [{ stateId:"sem_noor", domain:"need", dimension:"solitude", target:null, state:"wants continuity and low interruption" }];
      },
    },
    memoryStore:{
      listCurrentMemories() { return []; },
      recordMemory(candidate) {
        memories.push(structuredClone(candidate));
        return structuredClone(candidate);
      },
    },
    experienceStore:{
      recordSharedMeeting(candidate) {
        shared.push(structuredClone(candidate));
        return { sharedEventId:"meet_n5_shared", ...structuredClone(candidate) };
      },
      recordEncounter(candidate) {
        histories.push(structuredClone(candidate));
        return {
          eventId:`enc_${candidate.threadId}`,
          threadId:candidate.threadId,
          situationId:candidate.situationId,
          occurredAt:candidate.occurredAt,
          visitorUtterance:candidate.visitorUtterance,
          responseText:candidate.responseText,
          sharedEventRef:candidate.sharedEventRef,
        };
      },
      recordJournalEntry(candidate) {
        journals.push(structuredClone(candidate));
        return { journalEntryId:`journal_${candidate.threadId}`, ...structuredClone(candidate) };
      },
    },
    journalBook:{
      async getProfile(threadId) {
        return {
          threadId,
          title:threadId === mina.threadId ? "Small Hours" : "Margins",
          presentationStyle:threadId === mina.threadId ? "literary" : "notebook",
          aestheticNote:threadId === mina.threadId ? "Quiet pages with room to linger." : "Loose notes, lines and sketches in the margins.",
        };
      },
      async append(candidate) {
        bookWrites.push(structuredClone(candidate));
        return { objectKey:`journals/${candidate.threadId}/journal.md`, profile:candidate.profile };
      },
    },
    modelAdapter,
  });

  return { meeting, shared, histories, journals, bookWrites, memories, ensured, calls };
}

test("N5 one shared meeting leaves two private accounts and selective memory", async () => {
  const fixture = service();
  const result = await fixture.meeting.meet({
    initiatorThreadId:mina.threadId,
    responderThreadId:noor.threadId,
    at:AT,
  });

  assert.equal(result.outcome, "met", "both Threads should meet");
  assert.equal(fixture.ensured.length, 2, "both lives must be current");
  assert.equal(fixture.shared.length, 1, "meeting must be one shared event");
  assert.equal(fixture.histories.length, 2, "each Thread needs its own experience");
  assert.equal(
    fixture.histories.every((record) => record.sharedEventRef === result.sharedEvent.sharedEventId),
    true,
    "private experiences must cite the shared event",
  );
  assert.equal(fixture.journals.length, 2, "both Threads should privately reflect");
  assert.notEqual(fixture.journals[0].entryText, fixture.journals[1].entryText, "same meeting should feel different");
  assert.match(fixture.journals.find((entry) => entry.threadId === noor.threadId).entryText, /annoyed|softened/u,
    "Noor's journal should preserve her own feeling");
  assert.match(fixture.journals.find((entry) => entry.threadId === mina.threadId).entryText, /relieved|companionable/u,
    "Mina's journal should preserve her own feeling");
  assert.deepEqual(
    fixture.bookWrites.map((entry) => entry.threadId).sort(),
    [mina.threadId, noor.threadId].sort(),
    "both private books should receive the encounter",
  );
  assert.equal(fixture.memories.length, 1, "journal must not imply memory");
  assert.equal(fixture.memories[0].threadId, mina.threadId, "retention should remain personal");
});

test("N5 a Thread can stop a compatible meeting before shared history exists", async () => {
  const fixture = service({ stanceFor:(name) => name === "Noor" ? "decline" : "accept" });
  const result = await fixture.meeting.meet({
    initiatorThreadId:mina.threadId,
    responderThreadId:noor.threadId,
    at:AT,
  });

  assert.equal(result.compatible, true, "presence should be compatible");
  assert.equal(result.outcome, "not_met", "declining Thread should stop the meeting");
  assert.equal(result.stances[noor.threadId].decision, "decline", "Noor should retain agency");
  assert.equal(fixture.shared.length, 0, "declined meeting is not shared history");
  assert.equal(fixture.histories.length, 0, "declined meeting creates no encounter");
  assert.equal(fixture.journals.length, 0, "declined meeting creates no journal aftermath");
});
