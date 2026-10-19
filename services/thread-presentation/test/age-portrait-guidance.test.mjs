import test from "node:test";
import assert from "node:assert/strict";
import {agePortraitBrief} from "../src/age-portrait-guidance.mjs";

test("the same identity is reconstructed through seven distinct developmental stages",()=>{
  const expectations=[
    [5,"early childhood","short lower face"],
    [12,"late childhood / preteen","school-age child or preteen"],
    [15,"adolescence","adolescent craniofacial"],
    [22,"young adulthood","adult facial proportions"],
    [45,"adulthood","facial volume"],
    [68,"older adulthood","skin elasticity"],
    [85,"advanced age","advanced old age"],
  ];
  for(const [age,stage,anatomy] of expectations){
    const brief=agePortraitBrief(age);
    assert.ok(brief.description.includes(`exactly age ${age}`),
      `Age ${age} did not govern the requested portrait`);
    assert.ok(brief.description.includes(`Developmental guidance (${stage})`)
      &&brief.description.includes(anatomy),
      `Age ${age} used the wrong anatomical guidance`);
    assert.ok(brief.description.includes("canonical first image")
      &&brief.constraints.some(rule=>rule.includes("identity authority")),
      `Age ${age} lost the canonical identity authority`);
  }
  assert.match(agePortraitBrief(12).description,/not retain the canonical adult skull and jaw proportions/,
    "Preteen portrait copied the adult's anatomy");
  assert.match(agePortraitBrief(85).description,/Do not merely gray the hair/,
    "Advanced age was reduced to a superficial gray-hair filter");
});

test("development remains continuous at stage boundaries, without jumping to an older anatomy",()=>{
  for(const [before,after] of [[6,7],[12,13],[17,18],[29,30],[59,60],[74,75]]){
    for(const age of [before,after]){
      const brief=agePortraitBrief(age);
      assert.match(brief.description,/is gradual and varies by individual/,
        `Stage boundary ${age} implied an abrupt biological transformation`);
      assert.ok(brief.description.includes(`exactly age ${age}`),
        `Stage boundary ${age} lost chronological age`);
    }
  }
  assert.doesNotMatch(agePortraitBrief(12).description,/Show gradual, individually variable adolescent craniofacial maturation/,
    "The age-12 portrait was prematurely given teenage anatomy");
  assert.doesNotMatch(agePortraitBrief(13).description,/Reconstruct a real school-age child or preteen/,
    "The age-13 portrait was frozen at childhood anatomy");
  assert.throws(()=>agePortraitBrief(25),/canonical age 25/,
    "The canonical age-25 reference was treated as a derivative anchor");
});
