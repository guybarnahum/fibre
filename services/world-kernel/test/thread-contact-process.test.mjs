import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openContactStore } from "../src/contact-store.mjs";
import { createEncounterVisualization } from "../src/lived-encounter-visualization.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { createThreadContactProcess } from "../src/thread-contact-process.mjs";
import { createThreadContactPerception } from "../src/thread-contact-perception.mjs";

const seed=JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8"),
);

function thread(threadId,name,lastEventId){
  const value=structuredClone(seed);
  value.threadId=threadId;
  value.identity.name=name;
  value.relationshipRefs=[];
  value.memoryRefs=[];
  value.provenance={
    createdAt:"2026-10-07T17:00:00.000Z",
    createdBy:"fibre.test",
    lastEventId,
  };
  return value;
}

function relation({threadId,partyId,kind,displayName,sourceEvent,role}){
  return {
    relationId:lifeRelationId({threadId,partyId,role}),
    revision:1,
    threadId,
    relatedParty:{partyId,kind,displayName},
    relationKind:"social_contact",
    geneticContributionRole:"none",
    factualRoleRefs:[role],
    relationshipFacts:[`${displayName} is someone this Thread has encountered before.`],
    sourceReferences:[sourceEvent],
    validFrom:"2026-10-07T18:00:00.000Z",
    validTo:null,
    visibility:"restricted",
    provenance:"world_recorded",
    recordedAt:"2026-10-07T18:10:00.000Z",
  };
}

function livedNowFixture(calls){
  return Object.freeze({
    async ensure({threadId,at}){
      calls.push(Object.freeze({threadId,at}));
      return Object.freeze({
        situationId:`sit_contact_now_${calls.length}`,
        threadId,
        establishedAt:at,
        phase:"at_place",
        location:Object.freeze({kind:"place",placeRef:"place_contact_now"}),
        mediatedContext:null,
        activity:"Continuing the day when a delayed thought becomes relevant again.",
        reason:"World reconciled actual life before fresh contact cognition.",
        participantRefs:Object.freeze([]),
        sourcePlanRefs:Object.freeze([]),
      });
    },
  });
}

function completeAfterthought(experienceStore,{
  threadId,
  situationId,
  occurredAt,
  startedAt,
  completedAt,
  text,
}){
  const objective={
    storyVersion:"encounter-story-v0.1",
    beats:[{actorThreadId:threadId,kind:"action",text:"The Thread pauses after the encounter."}],
  };
  const story=experienceStore.recordEncounterStory({
    occurredAt,
    threadPresence:[{threadId,situationId}],
    story:objective,
    visualization:createEncounterVisualization({
      occurredAt,
      story:objective,
      scene:"A quiet moment after an encounter.",
      sourceReferences:[situationId],
      depictedThreadRefs:[threadId],
    }),
  });
  const attention=experienceStore.recordThreadEncounterAttention({
    threadId,
    encounterRef:story.encounterId,
    situationId,
    occurredAt,
    outcome:"noticed",
    experienceText:"Something from the encounter stayed unresolved.",
  });
  experienceStore.queueThreadExperienceConsolidation({
    experienceId:attention.experience.experienceId,
    queuedAt:occurredAt,
  });
  const consolidation=experienceStore.createThreadExperienceConsolidation({
    threadId,
    experienceRefs:[attention.experience.experienceId],
    startedAt,
  });
  experienceStore.recordThreadExperienceConsolidationStage({
    consolidationId:consolidation.consolidationId,
    stage:"decision",
    recordedAt:startedAt,
    payload:{
      journalEntry:null,
      afterthoughts:[{kind:"question",text}],
      memory:{
        outcome:"not_remembered",
        rememberedContent:null,
        rememberedMeaning:null,
        confidence:null,
        salience:null,
        uncertainty:[],
      },
    },
  });
  experienceStore.recordThreadExperienceConsolidationStage({
    consolidationId:consolidation.consolidationId,
    stage:"complete",
    recordedAt:completedAt,
    payload:{
      journalEntryId:null,
      memoryOutcome:"not_remembered",
      memoryId:null,
      afterthoughtCount:1,
    },
  });
  return consolidation;
}

