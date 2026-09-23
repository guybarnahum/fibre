import assert from "node:assert/strict";
import test from "node:test";

import { createSocialMeetingService } from "../src/lived-social-meeting.mjs";
import { placeEpisodeRevisionRef } from "../src/situated-life-evidence.mjs";

const AT = "2026-09-21T18:00:00.000Z";

function thread(threadId, name, selfDescription) {
  return {
    threadId,
    version:1,
    identity:{ name, selfDescription },
    currentState:{ selfModel:selfDescription, unresolvedIntentions:[] },
    genome:{ textualTraits:{ temperament:`${name} has a distinct social rhythm.` } },
  };
}

const mina = thread("thr_n5_mina", "Mina", "I notice small emotional shifts and prefer unforced closeness.");
const noor = thread("thr_n5_noor", "Noor", "I am warm but protective of my quiet and my time.");
const sela = thread("thr_n5_sela", "Sela", "I pay close attention to how people treat each other, even when I stay out of it.");

function placeEpisode(threadId, episodeId, placeId = "place_n5_cafe", provenance = "world_recorded") {
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
    provenance,
    recordedAt:"2026-09-01T00:00:00.000Z",
  };
}

function situation(threadId, activity, placeRef, mediatedContext = null, participantRefs = []) {
  return {
    situationId:`sit_${threadId}`,
    threadId,
    establishedAt:AT,
    location:{ kind:"place", placeRef },
    mediatedContext,
    activity,
    participantRefs:[...participantRefs],
  };
}

function plan(threadId) {
  return { subjectThreadId:threadId, horizonEnd:"2026-09-21T23:00:00.000Z" };
}

function relations(threadId) {
  if (threadId === mina.threadId) {
    return [{
      relationId:"lrel_mina_noor",
      threadId:mina.threadId,
      relatedParty:{ partyId:noor.threadId, displayName:"Noor" },
      relationKind:"social_contact",
      relationshipFacts:["Noor is someone Mina likes and is comfortable being quiet with."],
    }];
  }
  if (threadId === noor.threadId) {
    return [{
      relationId:"lrel_noor_mina",
      threadId:noor.threadId,
      relatedParty:{ partyId:mina.threadId, displayName:"Mina" },
      relationKind:"social_contact",
      relationshipFacts:["Noor likes Mina but sometimes needs space when already absorbed in something."],
    }];
  }
  return [];
}

