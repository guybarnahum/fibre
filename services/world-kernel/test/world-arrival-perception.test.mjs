import {installedWorldStateStorage} from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openWorldStore} from "../src/persistence.mjs";
import {openLivedExperienceStore} from "../src/lived-experience-store.mjs";
import {createWorldArrivalPerception} from "../src/world-arrival-perception.mjs";
import {createWorldSocialOpportunity} from "../src/world-social-opportunity.mjs";
import {projectSituatedPercept} from "../src/situated-percept.mjs";
import {evaluateSalience} from "../src/salience-gate.mjs";
import {embodimentSpecificationDigest} from "../src/embodiment-domain.mjs";
import {booksToContinueAt,displayHoldings,glanceItems,readHolding} from "../src/scene-glance.mjs";

const seed=JSON.parse(readFileSync(
  new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8",
));
const AT="2026-10-18T14:00:00.000Z";
function setup(){
  const dir=mkdtempSync(join(tmpdir(),"fibre-arrival-witness-"));
  const storage=installedWorldStateStorage(join(dir,"world.sqlite"));
  const ids=["thr_arrival_actor","thr_arrival_reader","thr_arrival_worker"];
  const world=openWorldStore(storage);
  const threads=new Map();
  for(const id of ids){
    const thread=structuredClone(seed);
    thread.threadId=id;thread.provenance.lastEventId=`evt_${id}`;
    world.seedThread(thread);threads.set(id,thread);
  }
  world.close();
  const situations=ids.map((threadId,i)=>({
    threadId,situationId:["sit_real_arrival","sit_reader","sit_worker"][i],
    establishedAt:i===0?AT:"2026-10-18T13:00:00.000Z",
    provenance:"world_enacted",wakefulness:"awake",
    activity:i===0?"Entering the café.":"Reading in the café.",
    location:{kind:"place",placeRef:"wpl_verified_cafe"},
  }));
  const bySituation=new Map(situations.map(s=>[s.situationId,s]));
  const store=openLivedExperienceStore(storage);
  const work={situationId:situations[0].situationId,
    venueRef:"venue_verified_cafe",dueAt:AT,
    witnesses:situations.slice(1).map(s=>({
      threadId:s.threadId,situationId:s.situationId,
    }))};
  const livedNowStore={
    getSituation:id=>structuredClone(bySituation.get(id)??null),
    getSituationAt:(id,at)=>structuredClone(situations.find(s=>
      s.threadId===id&&s.establishedAt<=at)??null),
    getPreviousSituation:()=>null,
    threadLifeRests:()=>false,
    getWorldPlace:()=>({physicalVenue:{
      ref:"venue_verified_cafe",displayName:"An attested café",
    }}),
  };
  return {ids,situations,threads,store,work,livedNowStore,
    close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}

test("an event-time departure cannot remain an arrival witness",async()=>{
  const ctx=setup();
  try{
    ctx.store.enqueueArrivalPerception(ctx.work);
    const original=ctx.livedNowStore.getSituationAt;
    ctx.livedNowStore.getSituationAt=(id,at)=>{
      const scene=original(id,at);
      return id===ctx.ids[0]?scene:{
        ...scene,establishedAt:at,
        location:{kind:"transit",fromPlaceRef:"wpl_verified_cafe",
          toPlaceRef:"per:home",progress:0},
      };
    };
    let calls=0;
    const process=createWorldArrivalPerception({
      experienceStore:ctx.store,livedNowStore:ctx.livedNowStore,
      worldReader:{getThread:()=>null},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke(){calls++;throw Error("invented notice");}},
      now:()=>AT,
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,"World could not settle the invalid witness set");
    assert.equal(result.results[0].outcome,"not_observable",
      "departed people became event-time witnesses");
    assert.equal(ctx.store.listEncounterStories(ctx.ids[0]).length,0,
      "simultaneous departure invented an Encounter Story");
    assert.equal(calls,0,"absent witnesses received personal attention cognition");
  }finally{ctx.close();}
});

test("one enacted arrival permits distinct noticing and missed attention with retry",async()=>{
  const ctx=setup();
  try{
    const {ids,store,work,livedNowStore,threads}=ctx;
    // The bystander may have already spent the social chance earned by
    // their own earlier arrival. This is a different witnessed event.
    const reader=ctx.situations[1];
    store.enqueueSocialOpportunity({
      threadId:reader.threadId,situationId:reader.situationId,
      dueAt:reader.establishedAt,
    });
    const earlier=store.claimDueSocialOpportunity({at:reader.establishedAt});
    assert.equal(earlier.threadId,reader.threadId,
      "the earlier independent social chance was lost");
    store.completeSocialOpportunity({
      situationId:earlier.situationId,at:reader.establishedAt,
      outcome:"not_initiated",
    });
    assert.equal(store.enqueueArrivalPerception(work).inserted,true);
    assert.equal(store.enqueueArrivalPerception(work).inserted,false,
      "arrival was scheduled twice");
    let calls=0,interrupt=true;
    const attentionInputs=[];
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke({input}){
        calls++;
        attentionInputs.push(structuredClone(input));
        if(input.glance)return {output:{focus:null,experienceText:null,
          passedReason:"I went straight to a free seat."},provenance:{provider:"fixture",modelId:"glance"}};
        assert.equal(input.encounterStory.occurredAt,AT,"World changed event time");
        assert.equal(input.encounterStory.story.beats[0].actorThreadId,ids[0],
          "actor was misattributed");
        const own=input.encounterStory.story.beats.filter(beat=>beat.self);
        assert.deepEqual(own.map(beat=>beat.actorThreadId),[input.thread.threadId],
          "attention failed to distinguish own beat from other people");
        assert.ok(input.encounterStory.story.beats.every(beat=>
          beat.self===(beat.actorThreadId===input.thread.threadId)),
        "observer-relative self markers contradict the objective actors");
        if(input.thread.threadId===ids[2]&&interrupt){
          interrupt=false;throw new Error("model interrupted");
        }
        return {output:input.thread.threadId===ids[1]
          ?{outcome:"noticed",experienceText:"I see the arrival.",passedReason:null}
          :{outcome:"not_noticed",experienceText:null,
            passedReason:"I stayed absorbed in the book before me."},
          provenance:{provider:"fixture",modelId:"attention"}};
      }},
      now:()=>AT,
    });
    assert.equal((await process.runOnce()).failed,1,
      "partial attention was falsely declared complete");
    const recovered=await process.runOnce();
    assert.equal(recovered.failed,0,recovered.results[0]?.message??"perception failed");
    const stories=store.listEncounterStories(ids[1]);
    assert.equal(stories.length,1,"World duplicated its arrival Story");
    const story=stories[0];
    const admittedVenue=livedNowStore.getWorldPlace(
      ids[0],ctx.situations[0].location.placeRef,
    ).physicalVenue.displayName;
    assert.ok(story.story.beats[0].text.endsWith(" arrives at "+admittedVenue+"."),
      "objective arrival did not name its admitted venue");
    const arrivingInput=attentionInputs.find(input=>input.thread.threadId===ids[0]);
    assert.equal(arrivingInput?.glance.arrivedAt,admittedVenue,
      "arriver's glance was at a different venue");
    assert.deepEqual(arrivingInput.glance.items.map(item=>item.kind),["person","person"],
      "the arriver's glance did not hold the people already present");
    assert.deepEqual(story.threadPresence.map(x=>x.threadId).sort(),[...ids].sort(),
      "independently situated witnesses were lost");
    assert.deepEqual(story.visualization.visualizationSourceReferences,
      [work.situationId,work.venueRef],"event lost its enacted source");
    assert.equal(story.story.beats.length,3,
      "real arrival did not identify its already-present witnesses");
    assert.ok(story.story.beats.every(beat=>!Object.hasOwn(beat,"self")),
      "observer identity was written into the objective World Story");
    assert.ok(story.story.beats.every(beat=>!beat.text.includes("Thread")),
      "lived Story leaked internal ontology");
    const noticed=store.getThreadEncounterAttention(ids[1],story.encounterId);
    const ignored=store.getThreadEncounterAttention(ids[2],story.encounterId);
    assert.equal(noticed?.outcome,"noticed","first witness did not notice");
    assert.ok(noticed?.experience?.experienceId,"noticed event has no Experience");
    assert.equal(ignored?.outcome,"not_noticed","second witness was forced to notice");
    assert.equal(ignored?.experience,null,"missed event became an Experience");
    assert.ok(ignored?.passedReason?.length>0,
      "missed attention had no private explanation");
    assert.equal(noticed?.passedReason,null,
      "noticed attention invented a passing explanation");
    assert.equal(story.story.beats.some(beat=>
      beat.text.includes(ignored.passedReason)),false,
      "private missed-attention reason entered objective World history");
    const observerStories=store.inspectRecentEncounterStories(ids[2]);
    assert.equal(observerStories[0]?.attention?.passedReason,ignored.passedReason,
      "personal Observatory did not show the missed-attention reason");
    assert.equal(store.inspectRecentEncounterStories(ids[1])[0]?.attention?.passedReason,
      null,"another Thread's Observatory disclosed private missed attention");
    assert.ok(attentionInputs.every(input=>
      !JSON.stringify(input).includes(ignored.passedReason)),
      "private passing reason entered someone else's cognition");
    assert.equal(store.getThreadEncounterAttention(ids[0],story.encounterId)?.outcome,
      "not_noticed","arriver was not given independent attention");
    assert.equal(calls,4,"replay rerolled admitted personal attention");
    assert.equal(store.nextArrivalPerceptionAt(),null,"completed event kept polling");

    // An observed arrival is a personal causal input, not generic
    // co-presence. Its impact on salience is grounded in noticed attention.
    const perceptFor=(threadId)=>projectSituatedPercept({
      observerThreadId:threadId,
      situation:ctx.situations.find(x=>x.threadId===threadId),
      at:AT,
      observedThreads:[{
        threadId:ids[0],name:"Newcomer",situation:ctx.situations[0],
      }],
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[]},
      livedNowStore,experienceStore:store,
    });
    const noticedPercept=perceptFor(ids[1]);
    const missedPercept=perceptFor(ids[2]);
    assert.equal(noticedPercept.recentEvents.length,1,
      "lived attention did not influence later social context");
    assert.equal(Object.hasOwn(noticedPercept.recentEvents[0],"personalExperience"),false,
      "private Experience leaked into exterior Situated Percept");
    const past=projectSituatedPercept({
      observerThreadId:ids[1],
      situation:ctx.situations[1],
      at:"2026-10-18T21:00:00.000Z",
      observedThreads:[{
        threadId:ids[0],name:"Newcomer",situation:ctx.situations[0],
      }],
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[]},
      livedNowStore,experienceStore:store,
    });
    assert.equal(past.recentEvents.length,0,
      "old World history was silently promoted to lifelong recollection");
    assert.equal(missedPercept.recentEvents.length,0,
      "a missed occurrence leaked into private social knowledge");
    const salient=evaluateSalience({
      opportunity:noticedPercept.opportunities[0],
      situatedPercept:noticedPercept,
    });
    const background=evaluateSalience({
      opportunity:missedPercept.opportunities[0],
      situatedPercept:missedPercept,
    });
    assert.equal(salient.outcome,"salient",
      "noticing a person did not matter to social consideration");
    assert.equal(background.outcome,"background",
      "mere co-presence forced social attention");

    const bystander=store.inspectSocialOpportunities(ids[1]);
    assert.equal(bystander.length,2,
      "later noticing did not earn a distinct social chance");
    assert.equal(bystander[0].sourceEncounterRef,story.encounterId,
      "social consideration lost its actual perceived cause");
    assert.equal(store.inspectSocialOpportunities(ids[2]).length,0,
      "a bystander who missed the arrival was forced into social consideration");
    let approached=0;
    const social=createWorldSocialOpportunity({
      experienceStore:store,
      livedNowStore:{
        getCurrentSituation:id=>ctx.situations.find(x=>x.threadId===id)??null,
        inspectLivedBoundary:()=>null,
        getSituationAt:livedNowStore.getSituationAt,
        getPreviousSituation:()=>null,
        getWorldPlace:livedNowStore.getWorldPlace,
        listCurrentVenueSituations:()=>{throw Error("targeted attention must not scan population");},
      },
      meetingService:{async meet(input){
        approached++;
        assert.equal(input.initiatorThreadId,ids[1],
          "the wrong person initiated the observed social choice");
        assert.equal(input.counterpartyThreadId,ids[0],
          "observation targeted a different person");
        return {attempts:[{outcome:"not_initiated"}]};
      }},
      now:()=>AT,
    });
    const considered=await social.runOnce();
    assert.equal(considered.failed,0,
      considered.results[0]?.message??"observed social choice failed");
    assert.equal(considered.results[0]?.outcome,"not_initiated",
      "bystander lost the freedom not to approach");
    assert.equal(approached,1,"noticed arrival prompted repeated social inference");
    assert.equal((await social.runOnce()).attempted,0,
      "completed observed social choice did not settle");
    assert.equal(store.listSocialInteractions(ids[1]).length,0,
      "choosing not to approach created shared interaction history");
  }finally{ctx.close();}
});

