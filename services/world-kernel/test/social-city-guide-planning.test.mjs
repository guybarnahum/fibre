import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {localCityGuideChoices} from "../src/social-city-guide.mjs";
import {formPersonalLivedPlan} from "../src/lived-plan-cognition.mjs";

const manifest=JSON.parse(readFileSync(
  new URL("../../../data/social-city-guide.json",import.meta.url),"utf8",
));
const listing=manifest.cities["tbilisi-GE"].places["national-library-of-georgia-building-iii"];
const libraryRef=listing.worldPlaceRef;
const admitted={
  ref:libraryRef,placeKind:"public_venue",authority:"world-public-place-v1",
  displayName:listing.name,locality:"Tbilisi",countryCode:"GE",
  streetAddress:listing.address,evidenceRef:listing.source.url,
};

test("only locally admitted magazine places can enter a Thread's planning choices",()=>{
  const getPublicPlace=ref=>ref===libraryRef?admitted:null;
  const inCity=localCityGuideChoices(manifest,{
    location:{locality:"Tbilisi",countryCode:"GE"},getPublicPlace,
  });
  assert.equal(inCity.length,1,"the public guide did not create a grounded opportunity");
  assert.equal(inCity[0].ref,libraryRef);
  assert.equal(inCity[0].source.url,admitted.evidenceRef);
  assert.deepEqual(localCityGuideChoices(manifest,{
    location:{locality:"Tbilisi",countryCode:"GE"},getPublicPlace,
    asOf:"2026-10-13T12:00:00Z",
  }),[],"today's guide appeared in earlier lived history");
  assert.deepEqual(localCityGuideChoices(manifest,{
    location:{locality:"London",countryCode:"GB"},getPublicPlace,
  }),[],"a venue was recommended in a different city");
  assert.deepEqual(localCityGuideChoices(manifest,{
    location:{locality:"Tbilisi",countryCode:"GE"},
    getPublicPlace:()=>null,
  }),[],"an editorial listing became World authority");
  assert.deepEqual(localCityGuideChoices(manifest,{
    location:{locality:"Tbilisi",countryCode:"GE"},
    getPublicPlace:()=>({...admitted,streetAddress:"Unverified"}),
  }),[],"a contradictory address became a planning destination");
});

test("one ordinary planning mind can consider a guide, prefer remembered life, or stay home",async()=>{
  const threadId="thr_city_guide_choice";
  const at="2026-10-14T16:00:00.000Z",middle="2026-10-14T17:00:00.000Z";
  const end="2026-10-14T20:00:00.000Z",homeRef="per:home_city_guide:1";
  const guidePlaces=localCityGuideChoices(manifest,{
    location:{locality:"Tbilisi",countryCode:"GE"},
    getPublicPlace:ref=>ref===libraryRef?admitted:null,
  });
  const thread={
    threadId,version:1,identity:{name:"A Thread"},
    currentState:{selfModel:"I value ideas and solitude.",unresolvedIntentions:[]},
  };
  const observed=[];
  async function plan({rememberedMeaning,interested,instantTravel=false}){
    const memories=rememberedMeaning===null?[]:[{
      threadId,memoryId:"mem_previous_library",status:"current",
      accessibility:"accessible",rememberedMeaning,
    }];
    const modelAdapter={
      async invoke(call){
        const context=call.input.concern.externalContext;
        const memory=call.input.developedSelfEvidence?.find(
          item=>item.kind==="memory",
        )?.text??"";
        observed.push({context,memory});
        const guideExists=context.cityGuide?.some(p=>p.placeRef===libraryRef)===true;
        const declines=/unwelcome interruption/iu.test(memory);
        const choosesLibrary=guideExists&&interested&&!declines;
        const base={
          physicalPlaceRef:homeRef,presenceMode:"physical",wakefulness:"awake",
          mediatedContext:"",activity:"Read at home.",purpose:"An ordinary afternoon.",
          travelFromPrevious:"",
        };
        const stops=[{...base,startAt:at,
          endAt:choosesLibrary
            ?instantTravel?middle:"2026-10-14T16:45:00.000Z":end}];
        if(choosesLibrary)stops.push({
          ...base,startAt:middle,endAt:end,physicalPlaceRef:libraryRef,
          activity:"Read at the public library.",
          purpose:"Explore new ideas with no expectation of company.",
          travelFromPrevious:"Walk to the library.",
        });
        return {
          output:{result:{stops},evidenceRefs:[],conflictingMotives:[],uncertainty:null},
          provenance:{provider:"fixture",modelId:"guide-choice-proof"},
        };
      },
    };
    return formPersonalLivedPlan({
      threadId,authoredAt:at,horizonEnd:end,startingPlaceRef:homeRef,
      availablePlaceRefs:[homeRef,libraryRef],cityGuidePlaces:guidePlaces,
      sourceReferences:["evt_lived_city_guide"],
      sourceStores:{
        worldStore:{getThread(){return thread;}},
        identityStore:{getCurrentIdentityView(){return {threadId,assertions:[]};}},
        semanticStateStore:{listCurrentState(){return [];}},
        memoryStore:{listCurrentMemories(){return memories;}},
        situatedLifeStore:{
          listCurrentPlaceEpisodes(){return [];},
          listCurrentLifeRelations(){return [];},
        },
        livedNowStore:{getWorldPlace(_id,ref){
          return ref===homeRef
            ?{ref,placeKind:"residence",displayName:"Home"}:ref===libraryRef?admitted:null;
        }},
      },
      modelAdapter,
    });
  }
  const drawn=await plan({rememberedMeaning:"Reading with company broadened my thinking.",interested:true});
  const reluctant=await plan({rememberedMeaning:"An unwelcome interruption spoiled my reading.",interested:true});
  const quiet=await plan({rememberedMeaning:null,interested:false});
  assert.deepEqual(drawn.stops.map(s=>s.physicalPlaceRef),[homeRef,libraryRef],
    "an interested Thread could not independently select the public venue");
  assert.deepEqual(reluctant.stops.map(s=>s.physicalPlaceRef),[homeRef],
    "the Thread's remembered experience could not outweigh a recommendation");
  assert.deepEqual(quiet.stops.map(s=>s.physicalPlaceRef),[homeRef],
    "the magazine forced a Thread to leave home");
  assert.ok(observed.every(item=>item.context.cityGuide?.[0]?.source.url===listing.source.url),
    "the planning mind lost editorial provenance");
  assert.ok(drawn.stops.every(s=>s.companionRefs.length===0),
    "a guide listing manufactured a social companion");
  await assert.rejects(
    ()=>plan({rememberedMeaning:null,interested:true,instantTravel:true}),
    /public venue travel requires an elapsed transit interval/u,
    "a public venue became instantaneous travel",
  );
});
