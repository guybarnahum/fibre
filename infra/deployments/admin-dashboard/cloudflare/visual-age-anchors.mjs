import {createHash} from "node:crypto";
import {createCloudflareInfraDriver} from "#infra/providers/cloudflare";
import {
  createAssetGenerationJobFromIdentity,
  verifyProvenancedAssetForPublication,
} from "#services/asset-generator/src/index.mjs";
import {
  VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
  admittedVisualAgeAnchors,
  normalizeVisualAgeAnchorAdmission,
  resolveVisualAgeReferences,
} from "#services/world-kernel/src/visual-age-anchors.mjs";
import {resolveAdminWorldThreadIdentity} from "./thread-identity.mjs";
import {agePortraitBrief} from "fibre/thread-presentation/age-portrait-guidance";
import {
  readVisualAgeAnchorAdmissions,
  VISUAL_AGE_ANCHOR_ADMISSION_CATALOG_PREFIX,
} from "#services/world-kernel/src/visual-age-anchor-catalog.mjs";

const PROFILE="openai-gpt-image-2-medium-v1";
const ADMISSIONS=VISUAL_AGE_ANCHOR_ADMISSION_CATALOG_PREFIX;
const CANDIDATES="visual-age-anchor:candidate:";
const DISCARDED_RETENTION_MS=7*24*60*60*1000;
const CLEANUP_BATCH_LIMIT=10;
const CANDIDATE="visualagecandidate_";
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

const sha=value=>"sha256:"+createHash("sha256").update(value).digest("hex");
const key=(threadId,candidateId)=>CANDIDATE+sha(threadId+"\0"+candidateId).slice(7);
const bytes=value=>new TextEncoder().encode(JSON.stringify(value));
const decode=value=>JSON.parse(new TextDecoder().decode(value));

