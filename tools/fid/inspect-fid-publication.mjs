import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function args(argv) {
  const values = {};
  for (const option of argv) {
    const match = /^--(thread-id|previous-photo-ref)=(.+)$/u.exec(option);
    if (!match || values[match[1]]) throw new TypeError(`unknown or repeated option: ${option}`);
    values[match[1]] = match[2];
  }
  return {
    threadId:required("--thread-id", values["thread-id"]),
    previousPhotoRef:required("--previous-photo-ref", values["previous-photo-ref"]),
  };
}

function serviceBase(deployment, serviceId) {
  const matches = (deployment.deployments ?? []).filter((item) => item.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`expected exactly one deployed ${serviceId}`);
  return required(`${serviceId} baseUrl`, matches[0].baseUrl).replace(/\/$/u, "");
}

async function getJson(baseUrl, path, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers:{
      Accept:"application/json",
      ...(token ? { "x-fibre-private-token":token } : {}),
    },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(json?.error ?? null)}`);
  return json;
}

export function inspectFidPublication({ world, worldIdentity, authority, publicSnapshot, previousPhotoRef }) {
  const obs = world?.observatory;
  const active = authority?.active;
  const snapshot = publicSnapshot?.snapshot;
  const presented = snapshot?.presentation;
  const card = presented?.identityCard;
  const assets = snapshot?.media?.assets ?? [];
  const canonical = (obs?.embodiments ?? []).find((entry) =>
    entry.kind === "portrait" && entry.status === "available"
    && entry.visibility === "public" && entry.asset?.referenceObjectRef
  );
  const canonicalRef = canonical?.asset?.referenceObjectRef ?? null;
  const photo = (assets ?? []).filter((asset) => asset.role === "official_id_photo" && asset.status === "ready");
  const cardAsset = (role) => (assets ?? []).find((asset) => asset.mediaId === card?.[`${role}MediaRef`]
    && asset.role === `fibre_identity_card_${role}` && asset.status === "ready");
  const front = cardAsset("front");
  const back = cardAsset("back");
  const matches = (published, authoritative) => Boolean(published && authoritative
    && published.locator === authoritative.objectRef
    && published.sha256 === authoritative.digest);

  const checks = {
    worldCanonicalPresent:canonicalRef !== null,
    stagingCanonicalDigestProjected:worldIdentity?.contract === "fibre-world-thread-identity-v0.3"
      && worldIdentity.identity?.threadId === active?.threadId
      && worldIdentity.identity?.embodiments?.some((entry) =>
        entry.asset?.referenceObjectRef === canonicalRef
        && typeof entry.asset?.sha256 === "string" && entry.asset.sha256 === canonical?.asset?.sha256) === true,
    presentationCanonicalCurrent:canonicalRef !== null
      && presented?.visualIdentity?.referenceObjectRefs?.length === 1
      && presented.visualIdentity.referenceObjectRefs[0] === canonicalRef,
    fidVerifiedAndSuperseding:active?.proofStatus === "verified" && active.status === "active"
      && Number.isSafeInteger(active.revision) && active.revision > 1
      && typeof active.supersedesCredentialId === "string" && active.supersedesCredentialId !== "",
    newPhotoReplacesPrior:!!active?.photo?.objectRef && active.photo.objectRef !== previousPhotoRef,
    fidPhotoTracesCanonical:canonicalRef !== null && active?.photo?.sourceReferences?.includes(canonicalRef) === true,
    publishedCredentialCurrent:!!card && card.status === "active" && card.credentialId === active?.credentialId
      && card.revision === active?.revision && card.supersedesCredentialId === active?.supersedesCredentialId
      && card.registrationId === active?.registrationId,
    publishedPhotoCurrent:photo.length === 1 && matches(photo[0], active?.photo)
      && photo[0].sourceReferences?.includes(canonicalRef) === true,
    publishedCardSidesCurrent:matches(front, active?.front) && matches(back, active?.back),
  };
  return {
    threadId:active?.threadId ?? null,
    fin:presented?.civilIdentity?.fibreIdentityNumber ?? null,
    canonicalRef,
    priorPhotoRef:previousPhotoRef,
    activePhotoRef:active?.photo?.objectRef ?? null,
    credentialId:active?.credentialId ?? null,
    revision:active?.revision ?? null,
    supersedesCredentialId:active?.supersedesCredentialId ?? null,
    publishedCredentialId:card?.credentialId ?? null,
    checks,
    passed:Object.values(checks).every((pass) => pass === true),
  };
}

async function main() {
  const { threadId, previousPhotoRef } = args(process.argv.slice(2));
  const deployment = JSON.parse(readFileSync(resolve(root, ".fibre/cloudflare/staging/deployment.json"), "utf8"));
  if (deployment.environment !== "staging") throw new Error("deployment evidence is not staging");
  const token = required("FIBRE_PRIVATE_TOKEN", process.env.FIBRE_PRIVATE_TOKEN);
  const id = encodeURIComponent(threadId);
  const [world, worldIdentity, authority, publicSnapshot] = await Promise.all([
    getJson(serviceBase(deployment,"world-kernel"), `/internal/threads/${id}/observatory`, token),
    getJson(serviceBase(deployment,"world-kernel"), `/internal/threads/${id}/identity`, token),
    getJson(serviceBase(deployment,"fibre-identity-authority"), `/internal/fid/threads/${id}/active`, token),
    getJson(serviceBase(deployment,"thread-presentation"), `/api/threads/${id}/snapshot`),
  ]);
  const inspection = inspectFidPublication({ world, worldIdentity, authority, publicSnapshot, previousPhotoRef });
  inspection.checks.threadBinding = inspection.threadId === threadId
    && publicSnapshot?.snapshot?.presentation?.manifest?.threadId === threadId;
  inspection.passed = Object.values(inspection.checks).every((pass) => pass === true);
  console.log(JSON.stringify(inspection, null, 2));
  if (!inspection.passed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FID publication inspection failed: ${error.message}`);
    process.exitCode = 1;
  });
}
