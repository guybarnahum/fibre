import assert from "node:assert/strict";
import test from "node:test";

import {
  migrationEntries,
  normalizeCountryCode,
  planEntry,
} from "./thread-country-codes.mjs";

test("country-code migration accepts only explicit ISO-2 operator input",()=>{
  assert.equal(normalizeCountryCode("eg"),"EG");
  assert.throws(()=>normalizeCountryCode("Egypt"),/two-letter ISO code/);
  assert.deepEqual(
    migrationEntries({threads:[{threadId:"thr_aswan",countryCode:"eg"}]}),
    [{threadId:"thr_aswan",countryCode:"EG"}],
  );
});

test("migration plan includes only Threads missing stored countryCode",()=>{
  const thread={threadId:"thr_aswan",displayName:"Amina"};
  const missing={observatory:{thread:{identity:{birthPlace:{
    displayName:"Aswan, Egypt",country:"Egypt",city:"Aswan",lat:24.08894,long:32.89983,
  }}}}};
  const current={observatory:{thread:{identity:{birthPlace:{
    displayName:"Aswan, Egypt",country:"Egypt",countryCode:"EG",city:"Aswan",lat:24.08894,long:32.89983,
  }}}}};
  assert.deepEqual(planEntry(thread,missing),{
    threadId:"thr_aswan",
    name:"Amina",
    birthPlace:{displayName:"Aswan, Egypt",country:"Egypt",city:"Aswan"},
    countryCode:"",
  });
  assert.equal(planEntry(thread,current),null);
});
