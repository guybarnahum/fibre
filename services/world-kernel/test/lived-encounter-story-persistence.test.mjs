import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openWorldStore } from "../src/persistence.mjs";

const seed = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function seedThread(storage, threadId, name) {
  const thread = structuredClone(seed);
  thread.threadId = threadId;
  thread.identity.name = name;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt:"2026-09-21T17:00:00.000Z",
    createdBy:"fibre.test",
    lastEventId:`evt_seed_${threadId}`,
  };
  const world = openWorldStore(storage);
  try { world.seedThread(thread); }
  finally { world.close(); }
}

test("E0 persists one Encounter Story with separate Thread Experiences", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-e0-story-"));
  const storage = {
    infraDriver:createSqliteStateInfraDriver({ scopes:{ world:join(directory, "world.sqlite") } }),
    stateScopeId:"world",
  };

  try {
    seedThread(storage, "thr_e0_mina", "Mina");
    seedThread(storage, "thr_e0_noor", "Noor");

    const store = openLivedExperienceStore(storage);
    try {
      const story = store.recordEncounterStory({
        occurredAt:"2026-09-21T18:00:00.000Z",
        threadPresence:[
          { threadId:"thr_e0_mina", situationId:"sit_e0_mina" },
          { threadId:"thr_e0_noor", situationId:"sit_e0_noor" },
        ],
        story:{
          beats:[
            { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mind if I sit here?" },
            { actorThreadId:"thr_e0_noor", kind:"action", text:"Noor moves her notebook aside." },
          ],
        },
        visualization:createEncounterVisualization({
          occurredAt:"2026-09-21T18:00:00.000Z",
          story:{
            beats:[
              { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mind if I sit here?" },
              { actorThreadId:"thr_e0_noor", kind:"action", text:"Noor moves her notebook aside." },
            ],
          },
          scene:"A quiet shared table.",
          sourceReferences:["sit_e0_mina","sit_e0_noor"],
          depictedThreadRefs:[],
        }),
      });

      const social = store.recordSocialInteraction({
        occurredAt:"2026-09-21T17:59:00.000Z",
        initiatorThreadId:"thr_e0_mina",
        recipientThreadId:"thr_e0_noor",
        initiatorSituationId:"sit_e0_mina",
        recipientSituationId:"sit_e0_noor",
        requestText:"Mind if I sit here?",
        responseDecision:"accept",
        responseExpression:"Sure.",
        suggestedAt:null,
      });
      assert.equal(
        store.listSocialInteractions("thr_e0_mina", { withThreadId:"thr_e0_noor" })[0].interactionId,
        social.interactionId,
        "actual request/response should survive as reciprocal social history",
      );
      assert.equal(
        store.listSocialInteractions("thr_e0_noor", { withThreadId:"thr_e0_mina" })[0].responseDecision,
        "accept",
        "both participants should resolve the same observable response",
      );

      const mina = store.recordThreadExperience({
        threadId:"thr_e0_mina",
        encounterRef:story.encounterId,
        situationId:"sit_e0_mina",
        occurredAt:story.occurredAt,
      });
      const noor = store.recordThreadExperience({
        threadId:"thr_e0_noor",
        encounterRef:story.encounterId,
        situationId:"sit_e0_noor",
        occurredAt:story.occurredAt,
      });

      assert.equal(store.listEncounterStories("thr_e0_mina")[0].encounterId, story.encounterId,
        "Mina should resolve the shared story");
      assert.equal(store.listEncounterStories("thr_e0_noor")[0].encounterId, story.encounterId,
        "Noor should resolve the shared story");
      assert.equal(mina.encounterRef, noor.encounterRef,
        "private experiences should cite one objective story");

      const continued = store.recordEncounterStory({
        occurredAt:"2026-09-21T18:01:00.000Z",
        threadPresence:[
          { threadId:"thr_e0_mina", situationId:"sit_e0_mina" },
          { threadId:"thr_e0_noor", situationId:"sit_e0_noor" },
        ],
        story:{
          continuationOfEncounterRef:story.encounterId,
          beats:[
            { actorThreadId:"thr_e0_noor", kind:"utterance", text:"Are you working on the same thing as yesterday?" },
            { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mostly, yes." },
          ],
        },
        visualization:createEncounterVisualization({
          occurredAt:"2026-09-21T18:01:00.000Z",
          story:{
            beats:[
              { actorThreadId:"thr_e0_noor", kind:"utterance", text:"Are you working on the same thing as yesterday?" },
              { actorThreadId:"thr_e0_mina", kind:"utterance", text:"Mostly, yes." },
            ],
          },
          scene:"The same quiet shared table, one moment later.",
          sourceReferences:[story.encounterId],
          depictedThreadRefs:[],
        }),
      });
      assert.equal(
        store.getEncounterStory(continued.encounterId).story.continuationOfEncounterRef,
        story.encounterId,
        "continued lived exchange lost its objective causal predecessor",
      );

      const interrupted = store.recordEncounterStory({
        occurredAt:"2026-09-21T18:01:30.000Z",
        threadPresence:[
          { threadId:"thr_e0_mina", situationId:"sit_e0_mina" },
          { threadId:"thr_e0_noor", situationId:"sit_e0_noor" },
        ],
        story:{
          continuationOfEncounterRef:continued.encounterId,
          beats:[{
            actorThreadId:"thr_e0_mina",
            kind:"utterance",
            text:"I was going to say—",
            completion:"interrupted",
          }],
        },
        visualization:createEncounterVisualization({
          occurredAt:"2026-09-21T18:01:30.000Z",
          story:{
            beats:[{
              actorThreadId:"thr_e0_mina",
              kind:"utterance",
              text:"I was going to say—",
              completion:"interrupted",
            }],
          },
          scene:"The same shared table as Noor begins speaking over Mina.",
          sourceReferences:[continued.encounterId],
          depictedThreadRefs:[],
        }),
      });
      assert.equal(
        store.getEncounterStory(interrupted.encounterId).story.beats[0].completion,
        "interrupted",
        "objective history lost audible interruption",
      );

      const receipt=store.recordPublicEncounterReceipt({
        requestId:"req_e0_public_retry",
        threadId:"thr_e0_mina",
        requestDigest:`sha256:${"a".repeat(64)}`,
        result:{
          outcome:"accepted",
          situationId:"sit_e0_mina",
          responseText:"Mostly, yes.",
          encounterStoryId:continued.encounterId,
        },
        recordedAt:"2026-09-21T18:01:00.000Z",
      });
      assert.deepEqual(
        store.getPublicEncounterReceipt(receipt.requestId),
        receipt,
        "public encounter retry receipt did not persist",
      );
    } finally { store.close(); }
  } finally {
    rmSync(directory, { recursive:true, force:true });
  }
});

test("interrupted public encounter admission survives a World restart without duplicating its Story",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-encounter-admission-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const threadId="thr_public_admission";
  const requestId="req_interrupted_admission";
  const requestDigest=`sha256:${"b".repeat(64)}`;
  try {
    seedThread(storage,threadId,"Mina");
    const makeStory=(occurredAt,text)=>({
      occurredAt,
      threadPresence:[{threadId,situationId:"sit_admission"}],
      story:{
        beats:[
          {actorThreadId:null,kind:"utterance",text:"Hello"},
          {actorThreadId:threadId,kind:"utterance",text},
        ],
      },
      visualization:createEncounterVisualization({
        occurredAt,
        story:{beats:[
          {actorThreadId:null,kind:"utterance",text:"Hello"},
          {actorThreadId:threadId,kind:"utterance",text},
        ]},
        scene:"An ongoing day.",
        sourceReferences:["sit_admission"],
        depictedThreadRefs:[threadId],
      }),
    });
    const publicRequest={requestId,threadId,requestDigest};
    const firstStore=openLivedExperienceStore(storage);
    const first=firstStore.recordEncounterStory(
      makeStory("2026-09-21T18:00:00.000Z","Hello back"),{publicRequest},
    );
    firstStore.close();

    const reopened=openLivedExperienceStore(storage);
    try {
      assert.equal(reopened.getPublicEncounterAdmission(requestId)?.encounterRef,first.encounterId,
        "admitted Story lost its request identity after a restart");
      const retry=reopened.recordEncounterStory(
        makeStory("2026-09-21T18:01:00.000Z","A different answer"),{publicRequest},
      );
      assert.equal(retry.encounterId,first.encounterId,
        "retry authored a second objective encounter");
      assert.equal(reopened.listEncounterStories(threadId).length,1,
        "retry duplicated World encounter history");
      assert.throws(()=>reopened.recordEncounterStory(
        makeStory("2026-09-21T18:02:00.000Z","Another answer"),
        {publicRequest:{...publicRequest,requestDigest:`sha256:${"c".repeat(64)}`}},
      ),/conflicts/,"a reused request ID changed the admitted encounter");
    }finally{reopened.close();}
  }finally{rmSync(directory,{recursive:true,force:true});}
});
