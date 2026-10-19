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

const PROFILE="openai-gpt-image-2-medium-v1";
const ADMISSIONS="visual-age-anchor:admission:";
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
async function listAdmissions(infra,threadId){
  const items=[];
  const prefix=ADMISSIONS+threadId+":";
  let after=null;
  do{
    const page=await infra.catalog.list({prefix,after,limit:100});
    items.push(...page.entries.map(entry=>normalizeVisualAgeAnchorAdmission(entry.value)));
    after=page.nextCursor;
  }while(after!==null);
  return items;
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
      brief:{
        description:`Generate a natural head-and-shoulders portrait of the SAME individual at age ${targetAgeYears}. The canonical root reference depicts this person at age 25. Other supplied images, if present, are approved age-specific references. Preserve stable facial identity while allowing plausible age-dependent anatomy and skin/hair changes.`,
        constraints:[
          "The canonical reference is identity authority; age-local references only guide development.",
          "Preserve recognizable bone structure, distinctive features, and natural asymmetry.",
          "Use ordinary neutral portrait lighting, simple background, no beauty retouching.",
          "No text, labels, cards, graphics or watermark.",
        ],
      },
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
      const admissions=await listAdmissions(infra,threadId);
      return {canonical:{objectRef:current.objectRef,digest:current.digest,age:25},
        anchors:applicable(current,admissions),historyCount:admissions.length};
    },
    async request(threadId,candidateId,targetAgeYears){
      identifier("threadId",threadId);identifier("candidateId",candidateId);age(targetAgeYears);
      const current=await readSource(threadId);
      let manifest=await stored(infra,manifestRef(threadId,candidateId));
      if(manifest===null){
        const previous=await listAdmissions(infra,threadId);
        const references=resolveVisualAgeReferences({
          threadId,targetAgeYears,
          canonicalReferenceObjectRef:current.objectRef,canonicalReferenceDigest:current.digest,
          admissions:previous,
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
        approval={threadId,candidateId,approvedBy,approvedAt:new Date().toISOString(),
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
      return record;
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
