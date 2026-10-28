import test from "node:test";
import assert from "node:assert/strict";
import {URGE_FAMILIES,selectedUrgesForBirth,urgeVariantsFromGenome} from "../src/inherited-urges.mjs";
import {normalizeOrganismPolicy,DEFAULT_ORGANISM_POLICY} from "../src/organism-policy.mjs";
import {evaluateIntrinsicRegulation,THREAD_SPECIES_PROFILE} from "../src/intrinsic-regulation.mjs";
import {projectInteroception} from "../../services/world-kernel/src/interoceptive-cognition.mjs";
import {buildDeNovoSymbolicGenome} from "../../services/world-kernel/src/symbolic-genome-domain.mjs";

const policy=(changes={})=>({...DEFAULT_ORGANISM_POLICY,...changes});
const frame=(availability={})=>({
  asOf:"2026-10-28T12:00:00Z",
  evidenceRefs:["admitted_contact_interval"],
  contact:{observedUnmetHours:24,evidenceRefs:["admitted_contact_interval"]},
  urgeAvailability:availability,
});
const social=reg=>reg.drives.find(d=>d.family==="social_contact");

test("v2 authored urge library binds 13 family kinds, origin provenance and stable replay",()=>{
  assert.equal(URGE_FAMILIES.length,13);
  assert.ok(URGE_FAMILIES.every(f=>f.variants.length===10));
  const a=selectedUrgesForBirth("newborn-inherited-urges");
  assert.deepEqual(a,selectedUrgesForBirth("newborn-inherited-urges"),"birth must replay");
  assert.equal(a.values.length,13);
  const genome=buildDeNovoSymbolicGenome({
    threadId:"thr_inherited_urges_test",genesisId:"genesis_inherited_urges_test",
    values:a.values,originMaterial:a.originMaterial,createdAt:"2026-10-28T12:00:00Z",
  });
  assert.equal(urgeVariantsFromGenome(genome).length,13,"origin must bind all families");
  assert.ok(!JSON.stringify(genome).includes("orientationUnrelated"));
  const tampered=structuredClone(genome);
  tampered.loci[0].value="unrelated bodily urge";
  assert.throws(()=>urgeVariantsFromGenome(tampered),/frozen library/,"origin must bind the actual textual loci");
});

test("directional orientation changes felt direction without suppressing pressure for absent targets",()=>{
  const f=URGE_FAMILIES.find(x=>x.family==="social_contact");
  const a=f.variants[1],b=f.variants[4];
  assert.deepEqual(a.positions,b.positions,"matched-position comparison was lost");
  const evaluate=(variant)=>social(evaluateIntrinsicRegulation({
    perceptFrame:frame({social_contact:{
      ambient_company:{state:"available",evidenceRefs:["witness_company"]},
      familiar_person:{state:"absent",evidenceRefs:["witness_separation"]},
    }}),
    urgeProjection:[{family:"social_contact",kind:"directional",
      orientation:variant.orientation,positions:variant.positions}],
    organismPolicy:policy(),
  }));
  const first=evaluate(a),second=evaluate(b);
  assert.equal(first.pressure,second.pressure,"orientation changed pressure without cause");
  assert.equal(first.felt,true);
  assert.equal(second.felt,true,"absent familiar target silenced longing");
  assert.equal(first.inheritedDirection,"ambient_company");
  assert.equal(second.inheritedDirection,"familiar_person");
  assert.equal(second.targetAvailability,"absent");
  const cue=projectInteroception(evaluateIntrinsicRegulation({
    perceptFrame:frame({social_contact:{familiar_person:{state:"absent",evidenceRefs:["witness_separation"]}}}),
    urgeProjection:[{family:"social_contact",kind:"directional",orientation:b.orientation,positions:b.positions}],
    organismPolicy:policy(),
  }));
  assert.equal(cue.drives[0].feltDirection,"familiar_person");
  assert.equal(cue.drives[0].targetAvailability,"absent");
  assert.equal("originMaterial" in cue.drives[0],false);
});

test("legacy genomes retain exact material and genome-off removes legacy and v2 variation",()=>{
  const legacy=buildDeNovoSymbolicGenome({
    threadId:"thr_legacy_urges_test",genesisId:"genesis_legacy_urges_test",
    values:["a legacy textual trait","another legacy textual trait"],createdAt:"2026-10-28T12:00:00Z",
  });
  const before=structuredClone(legacy);
  const defaultBody=evaluateIntrinsicRegulation({perceptFrame:frame(),organismPolicy:policy()});
  assert.equal(social(defaultBody).inheritedDirection,"undirected");
  assert.equal(social(defaultBody).felt,true);
  const baseline={regulatorSocialSensitivity:1.15};
  const disabled=policy({inheritedSpread:0});
  const legacyFrame=evaluateIntrinsicRegulation({
    perceptFrame:frame(),runtimeBaselines:baseline,organismPolicy:disabled,
  });
  const variant=URGE_FAMILIES[0].variants[5];
  const v2Frame=evaluateIntrinsicRegulation({
    perceptFrame:frame(),runtimeBaselines:baseline,organismPolicy:disabled,
    urgeProjection:[{family:"social_contact",kind:"directional",
      orientation:variant.orientation,positions:variant.positions}],
  });
  assert.deepEqual(v2Frame,legacyFrame,"genome-off must make all Threads mechanically equal");
  assert.equal(social(legacyFrame).inheritedDirection,"undirected");
  assert.deepEqual(legacy,before,"Body rewrote historical DNA");
});

