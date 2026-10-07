import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEncounterEpisodes,
  buildSocialAnalytics,
} from "./thread-encounter-model.mjs";
import {
  fetchThreadObservatory,
  identityWithFidPublication,
  mergeObservatoryWorldIdentity,
  reissueFidCard,
  resumeFidReissue,
  threadObservatoryCopyPayload,
} from "./thread-observatory.js";

test("Thread Observatory renders mutable identity from current authoritative World", () => {
  const staleProjection = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
    originOrientation:"original",
    lifecycleStatus:"active",
    presentation:{ snapshotVersion:"stale-public-projection" },
  };
  const deepWorld = {
    thread:{
      threadId:"thr_observatory_1",
      version:8,
      status:"active",
      identity:{
        name:"Maya Cohen",
        sex:"female",
        birthDate:"2004-08-20",
        birthCity:"Jerusalem, Israel",
        culture:["Jerusalem formative context"],
        languages:["Hebrew", "English"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(staleProjection, deepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "English"], "stale projected languages must not override current World identity");
  assert.equal(merged.world.thread.version, 8);
  assert.equal(merged.presentation.snapshotVersion, "stale-public-projection", "Presentation must remain separately inspectable");
});

test("Thread Observatory keeps a newer authoritative identity read when deep Observatory lags", () => {
  const currentIdentity = {
    threadId:"thr_observatory_1",
    displayName:"Maya Cohen",
    sex:"female",
    birthDate:"2004-08-20",
    birthPlace:"Jerusalem, Israel",
    culture:["Jerusalem formative context"],
    languages:["Hebrew", "Russian", "English"],
    originOrientation:"original",
    lifecycleStatus:"active",
    version:9,
  };
  const laggingDeepWorld = {
    thread:{
      threadId:"thr_observatory_1",
      version:8,
      status:"active",
      identity:{
        name:"Maya Cohen",
        sex:"female",
        birthDate:"2004-08-20",
        birthCity:"Jerusalem, Israel",
        culture:["Jerusalem formative context"],
        languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"],
        originOrientation:"original",
        selfDescription:"I persist.",
      },
    },
    civilRegistration:{ fibreIdentityNumber:"FIN-OBS-1" },
    embodiments:[],
    symbolicGenomes:[],
  };

  const merged = mergeObservatoryWorldIdentity(currentIdentity, laggingDeepWorld);

  assert.deepEqual(merged.languages, ["Hebrew", "Russian", "English"]);
  assert.equal(merged.version, 9);
  assert.equal(merged.world.thread.version, 8, "lagging deep World remains inspectable rather than being rewritten");
});

test("Thread Observatory preserves identity projection when deep World is unavailable", () => {
  const identity = {
    displayName:"Maya Cohen",
    languages:["Hebrew", "English"],
    lifecycleStatus:"active",
  };
  const merged = mergeObservatoryWorldIdentity(identity, null);
  assert.deepEqual(merged.languages, ["Hebrew", "English"]);
  assert.equal(merged.world, null);
});


test("successful FIN reissue projects returned publication immediately", () => {
  const identity = {
    threadId:"thr_sara",
    assets:[{
      mediaId:"media_old_front",
      role:"fibre_identity_card_front",
      objectRef:"fidcard_old_front",
      url:"/api/thread-assets/fidcard_old_front",
      source:"current_public_presentation",
      deliveryStatus:"published",
    },{
      mediaId:"world_portrait",
      role:"canonical_portrait",
      source:"world_embodiment",
      url:null,
    }],
    presentation:{
      presentation:{
        identityCard:{ credentialId:"fidc_old", revision:1 },
      },
    },
  };
  const result = {
    credential:{ credentialId:"fidc_new", revision:2 },
    presentation:{
      publication:{
        snapshot:{
          presentation:{
            identityCard:{
              credentialId:"fidc_new",
              revision:2,
              frontMediaRef:"media_new_front",
              backMediaRef:"media_new_back",
            },
          },
          media:{
            assets:[{
              mediaId:"media_new_front",
              kind:"image",
              role:"fibre_identity_card_front",
              status:"ready",
              locator:"fidcard_new_front",
              mediaType:"image/png",
            },{
              mediaId:"media_new_back",
              kind:"image",
              role:"fibre_identity_card_back",
              status:"ready",
              locator:"fidcard_new_back",
              mediaType:"image/png",
            }],
          },
        },
      },
    },
  };

  const projected = identityWithFidPublication(identity, result);

  assert.equal(projected.presentation.presentation.identityCard.credentialId, "fidc_new", "new FIN snapshot was not projected");
  assert.equal(projected.assets.find((asset) => asset.mediaId === "media_new_front")?.url, "/api/thread-assets/fidcard_new_front", "new FIN media was not immediately addressable");
  assert.equal(projected.assets.some((asset) => asset.mediaId === "media_old_front"), false, "stale FIN media survived reissue projection");
  assert.equal(projected.assets.some((asset) => asset.mediaId === "world_portrait"), true, "non-presentation media was lost");
});


test("first FIN issuance resumes the same idempotent workflow after photo derivation", async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  let request = 0;
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    request += 1;
    const payload = request === 1
      ? {
          complete:false,
          state:"derivation_requested",
          credential:null,
          derivation:{ jobId:"asset_fid_photo_1", status:"queued" },
          presentation:null,
        }
      : {
          complete:true,
          state:"active",
          credential:{ credentialId:"fidc_first", revision:1, supersedesCredentialId:null },
          derivation:null,
          presentation:{ changed:true },
        };
    return new Response(JSON.stringify(payload), {
      status:request === 1 ? 202 : 200,
      headers:{ "Content-Type":"application/json" },
    });
  };

  try {
    const idempotencyKey = "admin_fid_reissue_first_card";
    const initial = await reissueFidCard("thr_first_card", { idempotencyKey });
    assert.equal(initial.state, "derivation_requested");

    const completed = await resumeFidReissue("thr_first_card", {
      idempotencyKey,
      initialResult:initial,
      wait:async () => {},
      maxAttempts:2,
    });

    assert.equal(completed.state, "active");
    assert.equal(completed.credential.revision, 1);
    assert.deepEqual(
      bodies.map((body) => body.idempotencyKey),
      [idempotencyKey, idempotencyKey],
      "first-card continuation started a new issuance workflow instead of resuming the existing one",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Thread Observatory copy payload carries person state and current repair diagnosis", () => {
  const payload = threadObservatoryCopyPayload({
    threadId:"thr_observatory_copy_1",
    identity:{
      displayName:"Maya Cohen",
      raisedAs:{ languages:["Hebrew"] },
      languages:["Hebrew", "Danish"],
      world:{ thread:{ version:12, status:"active" } },
    },
    memories:[{ memoryId:"mem_1", rememberedContent:"Worked in Copenhagen." }],
    repair:{
      diagnosis:{
        health:"operator_decision_required",
        findings:[{ code:"RAISED_LANGUAGES_NEED_REVIEW", state:"operator_decision_required" }],
      },
      reconciliation:{ state:"pending" },
    },
  });

  assert.equal(payload.contract, "fibre-thread-observatory-copy-v0.1");
  assert.equal(payload.threadId, "thr_observatory_copy_1");
  assert.deepEqual(payload.identity.raisedAs.languages, ["Hebrew"]);
  assert.deepEqual(payload.identity.languages, ["Hebrew", "Danish"]);
  assert.equal(payload.identity.world.thread.version, 12);
  assert.equal(payload.memories[0].memoryId, "mem_1");
  assert.equal(payload.repair.diagnosis.health, "operator_decision_required");
  assert.equal(payload.repair.reconciliation.state, "pending");
  assert.equal(payload.memoryError, null);
  assert.equal(payload.repairError, null);
});


test("Encounter Episodes derive continuation and consequence without becoming authority", () => {
  const first={
    encounterId:"story_ep_1",
    occurredAt:"2026-10-07T18:00:00.000Z",
    situation:{ situationId:"sit_ep_1", activity:"Eating breakfast.", location:{kind:"place",placeRef:"place_home"} },
    story:{
      beats:[
        {actorThreadId:null,kind:"utterance",text:"I like drawing fish."},
        {actorThreadId:"thr_ep",kind:"utterance",text:"What do you like about it?"},
      ],
    },
    attention:{
      outcome:"noticed",
      experience:{experienceId:"exp_ep_1",experienceText:"I was curious about the distinction."},
    },
  };
  const second={
    encounterId:"story_ep_2",
    occurredAt:"2026-10-07T18:02:00.000Z",
    situation:{ situationId:"sit_ep_1", activity:"Eating breakfast.", location:{kind:"place",placeRef:"place_home"} },
    story:{
      continuationOfEncounterRef:"story_ep_1",
      beats:[
        {actorThreadId:null,kind:"utterance",text:"The act of drawing changes how I see."},
        {actorThreadId:"thr_ep",kind:"utterance",text:"Oh—that is different.",completion:"interrupted"},
      ],
    },
    attention:{
      outcome:"noticed",
      experience:{experienceId:"exp_ep_2",experienceText:"The correction changed what I thought he meant."},
    },
  };
  const consolidation={
    queued:[],
    consolidations:[{
      consolidationId:"con_ep_1",
      threadId:"thr_ep",
      startedAt:"2026-10-07T18:05:00.000Z",
      experienceRefs:["exp_ep_1","exp_ep_2"],
      decision:{
        stage:"decision",
        payload:{
          journalEntry:"The correction stayed with me.",
          afterthoughts:[{kind:"question",text:"Would drawing something change what I notice?"}],
          memory:{outcome:"retained"},
        },
      },
      complete:{
        stage:"complete",
        payload:{memoryOutcome:"retained",memoryId:"mem_ep_1",journalEntryId:"journal_ep_1",afterthoughtCount:1},
      },
      journal:{
        journalEntryId:"journal_ep_1",
        consolidationId:"con_ep_1",
        threadId:"thr_ep",
        writtenAt:"2026-10-07T18:05:01.000Z",
        entryText:"The correction stayed with me.",
      },
    }],
  };
  const episodes=buildEncounterEpisodes({
    encounterStories:[second,first],
    experienceConsolidation:consolidation,
    memories:[{
      memoryId:"mem_ep_1",
      eventRefs:["exp_ep_1","exp_ep_2"],
      rememberedContent:"I remember revising what I thought Guy meant.",
    }],
    semanticStates:[{
      stateId:"sem_ep_1",
      evidenceRefs:["mem_ep_1"],
      domain:"belief",
      dimension:"attention",
      state:"drawing can change what I notice",
    }],
    lifeRelations:[{
      relationId:"rel_ep_1",
      relatedParty:{partyId:"person_guy",displayName:"Guy"},
      relationKind:"social_contact",
      relationshipFacts:["Guy is someone I have talked with about art."],
      sourceReferences:["exp_ep_2"],
    }],
  });

  assert.equal(episodes.length,1,"continuation chain split into separate episodes");
  assert.deepEqual(
    episodes[0].stories.map((story)=>story.encounterId),
    ["story_ep_1","story_ep_2"],
    "episode lost causal story order",
  );
  assert.equal(episodes[0].consolidation.status,"complete","episode lost consolidation completion");
  assert.equal(episodes[0].journals.length,1,"episode lost linked Journal authority");
  assert.equal(episodes[0].memories[0].memoryId,"mem_ep_1","episode lost retained autobiographical memory");
  assert.deepEqual(
    episodes[0].afterthoughts.map((item)=>item.kind),
    ["question"],
    "episode lost delayed private residue",
  );
  assert.equal(episodes[0].semanticStates[0].stateId,"sem_ep_1",
    "episode lost explicitly evidenced semantic consequence");
  assert.equal(episodes[0].lifeRelations[0].relationId,"rel_ep_1",
    "episode lost explicitly evidenced relationship consequence");
});


test("Social analytics stay windowed, causal-observational, and score-free", () => {
  const threadId="thr_social_analytics";
  const stories=[
    {
      encounterId:"story_social_outgoing",
      occurredAt:"2026-10-01T18:00:00.000Z",
      threadPresence:[
        {threadId,situationId:"sit_social_home"},
        {threadId:"thr_noor",situationId:"sit_noor_cafe"},
      ],
      story:{beats:[
        {actorThreadId:threadId,kind:"utterance",text:"Want to sit for a bit?"},
        {actorThreadId:"thr_noor",kind:"utterance",text:"Sure."},
      ]},
      attention:{
        outcome:"noticed",
        experience:{experienceId:"exp_social_outgoing",experienceText:"I enjoyed asking Noor to stay."},
      },
    },
    {
      encounterId:"story_social_incoming_1",
      occurredAt:"2026-10-03T18:00:00.000Z",
      threadPresence:[
        {threadId,situationId:"sit_social_home"},
        {threadId:"thr_noor",situationId:"sit_noor_cafe"},
      ],
      story:{beats:[
        {actorThreadId:"thr_noor",kind:"utterance",text:"Can I ask you something?"},
        {actorThreadId:threadId,kind:"utterance",text:"Yes."},
      ]},
      attention:{
        outcome:"noticed",
        experience:{experienceId:"exp_social_incoming_1",experienceText:"Noor's question caught my attention."},
      },
    },
    {
      encounterId:"story_social_incoming_2",
      occurredAt:"2026-10-03T18:02:00.000Z",
      threadPresence:[
        {threadId,situationId:"sit_social_home"},
        {threadId:"thr_noor",situationId:"sit_noor_cafe"},
      ],
      story:{
        continuationOfEncounterRef:"story_social_incoming_1",
        beats:[
          {actorThreadId:"thr_noor",kind:"utterance",text:"It is about the sketch."},
          {actorThreadId:threadId,kind:"utterance",text:"Go ahead."},
        ],
      },
      attention:{
        outcome:"noticed",
        experience:{experienceId:"exp_social_incoming_2",experienceText:"The conversation became more specific."},
      },
    },
    {
      encounterId:"story_social_witness",
      occurredAt:"2026-10-04T18:00:00.000Z",
      threadPresence:[
        {threadId,situationId:"sit_social_home"},
        {threadId:"thr_mina",situationId:"sit_mina_cafe"},
        {threadId:"thr_sela",situationId:"sit_sela_cafe"},
      ],
      story:{beats:[
        {actorThreadId:"thr_mina",kind:"utterance",text:"That was unexpected."},
        {actorThreadId:"thr_sela",kind:"utterance",text:"I know."},
      ]},
      attention:{
        outcome:"not_noticed",
        experience:null,
      },
    },
    {
      encounterId:"story_social_visitor",
      occurredAt:"2026-10-06T18:00:00.000Z",
      threadPresence:[{threadId,situationId:"sit_social_home"}],
      story:{beats:[
        {actorThreadId:null,kind:"utterance",text:"Hi, I'm visiting."},
        {actorThreadId:threadId,kind:"utterance",text:"Hi."},
      ]},
      attention:{
        outcome:"noticed",
        experience:{experienceId:"exp_social_visitor",experienceText:"A visitor stopped to talk."},
      },
    },
    {
      encounterId:"story_social_old",
      occurredAt:"2026-08-01T18:00:00.000Z",
      threadPresence:[
        {threadId,situationId:"sit_old"},
        {threadId:"thr_old_friend",situationId:"sit_old_friend"},
      ],
      story:{beats:[
        {actorThreadId:"thr_old_friend",kind:"utterance",text:"Long ago."},
        {actorThreadId:threadId,kind:"utterance",text:"Yes."},
      ]},
      attention:{
        outcome:"noticed",
        experience:{experienceId:"exp_social_old",experienceText:"An old conversation."},
      },
    },
  ];
  const interactions=[
    {
      interactionId:"social_out",
      occurredAt:"2026-10-01T18:00:00.000Z",
      initiatorThreadId:threadId,
      recipientThreadId:"thr_noor",
      responseDecision:"accept",
    },
    {
      interactionId:"social_in",
      occurredAt:"2026-10-03T18:00:00.000Z",
      initiatorThreadId:"thr_noor",
      recipientThreadId:threadId,
      responseDecision:"accept",
    },
    {
      interactionId:"social_decline",
      occurredAt:"2026-10-05T18:00:00.000Z",
      initiatorThreadId:"thr_sela",
      recipientThreadId:threadId,
      responseDecision:"decline",
    },
    {
      interactionId:"social_old",
      occurredAt:"2026-08-01T18:00:00.000Z",
      initiatorThreadId:"thr_old_friend",
      recipientThreadId:threadId,
      responseDecision:"accept",
    },
  ];
  const experienceConsolidation={
    queued:[],
    consolidations:[{
      consolidationId:"con_social",
      threadId,
      startedAt:"2026-10-04T18:00:00.000Z",
      experienceRefs:["exp_social_incoming_1","exp_social_incoming_2"],
      decision:{stage:"decision",payload:{afterthoughts:[],memory:{outcome:"retained"},journalEntry:null}},
      complete:{stage:"complete",payload:{memoryOutcome:"retained",memoryId:"mem_social",journalEntryId:null,afterthoughtCount:0}},
      journal:null,
    }],
  };
  const model=buildSocialAnalytics({
    threadId,
    encounterStories:stories,
    socialInteractions:interactions,
    experienceConsolidation,
    memories:[{
      memoryId:"mem_social",
      eventRefs:["exp_social_incoming_1","exp_social_incoming_2"],
      rememberedContent:"I remember Noor asking about the sketch.",
    }],
    asOf:"2026-10-07T18:00:00.000Z",
    windowDays:30,
  });

  assert.equal(model.exposure.episodes,4,"social exposure counted stale or non-social history");
  assert.equal(model.exposure.noticedEpisodes,3,
    "silent social presence was incorrectly treated as noticed experience");
  assert.equal(model.initiative.openedEpisodes,1,"Thread-opened episode count drifted");
  assert.equal(model.initiative.outgoingOvertures,1,"outgoing overture count drifted");
  assert.equal(model.responsiveness.externallyOpenedEpisodes,2,"external openings were not distinguished");
  assert.equal(model.responsiveness.answeredEpisodes,2,"answered external episodes were not observed");
  assert.equal(model.responsiveness.accepted,1,"incoming acceptance count drifted");
  assert.equal(model.responsiveness.declined,1,"incoming decline count drifted");
  assert.equal(model.breadth.knownCounterparties,3,
    "breadth should include known witnessed Threads without inventing visitor identity");
  assert.equal(model.breadth.anonymousVisitorEpisodes,1,
    "anonymous visitor exposure should remain separate from known breadth");
  assert.deepEqual(model.reciprocity,{
    bidirectionalCounterparties:1,
    directionalCounterparties:2,
  },"reciprocity should require both overture directions with the same known Thread");
  assert.equal(model.depth.continuedEpisodes,1,"continued social episode was not recognized");
  assert.equal(model.depth.maxStoryCount,2,"episode depth should use admitted continuation, not word count");
  assert.equal(model.continuity.recurringCounterparties,1,
    "repeat contact across distinct episodes was not recognized");
  assert.equal(model.consequence.episodes,1,
    "durable consequence should attach only to the linked social episode");
  assert.equal("score" in model,false,"social analytics introduced a causal-looking sociability score");
});

test("Thread Observatory keeps Encounter Story, journal authority, and memory separate", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/identity")) {
      return Response.json({
        environment:"staging",
        identity:{ threadId:"thr_e4_admin", displayName:"Sela", version:4 },
      });
    }
    if (String(url).endsWith("/observatory")) {
      return Response.json({
        observatory:{
          threadId:"thr_e4_admin",
          thread:{ threadId:"thr_e4_admin", version:4, status:"active", identity:{ name:"Sela" } },
          civilRegistration:null,
          embodiments:[],
          symbolicGenomes:[],
          memories:[],
          encounterStories:[{
            encounterId:"story_e4_admin",
            occurredAt:"2026-09-21T18:00:00.000Z",
            threadPresence:[{ threadId:"thr_e4_admin", situationId:"sit_e4_admin" }],
            story:{ beats:[{ actorThreadId:"thr_other", kind:"utterance", text:"A sharp remark." }] },
            visualization:{
              visualizationPrompt:"OBJECTIVE FIBRE ENCOUNTER RECONSTRUCTION",
              visualizationPromptDigest:"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              visualizationSourceReferences:["sit_e4_admin"],
              depictedThreadRefs:["thr_other"],
            },
            attention:{
              threadId:"thr_e4_admin",
              encounterRef:"story_e4_admin",
              outcome:"noticed",
              experience:{ experienceId:"exp_e4_admin", experienceText:"I noticed the edge in it." },
            },
          }],
          experienceJournalEntries:[{
            journalEntryId:"journal_e4_admin",
            threadId:"thr_e4_admin",
            aboutExperienceRef:"exp_e4_admin",
            writtenAt:"2026-09-21T18:00:00.000Z",
            entryText:"I stayed quiet, but it changed the room for me.",
          }],
          experienceConsolidation:{
            queued:[],
            consolidations:[{
              consolidationId:"con_e4_admin",
              threadId:"thr_e4_admin",
              startedAt:"2026-09-21T18:01:00.000Z",
              experienceRefs:["exp_e4_admin"],
              decision:{stage:"decision",payload:{afterthoughts:[],memory:{outcome:"not_remembered"},journalEntry:null}},
              complete:{stage:"complete",payload:{memoryOutcome:"not_remembered",memoryId:null,journalEntryId:null,afterthoughtCount:0}},
              journal:null,
            }],
          },
        },
      });
    }
    if (String(url).endsWith("/journal")) {
      return Response.json({
        journal:{
          objectKey:"journals/thr_e4_admin/journal.md",
          profile:{
            threadId:"thr_e4_admin",
            title:"Margins",
            presentationStyle:"notebook",
            aestheticNote:"Loose notes with room around them.",
          },
          document:"# Margins\n\n## 2026-09-21 · 18:00:00Z\n\nI stayed quiet, but it changed the room for me.\n",
        },
      });
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    const result = await fetchThreadObservatory("thr_e4_admin");
    assert.equal(result.encounterStories[0].encounterId, "story_e4_admin",
      "Admin should receive objective Encounter Story authority");
    assert.equal(result.experienceJournalEntries[0].aboutExperienceRef, "exp_e4_admin",
      "Admin should receive World journal-entry provenance separately from the R2 book");
    assert.equal(result.journal.profile.title, "Margins",
      "Admin should retain the stable Thread-owned journal presentation");
    assert.equal(result.experienceConsolidation.consolidations[0].consolidationId,"con_e4_admin",
      "Admin should receive consolidation authority separately from Encounter Story");
    assert.equal(result.memories.length, 0,
      "journal presence must not imply autobiographical retention");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