function identifier(name,value){
  if(typeof value!=="string"||!ID.test(value))throw new TypeError(name+" is invalid");
  return value;
}
function age(value){
  if(!Number.isSafeInteger(value)||value<3||value>95)throw new TypeError("anchor age must be 3–95 years");
  if(value===25)throw new TypeError("age 25 is already the canonical root");
  return value;
}
function infraFor(env){
  return createCloudflareInfraDriver({
    objectBucket:env?.PRESENTATION_OBJECTS,
    catalogDatabase:env?.PRESENTATION_CATALOG,
    serviceBindings:env?.ASSET_GENERATOR?{asset_generator:env.ASSET_GENERATOR}:{},
    privateToken:env?.FIBRE_PRIVATE_TOKEN,
  });
}
function worldFetch(env){
  if(typeof env?.WORLD_KERNEL?.fetch!=="function")throw new Error("World service is unavailable");
  return (url,init)=>env.WORLD_KERNEL.fetch(new Request(url,{
    ...init,headers:{...init?.headers,"x-fibre-private-token":env.FIBRE_PRIVATE_TOKEN},
  }));
}
async function identitySource(env,infra,threadId){
  const world=await resolveAdminWorldThreadIdentity({threadId,fetchImpl:worldFetch(env)});
  if(!world)throw new Error("Thread does not exist in World");
  const portraits=world.embodiments.filter(e=>e.kind==="portrait"&&e.status==="available"
    &&e.visibility==="public"&&typeof e.asset?.referenceObjectRef==="string");
  if(!portraits.length)throw new Error("Thread has no admitted canonical portrait");
  const portrait=portraits.sort((a,b)=>(b.revision??0)-(a.revision??0))[0];
  const objectRef=portrait.asset.referenceObjectRef;
  const stored=await infra.objects.head(objectRef);
  if(!stored || stored.digest!==portrait.asset.sha256)throw new Error("Canonical image is unavailable or changed");
  return Object.freeze({threadId,objectRef,digest:stored.digest,
    originRefs:[portrait.embodimentId,portrait.provenanceRef].filter(Boolean)});
}
async function stored(infra,ref){
  const value=await infra.objects.get(ref);
  return value===null?null:decode(value.bytes);
}
function applicable(source,records){
  return admittedVisualAgeAnchors({
    threadId:source.threadId,
    canonicalReferenceObjectRef:source.objectRef,
    canonicalReferenceDigest:source.digest,
    admissions:records,
  });
}
function ensureCurrent(source,manifest){
  if(source.objectRef!==manifest.canonicalReferenceObjectRef
    ||source.digest!==manifest.canonicalReferenceDigest){
    throw new Error("Canonical identity changed; request a new age anchor");
  }
}
function manifestRef(threadId,candidateId){
  return key(identifier("threadId",threadId),identifier("candidateId",candidateId));
}
async function readManifest(infra,threadId,candidateId){
  const manifest=await stored(infra,manifestRef(threadId,candidateId));
  if(manifest===null)throw new Error("Age anchor candidate not found");
  if(manifest.threadId!==threadId||manifest.candidateId!==candidateId)throw new Error("Candidate ownership changed");
  return manifest;
}
async function verifiedImage(infra,manifest,verify){
  const receipt=await stored(infra,manifest.job.receiptObjectRef);
  if(receipt===null)return null;
  if(receipt.status!=="ready")throw new Error("Age portrait generation did not produce an image");
  const proof=await verify({infra,receipt});
  const recordedJob=proof.generationRecord?.job;
  if(receipt.jobId!==manifest.job.jobId
    ||receipt.objectRef!==manifest.job.outputObjectRef
    ||receipt.role!=="visual_age_anchor"
    ||receipt.mediaType!=="image/png"
    ||receipt.context?.threadId!==manifest.threadId
    ||receipt.context?.targetAgeYears!==manifest.targetAgeYears
    ||receipt.context?.canonicalReferenceDigest!==manifest.canonicalReferenceDigest
    ||recordedJob?.jobId!==manifest.job.jobId
    ||recordedJob?.outputObjectRef!==manifest.job.outputObjectRef
    ||recordedJob?.receiptObjectRef!==manifest.job.receiptObjectRef
    ||JSON.stringify(recordedJob?.referenceObjectRefs)!==JSON.stringify(manifest.job.referenceObjectRefs)
    ||proof.generationRecord.generation.provider!=="openai"
    ||!proof.generationRecord.providerRequestWitness?.body?.referenceInputs?.some(ref=>
      ref.objectRef===manifest.canonicalReferenceObjectRef&&ref.digest===manifest.canonicalReferenceDigest)){
    throw new Error("Generated portrait does not match its canonical age-anchor job");
  }
  const image=await infra.objects.get(receipt.objectRef);
  if(image===null||image.digest!==receipt.sha256)throw new Error("Age-anchor image bytes do not match generation receipt");
  return {receipt,image};
}
function makeJob({source,candidateId,targetAgeYears,references}){
  const canonical={canonicalReferenceObjectRef:source.objectRef,canonicalReferenceDigest:source.digest};
  const sourceAnchorRefs=references.references.filter(x=>x.admissionId!==null).map(x=>x.objectRef);
  const identity=sha(JSON.stringify({threadId:source.threadId,candidateId,targetAgeYears,
    canonical,refs:references.referenceObjectRefs}));
  return {
    sourceAnchorRefs,
    job:createAssetGenerationJobFromIdentity({
      identityDigest:identity,assetKind:"image",role:"visual_age_anchor",variant:"lifelong-portrait",
      brief:agePortraitBrief(targetAgeYears),
      inputReferences:[source.objectRef,source.digest,...sourceAnchorRefs],
      referenceObjectRefs:references.referenceObjectRefs,
      requestedAt:new Date().toISOString(),providerProfile:PROFILE,
      context:{kind:"visual_age_anchor",threadId:source.threadId,candidateId,
        targetAgeYears,canonicalReferenceDigest:source.digest,sourceAnchorRefs},
    }),
  };
}
export function createAdminVisualAgeAnchors({env,infra=infraFor(env),source=null,verify=verifyProvenancedAssetForPublication}={}){
  const readSource=threadId=>source===null?identitySource(env,infra,threadId):source(threadId);
  return Object.freeze({
    async list(threadId){
      identifier("threadId",threadId);
      const current=await readSource(threadId);
      const admissions=await readVisualAgeAnchorAdmissions(infra.catalog,threadId);
      const candidates=[];
      let after=null;
      do{
        const page=await infra.catalog.list({prefix:CANDIDATES+threadId+":",after,limit:100});
        candidates.push(...page.entries.map(({value})=>value).filter(value=>
          value.state!=="discarded"&&value.state!=="cleaned"
          &&value.canonicalReferenceObjectRef===current.objectRef
          &&value.canonicalReferenceDigest===current.digest));
        after=page.nextCursor;
      }while(after!==null);
      candidates.sort((a,b)=>b.requestedAt.localeCompare(a.requestedAt));
      return {canonical:{objectRef:current.objectRef,digest:current.digest,age:25},
        anchors:applicable(current,admissions),historyCount:admissions.length,candidates};
    },
    async request(threadId,candidateId,targetAgeYears){
      identifier("threadId",threadId);identifier("candidateId",candidateId);age(targetAgeYears);
      const current=await readSource(threadId);
      let manifest=await stored(infra,manifestRef(threadId,candidateId));
      if(manifest===null){
        const previous=await readVisualAgeAnchorAdmissions(infra.catalog,threadId);
        const references=resolveVisualAgeReferences({
          threadId,targetAgeYears,
          canonicalReferenceObjectRef:current.objectRef,canonicalReferenceDigest:current.digest,
          // A same-age replacement must not condition on the portrait being corrected.
          admissions:previous.filter(anchor=>anchor.targetAgeYears!==targetAgeYears),
        });
        const {sourceAnchorRefs,job}=makeJob({source:current,candidateId,targetAgeYears,references});
        manifest={threadId,candidateId,targetAgeYears,
          canonicalReferenceObjectRef:current.objectRef,canonicalReferenceDigest:current.digest,
          sourceAnchorRefs,job};
        const data=bytes(manifest);
        await infra.objects.putImmutable(manifestRef(threadId,candidateId),data,sha(data),{
          kind:"visual_age_anchor_candidate",threadId,targetAgeYears,mediaType:"application/json",
        });
      }
      if(manifest.targetAgeYears!==targetAgeYears)throw new Error("Candidate ID was already used for another age");
      ensureCurrent(current,manifest);
      const indexed=await infra.catalog.get(CANDIDATES+threadId+":"+candidateId);
      if(indexed?.state==="discarded"||indexed?.state==="cleaned"){
        throw new Error("Discarded age portrait candidate cannot be restarted");
      }
      await infra.catalog.upsert(CANDIDATES+threadId+":"+candidateId,{
        candidateId,targetAgeYears,requestedAt:manifest.job.requestedAt,
        canonicalReferenceObjectRef:manifest.canonicalReferenceObjectRef,
        canonicalReferenceDigest:manifest.canonicalReferenceDigest,
      });
      if(await infra.objects.head(manifest.job.receiptObjectRef)===null){
        const result=await infra.services.call("asset_generator","generation.reconcile",{job:manifest.job});
        return {candidateId,targetAgeYears,state:result.state};
      }
      return this.status(threadId,candidateId);
    },
    async status(threadId,candidateId){
      const manifest=await readManifest(infra,threadId,candidateId);
      const current=await readSource(threadId);ensureCurrent(current,manifest);
      const admitted=await infra.catalog.get(ADMISSIONS+threadId+":"+candidateId)!==null;
      if(admitted)return {candidateId,targetAgeYears:manifest.targetAgeYears,state:"admitted"};
      const receipt=await stored(infra,manifest.job.receiptObjectRef);
      // Reconcile also exposes terminal Workflow errors when no receipt exists;
      // a missing receipt alone is not evidence of continued generation.
      const state=receipt===null
        ?(await infra.services.call("asset_generator","generation.reconcile",{job:manifest.job})).state
        :receipt.status==="ready"?"ready":"unavailable";
      return {candidateId,targetAgeYears:manifest.targetAgeYears,state};
    },
    async discard(threadId,candidateId){
      const manifest=await readManifest(infra,threadId,candidateId);
      if(await infra.catalog.get(ADMISSIONS+threadId+":"+candidateId)!==null){
        throw new Error("Approved portrait cannot be discarded");
      }
      const catalogKey=CANDIDATES+threadId+":"+candidateId;
      const indexed=await infra.catalog.get(catalogKey);
      if(indexed?.state!=="cleaned"){
        await infra.catalog.upsert(catalogKey,{
          ...(indexed??{
            candidateId,targetAgeYears:manifest.targetAgeYears,
            requestedAt:manifest.job.requestedAt,
            canonicalReferenceObjectRef:manifest.canonicalReferenceObjectRef,
            canonicalReferenceDigest:manifest.canonicalReferenceDigest,
          }),
          state:"discarded",discardedAt:indexed?.discardedAt??new Date().toISOString(),
        });
      }
      return {candidateId,state:"discarded"};
    },
    async image(threadId,candidateId){
      const manifest=await readManifest(infra,threadId,candidateId);
      ensureCurrent(await readSource(threadId),manifest);
      const result=await verifiedImage(infra,manifest,verify);
      if(result===null)throw new Error("Age anchor is still generating");
      return result.image.bytes;
    },
    async canonical(threadId){
      const source=await readSource(identifier("threadId",threadId));
      const image=await infra.objects.get(source.objectRef);
      if(!image||image.digest!==source.digest)throw new Error("Canonical portrait unavailable");
      return image.bytes;
    },
    async admit(threadId,candidateId,approvedBy){
      if(typeof approvedBy!=="string"||approvedBy.trim()==="")throw new TypeError("authenticated operator is required");
      const manifest=await readManifest(infra,threadId,candidateId);
      const source=await readSource(threadId);ensureCurrent(source,manifest);
      const catalogKey=ADMISSIONS+threadId+":"+candidateId;
      const existing=await infra.catalog.get(catalogKey);
      if(existing!==null)return normalizeVisualAgeAnchorAdmission(existing);
      const candidateEntry=await infra.catalog.get(CANDIDATES+threadId+":"+candidateId);
      if(candidateEntry?.state==="discarded"||candidateEntry?.state==="cleaned"){
        throw new Error("Discarded age portrait cannot be approved");
      }
      const result=await verifiedImage(infra,manifest,verify);
      if(result===null)throw new Error("Age anchor must be generated before approval");
      const approvalRef="visualageapproval_"+sha(threadId+"\0"+candidateId).slice(7);
      let approval=await stored(infra,approvalRef);
      if(approval!==null){
        if(approval.threadId!==threadId||approval.candidateId!==candidateId
          ||approval.canonicalReferenceObjectRef!==source.objectRef
          ||approval.canonicalReferenceDigest!==source.digest
          ||approval.portraitObjectRef!==result.receipt.objectRef
          ||approval.portraitDigest!==result.receipt.sha256
          ||approval.generationReceiptRef!==manifest.job.receiptObjectRef){
          throw new Error("Prior operator approval does not match this candidate");
        }
      }else{
        const previous=await readVisualAgeAnchorAdmissions(infra.catalog,threadId);
        const lastAt=previous.filter(a=>a.targetAgeYears===manifest.targetAgeYears)
          .reduce((time,a)=>Math.max(time,Date.parse(a.admittedAt)),0);
        const approvedAt=new Date(Math.max(Date.now(),lastAt+1)).toISOString();
        approval={threadId,candidateId,approvedBy,approvedAt,
          canonicalReferenceObjectRef:source.objectRef,canonicalReferenceDigest:source.digest,
          portraitObjectRef:result.receipt.objectRef,portraitDigest:result.receipt.sha256,
          generationReceiptRef:manifest.job.receiptObjectRef};
        const approvalBytes=bytes(approval);
        await infra.objects.putImmutable(approvalRef,approvalBytes,sha(approvalBytes),{
          kind:"visual_age_anchor_approval",threadId,candidateId,mediaType:"application/json",
        });
      }
      const admissionId="visualageadmission_"+sha(threadId+"\0"+candidateId).slice(7);
      const record=normalizeVisualAgeAnchorAdmission({
        contract:VISUAL_AGE_ANCHOR_ADMISSION_VERSION,admissionId,threadId,
        targetAgeYears:manifest.targetAgeYears,portraitObjectRef:result.receipt.objectRef,
        portraitDigest:result.receipt.sha256,canonicalReferenceObjectRef:source.objectRef,
        canonicalReferenceDigest:source.digest,sourceAnchorRefs:manifest.sourceAnchorRefs,
        generationReceiptRef:manifest.job.receiptObjectRef,approvalRef,
        admittedAt:approval.approvedAt,
      });
      const admissionBytes=bytes(record);
      await infra.objects.putImmutable(admissionId,admissionBytes,sha(admissionBytes),{
        kind:"visual_age_anchor_admission",threadId,mediaType:"application/json",
      });
      await infra.catalog.upsert(catalogKey,record);
      await infra.catalog.remove(CANDIDATES+threadId+":"+candidateId);
      return record;
    },
    /** Operator-only, targeted dry-run by default. Never scans R2 or touches admissions. */
    async cleanup(threadId,{dryRun=true,now=new Date().toISOString()}={}){
      identifier("threadId",threadId);
      if(typeof dryRun!=="boolean")throw new TypeError("dryRun must be boolean");
      const olderThan=new Date(now).getTime()-DISCARDED_RETENTION_MS;
      if(!Number.isFinite(olderThan))throw new TypeError("cleanup date is invalid");
      const admissions=await readVisualAgeAnchorAdmissions(infra.catalog,threadId);
      const protectedRefs=new Set(admissions.flatMap(record=>[
        record.portraitObjectRef,record.generationReceiptRef,
        record.approvalRef,record.admissionId,...record.sourceAnchorRefs,
        record.canonicalReferenceObjectRef,
      ]));
      const results=[];
      let after=null;
      let limited=false;
      let eligibleCount=0;
      do{
        const page=await infra.catalog.list({prefix:CANDIDATES+threadId+":",after,limit:100});
        for(const {value:entry} of page.entries){
          if(eligibleCount>=CLEANUP_BATCH_LIMIT){
            limited=true;
            break;
          }
          if(entry.state!=="discarded" || Date.parse(entry.discardedAt)>olderThan
            || !Number.isFinite(Date.parse(entry.discardedAt)))continue;
          const candidateId=entry.candidateId;
          const candidateKey=CANDIDATES+threadId+":"+candidateId;
          const manifest=await readManifest(infra,threadId,candidateId);
          if(await infra.catalog.get(ADMISSIONS+threadId+":"+candidateId)!==null)continue;
          const receipt=await stored(infra,manifest.job.receiptObjectRef);
          if(receipt===null){
            results.push({candidateId,state:"not_complete",objects:[],bytes:0});
            continue; // Pending or failed; no proof that the workflow has stopped.
          }
          const job=manifest.job;
          if(receipt.status!=="ready"||receipt.jobId!==job.jobId
            ||receipt.objectRef!==job.outputObjectRef
            ||receipt.context?.threadId!==threadId){
            results.push({candidateId,state:"invalid_receipt",objects:[],bytes:0});
            continue;
          }
          const output=await infra.objects.get(job.outputObjectRef);
          if(output===null){
            results.push({candidateId,state:"media_already_removed",objects:[],bytes:0});
            continue;
          }
          if(output.digest!==receipt.sha256||output.metadata?.kind!=="provenanced_generated_media"
            ||output.metadata?.jobId!==job.jobId){
            results.push({candidateId,state:"unverified_media",objects:[],bytes:0});
            continue;
          }
          const outputRef=output.metadata.providerOutputObjectRef;
          const attemptRef=output.metadata.generationAttemptObjectRef;
          const staged=typeof outputRef==="string"?await infra.objects.get(outputRef):null;
          const bundle=typeof attemptRef==="string"?await infra.objects.get(attemptRef):null;
          const objects=[{objectRef:job.outputObjectRef,bytes:output.bytes.length}];
          // The optimized Asset Generator often co-locates the attempt and
          // staged image in ONE R2 object; the logical outputRef is virtual.
          if(bundle?.metadata?.kind==="generation_attempt_bundle"
            &&bundle.metadata.jobId===job.jobId
            &&bundle.metadata.attemptRef===attemptRef
            &&bundle.metadata.outputRef===outputRef
            &&bundle.metadata.outputDigest===receipt.sha256
            &&attemptRef!==job.outputObjectRef){
            objects.push({objectRef:attemptRef,bytes:bundle.bytes.length});
          }else if(staged?.metadata?.kind==="staged_provider_output"
            &&staged.metadata.jobId===job.jobId
            &&staged.digest===output.metadata.providerOutputDigest
            &&outputRef!==job.outputObjectRef){
            objects.push({objectRef:outputRef,bytes:staged.bytes.length});
          }
          if(objects.some(object=>protectedRefs.has(object.objectRef))){
            results.push({candidateId,state:"referenced",objects:[],bytes:0});
            continue;
          }
          if(!dryRun){
            // Recheck the admitted ledger immediately before destructive changes.
            const latest=await readVisualAgeAnchorAdmissions(infra.catalog,threadId);
            const nowProtected=new Set(latest.flatMap(a=>[a.portraitObjectRef,...a.sourceAnchorRefs]));
            if(latest.some(a=>a.generationReceiptRef===job.receiptObjectRef)
              ||objects.some(o=>nowProtected.has(o.objectRef)))continue;
            for(const object of objects)await infra.objects.remove(object.objectRef);
            await infra.catalog.upsert(candidateKey,{...entry,state:"cleaned",cleanedAt:now});
          }
          results.push({candidateId,state:dryRun?"eligible":"cleaned",objects,
            bytes:objects.reduce((sum,item)=>sum+item.bytes,0)});
          eligibleCount++;
        }
        after=page.nextCursor;
        if(limited)break;
      }while(after!==null);
      return {threadId,dryRun,retentionDays:7,batchLimit:CLEANUP_BATCH_LIMIT,limited,results,
        totalBytes:results.reduce((sum,item)=>sum+item.bytes,0)};
    },
    async admittedImage(threadId,admissionId){
      const anchors=await this.list(threadId);
      const anchor=anchors.anchors.find(item=>item.admissionId===admissionId);
      if(!anchor)throw new Error("Age anchor is not active for this canonical identity");
      const image=await infra.objects.get(anchor.portraitObjectRef);
      if(!image||image.digest!==anchor.portraitDigest)throw new Error("Admitted portrait bytes changed");
      return image.bytes;
    },
  });
}