test("an arriver's own noticed company changes later social salience",async()=>{
  for(const noticed of [false,true]){
    const ctx=setup();
    try{
      const {ids,store,livedNowStore,threads}=ctx;
      store.enqueueArrivalPerception(ctx.work);
      const process=createWorldArrivalPerception({
        experienceStore:store,livedNowStore,
        worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
        semanticStateStore:{listCurrentState:()=>[]},
        memoryStore:{listCurrentMemories:()=>[]},
        modelAdapter:{async invoke({input}){
          if(input.glance)return {output:noticed
            ?{focus:0,experienceText:"I notice someone reading by the window.",passedReason:null}
            :{focus:null,experienceText:null,passedReason:"I was focused on my own thoughts."},
            provenance:{provider:"fixture",modelId:"arrival-glance"}};
          return {
            output:input.thread.threadId===ids[0]&&noticed
              ?{outcome:"noticed",experienceText:"I became aware of a reader.",passedReason:null}
              :{outcome:"not_noticed",experienceText:null,
                passedReason:"I was focused on my own thoughts."},
            provenance:{provider:"fixture",modelId:"arrival-attention"},
          };
        }},
        now:()=>AT,
      });
      assert.equal((await process.runOnce()).failed,0,
        "arrival attention did not settle");
      const scene=store.listEncounterStories(ids[0])[0];
      const attention=store.getThreadEncounterAttention(ids[0],scene.encounterId);
      assert.equal(attention.outcome,noticed?"noticed":"not_noticed",
        "arriver's attention was imposed by bystanders");
      const percept=projectSituatedPercept({
        observerThreadId:ids[0],situation:ctx.situations[0],at:AT,
        observedThreads:[{
          threadId:ids[1],name:"Unknown reader",situation:ctx.situations[1],
        }],
        situatedLifeStore:{
          listCurrentPlaceEpisodes:()=>[],listCurrentLifeRelations:()=>[],
        },
        livedNowStore,experienceStore:store,
      });
      const gate=evaluateSalience({
        opportunity:percept.opportunities[0],situatedPercept:percept,
      });
      assert.equal(percept.observed[0].name,null,
        "a stranger's name became visible without acquaintance");
      assert.equal(gate.outcome,noticed?"salient":"background",
        "an arriver's independently noticed company did not change salience");
      assert.equal(gate.anchors.includes("recent_observable_history"),noticed,
        "arriver's perceived occurrence was not causally available");
    }finally{ctx.close();}
  }
});

