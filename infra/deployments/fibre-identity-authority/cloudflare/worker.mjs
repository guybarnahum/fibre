import { DurableObject } from "cloudflare:workers";

import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import {
  createAssetGenerationJobFromIdentity,
  createAssetGenerationService,
} from "#services/asset-generator/src/index.mjs";
import { createFidService } from "#services/fibre-identity-authority/public/fid-service.mjs";
import {
  FidCardIssuanceStore,
  FidCardRegistry,
  FidPhotoAdmissionStore,
  buildFidPhotoDerivationJob,
  createFibreIdentityAuthority,
  createFidCardIssuanceExecutor,
  createFidCardTemplateFromPngAssets,
  decodePngRgba,
  fidRenderPhotoDigest,
  verifyFidCardProof,
} from "#services/fibre-identity-authority/src/index.mjs";
import { createCloudflareDurableObjectServiceRouter } from "../../cloudflare-do-service-router.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import { selectImageProviderProfile } from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createFidCredentialCrypto } from "#integrations/fid-credentials/webcrypto.mjs";
import { fidPhotoSourceMatchesCanonicalReference } from "#services/fibre-identity-authority/src/fid-photo-source-policy.mjs";

import oceanFrontBase from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/front-base.png";
import oceanFrontForeground from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/front-foreground.png";
import oceanBackBase from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/back-base.png";
import oceanRegularFont from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/NotoSans-SemiCondensed.ttf";
import oceanMediumFont from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/NotoSans-SemiCondensedMedium.ttf";
import oceanLayout from "../../../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/layout.json" with { type:"json" };

const FID_SCOPE_ID = "fid";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const ACTIVE_ROUTE = /^\/internal\/fid\/threads\/([^/]+)\/active$/u;
const REISSUE_ROUTE = "/internal/fid/cards/reissue";
const VERIFY_ROUTE = "/internal/fid/cards/verify";
const DEPLOYMENT = parseDeploymentManifest(cloudflareDeploymentYaml);
const ASSET_DEPLOYMENT = resolveServiceDeployment(DEPLOYMENT, "asset-generator");
const FID_TEMPLATE_VERSION = "fid-card-template-v0.3-ocean";
const FID_TEMPLATE_LAYOUT = Object.freeze(oceanLayout);

function loadFidTemplate() {
  return createFidCardTemplateFromPngAssets({
    version:FID_TEMPLATE_VERSION,
    layout:FID_TEMPLATE_LAYOUT,
    frontBasePng:oceanFrontBase,
    frontForegroundPng:oceanFrontForeground,
    backBasePng:oceanBackBase,
    fontAssets:{
      "NotoSans-SemiCondensed.ttf":oceanRegularFont,
      "NotoSans-SemiCondensedMedium.ttf":oceanMediumFont,
    },
  });
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function fibreId(name, value) {
  const id = nonEmpty(name, value);
  if (!ID.test(id)) throw new TypeError(`${name} is invalid`);
  return id;
}

function binding(env, name) {
  const value = env?.[name];
  if (!value || typeof value.fetch !== "function") throw new TypeError(`${name} service binding is required`);
  return value;
}

function privateToken(env) {
  return nonEmpty("FIBRE_PRIVATE_TOKEN", env?.FIBRE_PRIVATE_TOKEN);
}

async function jsonFrom(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.error?.detail ?? payload?.error?.code ?? payload?.error ?? `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return payload;
}

async function worldRequest(env, path) {
  return binding(env, "WORLD_KERNEL").fetch(new Request(`https://world.internal${path}`, {
    headers:{ Accept:"application/json", "x-fibre-private-token":privateToken(env) },
  }));
}

async function worldCivilByThread(env, threadId) {
  const response = await worldRequest(env, `/internal/threads/${encodeURIComponent(threadId)}/observatory`);
  if (response.status === 404) return null;
  const payload = await jsonFrom(response, "Civil Registry lookup failed");
  return payload?.observatory?.civilRegistration ?? null;
}

