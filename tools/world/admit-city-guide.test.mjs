import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pendingCityGuideAdmissions } from "./admit-city-guide.mjs";

test("sourced editorial places become World admissions only through independent venue evidence",()=>{
  const guide=JSON.parse(readFileSync(
    new URL("../../data/social-city-guide.json",import.meta.url),"utf8"));
  const venues=JSON.parse(readFileSync(
    new URL("../../data/social-city-guide-admissions.json",import.meta.url),"utf8"));
  assert.equal(pendingCityGuideAdmissions(guide,venues).length,0,
    "an admitted World venue was requeued");
  const editorial=structuredClone(guide);
  for(const {cityKey,placeKey} of venues.venues){
    editorial.cities[cityKey].places[placeKey].worldPlaceRef=null;
  }
  const pending=pendingCityGuideAdmissions(editorial,venues);
  assert.equal(pending.length,venues.venues.length,
    "source-grounded editorial places could not be prepared for World admission");
  for(const {cityKey,placeKey,admission} of pending){
    const place=guide.cities[cityKey].places[placeKey];
    assert.equal(admission.streetAddress,place.address,
      "World admission would contradict the public editorial address");
    assert.equal(admission.evidenceRef,place.source.url,
      "World admission would lose independently sourced provenance");
    assert.ok(admission.venueIdentity&&admission.affordances.length,
      "public venue lacks an independent identity or an activity");
  }
  const admitted=structuredClone(guide);
  admitted.cities[pending[0].cityKey].places[pending[0].placeKey].worldPlaceRef="wpl_verified";
  assert.ok(!pendingCityGuideAdmissions(admitted,venues).some(item=>
    item.cityKey===pending[0].cityKey&&item.placeKey===pending[0].placeKey),
  "World admission would be repeated after a verified venue ref is recorded");
});