test("objective arrivals redact full and partial names from public portrait and activity",async()=>{
  const ctx=setup();
  try{
    const {ids,threads,store,work,livedNowStore}=ctx;
    const name="Mina Rivera";
    threads.get(ids[0]).identity.name=name;
    ctx.situations[0].activity="Mina reads quietly by the window.";
    const specification={
      subject:{partyId:ids[0],
        description:"Mina Rivera has dark eyes and a small freckle. Mina wears short hair."},
      method:"canonical synthetic portrait specification",
      description:"A neutral visual portrayal of a real person, without invented motives.",
      model:"reference-renderer",
    };
    const portrait={
      embodimentId:"emb_named_arrival",revision:1,threadId:ids[0],
      kind:"portrait",representationKind:"synthetic_generation",
      truthStatus:"synthetic_representation_not_historical_evidence",
      rightsBasis:"thread_self_owned",permissionReferences:[],
      sourceReferences:["evt_"+ids[0]],specification,
      specificationDigest:embodimentSpecificationDigest(specification),
      respecification:null,status:"available",unavailableReason:null,
      asset:{assetRef:"asset://embodiment/arrival-reference",
        referenceObjectRef:"asset_named_arrival_reference",
        sha256:"sha256:"+"a".repeat(64),mediaType:"image/webp",
        width:512,height:512,durationMs:null},
      visibility:"public",recordedAt:AT,
    };
    store.enqueueArrivalPerception(work);
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      embodimentStore:{listCurrent:id=>id===ids[0]?[portrait]:[]},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke(){return{
        output:{outcome:"not_noticed",experienceText:null,
          passedReason:"I was occupied with something else."},
        provenance:{provider:"fixture",modelId:"attention"},
      };}},
      now:()=>AT,
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,result.results[0]?.message??"arrival failed");
    const story=store.listEncounterStories(ids[0])[0];
    const recorded=story.story.beats.map(beat=>beat.text).join(" ");
    const venueName=livedNowStore.getWorldPlace(
      ids[0],ctx.situations[0].location.placeRef,
    ).physicalVenue.displayName;
    assert.ok(recorded.includes("arrives at "+venueName+"."),
      "the arrival disappeared from its admitted venue");
    assert.doesNotMatch(recorded,/freckle|short hair/i,
      "legacy portrait rendering prose became objective perception");
    assert.doesNotMatch(recorded,/\b(?:Mina|Rivera)\b/i,
      "objective arrival revealed a private name token");
  }finally{ctx.close();}
});

