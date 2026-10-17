import assert from "node:assert/strict";
import test from "node:test";

import {
  forgetThreadPortrait,
  preferredThreadPortraitUrl,
  threadPortraitUrl,
  threadLocationFlag,
  threadLocationText,
  threadLocationTooltip,
  currentThreadPlace,
} from "./thread-person-ui.js";

test("Thread locations present city/country without changing authority",()=>{
  const location={city:"Aswan",country:"Egypt",countryCode:"EG",displayName:"Aswan, Egypt"};
  assert.equal(threadLocationText(location),"Aswan, Egypt");
  assert.equal(threadLocationTooltip(location),"Aswan/Egypt");
  assert.equal(threadLocationFlag(location),"🇪🇬");
  assert.equal(threadLocationFlag({city:"Aswan",country:"EG"}),"🇪🇬");
});

test("Legacy country/city locations normalize only for presentation",()=>{
  assert.equal(threadLocationText(null,"Egypt/Aswan"),"Aswan, Egypt");
  assert.equal(threadLocationTooltip(null,"Egypt/Aswan"),"Aswan/Egypt");
  assert.equal(threadLocationFlag(null,"Egypt/Aswan"),"");
});


test("missing portrait lookup does not hide a newly published visual",async()=>{
  const originalFetch=globalThis.fetch;
  const threadId="thr_portrait_refresh";
  let request=0;
  globalThis.fetch=async()=>{
    request+=1;
    return {
      ok:true,
      async json(){
        return request===1
          ?{identity:{assets:[]}}
          :{identity:{assets:[{
            role:"official_id_photo",
            url:"https://api.staging.insidefibre.com/api/assets/new_portrait",
          }]}};
      },
    };
  };
  try{
    forgetThreadPortrait(threadId);
    assert.equal(await threadPortraitUrl(threadId),null,
      "missing portrait should remain a placeholder");
    assert.equal(
      await threadPortraitUrl(threadId),
      "https://api.staging.insidefibre.com/api/assets/new_portrait",
      "newly published portrait stayed hidden behind a cached miss",
    );
    assert.equal(request,2,"portrait refresh did not reread current Presentation");
  }finally{
    forgetThreadPortrait(threadId);
    globalThis.fetch=originalFetch;
  }
});

test("compact Admin portraits prefer admitted thumbnails without losing original fallback",()=>{
  const identity={assets:[
    {role:"official_id_photo",url:"/api/thread-assets/full"},
    {role:"portrait_thumbnail",url:"/api/thread-assets/tiny"},
  ]};
  assert.equal(preferredThreadPortraitUrl(identity),"/api/thread-assets/tiny",
    "compact Admin image should prefer the small published derivative");
  assert.equal(preferredThreadPortraitUrl({
    assets:[identity.assets[0]],
  }),"/api/thread-assets/full","unmigrated portrait should remain usable");
});

test("current-place presentation uses enacted city, not birthplace or a private address",()=>{
  const worldLocation={
    kind:"place",locality:"London",country:"United Kingdom",countryCode:"GB",
    displayName:"Private home at 10 Sample Street",lat:51.5,long:-0.12,
  };
  const displayed=currentThreadPlace(worldLocation);
  assert.equal(threadLocationText(displayed),"London, United Kingdom");
  assert.equal(threadLocationFlag(displayed),"🇬🇧");
  assert.equal(JSON.stringify(displayed).includes("Sample Street"),false,
    "World city presentation revealed an exact private place");
  assert.equal(currentThreadPlace(null),null,
    "missing current World situation cannot inherit the birthplace");
  assert.equal(threadLocationText(currentThreadPlace({
    ...worldLocation,kind:"transit",
  })),"In transit · London, United Kingdom");
  assert.equal(threadLocationText(currentThreadPlace({
    ...worldLocation,kind:"transit",locality:"In transit",
    displayName:"Private home → private destination",
  })),"In transit",
  "transit exposed a private route or repeated an unknown city");
});
