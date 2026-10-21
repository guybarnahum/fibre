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
