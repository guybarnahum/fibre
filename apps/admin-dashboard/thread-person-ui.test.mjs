import assert from "node:assert/strict";
import test from "node:test";

import {
  forgetThreadPortrait,
  refreshThreadPortraitUrl,
  threadPortraitUrl,
  threadLocationFlag,
  threadLocationText,
  threadLocationTooltip,
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
