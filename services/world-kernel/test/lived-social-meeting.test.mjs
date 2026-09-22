import assert from "node:assert/strict";
import test from "node:test";

import { createSocialMeetingService } from "../src/lived-social-meeting.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";

const AT = "2026-09-21T18:00:00.000Z";

function thread(threadId, name, selfDescription) {
  return {
    threadId,
    identity:{ name, selfDescription },
    currentState:{ selfModel:selfDescription, unresolvedIntentions:[] },
    genome:{ textualTraits:{ temperament:`${name} has a distinct social rhythm.` } },
  };
}

const mina = thread("thr_n5_mina", "Mina", "I notice small emotional shifts and prefer unforced closeness.");
const noor = thread("thr_n5_noor", "Noor", "I am warm but protective of my quiet and my time.");
const sela = thread("thr_n5_sela", "Sela", "I pay close attention to how people treat each other, even when I stay out of it.");

function placeEpisode(threadId, episodeId, placeId = "place_n5_cafe") {
  return {
    episodeId,
    revision:1,
    threadId,
    episodeKind:"formative_presence",
    place:{
      placeId,
      displayName:"The same neighborhood café",
      countryCode:"US",
      region:"AZ",
      locality:"Tucson",
      precision:"locality",
    },
    startAt:"2026-09-01T00:00:00.000Z",
    endAt:null,
    sourceReferences:[`evt_${threadId}_cafe`],
    visibility:"private",
    status:"current",
    provenance:"thread_history",
    recordedAt:"2026-09-01T00:00:00.000Z",
  };
}

function situation(threadId, activity, placeRef) {
  return {
    situationId:`sit_${threadId}`,
    threadId,
    establishedAt:AT,
    location:{ kind:"place", placeRef },
    mediatedContext:null,
    activity,
  };
}

function plan(threadId) {
  return { subjectThreadId:threadId, horizonEnd:"2026-09-21T23:00:00.000Z" };
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
  if (threadId === noor.threadId) {
    return [{
      relationId:"lrel_noor_mina",
      relatedParty:{ partyId:mina.threadId, displayName:"Mina" },
      relationKind:"social_contact",
      relationshipFacts:["Noor likes Mina but sometimes needs space when already absorbed in something."],
    }];
  }
  return [];
}