test("a witness sees someone it has met by name, a stranger stays described, and the World Story names no one",async()=>{
  const ctx=setup();
  try{
    const {ids,threads,store,work,livedNowStore}=ctx;
    threads.get(ids[0]).identity.name="Kadir Hundessa";
    // Only the reader has met the arriver before.
    const experienceStore=new Proxy(store,{get:(target,key)=>key==="hasMetEncounter"
      ?(observer,other)=>observer===ids[1]&&other===ids[0]
      :typeof target[key]==="function"?target[key].bind(target):target[key]});
    store.enqueueArrivalPerception(work);
    const seen={};
    const process=createWorldArrivalPerception({
      experienceStore,livedNowStore,
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke({input}){
        seen[input.thread.threadId]=input.glance??input.encounterStory.story.beats.find(beat=>beat.actorThreadId===ids[0]);
        return {output:input.glance?{focus:null,experienceText:null,passedReason:"I was looking for a seat."}
          :{outcome:"not_noticed",experienceText:null,passedReason:"I was reading."},
          provenance:{provider:"fixture",modelId:"attention"}};
      }},
      now:()=>AT,
    });
    assert.equal((await process.runOnce()).failed,0,"arrival attention did not settle");
    assert.equal(seen[ids[1]].knownAs,"Kadir Hundessa","a witness did not recognize someone it has met");
    assert.equal(seen[ids[2]].knownAs,undefined,"a stranger was recognized without having met");
    assert.ok(seen[ids[0]].items.every(item=>item.kind==="person"&&item.knownAs===undefined),
      "the arriver recognized people it has never met");
    assert.ok(store.listEncounterStories(ids[0])[0].story.beats.every(beat=>!("knownAs" in beat)),
      "one observer's recognition entered the objective World Story");
  }finally{ctx.close();}
});

