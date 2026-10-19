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
  let workflowError=null;
  const infra={
    objects:{
      get:async key=>objects.get(key)??null,
      head:async key=>objects.get(key)??null,
      remove:async key=>objects.delete(key),
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
      remove:async key=>catalog.delete(key),
      list:async({prefix})=>({entries:[...catalog.entries()].filter(([key])=>key.startsWith(prefix))
        .map(([key,value])=>({key,value})),nextCursor:null}),
    },
    services:{call:async(_service,_operation,{job})=>{
      dispatched.push(job);
      if(workflowError)throw workflowError;
      return {state:"pending"};
    }},
  };
  const verify=async({receipt})=>{
    const job=dispatched.find(value=>value.jobId===receipt.jobId);
    return {generationRecord:{
      job,generation:{provider},
      providerRequestWitness:{body:{referenceInputs:[{
        objectRef:job.referenceObjectRefs[0],
        digest:current.digest,
      }]}}}};
  };
  const service=createAdminVisualAgeAnchors({infra,source:async()=>current,verify});
  const complete=({bundled=false}={})=>{
    const job=dispatched.at(-1);
    const receipt={
      jobId:job.jobId,status:"ready",objectRef:job.outputObjectRef,role:job.role,
      mediaType:"image/png",sha256:digest("b"),
      context:job.context,
    };
    objects.set(job.receiptObjectRef,{bytes:encoded(receipt),digest:digest("c")});
    const stagedRef=bundled?"provideroutput_"+job.jobId:"staged_"+job.jobId;
    const attemptRef="generationattempt_"+job.jobId;
    if(bundled){
      objects.set(attemptRef,{
        bytes:encoded({attempt:true,photo:true}),digest:digest("c"),
        metadata:{kind:"generation_attempt_bundle",jobId:job.jobId,
          attemptRef,outputRef:stagedRef,outputDigest:digest("b")},
      });
    }else{
      objects.set(stagedRef,{
        bytes:encoded({photo:true}),digest:digest("b"),
        metadata:{kind:"staged_provider_output",jobId:job.jobId},
      });
    }
    objects.set(job.outputObjectRef,{
      bytes:encoded({photo:true}),digest:digest("b"),
      metadata:{kind:"provenanced_generated_media",jobId:job.jobId,
        generationAttemptObjectRef:bundled?attemptRef:null,
        providerOutputObjectRef:stagedRef,providerOutputDigest:digest("b")},
    });
  };
  return {service,infra,objects,catalog,dispatched,complete,
    setCanonical:(value)=>{current=value;},setWorkflowError:(error)=>{workflowError=error;}};
}

test("operator request freezes a single provenance-bound generation; admission requires completion",async()=>{
  const f=fixture();
  const request=await f.service.request("thr_visual","visual_candidate_1",15);
  assert.equal(request.state,"pending","Request falsely admitted a pending portrait");
  assert.equal(f.dispatched.length,1,"One age request dispatched multiple image jobs");
  assert.deepEqual(f.dispatched[0].referenceObjectRefs,["canonical_visual"],"Root identity was not used");
  const interruptedView=await f.service.list("thr_visual");
  assert.equal(interruptedView.candidates[0].candidateId,"visual_candidate_1",
    "An Observatory refresh lost the immutable image generation");
  assert.equal(interruptedView.candidates[0].targetAgeYears,15);
  await assert.rejects(f.service.admit("thr_visual","visual_candidate_1","operator@example.com"),
    /must be generated/,"Pending candidate was admitted");
  await f.service.request("thr_visual","visual_candidate_1",15);
  assert.deepEqual(f.dispatched[0].jobId,f.dispatched[1].jobId,"Retry created a different generation");
  f.complete();
  const admission=await f.service.admit("thr_visual","visual_candidate_1","operator@example.com");
  assert.equal(admission.targetAgeYears,15,"Admitted image lost its requested age");
  const approved=await f.service.list("thr_visual");
  assert.equal(approved.anchors.length,1,"Approved image did not become selectable");
  assert.equal(approved.candidates.length,0,"Approved age candidate remained pending");
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

test("unfinished generation reports a terminal Workflow failure instead of appearing perpetually pending",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_candidate_failed",12);
  f.setWorkflowError(new Error("OpenAI portrait generation terminated"));
  await assert.rejects(f.service.status("thr_visual","visual_candidate_failed"),
    /OpenAI portrait generation terminated/,"Failed generation was misreported as pending");
  assert.equal((await f.service.list("thr_visual")).anchors.length,0,
    "Failed generation became an admitted age anchor");
});

test("unapproved age portrait can be discarded without modifying canonical identity",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_candidate_discard",12);
  assert.equal((await f.service.list("thr_visual")).candidates.length,1);
  await f.service.discard("thr_visual","visual_candidate_discard");
  const restored=await f.service.list("thr_visual");
  assert.equal(restored.candidates.length,0,"Discarded candidate returned after Observatory reload");
  assert.equal(restored.anchors.length,0,"Discarding generated image created an admission");
  assert.equal(restored.canonical.objectRef,"canonical_visual","Candidate discard changed identity root");
});

