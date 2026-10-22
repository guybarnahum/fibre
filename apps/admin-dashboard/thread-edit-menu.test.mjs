import assert from "node:assert/strict";
import test from "node:test";
import {threadEditActions} from "./thread-edit-menu.js";
import {identityActionPayload} from "./thread-identity-action.js";

test("one shared editor exposes the missing birth-city correction and maintenance without duplicate actions",()=>{
  const diagnosis={exists:true,health:"operator_decision_required",findings:[
    {state:"operator_decision_required",identityAction:{
      id:"set_birth_place",label:"Set birth city",
      input:{fields:[{name:"birthPlace",kind:"place_search",required:true}]}}},
    {state:"healthy",identityAction:{id:"set_birth_place",label:"Set birth city"}},
    {state:"migration_required",migration:{id:"ancestry",label:"Migrate ancestry",input:{fields:[]}}},
  ]};
  const choices=threadEditActions(diagnosis,null);
  assert.equal(choices.filter(a=>a.id==="set_birth_place").length,1,
    "one identity correction appeared as duplicate buttons");
  assert.equal(choices.find(a=>a.id==="set_birth_place").fields[0].kind,"place_search",
    "legacy birth city accepted unverified free text");
  assert.ok(choices.some(a=>a.kind==="fid"),"FIN maintenance vanished from the shared menu");
  assert.ok(choices.some(a=>a.kind==="photo"),"Photo correction lost its Observatory review entry");

  const place={displayName:"Kisumu, Kenya",country:"Kenya",countryCode:"KE",
    city:"Kisumu",lat:-0.0917,long:34.768};
  const action=diagnosis.findings[0].identityAction;
  assert.deepEqual(identityActionPayload(action,{birthPlace:place},{operationKey:"admin_identity_test"}),{
    action:"identity",operationKey:"admin_identity_test",birthPlace:place,
  },"birth city correction bypassed canonical World identity command");
});

test("a malformed birth place can be replaced with a verified city as well as repaired",()=>{
  const diagnosis={exists:true,health:"operator_decision_required",
    identity:{birthPlace:"Old unmapped place"},
    findings:[{code:"BIRTH_GEOGRAPHY_RECOVERABLE",
      state:"operator_decision_required",identityAction:{
        id:"repair_birth_geography",label:"Repair birth place",
        fixed:{birthPlace:{displayName:"Tbilisi, Georgia"}},
        input:{fields:[{name:"countryCode",kind:"country_code",required:true}]},
      }}],
  };
  const actions=threadEditActions(diagnosis,null);
  assert.equal(actions.filter(a=>a.id==="repair_birth_geography").length,1,
    "a recoverable birth place lost its existing country-code repair");
  const change=actions.filter(a=>a.id==="change_birth_place");
  assert.equal(change.length,1,"malformed birth place has no full correction");
  assert.equal(change[0].fields[0].kind,"place_search",
    "birthplace replacement allowed an unverified typed place");
  const chosen={displayName:"Batumi, Georgia",country:"Georgia",
    countryCode:"GE",city:"Batumi",lat:41.6168,long:41.6367};
  assert.deepEqual(identityActionPayload(change[0].action,{birthPlace:chosen},
    {operationKey:"admin_birthplace_correction"}),{
    action:"identity",operationKey:"admin_birthplace_correction",birthPlace:chosen,
  },"replacement bypassed the existing World identity command");
});
