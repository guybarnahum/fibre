import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { openLivedExperienceStore } from "../src/lived-experience-store.mjs";
import { openAutobiographicalMemoryStore } from "../src/autobiographical-memory-store.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import { selectDevelopedSelfEvidence } from "../src/interior-cognition.mjs";
import { formPersonalLivedPlan } from "../src/lived-plan-cognition.mjs";
import { worldPlaceRef } from "../src/live-world-geography.mjs";
import { attendedHours, formLivelihood, livelihoodForPlanning } from "../src/thread-livelihood.mjs";

const seed=JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json",import.meta.url),"utf8"));
const SELF="thr_livelihood_hana",AT="2026-11-21T09:00:00.000Z";
const STALL="A phone repair stall in Merkato, Addis Ababa, Ethiopia";
const memory=(memoryId,content)=>({memoryId,rememberedContent:content,rememberedMeaning:null,salience:0.8});
const MEMORIES=[memory("mem_kiosk","For years after school I fixed cracked phone screens at my uncle's stall."),
  memory("mem_sister","My sister and I kept the stall's accounts in a school notebook.")];

function world(run){
  return async()=>{
    const directory=mkdtempSync(join(tmpdir(),"fibre-livelihood-"));
    const storage=installedWorldStateStorage(join(directory,"world.sqlite"));
    const stores={world:openWorldStore(storage),experience:openLivedExperienceStore(storage),
      memory:openAutobiographicalMemoryStore(storage),semantic:openSemanticStateStore(storage)};
    try{
      const thread=structuredClone(seed);
      thread.threadId=SELF;thread.identity.name="Hana Tesfaye";thread.provenance.lastEventId="evt_"+SELF;
      stores.world.seedThread(thread);
      await run({...stores,thread:stores.world.getThread(SELF)});
    }finally{
      for(const store of Object.values(stores))store.close();
      rmSync(directory,{recursive:true,force:true});
    }
  };
}

const answer=(output)=>{
  const calls=[];
  return {calls,adapter:{async invoke(request){calls.push(request);return {output};}}};
};

test("a Thread finds what it can do and what it does with its life in its own past, once, and nothing it did not live",
  world(async({experience,thread})=>{
    const {calls,adapter}=answer({
      skills:[{skill:"Fixing phone screens",how:"I learned it at my uncle's stall.",evidenceRefs:["mem_kiosk","mem_not_mine"]},
        {skill:"Surgery",how:"Nothing I lived.",evidenceRefs:["mem_not_mine"]}],
      situation:{now:"I work at my uncle's stall most days.",place:STALL,rhythm:"Six days a week, mornings to dusk.",
        hopes:"A stall of my own.",worries:"That the work dries up.",openQuestions:["Should I learn to fix laptops?"],
        evidenceRefs:["mem_kiosk"]},
    });
    const form=()=>formLivelihood({thread,memories:MEMORIES,experienceStore:experience,modelAdapter:adapter,asOf:AT,
      places:[{ref:"wpl_library",displayName:"Abrehot Library",placeKind:"library_or_learning"}],city:"Addis Ababa, Ethiopia"});
    await form();
    await form();
    assert.equal(calls.length,1,"a Thread re-formed its account of its life");
    const skills=experience.listCurrentSkills(SELF);
    assert.deepEqual(skills.map(skill=>[skill.skill,[...skill.evidenceRefs]]),[["Fixing phone screens",["mem_kiosk"]]],
      "a skill rested on a memory the Thread does not have");
    const life=experience.getCurrentLivelihood(SELF);
    assert.equal(life.placeRef,worldPlaceRef({threadId:SELF,name:"A phone repair stall in Merkato",
      city:"Addis Ababa",country:"Ethiopia"}),"where its days are spent is not the place it will find by that name");

    const evidence=selectDevelopedSelfEvidence({threadId:SELF,at:AT,sourceStores:{
      identityStore:{getCurrentIdentityView:threadId=>({threadId,assertions:[]})},
      situatedLifeStore:{listCurrentLifeRelations:()=>[]},
      semanticStateStore:{listCurrentState:()=>[]},memoryStore:{listCurrentMemories:()=>[]},experienceStore:experience,
    }});
    assert.ok(["livelihood","skill"].every(kind=>evidence.some(item=>item.kind===kind)),
      "its life and skills did not reach its own developed-self evidence");
  }));

