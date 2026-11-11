import assert from "node:assert/strict";
import test from "node:test";

import { formPersonalLivedPlan } from "../src/lived-plan-cognition.mjs";

const at="2026-11-10T07:00:00Z", end="2026-11-10T12:00:00Z";
const homeRef="per:books_home:1", libraryRef="per:books_library:1";
const threadId="thr_books_reader";

test("a plan can go back to a book the Thread has been reading, where it is kept; going is its own choice", async () => {
  const plan=(booksToContinue)=>formPersonalLivedPlan({
    threadId,authoredAt:at,horizonEnd:end,startingPlaceRef:homeRef,
    availablePlaceRefs:[homeRef,libraryRef],booksToContinue,sourceReferences:["evt_books"],
    sourceStores:{
      worldStore:{getThread:()=>({threadId,version:1,identity:{name:"A reader"},
        currentState:{selfModel:"I like to finish what I start.",unresolvedIntentions:[]}})},
      identityStore:{getCurrentIdentityView:()=>({threadId,assertions:[]})},
      semanticStateStore:{listCurrentState:()=>[]},
      memoryStore:{listCurrentMemories:()=>[]},
      situatedLifeStore:{listCurrentPlaceEpisodes:()=>[],listCurrentLifeRelations:()=>[]},
      livedNowStore:{getWorldPlace:(_id,ref)=>({ref,placeKind:ref===homeRef?"residence":"public_venue",
        displayName:ref===homeRef?"Home":"Abrehot Library"})},
    },
    modelAdapter:{async invoke(call){
      const book=call.input.concern.externalContext.booksToContinue?.[0]??null;
      const base={physicalPlaceRef:homeRef,presenceMode:"physical",wakefulness:"awake",mediatedContext:"",
        activity:"Morning at home",outwardActivity:"making tea",purpose:"A slow start",travelFromPrevious:""};
      return {output:{result:{stops:[
        {...base,startAt:at,endAt:book?"2026-11-10T08:30:00Z":end},
        ...(book?[{...base,physicalPlaceRef:book.placeRef,startAt:"2026-11-10T09:00:00Z",endAt:end,
          activity:`Go on with ${book.title}`,outwardActivity:"reading",purpose:"Find out how it goes on",
          travelFromPrevious:"Walk to the library."}]:[]),
      ]},evidenceRefs:[],conflictingMotives:[],uncertainty:null},provenance:{provider:"fixture",modelId:"books"}};
    }},
  });
  const returning=await plan([{title:"Walden",by:"Henry David Thoreau",placeRef:libraryRef,
    placeName:"Abrehot Library",lastReadAt:"2026-11-09T09:00:00Z"}]);
  const without=await plan([]);
  assert.deepEqual(returning.stops.map(stop=>stop.physicalPlaceRef),[homeRef,libraryRef],
    "a book in progress could not bring the Thread back to where it is kept");
  assert.deepEqual(without.stops.map(stop=>stop.physicalPlaceRef),[homeRef],"a plan went to the library for no book");
});