test("same-age replacement never self-conditions and preserves prior approved evidence",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_age_12_first",12);
  f.complete();
  const first=await f.service.admit("thr_visual","visual_age_12_first","operator@example.com");
  await f.service.request("thr_visual","visual_age_12_replacement",12);
  const replacement=f.dispatched.at(-1);
  assert.deepEqual(replacement.referenceObjectRefs,["canonical_visual"],
    "Age-12 regeneration reused its own flawed age-12 reference");
  assert.match(replacement.brief.description,/school-age child or preteen/,
    "Childhood reconstruction lacks its distinct preteen anatomy");
  assert.match(replacement.brief.description,/exactly age 12/,
    "Childhood reconstruction lost the exact requested age");
  f.complete();
  const second=await f.service.admit("thr_visual","visual_age_12_replacement","operator@example.com");
  const current=await f.service.list("thr_visual");
  assert.equal(current.anchors.length,1,"More than one age-12 anchor became active");
  assert.equal(current.anchors[0].admissionId,second.admissionId,
    "Newly admitted age-12 likeness did not supersede the old one");
  assert.ok(f.objects.has(first.portraitObjectRef),
    "Regeneration destroyed the older immutable age-12 portrait");
  await assert.rejects(f.service.discard("thr_visual","visual_age_12_replacement"),
    /Approved portrait/,"Discard deleted an approved admission");
  await f.service.request("thr_visual","visual_age_85_new",85);
  assert.match(f.dispatched.at(-1).brief.description,/advanced old age|soft tissue/,
    "Age-85 reconstruction lacks real anatomical aging");
});

test("discarded completed age portraits are eligible for delayed targeted media cleanup only",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_candidate_unused",12);
  f.complete();
  await f.service.discard("thr_visual","visual_candidate_unused");
  const index=f.catalog.get("visual-age-anchor:candidate:thr_visual:visual_candidate_unused");
  assert.equal(index.state,"discarded","Discard did not retain a cleanup ledger");
  await assert.rejects(f.service.request("thr_visual","visual_candidate_unused",12),
    /Discarded/,"Discarded immutable job was restarted");
  const later=new Date(Date.parse(index.discardedAt)+8*24*3600*1000).toISOString();
  const dry=await f.service.cleanup("thr_visual",{now:later});
  assert.equal(dry.dryRun,true);
  assert.equal(dry.results[0].state,"eligible",
    "Unapproved completed portrait was not selected for delayed cleanup");
  assert.equal(dry.results[0].objects.length,2,
    "Cleanup did not identify the two disposable media objects");
  const job=f.dispatched[0];
  assert.ok(f.objects.has(job.outputObjectRef),"Dry run deleted the rendered image");
  assert.ok(f.objects.has(job.receiptObjectRef),"Dry run deleted provenance");
  const deleted=await f.service.cleanup("thr_visual",{now:later,dryRun:false});
  assert.equal(deleted.results[0].state,"cleaned");
  assert.equal(f.objects.has(job.outputObjectRef),false,
    "Discarded final image remained in R2");
  assert.equal(f.objects.has("staged_"+job.jobId),false,
    "Discarded provider output remained in R2");
  assert.ok(f.objects.has(job.receiptObjectRef),"Cleanup deleted the generation receipt");
  assert.equal(f.catalog.get("visual-age-anchor:candidate:thr_visual:visual_candidate_unused").state,"cleaned",
    "Deleted media remained eligible on subsequent cleanup");
  assert.equal((await f.service.cleanup("thr_visual",{now:later})).results.length,0,
    "Cleaned candidate was offered again");
});

test("pending candidates and approved references are never deleted during cleanup",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_pending_discard",45);
  await f.service.discard("thr_visual","visual_pending_discard");
  const entry=f.catalog.get("visual-age-anchor:candidate:thr_visual:visual_pending_discard");
  const later=new Date(Date.parse(entry.discardedAt)+8*24*3600*1000).toISOString();
  const report=await f.service.cleanup("thr_visual",{dryRun:false,now:later});
  assert.equal(report.results[0].state,"not_complete",
    "Cleanup treated an unfinished job as terminal");
  assert.ok(f.objects.has(f.dispatched[0].receiptObjectRef)===false);
  await f.service.request("thr_visual","visual_approved_45",45);
  f.complete();
  const admission=await f.service.admit("thr_visual","visual_approved_45","operator@example.com");
  await f.service.cleanup("thr_visual",{dryRun:false,now:later});
  assert.ok(f.objects.has(admission.portraitObjectRef),
    "Cleanup removed the approved portrait");
});

test("discarded generation-attempt bundles release their staged image bytes",async()=>{
  const f=fixture();
  await f.service.request("thr_visual","visual_candidate_bundled",85);
  f.complete({bundled:true});
  await f.service.discard("thr_visual","visual_candidate_bundled");
  const record=f.catalog.get("visual-age-anchor:candidate:thr_visual:visual_candidate_bundled");
  const afterWeek=new Date(Date.parse(record.discardedAt)+8*86400000).toISOString();
  const job=f.dispatched.at(-1);
  const attemptRef="generationattempt_"+job.jobId;
  const preview=await f.service.cleanup("thr_visual",{now:afterWeek});
  assert.deepEqual(preview.results[0].objects.map(o=>o.objectRef),
    [job.outputObjectRef,attemptRef],"R2's co-located provider image was omitted from cleanup");
  await f.service.cleanup("thr_visual",{now:afterWeek,dryRun:false});
  assert.equal(f.objects.has(attemptRef),false,"Discarded staged media bundle survived cleanup");
  assert.equal(f.objects.has(job.outputObjectRef),false,"Discarded final image survived cleanup");
  assert.equal(f.objects.has(job.receiptObjectRef),true,
    "Cleaning a discarded image unexpectedly deleted its receipt");
});