test("triggered inheritance boosts only its matching trigger; other triggers remain species-level",()=>{
  const f=URGE_FAMILIES.find(x=>x.family==="standing_flare");
  const v=f.variants[2];
  const projection=[{family:f.family,kind:f.kind,orientation:v.orientation,positions:v.positions}];
  const p=policy({enabledFamilies:["standing_flare"]});
  const evaluate=(kind,genome=projection)=>evaluateIntrinsicRegulation({
    perceptFrame:{asOf:"2026-10-28T12:00:00Z",evidenceRefs:["social_event"],
      urgeTriggers:[{family:"standing_flare",kind,pressure:.4,evidenceRefs:["social_event"]}]},
    organismPolicy:p,urgeProjection:genome,
  }).drives[0];
  assert.ok(evaluate("public_correction").pressure>evaluate("public_correction",null).pressure,
    "inherited trigger failed to modify felt pressure");
  assert.deepEqual(evaluate("exclusion"),evaluate("exclusion",null),
    "a non-inherited trigger was silenced or changed");
  assert.equal(evaluate("exclusion").felt,true);
});

test("disabled and unevidenced families are silent, and organism policy is validated",()=>{
  const empty=evaluateIntrinsicRegulation({
    perceptFrame:{asOf:"2026-10-28T12:00:00Z",evidenceRefs:[]},
    organismPolicy:policy(),
  });
  assert.equal(empty.drives.length,0,"unknown condition became an urge");
  const disabled=evaluateIntrinsicRegulation({
    perceptFrame:frame(),organismPolicy:policy({enabledFamilies:[]}),
  });
  assert.equal(disabled.drives.length,0,"disabled family generated pressure");
  assert.throws(()=>normalizeOrganismPolicy(policy({inheritedSpread:4})),/out of bounds/);
});

test("inherited positions span the species range without orientation or duplicate-allele bias",()=>{
  const mean=(values)=>values.reduce((sum,value)=>sum+value,0)/values.length;
  const keys=["gain","feltThreshold","persistence"];
  const species=THREAD_SPECIES_PROFILE;
  for(const family of URGE_FAMILIES){
    const variants=family.variants;
    for(const key of keys){
      const values=variants.map(v=>v.positions[key]);
      assert.ok(Math.min(...values)<=-0.85&&Math.max(...values)>=0.85,
        `${family.family}: ${key} range`);
      assert.ok(Math.abs(mean(values))<=0.1+1e-9,
        `${family.family}: ${key} mean`);
    }
    for(const [orientation,group] of Object.entries(Object.groupBy(variants,v=>v.orientation))){
      const values=group.map(v=>v.positions.gain);
      assert.ok(values.some(v=>v<0)&&values.some(v=>v>0),
        `${family.family}/${orientation}: gain signs`);
      assert.ok(Math.abs(mean(values))<=0.25+1e-9,
        `${family.family}/${orientation}: gain mean`);
    }
    const pairs=variants.flatMap((left,i)=>variants.slice(i+1)
      .filter(right=>keys.every(k=>left.positions[k]===right.positions[k]))
      .map(right=>[left,right]));
    assert.equal(pairs.length,1,`${family.family}: matched triple count`);
    assert.notEqual(pairs[0][0].orientation,pairs[0][1].orientation,
      `${family.family}: matched direction`);
    assert.equal(new Set(variants.map(v=>keys.map(k=>v.positions[k]).join(","))).size,9,
      `${family.family}: duplicate triple`);
    assert.equal(variants.flatMap((left,i)=>variants.slice(i+1)
      .filter(right=>keys.every(k=>left.positions[k]===-right.positions[k]))).length,0,
      `${family.family}: mirror triples`);
    const uniqueT=[...new Set(variants.map(v=>v.positions.feltThreshold))];
    const effectiveT=uniqueT.map(t=>Math.min(species.speciesFeltThresholdCeiling,
      species.speciesFeltThreshold*2**(-species.speciesFeltThresholdOctaves*t)));
    assert.equal(new Set(effectiveT).size,uniqueT.length,
      `${family.family}: threshold collision`);
  }
});
