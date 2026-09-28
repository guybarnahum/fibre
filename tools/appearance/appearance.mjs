import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { PHYSICAL_GENOME_VERSION } from "../../core/src/human-phenotype/index.mjs";
import { THREAD_REPAIR_CONTRACT } from "../../services/world-kernel/src/thread-genesis-repair-api.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_TIMEOUT_MS = 900_000;
const POLL_MS = 2_000;
const POLL_PROGRESS_MS = 10_000;

function progress(stage, detail = {}) {
  process.stderr.write(`${JSON.stringify({
    event:"appearance-progress",
    stage,
    ...detail,
  })}\n`);
}

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function options(argv) {
  const parsed = {
    threadId:null,
    diagnose:false,
    migrate:false,
    rerender:false,
    specFile:null,
    ancestryFile:null,
    reason:null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--thread-id=")) parsed.threadId = arg.slice("--thread-id=".length);
    else if (arg === "--diagnose") parsed.diagnose = true;
    else if (arg === "--migrate") parsed.migrate = true;
    else if (arg === "--rerender") parsed.rerender = true;
    else if (arg.startsWith("--spec-file=")) parsed.specFile = arg.slice("--spec-file=".length);
    else if (arg.startsWith("--physical-ancestry-file=")) parsed.ancestryFile = arg.slice("--physical-ancestry-file=".length);
    else if (arg.startsWith("--reason=")) parsed.reason = arg.slice("--reason=".length);
    else throw new TypeError(`unsupported appearance option ${arg}`);
  }

  const modes=[
    parsed.diagnose,
    parsed.migrate,
    parsed.rerender,
    parsed.specFile!==null,
  ].filter(Boolean).length;
  if(modes!==1){
    throw new TypeError("choose exactly one appearance operation: --diagnose, --migrate, --rerender, or --spec-file=<path>");
  }
  if(parsed.ancestryFile!==null&&!parsed.migrate){
    throw new TypeError("--physical-ancestry-file is only valid with --migrate");
  }

  return {
    threadId:required("--thread-id", parsed.threadId),
    diagnose:parsed.diagnose,
    migrate:parsed.migrate,
    rerender:parsed.rerender,
    specFile:parsed.specFile,
    ancestryFile:parsed.ancestryFile,
    reason:parsed.diagnose ? null : required("--reason", parsed.reason),
  };
}

function deployment() {
  const path = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json");
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record?.environment !== "staging") throw new Error("deployment evidence is not staging");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd:REPO_ROOT, encoding:"utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd:REPO_ROOT, encoding:"utf8" }).trim();
  if (status !== "") throw new Error("appearance operation requires a clean working tree");
  if (record.sourceTreeClean !== true || record.sourceGitSha !== head) {
    throw new Error(`staging deployment ${record.sourceGitSha ?? "unknown"} does not match current clean checkout ${head}`);
  }
  return record;
}