function fixture({ initiationFor = () => "initiate", stanceFor = () => "accept", compatible = true, rude = false } = {}) {
  const minaCafe = placeEpisode(mina.threadId, "plce_n5_mina_cafe");
  const noorCafe = placeEpisode(
    noor.threadId,
    "plce_n5_noor_cafe",
    compatible ? "place_n5_cafe" : "place_n5_elsewhere",
  );
  const selaCafe = placeEpisode(sela.threadId, "plce_n5_sela_cafe");
  const placeEpisodes = new Map([
    [mina.threadId, [minaCafe]],
    [noor.threadId, [noorCafe]],
    [sela.threadId, [selaCafe]],
  ]);
  const situations = new Map([
    [mina.threadId, situation(mina.threadId, "Reading over coffee.", placeEpisodeRevisionRef(minaCafe))],
    [noor.threadId, situation(noor.threadId, "Sketching at the same café table.", placeEpisodeRevisionRef(noorCafe))],
    [sela.threadId, situation(sela.threadId, "Waiting for tea at the next table.", placeEpisodeRevisionRef(selaCafe))],
  ]);
  const stories = [];
  const attentions = [];
  const experiences = [];
  const initiationNames = [];
  const stanceNames = [];
  const storyAuthors = [];
  const journals = [];
  const bookWrites = [];
  const memories = [];
  const ensured = [];

  const modelAdapter = {
    async invoke(call) {
      if (call.clientRequestId.startsWith("meeting-invitation_")) {
        initiationNames.push(call.input.thread.name);
        const decision = initiationFor(call.input.thread.name);
        return {
          output:{
            decision,
            invitationText:decision === "initiate"
              ? rude
                ? "Noor, move your sketch. You’re taking up too much of the table."
                : "Hey Noor — mind if I sit with you for a minute?"
              : null,
          },
          provenance:{ provider:"fixture", modelId:"fixture-social" },
        };
      }
      if (call.clientRequestId.startsWith("meeting-stance_")) {
        stanceNames.push(call.input.thread.name);
        assert.equal(call.input.invitation.initiatorThreadId, mina.threadId);
        assert.equal(typeof call.input.invitation.text, "string");
        return {
          output:{ decision:stanceFor(call.input.thread.name), expression:null, suggestedAt:null },
          provenance:{ provider:"fixture", modelId:"fixture-social" },
        };
      }
      if (call.clientRequestId.startsWith("social-encounter-story_")) {
        storyAuthors.push(call.input.thread.name);
        return call.input.thread.name === "Noor"
          ? {
              output:{
                beatKind:"utterance",
                beatText:rude
                  ? "You could have asked without talking to me like that."
                  : "Sure. I’m in the middle of this sketch, but quiet company sounds nice.",
              },
              provenance:{ provider:"fixture", modelId:"fixture-e0" },
            }
          : {
              output:{ beatKind:null, beatText:null },
              provenance:{ provider:"fixture", modelId:"fixture-e0" },
            };
      }
      if (call.clientRequestId.startsWith("encounter-attention_")) {
        assert.equal(call.input.thread.name, "Sela", "only witness should need attention appraisal");
        return {
          output:{
            outcome:"noticed",
            experienceText:"I stayed quiet, but my shoulders tightened when Mina spoke to Noor that way. I felt protective of Noor and wary of Mina.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-e3" },
        };
      }
      if (call.clientRequestId.startsWith("encounter-experience_")) {
        return {
          output:{
            experienceText:rude
              ? call.input.thread.name === "Noor"
                ? "I felt heat rise in my face when Mina ordered me to move my sketch. I was angry that she spoke to me as if I were in the way."
                : "I heard the edge in my own voice after Noor pushed back, and I felt a flash of defensiveness."
              : call.input.thread.name === "Noor"
                ? "I felt the tug between wanting to keep sketching and being glad it was Mina asking."
                : "I felt relieved that Noor made room without turning the moment into a big thing.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-e2" },
        };
      }
      if (call.clientRequestId.startsWith("encounter-reflection_")) {
        const name = call.input.thread.name;
        return {
          output:{
            journalEntry:rude
              ? name === "Noor"
                ? "Mina spoke to me like I was clutter in her way. I hated how quickly I felt small, then angry."
                : name === "Sela"
                  ? "I didn't say anything. I kept thinking about how small Noor looked after Mina snapped at her, and how quickly the room felt less friendly."
                  : "I was sharper with Noor than I meant to be. Her pushback made me defensive before I could soften."
              : name === "Noor"
                ? "I was a little annoyed at the interruption before I looked up. Then it was Mina, and the annoyance softened."
                : "Sitting with Noor felt easy today. The quiet felt companionable instead of empty.",
          },
          provenance:{ provider:"fixture", modelId:"fixture-e0" },
        };
      }
      if (call.clientRequestId.startsWith("lived-memory_")) {
        const isMina = call.input.thread.selfDescription.startsWith("I notice");
        const isWitness = call.input.experience.experiencedAs?.includes("protective of Noor");
        assert.equal(typeof call.input.experience.experiencedAs, "string",
          "memory should receive Thread Experience");
        return {
          output:isWitness ? {
            outcome:"retained",
            rememberedContent:"I remember watching Mina speak harshly to Noor while I sat nearby.",
            rememberedMeaning:"How someone treats another person when they are irritated matters to how safe I feel around them.",
            confidence:0.9,
            salience:0.8,
            uncertainty:[],
          } : isMina && !rude ? {
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
          provenance:{ provider:"fixture", modelId:"fixture-e0" },
        };
      }
      throw new Error(`unexpected cognition ${call.clientRequestId}`);
    },
  };

  const meeting = createSocialMeetingService({
    worldReader:{
      getThread(threadId) {
        if (threadId === mina.threadId) return structuredClone(mina);
        if (threadId === noor.threadId) return structuredClone(noor);
        if (threadId === sela.threadId) return structuredClone(sela);
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
      listCurrentPlaceEpisodes(threadId) { return structuredClone(placeEpisodes.get(threadId)); },
    },
    semanticStateStore:{
      listCurrentState(threadId) {
        if (threadId === mina.threadId) {
          return [{ stateId:"sem_mina", domain:"emotion", dimension:"felt_state", target:null, state:"open and quietly affectionate" }];
        }
        if (threadId === noor.threadId) {
          return [{ stateId:"sem_noor", domain:"need", dimension:"solitude", target:null, state:"wants continuity and low interruption" }];
        }
        return [{ stateId:"sem_sela", domain:"emotion", dimension:"felt_state", target:null, state:"quietly observant and sensitive to interpersonal tension" }];
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
      recordEncounterStory(candidate) {
        stories.push(structuredClone(candidate));
        return { encounterId:"story_e0_social", ...structuredClone(candidate) };
      },
      getThreadEncounterAttention(threadId, encounterRef) {
        return structuredClone(
          attentions.find((attention) => attention.threadId === threadId
            && attention.encounterRef === encounterRef) ?? null,
        );
      },
      recordThreadEncounterAttention(candidate) {
        const experience = candidate.outcome === "noticed"
          ? {
              experienceId:`exp_${candidate.threadId}`,
              threadId:candidate.threadId,
              encounterRef:candidate.encounterRef,
              situationId:candidate.situationId,
              occurredAt:candidate.occurredAt,
              experienceText:candidate.experienceText,
            }
          : null;
        if (experience !== null) experiences.push(structuredClone(experience));
        const attention = { ...structuredClone(candidate), experience };
        attentions.push(structuredClone(attention));
        return attention;
      },
      recordThreadExperienceJournalEntry(candidate) {
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
          aestheticNote:threadId === mina.threadId
            ? "Quiet pages with room to linger."
            : "Loose notes and lines in the margins.",
        };
      },
      async append(candidate) {
        bookWrites.push(structuredClone(candidate));
        return { objectKey:`journals/${candidate.threadId}/journal.md`, profile:candidate.profile };
      },
    },
    modelAdapter,
  });

  return {
    meeting,
    stories,
    attentions,
    experiences,
    journals,
    bookWrites,
    memories,
    ensured,
    initiationNames,
    stanceNames,
    storyAuthors,
  };
}

test("E2 accepted meeting is one Encounter Story with distinct Thread Experiences", async () => {
  const f = fixture();
  const result = await f.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(result.outcome, "met", "meeting should form");
  assert.equal(f.ensured.length, 2, "both lives must be current");
  assert.deepEqual(f.initiationNames, ["Mina"], "meeting must begin from initiator agency");
  assert.deepEqual(f.stanceNames, ["Noor"], "only invitees should decide whether to accept");
  assert.equal(result.encounterStory.story.beats[0].text, "Hey Noor — mind if I sit with you for a minute?",
    "accepted invitation must become the first objective story beat");
  assert.equal(f.stories.length, 1, "meeting should create one Encounter Story");
  assert.equal(f.experiences.length, 2, "each participant should own an experience");
  assert.equal(
    f.experiences.every((experience) => experience.encounterRef === result.encounterStory.encounterId),
    true,
    "private experiences must cite the same Encounter Story",
  );
  assert.notEqual(
    f.experiences[0].experienceText,
    f.experiences[1].experienceText,
    "same story should feel different to different Threads",
  );
  assert.deepEqual(
    result.encounterStory.threadPresence.map((presence) => presence.situationId).sort(),
    [`sit_${mina.threadId}`, `sit_${noor.threadId}`].sort(),
    "meeting must use the lives already underway",
  );
  assert.equal(f.journals.length, 2, "private reflection should stay per Thread");
  assert.notEqual(f.journals[0].entryText, f.journals[1].entryText, "private accounts should remain personal");
  assert.equal(f.bookWrites.length, 2, "both journal books should receive their private entry");
  assert.equal(f.memories.length, 1, "journal must not imply autobiographical retention");
});

test("E2 incompatible presence or decline creates no Encounter Story", async () => {
  const apart = fixture({ compatible:false });
  const incompatible = await apart.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(incompatible.outcome, "incompatible", "separate places must stay separate");
  assert.equal(apart.stories.length, 0, "incompatible lives must not be rearranged into a meeting");

  const declined = fixture({ stanceFor:(name) => name === "Noor" ? "decline" : "accept" });
  const result = await declined.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(result.compatible, true, "presence should be compatible");
  assert.equal(result.outcome, "not_met", "decline should stop the voluntary encounter");
  assert.equal(result.invitation.text, "Hey Noor — mind if I sit with you for a minute?",
    "decline must answer a real outward invitation");
  assert.equal(result.stances[noor.threadId].decision, "decline", "Noor should retain agency");
  assert.equal(declined.stories.length, 0, "decline must not fabricate an Encounter Story");
  assert.equal(declined.experiences.length, 0, "no story means no Thread Experience");
  assert.equal(declined.journals.length, 0, "no story means no private aftermath");
});


test("E3 one social story may affect a silent co-present witness", async () => {
  const f = fixture({ rude:true });
  const result = await f.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    witnessThreadIds:[sela.threadId],
    at:AT,
  });

  assert.equal(result.outcome, "met", "meeting should form");
  assert.equal(f.ensured.length, 3, "witness life must already be current");
  assert.equal(f.stories.length, 1, "witness should share the story");
  assert.equal(
    result.encounterStory.threadPresence.some((presence) => presence.threadId === sela.threadId),
    true,
    "witness presence should belong to the Encounter Story",
  );
  assert.equal(f.stanceNames.includes("Sela"), false, "witness should not be invited");
  assert.equal(result.encounterStory.story.beats[0].actorThreadId, mina.threadId,
    "initiator overture should begin the shared story");
  assert.equal(f.storyAuthors.includes("Sela"), false, "witness should remain silent");
  assert.equal(
    result.encounterStory.story.beats.some((beat) => beat.actorThreadId === sela.threadId),
    false,
    "witness should remain silent",
  );

  const witnessAttention = f.attentions.find((attention) => attention.threadId === sela.threadId);
  const witnessExperience = f.experiences.find((experience) => experience.threadId === sela.threadId);
  assert.equal(witnessAttention?.outcome, "noticed", "witness may notice the encounter");
  assert.match(witnessExperience?.experienceText ?? "", /protective of Noor/u,
    "witness should have a personal experience");
  assert.equal(
    f.experiences.every((experience) => experience.encounterRef === result.encounterStory.encounterId),
    true,
    "all experiences should cite the same story",
  );
  assert.equal(
    f.journals.some((entry) => entry.threadId === sela.threadId && /didn't say anything/u.test(entry.entryText)),
    true,
    "witness may privately journal what she saw",
  );
  assert.equal(
    f.memories.some((memory) => memory.threadId === sela.threadId && /Mina speak harshly/u.test(memory.rememberedContent)),
    true,
    "witness memory should remain selective",
  );
});