const WORKS=["Walden","The Souls of Black Folk","Meditations","The Prince","Leaves of Grass"].map((title,i)=>({
  source:"gutenberg",sourceId:String(100+i),title,authors:[{name:`Author ${i}`,birthYear:null,deathYear:null}],
  languages:["en"],subjects:[`Subject ${i}`],textUrl:`https://example.org/${i}.txt`,
  evidenceRef:`https://www.gutenberg.org/ebooks/${100+i}`}));

test("a library's display is filled once from attested works and kept; an unreachable catalogue invents nothing",async()=>{
  const ctx=setup();
  try{
    let fetched=0;
    const catalogue={async listWorks(){fetched++;return WORKS;}};
    const first=await displayHoldings({venueRef:"venue_verified_cafe",catalogue,experienceStore:ctx.store,at:AT});
    const again=await displayHoldings({venueRef:"venue_verified_cafe",catalogue,experienceStore:ctx.store,at:AT});
    assert.deepEqual(again.map(item=>item.holdingRef),first.map(item=>item.holdingRef),"the same shelf held different books");
    assert.equal(fetched,1,"a kept shelf was filled again");
    assert.ok(first.every(item=>item.work.evidenceRef.startsWith("https://")),"a holding has no catalogue attestation");
    const offline={async listWorks(){throw new Error("catalogue unreachable");}};
    assert.deepEqual(await displayHoldings({venueRef:"venue_other",catalogue:offline,experienceStore:ctx.store,at:AT,
      warn:()=>{}}),[],
      "books were invented when the catalogue could not be reached");
  }finally{ctx.close();}
});