test("delayed residue can contact a Person, contact a Thread, or remain private",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-n710-contact-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const contactStore=openContactStore(storage);
  const semanticStateStore=openSemanticStateStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  const situatedLifeStore=openSituatedLifeStore(storage);
  const ensured=[];
  const livedNow=livedNowFixture(ensured);
  try{
    const kaleo=thread("thr_n710_kaleo","Kaleo","evt_n710_kaleo_seed");
    const noor=thread("thr_n710_noor","Noor","evt_n710_noor_seed");
    world.seedThread(kaleo);
    world.seedThread(noor);
    const sourceEvent=world.getThread(kaleo.threadId).provenance.lastEventId;

    situatedLifeStore.recordLifeRelation(relation({
      threadId:kaleo.threadId,
      partyId:"person_guy",
      kind:"human_source",
      displayName:"Guy",
      sourceEvent,
      role:"visitor",
    }));
    situatedLifeStore.recordLifeRelation(relation({
      threadId:kaleo.threadId,
      partyId:noor.threadId,
      kind:"thread",
      displayName:"Noor",
      sourceEvent,
      role:"peer",
    }));
    contactStore.registerPersonCapability({
      partyId:"person_guy",
      displayName:"Guy",
      registeredAt:"2026-10-07T18:15:00.000Z",
    });

    completeAfterthought(experienceStore,{
      threadId:kaleo.threadId,
      situationId:"sit_n710_guy",
      occurredAt:"2026-10-07T18:20:00.000Z",
      startedAt:"2026-10-07T18:21:00.000Z",
      completedAt:"2026-10-07T18:21:01.000Z",
      text:"I wonder whether Guy meant that drawing changes what he notices.",
    });
    completeAfterthought(experienceStore,{
      threadId:kaleo.threadId,
      situationId:"sit_n710_noor",
      occurredAt:"2026-10-07T18:22:00.000Z",
      startedAt:"2026-10-07T18:23:00.000Z",
      completedAt:"2026-10-07T18:23:01.000Z",
      text:"I should ask Noor whether she still wants to compare sketches.",
    });
    completeAfterthought(experienceStore,{
      threadId:kaleo.threadId,
      situationId:"sit_n710_private",
      occurredAt:"2026-10-07T18:24:00.000Z",
      startedAt:"2026-10-07T18:25:00.000Z",
      completedAt:"2026-10-07T18:25:01.000Z",
      text:"I am curious about this, but I may want to sit with it privately.",
    });

    const decisions=[];
    const expressions=[];
    const adapter={
      async invoke(call){
        if(call.clientRequestId.startsWith("later-contact-decision_")){
          decisions.push(structuredClone(call.input));
          assert.equal(call.input.currentSituation?.threadId,kaleo.threadId,
            "contact decision did not receive ensured lived context");
          const residue=call.input.delayedPrivateResidue[0].text;
          assert.equal(call.input.autobiographicalMemories.length,0,
            "routing identity was silently converted into autobiographical recognition");
          assert.deepEqual(
            call.input.routableKnownParties.map((item)=>item.partyId).sort(),
            ["person_guy",noor.threadId].sort(),
            "Fibre did not supply the same current routable relationship set",
          );
          if(residue.includes("Guy")){
            return {
              output:{
                decision:"contact",
                recipientPartyId:"person_guy",
                reason:"I want to clarify the distinction while it is still on my mind.",
              },
              provenance:{provider:"fixture",modelId:"fixture-contact-decision"},
            };
          }
          if(residue.includes("Noor")){
            return {
              output:{
                decision:"contact",
                recipientPartyId:noor.threadId,
                reason:"I want to follow up on the sketch comparison.",
              },
              provenance:{provider:"fixture",modelId:"fixture-contact-decision"},
            };
          }
          return {
            output:{
              decision:"keep_private",
              recipientPartyId:null,
              reason:"I would rather let this thought develop before involving anyone.",
            },
            provenance:{provider:"fixture",modelId:"fixture-contact-decision"},
          };
        }
        if(call.clientRequestId.startsWith("later-contact-expression_")){
          expressions.push(structuredClone(call.input));
          assert.equal(call.input.currentSituation?.threadId,kaleo.threadId,
            "contact expression did not receive ensured lived context");
          const recipient=call.input.recipient.partyId;
          return {
            output:{
              messageText:recipient==="person_guy"
                ?"Hi Guy — I had a question about what you meant by drawing changing what you notice."
                :"Hi Noor — do you still want to compare sketches sometime?",
            },
            provenance:{provider:"fixture",modelId:"fixture-contact-expression"},
          };
        }
        throw new Error("unexpected N7.10 cognition");
      },
    };

    const times=[
      "2026-10-07T18:30:00.000Z","2026-10-07T18:30:01.000Z","2026-10-07T18:30:02.000Z","2026-10-07T18:30:03.000Z",
      "2026-10-07T18:30:04.000Z","2026-10-07T18:30:05.000Z","2026-10-07T18:30:06.000Z","2026-10-07T18:30:07.000Z",
      "2026-10-07T18:30:08.000Z","2026-10-07T18:30:09.000Z","2026-10-07T18:30:10.000Z","2026-10-07T18:30:11.000Z",
    ];
    const process=createThreadContactProcess({
      worldReader:world,
      livedNow,
      situatedLifeStore,
      semanticStateStore,
      memoryStore,
      experienceStore,
      contactStore,
      modelAdapter:adapter,
      now:()=>times.shift(),
      batchLimit:4,
    });

    const result=await process.runOnce();
    assert.equal(result.attempted,3,"delayed residue did not reach bounded later-contact judgment");
    assert.equal(result.completed,3,"later-contact decisions did not become durable");
    assert.equal(result.failed,0,"later contact unexpectedly failed");
    assert.deepEqual(
      result.results.map((item)=>item.outcome).sort(),
      ["delivered","delivered","kept_private"].sort(),
      "route availability forced contact or blocked an intended contact",
    );
    assert.equal(contactStore.listInbox("person_guy").length,1,
      "Person contact capability did not receive the Thread's outward message");
    assert.equal(contactStore.listInbox(noor.threadId).length,1,
      "known Thread route did not receive the Thread's outward message");
    assert.equal(contactStore.listSent(kaleo.threadId).length,2,
      "keep_private incorrectly became outward contact");
    assert.equal(expressions.length,2,
      "outward expression did not remain separate from private contact judgment");
    assert.equal(ensured.length,decisions.length+expressions.length,
      "fresh contact cognition escaped canonical LivedNow");

    const guyExpression=expressions.find((input)=>input.recipient.partyId==="person_guy");
    assert.equal(guyExpression.autobiographicalMemories.length,0,
      "Person routing fabricated autobiographical recognition during expression");
    const callsBeforeRetry=decisions.length+expressions.length;
    const retry=await process.runOnce();
    assert.equal(retry.attempted,0,"completed contact residue was reconsidered");
    assert.equal(decisions.length+expressions.length,callsBeforeRetry,
      "retry resampled completed contact cognition");
    assert.equal(contactStore.listDueContactReceptions({
      at:"2026-10-07T18:31:00.000Z",limit:1,
    }).length,1,"delivered Thread contact did not earn recipient opportunity");
    assert.equal(experienceStore.listEncounterStories(noor.threadId).length,0,
      "delivery itself fabricated recipient experience");
    let cognition=0;
    let receivedSituation=null;
    const recipientProcess=createThreadContactPerception({
      contactStore,worldReader:world,semanticStateStore,memoryStore,experienceStore,
      livedNow:{
        async ensure({threadId,at}){
          assert.equal(threadId,noor.threadId);
          receivedSituation={
            threadId,situationId:"sit_noor_receiving",establishedAt:at,
            phase:"at_place",location:{kind:"place",placeRef:"place_noor_home"},
            activity:"Quietly sketching.",reason:"Personal activity.",
            mediatedContext:null,participantRefs:[],sourcePlanRefs:[],
          };
          return receivedSituation;
        },
      },
      livedNowStore:{getSituation:()=>receivedSituation},
      now:()=>"2026-10-07T18:31:00.000Z",
      modelAdapter:{
        async invoke(call){
          cognition++;
          assert.equal(call.input.thread.threadId,noor.threadId,
            "sender's mind was substituted for recipient's attention");
          assert.match(call.input.encounterStory.story.beats[0].text,/compare sketches/,
            "recipient did not encounter the actual addressed message");
          return {
            output:{outcome:"noticed",experienceText:"I saw Kaleo asking about our sketches."},
            provenance:{provider:"fixture",modelId:"recipient-test"},
          };
        },
      },
    });
    const reception=await recipientProcess.runOnce();
    assert.equal(reception.failed,0,"recipient attention admission failed");
    assert.equal(reception.noticed,1,"recipient did not independently notice");
    assert.equal(reception.results[0].experienceId?.startsWith("exp_"),true,
      "noticed contact did not become a personal Experience");
    assert.equal(contactStore.inspectContactReceptions(noor.threadId)[0].completedAt!==null,true);
    const admitted=experienceStore.listEncounterStories(noor.threadId);
    assert.equal(admitted.length,1,"recipient contact was not admitted once");
    assert.deepEqual(admitted[0].threadPresence,
      [{threadId:noor.threadId,situationId:"sit_noor_receiving"}],
      "private contact invented physically co-present witnesses");
    assert.equal((await recipientProcess.runOnce()).attempted,0,
      "recipient notice was duplicated after retry");
    assert.equal(cognition,1,"completed contact resampled recipient attention");
  }finally{
    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    contactStore.close();
    experienceStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


test("revoked Person route stops a persisted contact decision before expression",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-n710-revoked-route-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const contactStore=openContactStore(storage);
  const semanticStateStore=openSemanticStateStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  const situatedLifeStore=openSituatedLifeStore(storage);
  const ensured=[];
  const livedNow=livedNowFixture(ensured);
  try{
    const kaleo=thread("thr_n710_revoked","Kaleo","evt_n710_revoked_seed");
    world.seedThread(kaleo);
    const sourceEvent=world.getThread(kaleo.threadId).provenance.lastEventId;
    situatedLifeStore.recordLifeRelation(relation({
      threadId:kaleo.threadId,
      partyId:"person_guy_revoked",
      kind:"human_source",
      displayName:"Guy",
      sourceEvent,
      role:"visitor",
    }));
    contactStore.registerPersonCapability({
      partyId:"person_guy_revoked",
      displayName:"Guy",
      registeredAt:"2026-10-07T18:15:00.000Z",
    });

    const consolidation=completeAfterthought(experienceStore,{
      threadId:kaleo.threadId,
      situationId:"sit_n710_revoked",
      occurredAt:"2026-10-07T18:20:00.000Z",
      startedAt:"2026-10-07T18:21:00.000Z",
      completedAt:"2026-10-07T18:21:01.000Z",
      text:"I want to ask Guy one more thing.",
    });
    const attempt=contactStore.claimAttempt({
      threadId:kaleo.threadId,
      consolidationId:consolidation.consolidationId,
      startedAt:"2026-10-07T18:30:00.000Z",
    });
    contactStore.recordStage({
      contactAttemptId:attempt.contactAttemptId,
      stage:"decision",
      recordedAt:"2026-10-07T18:30:01.000Z",
      payload:{
        decision:"contact",
        recipientPartyId:"person_guy_revoked",
        reason:"I want to follow up.",
        provenance:{provider:"fixture",modelId:"fixture-contact-decision"},
      },
    });
    contactStore.revokePersonCapability({
      partyId:"person_guy_revoked",
      revokedAt:"2026-10-07T18:31:00.000Z",
      reason:"Person disabled Fibre contact.",
    });

    let modelCalls=0;
    const process=createThreadContactProcess({
      worldReader:world,
      livedNow,
      situatedLifeStore,
      semanticStateStore,
      memoryStore,
      experienceStore,
      contactStore,
      modelAdapter:{
        async invoke(){
          modelCalls+=1;
          throw new Error("revoked route must stop before expression");
        },
      },
      now:()=>"2026-10-07T18:32:00.000Z",
    });

    const result=await process.runOnce();
    assert.equal(result.attempted,1,"persisted contact decision was not resumed");
    assert.equal(result.results[0].outcome,"route_unavailable",
      "revoked Person route still delivered contact");
    assert.equal(contactStore.listInbox("person_guy_revoked").length,0,
      "revoked Person capability received an outward message");
    assert.equal(contactStore.listSent(kaleo.threadId).length,0,
      "revoked route created sent contact history");
    assert.equal(modelCalls,0,
      "revoked route resampled or expressed contact cognition");
    assert.equal(ensured.length,0,
      "revoked route ran unnecessary LivedNow cognition");
  }finally{
    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    contactStore.close();
    experienceStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});

test("unroutable delayed residue drains without cognition or frontier starvation",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-n710-no-route-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const contactStore=openContactStore(storage);
  const semanticStateStore=openSemanticStateStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  const situatedLifeStore=openSituatedLifeStore(storage);
  const ensured=[];
  const livedNow=livedNowFixture(ensured);
  try{
    const kaleo=thread("thr_n710_no_route","Kaleo","evt_n710_no_route_seed");
    world.seedThread(kaleo);

    for(let index=0;index<5;index+=1){
      completeAfterthought(experienceStore,{
        threadId:kaleo.threadId,
        situationId:`sit_n710_no_route_${index}`,
        occurredAt:`2026-10-07T18:2${index}:00.000Z`,
        startedAt:`2026-10-07T18:3${index}:00.000Z`,
        completedAt:`2026-10-07T18:3${index}:01.000Z`,
        text:`Private delayed question ${index}.`,
      });
    }

    let modelCalls=0;
    const adapter={
      async invoke(){
        modelCalls+=1;
        throw new Error("unroutable contact should not invoke cognition");
      },
    };
    let tick=0;
    const process=createThreadContactProcess({
      worldReader:world,
      livedNow,
      situatedLifeStore,
      semanticStateStore,
      memoryStore,
      experienceStore,
      contactStore,
      modelAdapter:adapter,
      now:()=>new Date(Date.parse("2026-10-07T19:00:00.000Z")+(tick++*1000)).toISOString(),
      batchLimit:2,
    });

    const first=await process.runOnce();
    const second=await process.runOnce();
    const third=await process.runOnce();
    const idle=await process.runOnce();

    assert.deepEqual(
      [first.attempted,second.attempted,third.attempted,idle.attempted],
      [2,2,1,0],
      "bounded no-route frontier did not make forward progress",
    );
    assert.equal(
      [...first.results,...second.results,...third.results]
        .every((item)=>item.outcome==="no_route"&&item.completed===true),
      true,
      "unroutable residue did not settle as no_route",
    );
    assert.equal(modelCalls,0,
      "route absence triggered unnecessary cognition");
    assert.equal(ensured.length,0,
      "route absence unnecessarily reconciled LivedNow");
    assert.equal(contactStore.hasPendingAttempts(),false,
      "no-route contact left an incomplete attempt");
    assert.equal(process.hasPending(),false,
      "drained no-route residue kept World reconciliation alive");
  }finally{
    situatedLifeStore.close();
    memoryStore.close();
    semanticStateStore.close();
    contactStore.close();
    experienceStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});


test("delivered private contact may remain unnoticed and never become memory",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-contact-reception-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const world=openWorldStore(storage);
  const experienceStore=openLivedExperienceStore(storage);
  const contactStore=openContactStore(storage);
  const semanticStateStore=openSemanticStateStore(storage);
  const memoryStore=openAutobiographicalMemoryStore(storage);
  try{
    const sender=thread("thr_contact_quiet_sender","Sender","evt_contact_quiet_sender");
    const recipient=thread("thr_contact_quiet_recipient","Recipient","evt_contact_quiet_recipient");
    world.seedThread(sender);
    world.seedThread(recipient);
    const source=completeAfterthought(experienceStore,{
      threadId:sender.threadId,situationId:"sit_contact_quiet_source",
      occurredAt:"2026-10-07T18:20:00.000Z",
      startedAt:"2026-10-07T18:21:00.000Z",
      completedAt:"2026-10-07T18:22:00.000Z",
      text:"I might check in with my friend.",
    });
    const attempt=contactStore.claimAttempt({
      threadId:sender.threadId,consolidationId:source.consolidationId,
      startedAt:"2026-10-07T18:24:00.000Z",
    });
    const message=contactStore.recordMessage({
      contactAttemptId:attempt.contactAttemptId,
      senderThreadId:sender.threadId,recipientPartyId:recipient.threadId,
      recipientKind:"thread",sentAt:"2026-10-07T18:25:00.000Z",
      messageText:"Hello, would you like to talk when you are free?",
      sourceConsolidationId:source.consolidationId,
    });
    assert.equal(contactStore.listInbox(recipient.threadId).length,1);
    assert.equal(experienceStore.listEncounterStories(recipient.threadId).length,0,
      "delivery silently counted as an experience");
    const situated={
      threadId:recipient.threadId,situationId:"sit_contact_quiet_lived",
      establishedAt:"2026-10-07T18:26:00.000Z",
      phase:"at_place",location:{kind:"place",placeRef:"place_contact_quiet"},
      activity:"Sleeping.",reason:"Rest.",mediatedContext:null,
      participantRefs:[],sourcePlanRefs:[],
    };
    let appraisals=0;
    let ensured=0;
    const process=createThreadContactPerception({
      contactStore,worldReader:world,semanticStateStore,memoryStore,experienceStore,
      livedNow:{async ensure({threadId}) {
        assert.equal(threadId,recipient.threadId);
        ensured++;
        return situated;
      }},
      livedNowStore:{getSituation:()=>situated},
      now:()=>"2026-10-07T18:26:00.000Z",
      modelAdapter:{async invoke(){
        appraisals++;
        if(appraisals===1)throw new Error("temporary attention provider failure");
        return {
          output:{outcome:"not_noticed",experienceText:null},
          provenance:{provider:"fixture",modelId:"recipient-quiet-test"},
        };
      }},
    });
    const interrupted=await process.runOnce();
    assert.equal(interrupted.failed,1,"temporary failure was silently counted as notice");
    assert.equal(contactStore.inspectContactReceptions(recipient.threadId)[0].situationId,
      situated.situationId,"partial attention lost its lived witness");
    const result=await process.runOnce();
    assert.equal(result.failed,0);
    assert.equal(result.noticed,0,"unnoticed delivery was treated as noticed");
    assert.equal(result.results[0].experienceId,null);
    const story=experienceStore.getEncounterStory(result.results[0].encounterId);
    assert.deepEqual(story.threadPresence,
      [{threadId:recipient.threadId,situationId:situated.situationId}],
      "private message gained an unintended witness");
    assert.equal(story.visualization.visualizationPrompt.includes(message.messageText),false,
      "private message leaked into visual reconstruction instructions");
    const attention=experienceStore.getThreadEncounterAttention(
      recipient.threadId,story.encounterId,
    );
    assert.equal(attention.outcome,"not_noticed");
    assert.equal(attention.experience,null,"unnoticed delivery created Experience");
    assert.equal(experienceStore.hasPendingExperienceConsolidation(),false,
      "unnoticed delivery entered memory consolidation");
    assert.equal((await process.runOnce()).attempted,0);
    assert.equal(appraisals,2,"partial attention was not retried exactly once");
    assert.equal(ensured,1,"partial attention re-authored the recipient's life");
    assert.equal(experienceStore.listEncounterStories(recipient.threadId).length,1,
      "attention retry duplicated the objective addressed message");
  }finally{
    contactStore.close();
    experienceStore.close();
    semanticStateStore.close();
    memoryStore.close();
    world.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
