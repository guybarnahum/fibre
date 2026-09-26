import assert from "node:assert/strict";
import test from "node:test";

import { genesisSexForThread } from "../src/genesis-sex.mjs";
import { buildGenesisDevelopmentPlan } from "../src/genesis-development-plan.mjs";
import { createModernBirthInitiationService } from "../src/modern-birth-initiation.mjs";
import {
  MODERN_BIRTHPLACE_ANCHOR_COUNT,
  MODERN_BIRTHPLACE_LONG_TAIL_SHARE,
  MODERN_BIRTHPLACES,
} from "../src/modern-birthplace-sampler.mjs";

const AUTHORED = Object.freeze({
  timeZone:"Asia/Jerusalem",
  femaleName:"Noa Levi",
  maleName:"Ari Levi",
  languages:Object.freeze(["Hebrew","English"]),
  raisedLanguages:Object.freeze(["Hebrew"]),
  homeDescription:"A family apartment in a mixed residential neighborhood.",
  schoolDescription:"A local public school serving the surrounding neighborhoods.",
  transitDescription:"Ordinary walking and bus routes between home, school and errands.",
  learningDescription:"A neighborhood library and informal study spaces.",
  commerceDescription:"Small shops, groceries and ordinary neighborhood services.",
  householdContext:"Two caregivers and the subject share a stable household with one sibling.",
  materialCircumstances:"Routine needs are met while ordinary household spending choices still matter.",
  mobilityPattern:"Most daily movement is local, with occasional trips across the city.",
  schoolingOrCommunityContext:"School and neighborhood activities provide recurring peers and adults.",
  culturalContext:"The household participates in ordinary local life without prescribing beliefs or personality.",
  availableInstitutions:Object.freeze(["school","library","community center"]),
  intellectualEnvironment:"Books, schoolwork, peers and ordinary media provide varied intellectual exposure.",
});

function harness() {
  let developed = null;
  const progress = [];
  const creativeAdapter = {
    provider:"test",
    modelId:"test",
    configuration:{},
    async invoke() { return { output:AUTHORED }; },
  };
  const birthRuntime = {
    durableAdapter(adapter) { return adapter; },
  };
  const developmentService = {
    async develop(request) {
      developed = request;
      const plan = buildGenesisDevelopmentPlan(request);
      return Object.freeze({
        requestId:request.requestId,
        threadId:plan.threadId,
        genesisId:plan.genesisId,
        status:"pending",
      });
    },
  };
  return {
    service:createModernBirthInitiationService({
      developmentService,
      creativeAdapter,
      birthRuntime,
      onProgress:(entry) => progress.push(entry),
    }),
    developed:() => developed,
    progress:() => progress,
  };
}

test("operator birth can omit location and sex without losing stable identity", async () => {
  const { service, developed, progress } = harness();
  const birth = await service.initiate({
    requestId:"admin_birth_random_001",
    requestedAt:"2026-09-25T04:00:00.000Z",
  });

  const request = developed();
  const plan = buildGenesisDevelopmentPlan(request);
  assert.equal(MODERN_BIRTHPLACE_ANCHOR_COUNT, 40);
  assert.equal(MODERN_BIRTHPLACE_LONG_TAIL_SHARE, 0.34);
  assert.ok(["anchor","long_tail"].includes(birth.locationSource));
  assert.equal(Object.hasOwn(request.subjectIdentity, "sex"), false);
  assert.equal(birth.sex, genesisSexForThread({ threadId:plan.threadId }));
  assert.equal(birth.threadId, plan.threadId);
  assert.deepEqual(progress().map((entry) => entry.status), ["authoring","developing","publishing"]);
  assert.equal(progress()[0].location, birth.location);
});

test("operator birth respects an explicit place and sex", async () => {
  const { service, developed } = harness();
  const birth = await service.initiate({
    requestId:"admin_birth_explicit_001",
    requestedAt:"2026-09-25T04:00:00.000Z",
    location:{
      country:"United Kingdom",
      city:"London",
      displayName:"London, England, United Kingdom",
      lat:51.5072,
      long:-0.1276,
    },
    sex:"female",
  });

  assert.equal(birth.location, "United Kingdom/London");
  assert.equal(birth.locationSource, "operator");
  assert.equal(birth.sex, "female");
  assert.deepEqual(developed().subjectIdentity.place, {
    country:"United Kingdom",
    city:"London",
    lat:51.5072,
    long:-0.1276,
  });
  assert.equal(developed().subjectIdentity.birthCity, "London, United Kingdom");
  assert.equal(developed().subjectIdentity.sex, "female");
});


test("modern birthplace catalog remains the random sampler authority", () => {
  assert.equal(MODERN_BIRTHPLACES.length, 100);
  const tbilisi = MODERN_BIRTHPLACES.find((place) => place.place === "Georgia/Tbilisi");
  assert.deepEqual(
    { lat:tbilisi.lat, long:tbilisi.long, region:tbilisi.region, tier:tbilisi.tier },
    { lat:41.69143, long:44.83412, region:"central_asia_caucasus", tier:"anchor" },
  );
  assert.equal(MODERN_BIRTHPLACES.every((place) => Number.isFinite(place.lat) && Number.isFinite(place.long)), true);
});
