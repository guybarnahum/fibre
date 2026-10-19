import test from "node:test";
import assert from "node:assert/strict";

import {
  VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
  admittedVisualAgeAnchors,
  normalizeVisualAgeAnchorAdmission,
  resolveVisualAgeReferences,
} from "../src/visual-age-anchors.mjs";

const sha = (digit) => `sha256:${digit.repeat(64)}`;
const root = {canonicalReferenceObjectRef:"canonical_root",canonicalReferenceDigest:sha("a")};
const anchor = (years, overrides={}) => ({
  contract:VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
  admissionId:`age_admission_${years}`,
  threadId:"thr_ada",
  targetAgeYears:years,
  portraitObjectRef:`portrait_${years}`,
  portraitDigest:sha("b"),
  ...root,
  sourceAnchorRefs:[],
  generationReceiptRef:`receipt_${years}`,
  approvalRef:`approval_${years}`,
  admittedAt:"2026-10-19T00:00:00.000Z",
  ...overrides,
});
const refs = (targetAgeYears, admissions=[]) => resolveVisualAgeReferences({
  threadId:"thr_ada",targetAgeYears,...root,admissions,
}).referenceObjectRefs;

test("visual age references preserve the canonical root without admitted anchors", () => {
  assert.deepEqual(refs(3),["canonical_root"],"missing age anchors changed canonical identity");
  assert.deepEqual(refs(25),["canonical_root"],"canonical age must use its original root");
  assert.deepEqual(refs(95),["canonical_root"],"no anchors must preserve legacy rendering");
});

test("age references use the exact anchor or the nearest bracketing ages without a hardcoded ladder", () => {
  const admissions=[10,15,35,40].map((years)=>anchor(years));
  assert.deepEqual(refs(10,admissions),["canonical_root","portrait_10"],"exact age anchor was ignored");
  assert.deepEqual(refs(20,admissions),["canonical_root","portrait_15"],"nearest younger anchor was ignored");
  assert.deepEqual(refs(30,admissions),["canonical_root","portrait_35"],"nearest older anchor was ignored");
  assert.deepEqual(refs(37,admissions),["canonical_root","portrait_35","portrait_40"],"bracketing references were lost");
  assert.deepEqual(refs(5,admissions),["canonical_root","portrait_10"],"extrapolation should use closest known age");
  assert.deepEqual(refs(60,admissions),["canonical_root","portrait_40"],"older-age extrapolation should use nearest anchor");
  assert.deepEqual(refs(25,admissions),["canonical_root"],"age 25 must never promote a derivative");
});

test("different Threads and superseded canonical roots cannot influence appearance", () => {
  const admissions=[anchor(15,{threadId:"thr_other"}),anchor(18,{canonicalReferenceDigest:sha("c")}),anchor(35,{canonicalReferenceObjectRef:"retired_root"}),anchor(40)];
  assert.deepEqual(refs(20,admissions),["canonical_root"],"stale or foreign anchors contaminated likeness");
  assert.deepEqual(refs(42,admissions),["canonical_root","portrait_40"],"valid own-root anchor was lost");
});

test("new admissions at the same age take precedence without rewriting earlier references", () => {
  const earlier=anchor(15);
  const newer=anchor(15,{admissionId:"age_admission_new",portraitObjectRef:"portrait_new",admittedAt:"2026-10-20T00:00:00.000Z"});
  assert.deepEqual(admittedVisualAgeAnchors({threadId:"thr_ada",...root,admissions:[newer,earlier]}).map(a=>a.portraitObjectRef),["portrait_new"]);
  assert.equal(earlier.portraitObjectRef,"portrait_15","historical anchor changed when superseded");
  assert.deepEqual(refs(15,[earlier,newer]),["canonical_root","portrait_new"],"new approval did not become active");
});

test("unadmitted or structurally invalid candidates cannot become references", () => {
  assert.throws(()=>normalizeVisualAgeAnchorAdmission({...anchor(15),approvalRef:null}),/approvalRef/,"unapproved candidate was accepted");
  assert.throws(()=>refs(20,[{...anchor(15),contract:"age-anchor-candidate"}]),/admission is invalid/,"candidate became an admitted anchor");
  assert.throws(()=>refs(20,[anchor(15,{sourceAnchorRefs:["portrait_15"]})]),/cannot reference itself/,"self-reference was accepted");
  assert.throws(()=>refs(-1),/targetAgeYears/,"invalid chronological age was accepted");
});