function serviceBase(record, serviceId) {
  const matches = (record.deployments ?? []).filter((entry) => entry?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return required(`${serviceId} baseUrl`, matches[0].baseUrl).replace(/\/$/u, "");
}

async function payload(response, label, accepted = [200]) {
  const body = await response.json().catch(() => null);
  if (!accepted.includes(response.status)) {
    throw new Error(`${label} failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  if (body === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return body;
}

async function poll(label, probe, ready, timeoutMs = DEFAULT_TIMEOUT_MS, heartbeat = null) {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let nextProgressAt = startedAt + POLL_PROGRESS_MS;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await probe();
    if (ready(latest)) return latest;
    const currentTime = Date.now();
    if (heartbeat !== null && currentTime >= nextProgressAt) {
      progress(heartbeat.stage, {
        elapsedSeconds:Math.floor((currentTime - startedAt) / 1_000),
        ...heartbeat.detail(latest),
      });
      nextProgressAt = currentTime + POLL_PROGRESS_MS;
    }
    await delay(POLL_MS);
  }
  throw new Error(`${label} did not converge within ${timeoutMs}ms; latest=${JSON.stringify(latest)}`);
}

async function observatory({ worldKernel, privateToken, threadId }) {
  const response = await fetch(
    `${worldKernel}/internal/threads/${encodeURIComponent(threadId)}/observatory`,
    { headers:{ Accept:"application/json", "x-fibre-private-token":privateToken } },
  );
  return payload(response, "World observatory");
}

async function repairDiagnosis({ worldKernel, privateToken, threadId }) {
  const response = await fetch(
    `${worldKernel}/internal/threads/${encodeURIComponent(threadId)}/repair`,
    { headers:{ Accept:"application/json", "x-fibre-private-token":privateToken } },
  );
  const body=await payload(response,"World repair diagnosis");
  if(body.contract!==THREAD_REPAIR_CONTRACT){
    throw new Error(
      `staging World Kernel repair contract is ${body.contract??"unknown"}; expected ${THREAD_REPAIR_CONTRACT}. Run: npm run cloud:deploy -- --env staging`,
    );
  }
  if(!body.diagnosis||typeof body.diagnosis!=="object"){
    throw new Error("World repair diagnosis response is missing diagnosis");
  }
  return body.diagnosis;
}

async function presentation({ threadPresentation, threadId }) {
  const response = await fetch(
    `${threadPresentation}/api/threads/${encodeURIComponent(threadId)}/snapshot`,
    { headers:{ Accept:"application/json" } },
  );
  return payload(response, "Thread Presentation snapshot");
}

function canonicalPortrait(observatoryBody) {
  const portraits = (observatoryBody?.observatory?.embodiments ?? []).filter((entry) => (
    entry?.kind === "portrait"
    && entry?.representationKind === "synthetic_generation"
    && entry?.visibility === "public"
  ));
  if (portraits.length !== 1) throw new Error(`expected one current canonical portrait, found ${portraits.length}`);
  return portraits[0];
}

function observedPhysicalGenomeVersion(observatoryBody) {
  return observatoryBody?.observatory?.thread?.genome?.physical?.version ?? null;
}

function diagnosisPhysicalFinding(diagnosis) {
  return (diagnosis?.findings ?? []).find((entry) => (
    entry.code === "PHYSICAL_GENOME"
    || entry.code === "PHYSICAL_APPEARANCE_MODEL_OUTDATED"
    || entry.code === "LEGACY_PHYSICAL_EMBODIMENT"
  )) ?? null;
}

function diagnosedPhysicalGenomeVersion(finding) {
  if (finding?.code === "PHYSICAL_GENOME") return finding.version ?? null;
  return finding?.currentVersion ?? null;
}

function assertPhysicalDiagnosisMatchesWorld(diagnosis, observatoryBody) {
  const finding = diagnosisPhysicalFinding(diagnosis);
  const observed = observedPhysicalGenomeVersion(observatoryBody);
  const diagnosed = diagnosedPhysicalGenomeVersion(finding);
  if (observed !== diagnosed) {
    throw new Error(
      `repair diagnosis physical version ${diagnosed ?? "none"} disagrees with World ${observed ?? "none"}; redeploy current World Kernel and retry`,
    );
  }
  if (observed !== null
    && observed !== PHYSICAL_GENOME_VERSION
    && finding?.code !== "PHYSICAL_APPEARANCE_MODEL_OUTDATED") {
    throw new Error(
      `World physical genome is ${observed} but repair diagnosis did not offer upgrade to ${PHYSICAL_GENOME_VERSION}`,
    );
  }
  return finding;
}

async function submitCanonical({
  worldKernel,
  privateToken,
  threadId,
  operationKey,
  specification,
  reason,
  rerender,
}) {
  const response = await fetch(
    `${worldKernel}/internal/threads/${encodeURIComponent(threadId)}/repair`,
    {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-fibre-private-token":privateToken,
      },
      body:JSON.stringify(rerender
        ? {
            action:"canonical_visual_identity_renewal",
            operationKey,
            reason,
          }
        : {
            action:"canonical_visual_identity",
            operationKey,
            correctedSpecification:specification,
            reason,
          }),
    },
  );
  return payload(response, rerender ? "appearance rerender" : "appearance correction");
}

async function submitAppearanceMigration({
  worldKernel,
  privateToken,
  threadId,
  migrationKey,
  physicalAncestry,
  reason,
}) {
  const response=await fetch(
    `${worldKernel}/internal/threads/${encodeURIComponent(threadId)}/repair`,
    {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-fibre-private-token":privateToken,
      },
      body:JSON.stringify({
        action:"migrate",
        migrationId:"physical_embodiment_v2",
        migrationKey,
        input:{
          ...(physicalAncestry===null?{}:{physicalAncestry}),
          reason,
        },
      }),
    },
  );
  return payload(response,"appearance migration");
}

async function main() {
  const { threadId, diagnose, migrate, rerender, specFile, ancestryFile, reason } = options(process.argv.slice(2));
  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const mode=diagnose?"diagnose":migrate?"migration":rerender?"rerender":"correction";

  progress("inspect_current_identity", { threadId, mode });
  const deployed = deployment();
  const worldKernel = serviceBase(deployed, "world-kernel");
  const threadPresentation = serviceBase(deployed, "thread-presentation");
  progress("verify_repair_contract", { expectedContract:THREAD_REPAIR_CONTRACT });
  const diagnosis=await repairDiagnosis({ worldKernel, privateToken, threadId });

  if(diagnose){
    const physical=(diagnosis.findings??[]).find((entry)=>(
      entry.code==="PHYSICAL_GENOME"
      || entry.code==="PHYSICAL_APPEARANCE_MODEL_OUTDATED"
      || entry.code==="LEGACY_PHYSICAL_EMBODIMENT"
    ))??null;
    const visual=(diagnosis.findings??[]).find((entry)=>(
      entry.code==="CANONICAL_VISUAL_SPEC"
      || entry.code==="CANONICAL_VISUAL_SPEC_MISSING"
      || entry.code==="GENESIS_VISUAL_SEED"
    ))??null;
    const embodiment=(diagnosis.findings??[]).find((entry)=>(
      entry.code==="CANONICAL_EMBODIMENT"
      || entry.code==="CANONICAL_EMBODIMENT_PENDING"
      || entry.code==="CANONICAL_EMBODIMENT_MISSING"
    ))??null;
    process.stdout.write(`${JSON.stringify({
      event:"appearance-diagnosis",
      threadId,
      health:diagnosis.health,
      physical,
      visual,
      embodiment,
    },null,2)}\n`);
    return;
  }

  const beforeObservatory=await observatory({ worldKernel, privateToken, threadId });
  const before=canonicalPortrait(beforeObservatory);
  const physicalAncestry=ancestryFile===null
    ? null
    : JSON.parse(readFileSync(resolve(process.cwd(),ancestryFile),"utf8"));
  const specification = rerender
    ? before.specification
    : migrate
      ? null
      : JSON.parse(readFileSync(resolve(process.cwd(), specFile), "utf8"));
  const migrationFinding=migrate
    ? (diagnosis.findings??[]).find((entry)=>entry.migration?.id==="physical_embodiment_v2")??null
    : null;
  if(migrate&&migrationFinding===null){
    throw new Error("appearance migration is not available for this Thread");
  }
  const operationKey = `appearance_${mode}_${createHash("sha256")
    .update(JSON.stringify({
      threadId,
      specification,
      physicalAncestry,
      targetVersion:migrationFinding?.targetVersion??null,
      ancestryEvidenceEventId:migrationFinding?.migration?.evidence?.eventId??null,
      reason,
    }))
    .digest("hex")
    .slice(0, 24)}`;
  const beforePresentation = await presentation({ threadPresentation, threadId });
  const previousFidCard = beforePresentation?.snapshot?.presentation?.identityCard ?? null;
  const previousFidCredentialId = previousFidCard?.credentialId ?? null;
  const previousFidCredentialVersion = previousFidCard?.credentialVersion ?? null;

  progress(migrate ? "submit_appearance_migration" : rerender ? "submit_appearance_rerender" : "submit_appearance_correction", {
    previousCanonicalReferenceObjectRef:before.asset?.referenceObjectRef ?? null,
    previousSpecificationDigest:before.specificationDigest ?? null,
    previousFidCredentialId,
  });
  const changed = migrate
    ? await submitAppearanceMigration({
        worldKernel,
        privateToken,
        threadId,
        migrationKey:operationKey,
        physicalAncestry,
        reason,
      })
    : await submitCanonical({
        worldKernel,
        privateToken,
        threadId,
        operationKey,
        specification,
        reason,
        rerender,
      });
  const result = migrate
    ? changed?.migration?.visualIdentityCorrection
    : rerender ? changed?.visualIdentityRenewal : changed?.visualIdentityCorrection;
  const pendingRevision = result?.embodiment?.revision;
  if (!Number.isSafeInteger(pendingRevision)) throw new Error("visual identity change did not return an Embodiment revision");
  if (rerender && result.embodiment.specificationDigest !== before.specificationDigest) {
    throw new Error("appearance rerender changed the authoritative visual specification");
  }
  if (migrate && result?.reused === true && result.embodiment.status === "available") {
    const canonicalReferenceObjectRef=result.embodiment.asset?.referenceObjectRef ?? null;
    if(typeof canonicalReferenceObjectRef!=="string"||canonicalReferenceObjectRef===""){
      throw new Error("reused appearance migration lacks an admitted canonical root");
    }
    const converged=await poll(
      "reused appearance projection",
      () => presentation({ threadPresentation, threadId }),
      (body) => {
        const card=body?.snapshot?.presentation?.identityCard ?? null;
        const projected=body?.snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0]===canonicalReferenceObjectRef;
        const photos=(body?.snapshot?.media?.assets??[]).filter((asset)=>(
          asset?.role==="official_id_photo"
          && asset?.status==="ready"
          && Array.isArray(asset?.sourceReferences)
          && asset.sourceReferences.includes(canonicalReferenceObjectRef)
        ));
        return projected&&card?.credentialId&&photos.length===1;
      },
      DEFAULT_TIMEOUT_MS,
      {
        stage:"await_reused_projection",
        detail:(body)=>({
          projected:body?.snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0]===canonicalReferenceObjectRef,
          fidCredentialId:body?.snapshot?.presentation?.identityCard?.credentialId ?? null,
        }),
      },
    );
    const credential=converged.snapshot.presentation.identityCard;
    process.stdout.write(`${JSON.stringify({
      event:"appearance-migration-complete",
      mode,
      reused:true,
      threadId,
      operationKey,
      specificationDigest:result.embodiment.specificationDigest,
      previousCanonicalReferenceObjectRef:before.asset?.referenceObjectRef ?? null,
      canonicalReferenceObjectRef,
      embodimentRevision:result.embodiment.revision,
      fidCredentialId:credential.credentialId,
      fidRevision:credential.revision,
    },null,2)}\n`);
    return;
  }

  progress("await_canonical_root", { pendingRevision });
  const admitted = await poll(
    migrate ? "migrated appearance root admission" : rerender ? "rerendered canonical root admission" : "corrected canonical root admission",
    () => observatory({ worldKernel, privateToken, threadId }),
    (body) => {
      const portrait = canonicalPortrait(body);
      return portrait.status === "available"
        && portrait.revision > pendingRevision
        && portrait.asset?.referenceObjectRef
        && portrait.asset.referenceObjectRef !== before.asset?.referenceObjectRef;
    },
    DEFAULT_TIMEOUT_MS,
    {
      stage:"await_canonical_root",
      detail:(body)=>{
        const portrait=canonicalPortrait(body);
        return { revision:portrait.revision, status:portrait.status };
      },
    },
  );
  const corrected = canonicalPortrait(admitted);
  const canonicalReferenceObjectRef = corrected.asset.referenceObjectRef;
  progress("canonical_root_admitted", {
    correctedEmbodimentRevision:corrected.revision,
    correctedCanonicalReferenceObjectRef:canonicalReferenceObjectRef,
  });

  progress("await_presentation_projection");
  await poll(
    migrate ? "migrated appearance projection" : rerender ? "rerendered appearance projection" : "corrected visual identity projection",
    () => presentation({ threadPresentation, threadId }),
    (body) => body?.snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0] === canonicalReferenceObjectRef,
    DEFAULT_TIMEOUT_MS,
    {
      stage:"await_presentation_projection",
      detail:(body)=>({
        projected:body?.snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0]===canonicalReferenceObjectRef,
      }),
    },
  );
  progress("presentation_projected", { correctedCanonicalReferenceObjectRef:canonicalReferenceObjectRef });

  progress("await_fin_card", { previousFidCredentialId });
  const correctedPresentation = await poll(
    migrate ? "automatic FID projection from migrated appearance root" : rerender ? "automatic FID projection from rerendered appearance root" : "automatic FID projection from corrected canonical root",
    () => presentation({ threadPresentation, threadId }),
    (body) => {
      const card = body?.snapshot?.presentation?.identityCard ?? null;
      const photos = (body?.snapshot?.media?.assets ?? []).filter((asset) => (
        asset?.role === "official_id_photo"
        && asset?.status === "ready"
        && Array.isArray(asset?.sourceReferences)
        && asset.sourceReferences.includes(canonicalReferenceObjectRef)
      ));
      return card?.credentialId
        && (previousFidCredentialId === null || card.credentialId !== previousFidCredentialId)
        && photos.length === 1;
    },
    DEFAULT_TIMEOUT_MS,
    {
      stage:"await_fin_card",
      detail:(body)=>({
        fidCredentialId:body?.snapshot?.presentation?.identityCard?.credentialId ?? null,
        officialIdPhotoReady:(body?.snapshot?.media?.assets ?? []).some((asset)=>(
          asset?.role==="official_id_photo"
          && asset?.status==="ready"
          && Array.isArray(asset?.sourceReferences)
          && asset.sourceReferences.includes(canonicalReferenceObjectRef)
        )),
      }),
    },
  );
  const credential = correctedPresentation.snapshot.presentation.identityCard;
  progress("fin_card_active", {
    fidCredentialId:credential.credentialId,
    fidRevision:credential.revision,
    fidSupersedesCredentialId:credential.supersedesCredentialId,
  });

  process.stdout.write(`${JSON.stringify({
    event:migrate ? "appearance-migration-complete" : rerender ? "appearance-rerender-complete" : "appearance-correction-complete",
    mode,
    threadId,
    operationKey,
    specificationDigest:corrected.specificationDigest,
    previousCanonicalReferenceObjectRef:before.asset?.referenceObjectRef ?? null,
    canonicalReferenceObjectRef,
    embodimentRevision:corrected.revision,
    previousFidCredentialId,
    previousFidCredentialVersion,
    fidCredentialId:credential.credentialId,
    fidRevision:credential.revision,
    fidSupersedesCredentialId:credential.supersedesCredentialId,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event:"appearance-failed",
    message:error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
});