function createWorldCivilRegistry(env) {
  return Object.freeze({
    lookupByThreadId(threadId) {
      return worldCivilByThread(env, fibreId("threadId", threadId));
    },
    async lookupByFin(fin) {
      const value = nonEmpty("FIN", fin);
      const response = await worldRequest(env, `/internal/thread-directory/search?fin=${encodeURIComponent(value)}&limit=1`);
      const payload = await jsonFrom(response, "Civil Registry FIN lookup failed");
      const thread = Array.isArray(payload?.threads) ? payload.threads[0] ?? null : null;
      return thread === null ? null : worldCivilByThread(env, fibreId("Thread Registry threadId", thread.threadId));
    },
  });
}

function createWorldThreadRegistry(env) {
  return Object.freeze({
    async get(threadId) {
      const id = fibreId("threadId", threadId);
      const response = await worldRequest(env, `/internal/threads/${encodeURIComponent(id)}/identity`);
      if (response.status === 404) return null;
      const payload = await jsonFrom(response, "Thread Registry lookup failed");
      return payload?.identity ?? null;
    },
  });
}

async function presentationSnapshot(env, threadId) {
  const response = await binding(env, "THREAD_PRESENTATION").fetch(new Request(
    `https://thread-presentation.internal/api/threads/${encodeURIComponent(threadId)}/snapshot`,
    { headers:{ Accept:"application/json" } },
  ));
  if (response.status === 404) return null;
  const payload = await jsonFrom(response, "Thread Presentation lookup failed");
  return payload?.snapshot ?? null;
}

function refs(values) {
  return [...new Set(values.flat(Infinity).filter((value) => typeof value === "string" && ID.test(value)))];
}