function fixture({
  initiationFor = () => "initiate",
  stanceFor = () => "accept",
  compatible = true,
  rude = false,
  placeProvenance = "world_recorded",
  recentSocialInteractions = [],
  noorActivity = "Sketching at the same café table.",
  mediatedContext = null,
  plannedCompanions = true,
  sustainedSameness = false,
} = {}) {
  const minaCafe = placeEpisode(mina.threadId, "plce_n5_mina_cafe", "place_n5_cafe", placeProvenance);
  const noorCafe = placeEpisode(
    noor.threadId,
    "plce_n5_noor_cafe",
    compatible ? "place_n5_cafe" : "place_n5_elsewhere",
    placeProvenance,
  );
  const selaCafe = placeEpisode(sela.threadId, "plce_n5_sela_cafe", "place_n5_cafe", placeProvenance);
  const placeEpisodes = new Map([
    [mina.threadId, [minaCafe]],
    [noor.threadId, [noorCafe]],
    [sela.threadId, [selaCafe]],
  ]);
  const situations = new Map([
    [mina.threadId, situation(
      mina.threadId,
      "Reading over coffee.",
      placeEpisodeRevisionRef(minaCafe),
      mediatedContext,
      plannedCompanions ? [noor.threadId] : [],
    )],
    [noor.threadId, situation(
      noor.threadId,
      noorActivity,
      placeEpisodeRevisionRef(noorCafe),
      mediatedContext,
      plannedCompanions ? [mina.threadId] : [],
    )],
    [sela.threadId, situation(
      sela.threadId,
      "Waiting for tea at the next table.",
      placeEpisodeRevisionRef(selaCafe),
      mediatedContext,
      [],
    )],
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
  const socialInteractions = structuredClone(recentSocialInteractions);
  let modelCalls = 0;

  const modelAdapter = {
    async invoke(call) {
      modelCalls += 1;
      if (call.input?.concern?.kind === "social_initiation") {
        initiationNames.push(call.input.thread.name);
        assert.equal(Object.hasOwn(call.input.thread, "stableTendencies"), false,
          "social initiation must not receive raw genome/persona traits");
        assert.equal(Array.isArray(call.input.developedSelfEvidence), true,
          "social initiation should receive Fibre-selected developed-self evidence");
        const percept = call.input.concern.externalContext.situatedPercept;
        assert.equal(percept.setting.place?.displayName, "The same neighborhood café",
          "social cognition should receive the actual setting");
        assert.equal(percept.observed[0]?.currentActivity, noorActivity,
          "social cognition should receive observable counterparty activity");
        assert.equal(Object.hasOwn(percept.observed[0], "currentState"), false,
          "Situated Percept must not expose counterparty interior state");
        assert.equal(Object.hasOwn(percept.observed[0], "genome"), false,
          "Situated Percept must not expose counterparty genome");
        const decision = initiationFor(
          call.input.thread.name,
          call.input.developedSelfEvidence,
          call.input.concern.externalContext,
        );
        const cited = call.input.developedSelfEvidence.find((item) => item.kind === "memory")
          ?? call.input.developedSelfEvidence.find((item) =>
            item.kind === "relationship" || item.kind === "semantic_state");
        return {
          output:{
            result:{
              decision,
              requestText:decision === "initiate"
                ? rude
                  ? "Noor, move your sketch. You’re taking up too much of the table."
                  : "Hey Noor — mind if I sit with you for a minute?"
                : null,
              reason:decision === "initiate"
                ? "A small social overture fits what matters to me in this moment."
                : "I do not want to begin a social exchange right now.",
            },
            evidenceRefs:cited ? [cited.ref] : [],
            conflictingMotives:[],
            uncertainty:null,
          },
          provenance:{ provider:"fixture", modelId:"fixture-social" },
        };
      }
      if (call.input?.concern?.kind === "social_response") {
        stanceNames.push(call.input.thread.name);
        assert.equal(Object.hasOwn(call.input.thread, "stableTendencies"), false,
          "social response must not receive raw genome/persona traits");
        assert.equal(Array.isArray(call.input.developedSelfEvidence), true,
          "social response should receive Fibre-selected developed-self evidence");
        const external = call.input.concern.externalContext;
        assert.equal(external.socialRequest.initiatorThreadId, mina.threadId,
          "recipient should know who made the request");
        assert.equal(typeof external.socialRequest.text, "string",
          "recipient should receive the concrete ask");
        assert.equal(
          external.situatedPercept.observed.some((candidate) => candidate.threadId === mina.threadId),
          true,
          "recipient should observe the requesting Thread",
        );
        assert.equal(
          external.situatedPercept.observed.some((candidate) =>
            Object.hasOwn(candidate, "currentState") || Object.hasOwn(candidate, "genome")),
          false,
          "Situated Percept must not expose another Thread's interior",
        );
        const decision = stanceFor(
          call.input.thread.name,
          call.input.developedSelfEvidence,
          external,
        );
        const cited = call.input.developedSelfEvidence.find((item) =>
          item.kind === "relationship" || item.kind === "semantic_state" || item.kind === "memory");
        return {
          output:{
            result:{
              decision,
              expression:null,
              suggestedAt:null,
              reason:"This response fits the recipient's present life and developed context.",
            },
            evidenceRefs:cited ? [cited.ref] : [],
            conflictingMotives:[],
            uncertainty:null,
          },
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
      getPreviousSituation(threadId) {
        if (!sustainedSameness) return null;
        const current = situations.get(threadId);
        return {
          ...structuredClone(current),
          situationId:`sit_previous_${threadId}`,
          establishedAt:new Date(Date.parse(current.establishedAt) - (30 * 60 * 1000)).toISOString(),
        };
      },
      latestPlan(threadId) { return structuredClone(plan(threadId)); },
    },
    identityStore:{
      getCurrentIdentityView(threadId) { return { threadId, assertions:[] }; },
    },
    situatedLifeStore:{
      listCurrentLifeRelations(threadId) { return structuredClone(relations(threadId)); },
      listCurrentPlaceEpisodes(threadId) { return structuredClone(placeEpisodes.get(threadId)); },
    },
    semanticStateStore:{
      listCurrentState(threadId) {
        if (threadId === mina.threadId) {
          return [{ stateId:"sem_mina", threadId:mina.threadId, domain:"emotion", dimension:"felt_state", target:null, state:"open and quietly affectionate" }];
        }
        if (threadId === noor.threadId) {
          return [{ stateId:"sem_noor", threadId:noor.threadId, domain:"need", dimension:"solitude", target:null, state:"wants continuity and low interruption" }];
        }
        return [{ stateId:"sem_sela", threadId:sela.threadId, domain:"emotion", dimension:"felt_state", target:null, state:"quietly observant and sensitive to interpersonal tension" }];
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
        const record = { encounterId:`story_e0_social_${stories.length + 1}`, ...structuredClone(candidate) };
        stories.push(structuredClone(record));
        return record;
      },
      listEncounterStories(threadId) {
        return structuredClone(stories.filter((story) =>
          story.threadPresence.some((presence) => presence.threadId === threadId)));
      },
      recordSocialInteraction(candidate) {
        const record = {
          interactionId:`social_fixture_${socialInteractions.length + 1}`,
          ...structuredClone(candidate),
        };
        socialInteractions.push(structuredClone(record));
        return record;
      },
      listSocialInteractions(threadId, { withThreadId = null, limit = 8, newestFirst = true } = {}) {
        let records = socialInteractions.filter((record) =>
          record.initiatorThreadId === threadId || record.recipientThreadId === threadId);
        if (withThreadId !== null) {
          records = records.filter((record) =>
            record.initiatorThreadId === withThreadId || record.recipientThreadId === withThreadId);
        }
        records = [...records].sort((left,right) =>
          Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
        if (newestFirst) records.reverse();
        return structuredClone(records.slice(0,limit));
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
    socialInteractions,
    initiationNames,
    stanceNames,
    storyAuthors,
    modelCallCount:() => modelCalls,
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
  assert.equal(result.salience.outcome, "salient",
    "planned co-presence should be material enough for social cognition");
  assert.deepEqual(result.salience.subjectRefs, [noor.threadId],
    "the opportunity should come from the co-present life already underway");
  assert.equal(
    result.salience.sourceReferences.includes(`sit_${mina.threadId}`)
      && result.salience.sourceReferences.includes(`sit_${noor.threadId}`),
    true,
    "the opportunity should remain grounded in both current situations",
  );
  assert.equal(f.ensured.length, 2, "both lives must be current");
  assert.deepEqual(f.initiationNames, ["Mina"], "meeting must begin from initiator agency");
  assert.deepEqual(f.stanceNames, ["Noor"], "only invitees should decide whether to accept");
  assert.equal(result.encounterStory.story.beats[0].text, result.request.text,
    "accepted request must become the first objective story beat");
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
  assert.equal(f.socialInteractions.length, 1, "an actual accepted overture should become shared social history");
  assert.equal(f.socialInteractions[0].responseDecision, "accept");
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

  const reusedGenesisPlace = fixture({ placeProvenance:"genesis_created" });
  const falseCopresence = await reusedGenesisPlace.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });
  assert.equal(falseCopresence.outcome, "incompatible",
    "reused Genesis place IDs must not manufacture shared presence");
  assert.equal(reusedGenesisPlace.initiationNames.length, 0,
    "false co-presence must not reach social cognition");

  const noOverture = fixture({ initiationFor:() => "not_initiate" });
  const notInitiated = await noOverture.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });
  assert.equal(notInitiated.outcome, "not_met", "initiator may choose not to begin an encounter");
  assert.equal(notInitiated.initiation.decision, "not_initiate", "initiator non-participation must stay explicit");
  assert.equal(noOverture.stories.length, 0, "no overture means no Encounter Story");
  assert.equal(noOverture.socialInteractions.length, 0,
    "private not_initiate must not become shared social history");

  const declined = fixture({ stanceFor:() => "decline" });
  const result = await declined.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(result.compatible, true, "presence should be compatible");
  assert.equal(result.outcome, "not_met", "decline should stop the voluntary encounter");
  assert.equal(result.request.text, result.initiation.requestText,
    "decline must answer the actual outward request");
  assert.equal(result.stances[noor.threadId].decision, "decline", "Noor should retain agency");
  assert.equal(declined.stories.length, 0, "decline must not fabricate an Encounter Story");
  assert.equal(declined.experiences.length, 0, "no story means no Thread Experience");
  assert.equal(declined.journals.length, 0, "no story means no private aftermath");
  assert.equal(declined.socialInteractions.length, 1,
    "an outward request plus decline should remain available as shared social history");
  assert.equal(declined.socialInteractions[0].responseDecision, "decline");
});


test("background co-presence costs no cognition and creates no private refusal", async () => {
  const f = fixture({
    plannedCompanions:false,
    mediatedContext:null,
  });

  const result = await f.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(result.compatible, true, "co-presence may be real without becoming salient");
  assert.equal(result.salience.outcome, "background",
    "unanchored ambient co-presence should remain background");
  assert.deepEqual(result.salience.subjectRefs, [noor.threadId],
    "ambient co-presence should still exist as a World opportunity before attention");
  assert.equal(result.initiation, null,
    "background opportunity must not be rewritten as not_initiate");
  assert.equal(f.modelCallCount(), 0,
    "background opportunity should cost zero cognition");
  assert.equal(f.socialInteractions.length, 0,
    "background opportunity must create no shared social history");
  assert.equal(f.stories.length, 0,
    "background opportunity must create no Encounter Story");
});

test("grounded sustained sameness can raise exploration salience without forcing engagement", async () => {
  const ordinary = fixture({
    plannedCompanions:false,
    sustainedSameness:false,
    initiationFor:() => "not_initiate",
  });
  const lowNovelty = fixture({
    plannedCompanions:false,
    sustainedSameness:true,
    initiationFor:() => "not_initiate",
  });

  const ordinaryResult = await ordinary.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });
  const lowNoveltyResult = await lowNovelty.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(ordinaryResult.salience.outcome, "background",
    "ambient opportunity should stay background without a grounded pressure");
  assert.equal(ordinary.modelCallCount(), 0,
    "background ambient opportunity should remain zero-cognition");

  assert.equal(lowNoveltyResult.salience.outcome, "salient",
    "sustained enacted sameness should make an otherwise-background opportunity material");
  assert.equal(lowNoveltyResult.salience.anchors.includes("exploration_pressure"), true,
    "salience should expose exploration pressure as the materiality reason");
  assert.equal(lowNoveltyResult.initiation.decision, "not_initiate",
    "exploration pressure must not force social engagement");
  assert.equal(lowNovelty.modelCallCount() > 0, true,
    "salient opportunity should earn cognition before refusal");
  assert.equal(lowNovelty.socialInteractions.length, 0,
    "private refusal after curiosity must still create no shared interaction");
});

test("observable setting can bend social judgment for the same person", async () => {
  const decideFromSetting = (_name, _evidence, externalContext) =>
    externalContext.situatedPercept.setting.mode === "mediated"
      ? "initiate"
      : "not_initiate";

  const physical = fixture({
    initiationFor:decideFromSetting,
    mediatedContext:null,
  });
  const mediated = fixture({
    initiationFor:decideFromSetting,
    mediatedContext:"fibre-commons",
  });

  const physicalResult = await physical.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });
  const mediatedResult = await mediated.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(physicalResult.initiation.decision, "not_initiate",
    "physical setting should remain a real reason not to interrupt");
  assert.equal(mediatedResult.initiation.decision, "initiate",
    "mediated social setting should be able to change the judgment");
  assert.deepEqual(physicalResult.initiation.cognition.selectedEvidenceRefs,
    mediatedResult.initiation.cognition.selectedEvidenceRefs,
    "private person/history evidence should stay constant across the setting change");
});

