import test from "node:test";
import assert from "node:assert/strict";
import {createAdminVisualAgeAnchors} from "./visual-age-anchors.mjs";
import {VISUAL_AGE_ANCHOR_ADMISSION_VERSION} from "#services/world-kernel/src/visual-age-anchors.mjs";

const digest=(x)=>"sha256:"+x.repeat(64);
const sourceRef={threadId:"thr_visual",objectRef:"canonical_visual",digest:digest("a")};
const encoder=new TextEncoder();
const encoded=value=>encoder.encode(JSON.stringify(value));
const decoded=bytes=>JSON.parse(new TextDecoder().decode(bytes));

function fixture({provider="openai"}={}){
  const objects=new Map([["canonical_visual",{bytes:encoded({image:true}),digest:digest("a")}]]);
  const catalog=new Map();
  const dispatched=[];
  let current={...sourceRef};
  const infra={
    objects:{
      get:async key=>objects.get(key)??null,
      head:async key=>objects.get(key)??null,
      putImmutable:async(key,bytes,sha)=>{
        const existing=objects.get(key);
        if(existing){
          if(existing.digest!==sha)throw new Error("Immutable object conflict");
          return {duplicate:true};
        }
        objects.set(key,{bytes,digest:sha});
        return {duplicate:false};
      },
    },
    catalog:{
      get:async key=>catalog.get(key)??null,
      upsert:async(key,value)=>{catalog.set(key,value);},
      list:async({prefix})=>({entries:[...catalog.entries()].filter(([key])=>key.startsWith(prefix))
        .map(([key,value])=>({key,value})),nextCursor:null}),
    },
    services:{call:async(_service,_operation,{job})=>{dispatched.push(job);return {state:"pending"};}},
  };
  const verify=async({receipt})=>({
    generationRecord:{
      generation:{provider},
      providerRequestWitness:{body:{referenceInputs:[{
        objectRef:receipt.job.referenceObjectRefs[0],
        digest:current.digest,
      }]}}},
  });
  const service=createAdminVisualAgeAnchors({infra,source:async()=>current,verify});
  const complete=()=>{
    const job=dispatched.at(-1);
    const receipt={
      jobId:job.jobId,status:"ready",objectRef:job.outputObjectRef,role:job.role,
      mediaType:"image/png",sha256:digest("b"),job,
      context:job.context,
    };
    objects.set(job.receiptObjectRef,{bytes:encoded(receipt),digest:digest("c")});
    objects.set(job.outputObjectRef,{bytes:encoded({photo:true}),digest:digest("b")});
  };
  return {service,infra,objects,catalog,dispatched,complete,setCanonical:(value)=>{current=value;}};
}

test("operator request freezes a single provenance-bound generation; admission requires completion",async()=>{
  const f=fixture();
  const request=await f.service.request("thr_visual","visual_candidate_1",15);
  assert.equal(request.state,"pending","Request falsely admitted a pending portrait");
  assert.equal(f.dispatched.length,1,"One age request dispatched multiple image jobs");
  assert.deepEqual(f.dispatched[0].referenceObjectRefs,["canonical_visual"],"Root identity was not used");
  await assert.rejects(f.service.admit("thr_visual","visual_candidate_1","operator@example.com"),
    /must be generated/,"Pending candidate was admitted");
  await f.service.request("thr_visual","visual_candidate_1",15);
  assert.deepEqual(f.dispatched[0].jobId,f.dispatched[1].jobId,"Retry created a different generation");
  f.complete();
  const admission=await f.service.admit("thr_visual","visual_candidate_1","operator@example.com");
  assert.equal(admission.targetAgeYears,15,"Admitted image lost its requested age");
  assert.equal((await f.service.list("thr_visual")).anchors.length,1,"Approved image did not become selectable");
  const same=await f.service.admit("thr_visual","visual_candidate_1","operator@example.com");
  assert.deepEqual(same,admission,"Repeated approval changed the admitted record");
});

test("superseded canonical roots invalidate generation, admission and lookup",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_candidate_2",40);
  f.complete();
  await f.service.admit("thr_visual","visual_candidate_2","operator@example.com");
  f.setCanonical({...sourceRef,objectRef:"new_visual_root",digest:digest("d")});
  const list=await f.service.list("thr_visual");
  assert.equal(list.anchors.length,0,"Old-root portrait remained a reference");
  await assert.rejects(f.service.request("thr_visual","visual_candidate_2",40),
    /Canonical identity changed/,"Old pending candidate reused a new canonical identity");
  await assert.rejects(f.service.admittedImage("thr_visual","visualageadmission_"+
    "irrelevant"),/not active/);
});

test("non-OpenAI or unproven images never become admitted anchors",async()=>{
  const f=fixture({provider:"bfl"});
  await f.service.request("thr_visual","visual_candidate_3",60);
  f.complete();
  await assert.rejects(f.service.admit("thr_visual","visual_candidate_3","operator@example.com"),
    /does not match/,"A candidate without correct provider evidence became an age anchor");
  assert.equal((await f.service.list("thr_visual")).anchors.length,0,"Rejected image contaminated references");
});

test("anchor selection consumes only admitted local-age portraits and no privileged age schedule",async()=>{
  const f=fixture();
  for(const age of [10,35,40]){
    await f.infra.catalog.upsert("visual-age-anchor:admission:thr_visual:prior_"+age,{
      contract:VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
      admissionId:"admission_"+age,threadId:"thr_visual",targetAgeYears:age,
      portraitObjectRef:"portrait_"+age,portraitDigest:digest("b"),
      canonicalReferenceObjectRef:sourceRef.objectRef,canonicalReferenceDigest:sourceRef.digest,
      sourceAnchorRefs:[],generationReceiptRef:"receipt_"+age,approvalRef:"approval_"+age,
      admittedAt:"2026-10-19T00:00:00.000Z",
    });
  }
  await f.service.request("thr_visual","visual_candidate_4",37);
  const job=f.dispatched[0];
  assert.deepEqual(job.referenceObjectRefs,["canonical_visual","portrait_35","portrait_40"],
    "Age interpolation ignored the nearest admitted anchors");
  assert.equal(job.referenceObjectRefs.length,3,"Generation exceeded the bounded reference set");
});
