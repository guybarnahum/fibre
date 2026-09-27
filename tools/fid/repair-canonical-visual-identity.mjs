import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_TIMEOUT_MS = 900_000;
const POLL_MS = 2_000;
const EXPECTED_REPAIR_CONTRACT = "fibre-thread-repair-v0.9";

function progress(stage, detail = {}) {
  process.stderr.write(`${JSON.stringify({
    event:"canonical-visual-identity-repair-progress",
    stage,
    ...detail,
  })}\n`);
}

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function options(argv) {
  const parsed = { threadId:null, specFile:null, renewCurrent:false, ancestryFile:null, reason:null };
  for (const arg of argv) {
    if (arg.startsWith("--thread-id=")) parsed.threadId = arg.slice("--thread-id=".length);
    else if (arg.startsWith("--spec-file=")) parsed.specFile = arg.slice("--spec-file=".length);
    else if (arg === "--renew-current") parsed.renewCurrent = true;
    else if (arg.startsWith("--legacy-physical-ancestry-file=")) parsed.ancestryFile = arg.slice("--legacy-physical-ancestry-file=".length);
    else if (arg.startsWith("--reason=")) parsed.reason = arg.slice("--reason=".length);
    else throw new TypeError(`unsupported visual repair option ${arg}`);
  }
  const modes=[parsed.renewCurrent,parsed.specFile!==null,parsed.ancestryFile!==null].filter(Boolean).length;
  if(modes!==1)throw new TypeError("choose exactly one of --spec-file=<path>, --renew-current, or --legacy-physical-ancestry-file=<path>");
  return {
    threadId:required("--thread-id", parsed.threadId),
    specFile:parsed.specFile,
    renewCurrent:parsed.renewCurrent,
    ancestryFile:parsed.ancestryFile,
    reason:required("--reason", parsed.reason),
  };
}

