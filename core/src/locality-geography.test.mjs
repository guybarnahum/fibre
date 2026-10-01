import assert from "node:assert/strict";
import test from "node:test";

import {
  countryCodeForCountry,
  resolveLocalityGeography,
} from "./locality-geography.mjs";

test("Fibre geography carries country codes as location metadata",()=>{
  assert.equal(countryCodeForCountry("Egypt"),"EG");
  assert.equal(countryCodeForCountry("Japan"),"JP");
  assert.equal(resolveLocalityGeography("Egypt/Aswan")?.countryCode,"EG");
  assert.equal(resolveLocalityGeography("Tokyo, Japan")?.countryCode,"JP");
});