test("a glance looks over everything before taking one thing up: the rest is seen and passed, and taking up a book is an act the Thread experiences",async()=>{
  const ctx=setup();
  try{
    const {ids,threads,store,work}=ctx;
    const livedNowStore={...ctx.livedNowStore,getWorldPlace:()=>({affordances:["Reading"],
      physicalVenue:{ref:"venue_verified_cafe",displayName:"An attested library"}})};
    store.enqueueArrivalPerception({...work,witnesses:work.witnesses.slice(0,1)});
    const glances=[];
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,catalogue:{async listWorks(){return WORKS;}},
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke({input}){
        if(!input.glance)return {output:{outcome:"not_noticed",experienceText:null,passedReason:"Reading."},
          provenance:{provider:"fixture",modelId:"attention"}};
        glances.push(input.glance);
        // The arriver takes up the last book in the list.
        const focus=input.glance.items.findLastIndex(item=>item.kind==="book");
        return {output:{focus,experienceText:"The worn spine pulls me in; I take it down.",
          passedReason:"Nothing else held me."},provenance:{provider:"fixture",modelId:"glance"}};
      }},
      now:()=>AT,
    });
    assert.equal((await process.runOnce()).failed,0,"the arrival glance did not settle");
    const [seen]=glances;
    assert.deepEqual(seen.items.map(item=>item.kind).sort(),["book","book","book","person"],
      "the glance did not hold the books within reach and the person present");
    const glance=store.getThreadGlance(ids[0],work.situationId);
    const book=glance.items[glance.focus];
    const story=store.listEncounterStories(ids[0]).find(item=>item.encounterId===glance.focusEncounterRef);
    assert.equal(story.story.beats[0].holdingRef,book.ref,"taking up the book was not an admitted act on that book");
    assert.equal(store.getThreadEncounterAttention(ids[0],story.encounterId)?.experience?.experienceText,
      "The worn spine pulls me in; I take it down.","meeting the book did not become the Thread's experience");
    const arrival=store.listEncounterStories(ids[1])[0];
    const towardPeople=store.getThreadEncounterAttention(ids[0],arrival.encounterId);
    assert.equal(towardPeople.outcome,"not_noticed","a person was noticed while attention was on a book");
    assert.equal(towardPeople.passedReason,"Nothing else held me.",
      "a person seen and passed was given no reason");
  }finally{ctx.close();}
});

test("a Thread reads the actual pages from where it stopped, and its place in the book is kept",async()=>{
  const ctx=setup();
  try{
    const [holding]=await displayHoldings({venueRef:"venue_verified_cafe",
      catalogue:{async listWorks(){return WORKS;}},experienceStore:ctx.store,at:AT});
    const pages={null:{text:"When I wrote the following pages, I lived alone, in the woods.",nextByte:900},
      900:{text:"I went to the woods because I wished to live deliberately.",nextByte:1800}};
    const asked=[],seen=[];
    const read=(at)=>readHolding({thread:ctx.threads.get(ctx.ids[0]),
      situation:{...ctx.situations[0],establishedAt:at},holdingRef:holding.holdingRef,describeSelf:"A person",
      catalogue:{async readPassage({fromByte}){asked.push(fromByte);return pages[fromByte];}},
      experienceStore:ctx.store,
      modelAdapter:{async invoke({input}){seen.push(input.reading);
        return {output:{experienceText:"The plainness of it holds me.",keepReading:true}};}}});
    const first=await read(AT);
    const second=await read("2026-10-19T10:00:00.000Z");
    assert.deepEqual(asked,[null,900],"a second reading did not continue where the first stopped");
    assert.equal(seen[0].passage,pages.null.text,"the book's actual pages did not reach the reader");
    assert.equal(seen[1].where,"where you left off","a returning reader was told it was starting over");
    assert.deepEqual([first.nextByte,second.nextByte,second.status],[900,1800,"reading"],
      "the reader's place in the book was not kept");
  }finally{ctx.close();}
});

