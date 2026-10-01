import assert from "node:assert/strict";
import test from "node:test";

import { identityActionPayload } from "./thread-identity-action.js";

test("Birth-place identity action requires an explicit country code",()=>{
  const action={
    id:"repair_birth_geography",
    command:"identity",
    fixed:{birthPlace:{displayName:"Aswan, Egypt",country:"Egypt",city:"Aswan",lat:24.08894,long:32.89983}},
  };
  assert.throws(
    ()=>identityActionPayload(action,{}, {operationKey:"admin_identity_1"}),
    /two-letter ISO code/,
  );
  assert.deepEqual(
    identityActionPayload(action,{countryCode:"eg"},{operationKey:"admin_identity_1"}),
    {
      action:"identity",
      operationKey:"admin_identity_1",
      birthPlace:{
        displayName:"Aswan, Egypt",
        country:"Egypt",
        city:"Aswan",
        lat:24.08894,
        long:32.89983,
        countryCode:"EG",
      },
    },
  );
});

test("Country-code-only migration uses the same explicit payload path",()=>{
  const action={
    id:"set_birth_country_code",
    command:"identity",
    fixed:{birthPlace:{displayName:"Tokyo, Japan",country:"Japan",city:"Tokyo",lat:35.6895,long:139.69171}},
  };
  assert.equal(
    identityActionPayload(action,{countryCode:"jp"},{operationKey:"admin_identity_3"}).birthPlace.countryCode,
    "JP",
  );
});

test("Ordinary identity actions still merge fixed and operator input",()=>{
  assert.deepEqual(
    identityActionPayload(
      {id:"set_name",fixed:{sex:"female"}},
      {name:"Amina"},
      {operationKey:"admin_identity_2"},
    ),
    {action:"identity",operationKey:"admin_identity_2",sex:"female",name:"Amina"},
  );
});
