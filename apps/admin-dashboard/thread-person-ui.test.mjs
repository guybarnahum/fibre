import assert from "node:assert/strict";
import test from "node:test";

import {
  threadLocationFlag,
  threadLocationText,
  threadLocationTooltip,
} from "./thread-person-ui.js";

test("Thread locations present city/country without changing authority",()=>{
  const location={city:"Aswan",country:"Egypt",countryCode:"EG",displayName:"Aswan, Egypt"};
  assert.equal(threadLocationText(location),"Aswan, Egypt");
  assert.equal(threadLocationTooltip(location),"Aswan/Egypt");
  assert.equal(threadLocationFlag(location),"🇪🇬");
});

test("Legacy country/city locations normalize only for presentation",()=>{
  assert.equal(threadLocationText(null,"Egypt/Aswan"),"Aswan, Egypt");
  assert.equal(threadLocationTooltip(null,"Egypt/Aswan"),"Aswan/Egypt");
  assert.equal(threadLocationFlag(null,"Egypt/Aswan"),"");
});