test("the day plan knows where its days are spent, but going there stays its own choice", world(async({experience,thread})=>{
  const {adapter}=answer({skills:[],situation:{now:"I work at my uncle's stall.",place:STALL,rhythm:"Most days.",
    hopes:"x",worries:"y",openQuestions:[],evidenceRefs:["mem_kiosk"]}});
  await formLivelihood({thread,memories:MEMORIES,experienceStore:experience,modelAdapter:adapter,asOf:AT});
  const stall=experience.getCurrentLivelihood(SELF).placeRef;
  const notYet=livelihoodForPlanning({experienceStore:experience,livedNowStore:{getWorldPlace:()=>null},threadId:SELF});
  assert.equal(notYet.newPlace,STALL,"a place it has never been to was not offered by name");
  const known=livelihoodForPlanning({experienceStore:experience,threadId:SELF,
    livedNowStore:{getWorldPlace:(_id,ref)=>ref===stall?{ref,displayName:"Phone repair stall"}:null}});
  assert.equal(known.placeRef,stall,"a place it knows was not offered as itself");

  const home="per:hana_home:1";
  const plan=await formPersonalLivedPlan({threadId:SELF,authoredAt:AT,horizonEnd:"2026-11-21T15:00:00.000Z",
    startingPlaceRef:home,availablePlaceRefs:[home,stall],livelihood:known,sourceReferences:["evt_day"],
    sourceStores:{
      worldStore:{getThread:()=>thread},identityStore:{getCurrentIdentityView:()=>({threadId:SELF,assertions:[]})},
      semanticStateStore:{listCurrentState:()=>[]},memoryStore:{listCurrentMemories:()=>[]},
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[],listCurrentLifeRelations:()=>[]},
      livedNowStore:{getWorldPlace:(_id,ref)=>({ref,placeKind:"residence",displayName:ref===home?"Home":"Stall"})},
    },
    modelAdapter:{async invoke(call){
      assert.equal(call.input.concern.externalContext.livelihood.placeRef,stall,"the plan did not see where its days are spent");
      return {output:{result:{stops:[{startAt:AT,endAt:"2026-11-21T15:00:00.000Z",physicalPlaceRef:home,
        presenceMode:"physical",wakefulness:"awake",mediatedContext:"",activity:"Staying home with my sister today",
        outwardActivity:"resting",purpose:"I need a day off",travelFromPrevious:""}]},
      evidenceRefs:[],conflictingMotives:[],uncertainty:null},provenance:{provider:"fixture",modelId:"day"}};
    }},
  });
  assert.deepEqual(plan.stops.map(stop=>stop.physicalPlaceRef),[home],"a day that skips work was not its own to choose");
}));

test("attendance counts only the hours World enacted it at the place of its livelihood", () => {
  const at=(hour)=>`2026-11-21T${String(hour).padStart(2,"0")}:00:00.000Z`;
  const situation=(hour,location)=>({establishedAt:at(hour),location});
  const hours=attendedHours({placeRef:"wpl_stall",from:at(6),to:at(18),situations:[
    situation(5,{kind:"place",placeRef:"per:home"}),
    situation(8,{kind:"transit",fromPlaceRef:"per:home",toPlaceRef:"wpl_stall"}),
    situation(9,{kind:"place",placeRef:"wpl_stall"}),
    situation(13,{kind:"place",placeRef:"wpl_cafe"}),
    situation(14,{kind:"place",placeRef:"wpl_stall"}),
    situation(16,{kind:"place",placeRef:"per:home"}),
  ]});
  assert.equal(hours,6,"time on the way, or elsewhere, counted as being there");
});