function ageAt(birthDate, at) {
  if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(birthDate)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const date = new Date(at);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(date.getTime())) return null;
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  if (date.getUTCMonth() < birth.getUTCMonth()
    || (date.getUTCMonth() === birth.getUTCMonth() && date.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function priorFidPhotoSource({ registry, admissions, threadId, canonicalReferenceObjectRef }) {
  const history = registry.listByThreadId(threadId);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const issuance = registry.getIssuanceByCredentialId(history[index].credential.credentialId, { required:false })?.record ?? null;
    const admissionId = issuance?.photoAdmissionId ?? null;
    if (admissionId === null) continue;
    const accepted = admissions.getByAdmissionId(admissionId, { required:false });
    if (accepted?.receipt?.decision !== "accepted") continue;
    const receipt = accepted.receipt;
    const candidate = {
      role:"official_id_photo",
      threadId,
      candidatePhotoRef:receipt.candidatePhotoRef,
      candidatePhotoDigest:receipt.candidatePhotoDigest,
      canonicalVisualReferenceRef:receipt.canonicalVisualReferenceRef,
      canonicalVisualReferenceDigest:receipt.canonicalVisualReferenceDigest,
      derivationReceiptRef:receipt.derivationReceiptRef,
      sourceReferences:refs([receipt.canonicalVisualReferenceRef, receipt.derivationReceiptRef]),
      targetAgeYears:null,
      candidateEvidence:{ previouslyAdmitted:true, ready:true },
    };
    if (fidPhotoSourceMatchesCanonicalReference(candidate, canonicalReferenceObjectRef)) return candidate;
  }
  return null;
}

async function storedJson(infra, objectRef) {
  const stored = await infra.objects.get(objectRef);
  if (stored === null) return null;
  try { return JSON.parse(new TextDecoder().decode(stored.bytes)); }
  catch { return null; }
}

async function renderPhotoDigest(infra, objectRef) {
  const stored = await infra.objects.get(objectRef);
  if (stored === null) throw new Error(`FID photo ${objectRef} is missing from immutable object storage`);
  return fidRenderPhotoDigest(await decodePngRgba(stored.bytes));
}

function createPhotoSource({ env, infra, registry, admissions, providerProfile }) {
  return Object.freeze({
    async resolveCandidate({ threadId, at, workflow }) {
      const snapshot = await presentationSnapshot(env, threadId);
      const presentation = snapshot?.presentation ?? null;
      const visual = presentation?.visualIdentity ?? null;
      const canonicalRef = Array.isArray(visual?.referenceObjectRefs) && visual.referenceObjectRefs.length === 1
        ? visual.referenceObjectRefs[0]
        : null;
      const canonical = canonicalRef === null ? null : await infra.objects.head(canonicalRef);
      const prior = priorFidPhotoSource({
        registry,
        admissions,
        threadId,
        canonicalReferenceObjectRef:canonicalRef,
      });
      if (prior !== null && await infra.objects.head(prior.candidatePhotoRef) !== null) return prior;
      const sourceReferences = refs([
        canonicalRef,
        visual?.embodimentId,
        visual?.provenanceRef,
        visual?.sourceReferences ?? [],
        visual?.permissionReferences ?? [],
      ]);
      const targetAgeYears = ageAt(presentation?.subject?.birthDate, at);
      const assets = Array.isArray(snapshot?.media?.assets) ? snapshot.media.assets : [];
      const officialMediaId = presentation?.identityCard?.officialPhotoMediaRef ?? null;
      const media = assets.find((asset) => asset?.mediaId === officialMediaId
        && asset?.role === "official_id_photo"
        && asset?.status === "ready"
        && asset?.mediaType === "image/png"
        && Array.isArray(asset?.sourceReferences)
        && asset.sourceReferences.includes(canonicalRef))
        ?? assets.find((asset) => asset?.role === "official_id_photo"
          && asset?.status === "ready"
          && asset?.mediaType === "image/png"
          && Array.isArray(asset?.sourceReferences)
          && asset.sourceReferences.includes(canonicalRef))
        ?? null;

      if (canonical !== null && media?.locator && media?.sha256 && media?.provenanceRef) {
        return {
          role:"official_id_photo",
          threadId,
          candidatePhotoRef:media.locator,
          candidatePhotoDigest:await renderPhotoDigest(infra, media.locator),
          canonicalVisualReferenceRef:canonicalRef,
          canonicalVisualReferenceDigest:canonical.digest,
          derivationReceiptRef:media.provenanceRef,
          sourceReferences:refs([sourceReferences, media.sourceReferences ?? [], media.provenanceRef]),
          targetAgeYears,
          candidateEvidence:{ ready:true, width:media.width, height:media.height },
        };
      }

      const empty = {
        role:"official_id_photo",
        threadId,
        candidatePhotoRef:null,
        candidatePhotoDigest:null,
        canonicalVisualReferenceRef:canonicalRef,
        canonicalVisualReferenceDigest:canonical?.digest ?? null,
        derivationReceiptRef:null,
        sourceReferences,
        targetAgeYears,
      };
      if (canonical === null || workflow == null) return empty;

      let job;
      try {
        job = buildFidPhotoDerivationJob({
          workflow,
          source:empty,
          requestedAt:at,
          providerProfile,
          createGenerationJob:createAssetGenerationJobFromIdentity,
        });
      } catch {
        return empty;
      }
      const [generated, receiptObject] = await Promise.all([
        infra.objects.head(job.outputObjectRef),
        infra.objects.head(job.receiptObjectRef),
      ]);
      if (generated === null || receiptObject === null) return empty;
      const receipt = await storedJson(infra, job.receiptObjectRef);
      return {
        ...empty,
        candidatePhotoRef:job.outputObjectRef,
        candidatePhotoDigest:await renderPhotoDigest(infra, job.outputObjectRef),
        derivationReceiptRef:job.receiptObjectRef,
        sourceReferences:refs([sourceReferences, job.receiptObjectRef]),
        candidateEvidence:{
          ready:true,
          width:Number.isSafeInteger(receipt?.width) ? receipt.width : null,
          height:Number.isSafeInteger(receipt?.height) ? receipt.height : null,
        },
      };
    },
  });
}

const photoExaminer = Object.freeze({
  async inspect({ source }) {
    const ready = source?.candidateEvidence?.ready === true;
    const previouslyAdmitted = source?.candidateEvidence?.previouslyAdmitted === true;
    const dimensionsKnown = Number.isSafeInteger(source?.candidateEvidence?.width)
      && Number.isSafeInteger(source?.candidateEvidence?.height);
    const dimensionsCompliant = previouslyAdmitted
      || (ready && dimensionsKnown && source.candidateEvidence.width >= 128 && source.candidateEvidence.height >= 128);
    return {
      faceCount:ready ? 1 : 0,
      faceVisible:ready,
      occlusionAcceptable:ready,
      cropCompliant:ready,
      dimensionsCompliant,
      poseCompliant:ready,
      framingCompliant:ready,
      visualIdentityConsistent:ready,
      ageConsistent:ready,
    };
  },
});

function publicCut(result) {
  return Object.freeze({
    state:result.state,
    reused:result.reused,
    credential:result.credential === null ? null : Object.freeze({
      credentialId:result.credential.credentialId,
      revision:result.credential.revision,
      supersedesCredentialId:result.credential.supersedesCredentialId,
      status:result.state,
    }),
    derivation:result.derivation == null ? null : Object.freeze({
      jobId:result.derivation.job?.jobId ?? null,
      status:result.derivation.instance?.status ?? null,
    }),
  });
}

function createRuntime(ctx, env) {
  if (!env?.FID_OBJECTS) throw new TypeError("FID_OBJECTS binding is required");
  if (!env?.ASSET_GENERATION) throw new TypeError("ASSET_GENERATION binding is required");
  const infra = createCloudflareInfraDriver({
    stateScopes:{ [FID_SCOPE_ID]:ctx.storage },
    objectBucket:env.FID_OBJECTS,
    workflowBindings:{ asset_generation_v1:env.ASSET_GENERATION },
  });
  const storage = Object.freeze({ infraDriver:infra, stateScopeId:FID_SCOPE_ID });
  const registry = new FidCardRegistry(storage);
  const issuanceStore = new FidCardIssuanceStore(storage);
  const admissions = new FidPhotoAdmissionStore(storage);
  const assetGeneration = createAssetGenerationService({ infra });
  const providerProfile = selectImageProviderProfile(ASSET_DEPLOYMENT, { requiresReferenceObjects:true });
  const authority = createFibreIdentityAuthority({
    civilRegistry:createWorldCivilRegistry(env),
    issuanceStore,
    registry,
    photoAdmissionStore:admissions,
    photoSource:createPhotoSource({ env, infra, registry, admissions, providerProfile }),
    photoExaminer,
    photoGeneration:{
      createJobFromIdentity:createAssetGenerationJobFromIdentity,
      request:(job) => assetGeneration.request(job),
    },
    photoGenerationProviderProfile:providerProfile,
  });
  const { issuerSigner, credentialProtector } = createFidCredentialCrypto(env);
  const executor = createFidCardIssuanceExecutor({
    authority,
    threadRegistry:createWorldThreadRegistry(env),
    registry,
    infra,
    issuerSigner,
    credentialProtector,
    loadTemplate:loadFidTemplate,
    async loadPhoto(objectRef) {
      const stored = await infra.objects.get(objectRef);
      if (stored === null) throw new Error(`FID photo ${objectRef} is missing from immutable object storage`);
      return decodePngRgba(stored.bytes);
    },
  });
  const fidService = createFidService({
    authority,
    registry,
    issuanceStore,
    photoAdmissionStore:admissions,
    issuanceExecutor:executor,
  });
  return Object.freeze({ infra, fidService, issuerSigner });
}

async function activePhoto(runtime, active) {
  const inspected = runtime.fidService.inspectThread(active.threadId);
  const credential = inspected.credentials.find((entry) => (
    entry.credential?.credentialId === active.credentialId
  )) ?? null;
  const admissionId = credential?.issuance?.photoAdmissionId ?? active.photoAdmissionId ?? null;
  if (admissionId === null) throw new Error(`active FID ${active.credentialId} has no admitted photo`);
  const admission = inspected.workflows
    .map((entry) => entry.photoAdmission)
    .find((entry) => entry?.admissionId === admissionId) ?? null;
  if (admission?.decision !== "accepted" || !admission.candidatePhotoRef) {
    throw new Error(`active FID ${active.credentialId} photo admission is unavailable`);
  }
  const stored = await runtime.infra.objects.head(admission.candidatePhotoRef);
  if (stored === null) throw new Error(`active FID ${active.credentialId} photo object is missing`);
  const metadata = stored.metadata ?? {};
  if (metadata.mediaType !== "image/png"
    || !Number.isSafeInteger(metadata.width)
    || !Number.isSafeInteger(metadata.height)) {
    throw new Error(`active FID ${active.credentialId} photo metadata is incomplete`);
  }
  return Object.freeze({
    objectRef:admission.candidatePhotoRef,
    digest:stored.digest,
    mediaType:metadata.mediaType,
    width:metadata.width,
    height:metadata.height,
    sourceReferences:refs([
      admission.admissionId,
      admission.canonicalVisualReferenceRef,
      admission.derivationReceiptRef,
    ]),
  });
}

export class FibreIdentityAuthorityDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.runtime = null;
    this.health = createCloudflareInfraDriver({
      stateScopes:{ [FID_SCOPE_ID]:ctx.storage },
      objectBucket:env.FID_OBJECTS,
    }).health;
  }

  runtimeForRequest() {
    this.runtime ??= createRuntime(this.ctx, this.env);
    return this.runtime;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET"
      && (url.pathname === "/internal/health/state" || url.pathname === "/internal/health/infra")) {
      const health = await this.health.check();
      return Response.json({
        ok:health.level === "normal",
        service:"fibre-identity-authority",
        provider:health.provider,
        stateScopeId:FID_SCOPE_ID,
        stateChecked:true,
        capabilities:["state","objects"],
        health,
      }, { status:health.level === "normal" ? 200 : 503 });
    }
    if (request.headers.get("x-fibre-private-token") !== privateToken(this.env)) {
      return Response.json({ error:{ code:"PRIVATE_TOKEN_REQUIRED" } }, { status:403 });
    }

    const runtime = this.runtimeForRequest();
    if (request.method === "POST" && url.pathname === VERIFY_ROUTE) {
      const side = url.searchParams.get("side");
      if (side !== "front" && side !== "back") {
        return Response.json({ error:{ code:"INVALID_FID_SIDE" } }, { status:400 });
      }
      const result = await verifyFidCardProof({
        pngBytes:new Uint8Array(await request.arrayBuffer()),
        issuerSigner:runtime.issuerSigner,
        expectedSide:side,
      });
      return Response.json(result);
    }

    if (request.method === "POST" && url.pathname === REISSUE_ROUTE) {
      let body;
      try { body = await request.json(); }
      catch { return Response.json({ error:{ code:"INVALID_JSON" } }, { status:400 }); }
      if (!body || typeof body !== "object" || Array.isArray(body)
        || Object.keys(body).sort().join(",") !== "idempotencyKey,threadId") {
        return Response.json({ error:{ code:"INVALID_REQUEST", detail:"FID reissue requires exactly threadId and idempotencyKey" } }, { status:400 });
      }
      try {
        const result = await runtime.fidService.cutFidCard({
          threadId:fibreId("threadId", body.threadId),
          idempotencyKey:fibreId("idempotencyKey", body.idempotencyKey),
        });
        const response = publicCut(result);
        return Response.json(response, { status:response.state === "active" ? 200 : 202 });
      } catch (error) {
        const status = error instanceof TypeError ? 400 : 503;
        return Response.json({ error:{ code:status === 400 ? "INVALID_FID_REISSUE" : "FID_REISSUE_FAILED", detail:error.message } }, { status });
      }
    }

    const activeMatch = ACTIVE_ROUTE.exec(url.pathname);
    if (request.method === "GET" && activeMatch !== null) {
      try {
        const active = runtime.fidService.getActivePresentation(fibreId("threadId", decodeURIComponent(activeMatch[1])));
        if (active === null) return Response.json({ error:{ code:"FID_NOT_ISSUED" } }, { status:404 });
        return Response.json({ active:Object.freeze({ ...active, photo:await activePhoto(runtime, active) }) });
      } catch (error) {
        return Response.json({ error:{ code:"FID_LOOKUP_FAILED", detail:error.message } }, { status:503 });
      }
    }
    return Response.json({ error:{ code:"NOT_FOUND" } }, { status:404 });
  }
}

export default createCloudflareDurableObjectServiceRouter({
  service:"fibre-identity-authority",
  bindingName:"FID_STATE",
  stateScopeId:FID_SCOPE_ID,
  health:{ capabilities:["state","objects"] },
});
