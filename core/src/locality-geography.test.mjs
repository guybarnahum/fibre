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
  assert.equal(resolveLocalityGeography("Osaka, Japan")?.countryCode,"JP");
});

test("Hilo birthplace aliases use its one canonical Hawaii locality",()=>{
  const canonical=resolveLocalityGeography("United States/Hilo, Hawaii");
  assert.ok(canonical,"canonical Hilo locality was lost");
  for(const name of ["United States/Hilo","Hilo, United States","USA/Hilo"]){
    assert.strictEqual(resolveLocalityGeography(name),canonical,
      "Hilo birthplace split into a second locality");
  }
});