test("a book a Thread has been reading is in its glance where it left it, and someone reading is seen with the book in hand",async()=>{
  const ctx=setup();
  try{
    const {ids,threads,store,work}=ctx;
    const livedNowStore={...ctx.livedNowStore,getWorldPlace:()=>({affordances:["Reading"],
      physicalVenue:{ref:"venue_verified_cafe",displayName:"An attested library"}})};
    const shelf=await displayHoldings({venueRef:"venue_verified_cafe",catalogue:{async listWorks(){return WORKS;}},
      experienceStore:store,at:AT});
    const [own,inHand]=[shelf.at(-1),shelf[0]];
    const reading=(threadId,holding,at)=>store.recordThreadReading({threadId,workRef:`gutenberg:${holding.work.sourceId}`,
      holdingRef:holding.holdingRef,title:holding.work.title,nextByte:900,status:"reading",at});
    reading(ids[0],own,"2026-10-17T10:00:00.000Z");
    reading(ids[1],inHand,"2026-10-18T13:30:00.000Z");
    store.enqueueArrivalPerception({...work,witnesses:work.witnesses.slice(0,1)});
    const glances=[];
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,catalogue:{async listWorks(){return WORKS;}},
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>[]},memoryStore:{listCurrentMemories:()=>[]},
      modelAdapter:{async invoke({input}){
        if(!input.glance)return {output:{outcome:"not_noticed",experienceText:null,passedReason:"Reading."},
          provenance:{provider:"fixture",modelId:"attention"}};
        glances.push(input.glance);
        return {output:{focus:null,experienceText:null,passedReason:"Not now."},provenance:{provider:"fixture",modelId:"glance"}};
      }},
      now:()=>AT,
    });
    assert.equal((await process.runOnce()).failed,0,"the arrival glance did not settle");
    const items=glances[0].items;
    assert.ok(items.some(item=>item.kind==="book"&&item.title===own.work.title&&item.yours),
      "the book it had been reading was not where it left it");
    assert.ok(items.find(item=>item.kind==="person").text.includes(inHand.work.title),
      "a person reading was not seen with the book in hand");
    assert.ok(store.listEncounterStories(ids[1])[0].story.beats.some(beat=>beat.text.includes(inHand.work.title)),
      "the book in hand is not part of what World saw");
    assert.deepEqual(booksToContinueAt({experienceStore:store,livedNowStore,threadId:ids[0],
      placeRefs:["wpl_verified_cafe"]}).map(item=>[item.title,item.placeRef]),[[own.work.title,"wpl_verified_cafe"]],
      "a plan could not find where the book it was reading is kept");
  }finally{ctx.close();}
});

test("different visits find different books from the same kept shelf, and a glance stays short",()=>{
  const holdings=WORKS.map((work,position)=>({holdingRef:`hld_${position}`,work}));
  const people=[{kind:"person",ref:"thr_a",text:"A woman is reading."},{kind:"person",ref:"thr_b",text:"A man is writing."}];
  const visits=["2026-10-18T14:00:00.000Z","2026-10-19T09:00:00.000Z","2026-10-20T11:30:00.000Z"]
    .map(at=>glanceItems({people,holdings,venueRef:"venue_library",at}));
  assert.ok(visits.every(items=>items.length<=5),"a glance was longer than a glance");
  assert.ok(new Set(visits.map(items=>items.filter(item=>item.kind==="book").map(item=>item.ref).sort().join())).size>1,
    "every visit found the same books on the table");
});

test("late inspection retains arrival truth without inventing old psychology",async()=>{
  const ctx=setup();
  try{
    const {ids,store,work,livedNowStore,threads}=ctx;
    store.enqueueArrivalPerception(work);
    const process=createWorldArrivalPerception({
      experienceStore:store,livedNowStore,
      worldReader:{getThread:id=>structuredClone(threads.get(id)??null)},
      semanticStateStore:{listCurrentState:()=>{throw new Error("no retro state");}},
      memoryStore:{listCurrentMemories:()=>{throw new Error("no retro memory");}},
      modelAdapter:{invoke:()=>{throw new Error("no retro model");}},
      now:()=> "2026-10-18T16:00:00.000Z",
    });
    const result=await process.runOnce();
    assert.equal(result.failed,0,result.results[0]?.message??"late arrival failed");
    const story=store.listEncounterStories(ids[1])[0];
    assert.equal(story.occurredAt,AT,"late processing moved the event");
    assert.equal(store.getThreadEncounterAttention(ids[1],story.encounterId),null,
      "late processing invented attention");
    assert.equal(store.nextArrivalPerceptionAt(),null,
      "late historical work kept rescheduling");
    assert.equal(store.nextSocialOpportunityAt(),null,
      "late arrival fabricated a present-day social opportunity");
  }finally{ctx.close();}
});