function deployment() {
  const path = resolve(REPO_ROOT, ".fibre", "cloudflare", "staging", "deployment.json");
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record?.environment !== "staging") throw new Error("deployment evidence is not staging");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd:REPO_ROOT, encoding:"utf8" }).trim();
  if (record.sourceGitSha !== head) {
    throw new Error(`staging deployment ${record.sourceGitSha} does not match current checkout ${head}`);
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

async function poll(label, probe, ready, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await probe();
    if (ready(latest)) return latest;
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
  if(body.contract!==EXPECTED_REPAIR_CONTRACT){
    throw new Error(
      `staging World Kernel repair contract is ${body.contract??"unknown"}; expected ${EXPECTED_REPAIR_CONTRACT}. Deploy world-kernel from the current checkout before changing canonical visual identity.`,
    );
  }
  return body;
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

async function submitCanonical({
  worldKernel,
  privateToken,
  threadId,
  operationKey,
  specification,
  reason,
  renewCurrent,
}) {
  const response = await fetch(
    `${worldKernel}/internal/threads/${encodeURIComponent(threadId)}/repair`,
    {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-fibre-private-token":privateToken,
      },
      body:JSON.stringify(renewCurrent
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
  return payload(response, renewCurrent ? "canonical visual identity renewal" : "canonical visual identity repair");
}

async function submitLegacyPhysicalMigration({
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
        migrationId:"legacy_physical_embodiment_v1",
        migrationKey,
        input:{physicalAncestry,reason},
      }),
    },
  );
  return payload(response,"legacy physical embodiment migration");
}

async function main() {
  const { threadId, specFile, renewCurrent, ancestryFile, reason } = options(process.argv.slice(2));
  const privateToken = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);

  const legacyMigration=ancestryFile!==null;
  const mode=legacyMigration?"legacy_physical_embodiment_migration":renewCurrent?"renewal":"correction";
  progress("inspect_current_identity", { threadId, mode });
  const deployed = deployment();
  const worldKernel = serviceBase(deployed, "world-kernel");
  const threadPresentation = serviceBase(deployed, "thread-presentation");
  progress("verify_repair_contract", { expectedContract:EXPECTED_REPAIR_CONTRACT });
  await repairDiagnosis({ worldKernel, privateToken, threadId });
  const beforeObservatory=await observatory({ worldKernel, privateToken, threadId });
  const before=canonicalPortrait(beforeObservatory);
  const physicalAncestry=legacyMigration
    ? JSON.parse(readFileSync(resolve(process.cwd(),ancestryFile),"utf8"))
    : null;
  if(legacyMigration&&beforeObservatory?.observatory?.thread?.genome?.physical!==undefined){
    throw new Error("legacy physical embodiment migration requires a Thread without an authoritative physical genome");
  }
  const specification = renewCurrent
    ? before.specification
    : legacyMigration
      ? null
      : JSON.parse(readFileSync(resolve(process.cwd(), specFile), "utf8"));
  const operationKey = `${legacyMigration?"legacy_physical_embodiment":`visual_identity_${renewCurrent ? "renew" : "repair"}`}_${createHash("sha256")
    .update(JSON.stringify({ threadId, specification, physicalAncestry, reason }))
    .digest("hex")
    .slice(0, 24)}`;
  const beforePresentation = await presentation({ threadPresentation, threadId });
  const previousFidCard = beforePresentation?.snapshot?.presentation?.identityCard ?? null;
  const previousFidCredentialId = previousFidCard?.credentialId ?? null;
  const previousFidCredentialVersion = previousFidCard?.credentialVersion ?? null;

  progress(legacyMigration ? "submit_legacy_physical_embodiment_migration" : renewCurrent ? "submit_canonical_renewal" : "submit_canonical_correction", {
    previousCanonicalReferenceObjectRef:before.asset?.referenceObjectRef ?? null,
    previousSpecificationDigest:before.specificationDigest ?? null,
    previousFidCredentialId,
  });
  const changed = legacyMigration
    ? await submitLegacyPhysicalMigration({
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
        renewCurrent,
      });
  const result = legacyMigration
    ? changed?.migration?.visualIdentityCorrection
    : renewCurrent ? changed?.visualIdentityRenewal : changed?.visualIdentityCorrection;
  const pendingRevision = result?.embodiment?.revision;
  if (!Number.isSafeInteger(pendingRevision)) throw new Error("visual identity change did not return an Embodiment revision");
  if (renewCurrent && result.embodiment.specificationDigest !== before.specificationDigest) {
    throw new Error("canonical renewal changed the authoritative visual specification");
  }
  if (legacyMigration && result?.reused === true && result.embodiment.status === "available") {
    const canonicalReferenceObjectRef=result.embodiment.asset?.referenceObjectRef ?? null;
    if(typeof canonicalReferenceObjectRef!=="string"||canonicalReferenceObjectRef===""){
      throw new Error("reused legacy embodiment migration lacks an admitted canonical root");
    }
    const converged=await poll(
      "reused legacy physical embodiment projection",
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
    );
    const credential=converged.snapshot.presentation.identityCard;
    process.stdout.write(`${JSON.stringify({
      event:"legacy-physical-embodiment-migration-complete",
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
    legacyMigration ? "migrated canonical root admission" : renewCurrent ? "renewed canonical root admission" : "corrected canonical root admission",
    () => observatory({ worldKernel, privateToken, threadId }),
    (body) => {
      const portrait = canonicalPortrait(body);
      return portrait.status === "available"
        && portrait.revision > pendingRevision
        && portrait.asset?.referenceObjectRef
        && portrait.asset.referenceObjectRef !== before.asset?.referenceObjectRef;
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
    legacyMigration ? "migrated visual identity projection" : renewCurrent ? "renewed visual identity projection" : "corrected visual identity projection",
    () => presentation({ threadPresentation, threadId }),
    (body) => body?.snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0] === canonicalReferenceObjectRef,
  );
  progress("presentation_projected", { correctedCanonicalReferenceObjectRef:canonicalReferenceObjectRef });

  progress("await_fin_card", { previousFidCredentialId });
  const correctedPresentation = await poll(
    legacyMigration ? "automatic FID projection from migrated canonical root" : renewCurrent ? "automatic FID projection from renewed canonical root" : "automatic FID projection from corrected canonical root",
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
  );
  const credential = correctedPresentation.snapshot.presentation.identityCard;
  progress("fin_card_active", {
    fidCredentialId:credential.credentialId,
    fidRevision:credential.revision,
    fidSupersedesCredentialId:credential.supersedesCredentialId,
  });

  process.stdout.write(`${JSON.stringify({
    event:legacyMigration ? "legacy-physical-embodiment-migration-complete" : renewCurrent ? "canonical-visual-identity-renewal-complete" : "canonical-visual-identity-repair-complete",
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
    event:"canonical-visual-identity-repair-failed",
    message:error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
});