test("observable setting can bend direct social response for the same recipient", async () => {
  const respondFromSetting = (_name, _evidence, externalContext) =>
    externalContext.situatedPercept.setting.mode === "mediated"
      ? "accept"
      : "decline";

  const physical = fixture({
    stanceFor:respondFromSetting,
    mediatedContext:null,
  });
  const mediated = fixture({
    stanceFor:respondFromSetting,
    mediatedContext:"fibre-commons",
  });

  const physicalResult = await physical.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });
  const mediatedResult = await mediated.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(physicalResult.stances[noor.threadId].decision, "decline",
    "recipient may decline the same request in a physical setting");
  assert.equal(mediatedResult.stances[noor.threadId].decision, "accept",
    "recipient may accept the same request in a mediated setting");
  assert.equal(physicalResult.request.text, mediatedResult.request.text,
    "the outward request should stay constant across the setting change");
  assert.deepEqual(
    physicalResult.stances[noor.threadId].cognition.selectedEvidenceRefs,
    mediatedResult.stances[noor.threadId].cognition.selectedEvidenceRefs,
    "private person/history evidence should stay constant across the setting change",
  );
});

test("recent reciprocal social history can bend later initiation without a momentum score", async () => {
  const f = fixture({
    plannedCompanions:false,
    recentSocialInteractions:[{
      interactionId:"social_prior_decline",
      occurredAt:"2026-09-20T18:00:00.000Z",
      initiatorThreadId:mina.threadId,
      recipientThreadId:noor.threadId,
      initiatorSituationId:"sit_prior_mina",
      recipientSituationId:"sit_prior_noor",
      requestText:"Want to talk for a minute?",
      responseDecision:"decline",
      responseExpression:"Not right now — I want to finish this first.",
      suggestedAt:null,
    }],
    initiationFor:(_name, _evidence, externalContext) =>
      externalContext.situatedPercept.recentEvents.some((item) =>
        item.kind === "social_request_response"
        && item.direction === "outgoing"
        && item.responseDecision === "decline")
        ? "not_initiate"
        : "initiate",
  });

  const result = await f.meeting.meet({
    initiatorThreadId:mina.threadId,
    participantThreadIds:[mina.threadId,noor.threadId],
    at:AT,
  });

  assert.equal(result.initiation.decision, "not_initiate",
    "recent real reciprocal history should be available to present social judgment");
  assert.equal(f.socialInteractions.length, 1,
    "choosing not to initiate again must not add a second shared interaction");
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
  assert.equal(typeof witnessExperience?.experienceText, "string",
    "witness should have a personal experience");
  assert.equal(
    f.experiences.every((experience) => experience.encounterRef === result.encounterStory.encounterId),
    true,
    "all experiences should cite the same story",
  );
  assert.equal(
    f.journals.some((entry) => entry.threadId === sela.threadId),
    true,
    "witness may privately journal what she experienced",
  );
  assert.equal(
    f.memories.some((memory) => memory.threadId === sela.threadId),
    true,
    "witness may selectively retain the experience",
  );
});
