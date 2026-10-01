import assert from "node:assert/strict";
import test from "node:test";

import { operatorModeFromLocation } from "./operator-route.js";

test("Appearance route survives trailing-slash canonicalization",()=>{
  assert.equal(operatorModeFromLocation({pathname:"/appearance",search:""}),"appearance");
  assert.equal(operatorModeFromLocation({pathname:"/appearance/",search:""}),"appearance");
});

test("Activity operator modes remain query-driven",()=>{
  assert.equal(operatorModeFromLocation({pathname:"/activity",search:"?mode=threads"}),"threads");
  assert.equal(operatorModeFromLocation({pathname:"/activity",search:"?mode=stillborn"}),"stillborn");
  assert.equal(operatorModeFromLocation({pathname:"/activity",search:""}),null);
});
