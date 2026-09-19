import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { createHttpContentCredentialSigner } from "#integrations/content-credentials/c2pa-http-signer.mjs";
import { createFidCredentialCrypto } from "#integrations/fid-credentials/webcrypto.mjs";
import {
  FidCardIssuanceStore,
  FidCardRegistry,
  FidPhotoAdmissionStore,
  createFibreIdentityAuthority,
  createFidCardIssuanceExecutor,
  createFidCardTemplateFromPngAssets,
  decodePngRgba,
  fidRenderPhotoDigest,
} from "#services/fibre-identity-authority/src/index.mjs";

const TEMPLATE_VERSION = "fid-card-template-v0.3-ocean";
const ASSET_ROOT = new URL("../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/", import.meta.url);
const OUTPUT_ROOT = resolve(".fibre/fid-local-test");

function syntheticPhoto() {
  const width = 320;
  const height = 400;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      rgba[i] = 210;
      rgba[i + 1] = 229;
      rgba[i + 2] = 231;
      rgba[i + 3] = 255;

      const head = ((x - 160) / 82) ** 2 + ((y - 144) / 102) ** 2 <= 1;
      const shoulders = ((x - 160) / 142) ** 2 + ((y - 374) / 116) ** 2 <= 1;
      const hair = ((x - 160) / 88) ** 2 + ((y - 116) / 84) ** 2 <= 1 && y < 126;
      const leftEye = ((x - 132) / 8) ** 2 + ((y - 150) / 4) ** 2 <= 1;
      const rightEye = ((x - 188) / 8) ** 2 + ((y - 150) / 4) ** 2 <= 1;

      if (shoulders) {
        rgba[i] = 35;
        rgba[i + 1] = 97;
        rgba[i + 2] = 111;
      }
      if (head) {
        rgba[i] = 212;
        rgba[i + 1] = 166;
        rgba[i + 2] = 132;
      }
      if (hair) {
        rgba[i] = 52;
        rgba[i + 1] = 43;
        rgba[i + 2] = 38;
      }
      if (leftEye || rightEye) {
        rgba[i] = 30;
        rgba[i + 1] = 28;
        rgba[i + 2] = 27;
      }
      if (y >= 194 && y <= 198 && x >= 138 && x <= 182) {
        rgba[i] = 137;
        rgba[i + 1] = 65;
        rgba[i + 2] = 65;
      }
    }
  }
  return Object.freeze({ width, height, rgba });
}

async function loadPhoto() {
  const path = process.env.FID_LOCAL_PHOTO?.trim();
  if (!path) return syntheticPhoto();
  return decodePngRgba(await readFile(resolve(path)));
}

async function loadTemplate() {
  const [layoutText, frontBasePng, frontForegroundPng, backBasePng, regularFont, mediumFont] = await Promise.all([
    readFile(new URL("layout.json", ASSET_ROOT), "utf8"),
    readFile(new URL("front-base.png", ASSET_ROOT)),
    readFile(new URL("front-foreground.png", ASSET_ROOT)),
    readFile(new URL("back-base.png", ASSET_ROOT)),
    readFile(new URL("NotoSans-SemiCondensed.ttf", ASSET_ROOT)),
    readFile(new URL("NotoSans-SemiCondensedMedium.ttf", ASSET_ROOT)),
  ]);
  return createFidCardTemplateFromPngAssets({
    version:TEMPLATE_VERSION,
    layout:JSON.parse(layoutText),
    frontBasePng,
    frontForegroundPng,
    backBasePng,
    fontAssets:{
      "NotoSans-SemiCondensed.ttf":regularFont,
      "NotoSans-SemiCondensedMedium.ttf":mediumFont,
    },
  });
}

async function contentCredentialSigner() {
  const baseUrl = process.env.C2PA_SIGNER_URL?.trim() || "http://127.0.0.1:8791";
  let health;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/healthz`);
    health = response.ok ? await response.json() : null;
  } catch {
    health = null;
  }
  if (health?.ok !== true || health?.service !== "content-credential-signer") {
    throw new Error(`local C2PA signer is not healthy at ${baseUrl}; run npm run content-credential-signer first`);
  }
  return createHttpContentCredentialSigner({
    baseUrl,
    signerId:process.env.C2PA_SIGNER_ID?.trim() || health.signerId || "fibre-c2pa-node-local-v1",
    trustPolicy:process.env.C2PA_TRUST_POLICY?.trim() || health.trustPolicy || "development_signature_only",
    authorizationToken:process.env.C2PA_SIGNER_TOKEN?.trim() || null,
  });
}

const THREAD_ID = process.env.FID_LOCAL_THREAD_ID?.trim() || "thr_local_ocean_fid";
const FIN = process.env.FID_LOCAL_FIN?.trim() || "8PKH-A4-VH5R";
const DISPLAY_NAME = process.env.FID_LOCAL_NAME?.trim() || "Mira Vale";
const BIRTH_DATE = process.env.FID_LOCAL_BIRTH_DATE?.trim() || "1996-03-18";
const tempRoot = await mkdtemp(join(tmpdir(), "fibre-fid-ocean-"));

const storage = {
  infraDriver:createSqliteStateInfraDriver({ scopes:{ fid:join(tempRoot, "fid.sqlite") } }),
  stateScopeId:"fid",
};
const registry = new FidCardRegistry(storage);
const issuanceStore = new FidCardIssuanceStore(storage);
const admissions = new FidPhotoAdmissionStore(storage);

try {
  const [photo, template, signer] = await Promise.all([
    loadPhoto(),
    loadTemplate(),
    contentCredentialSigner(),
  ]);
  const registration = buildFibreCivilRegistration({
    threadId:THREAD_ID,
    fibreIdentityNumber:FIN,
    registeredAt:"2026-09-19T12:00:00.000Z",
    birthEventRef:"evt_local_ocean_fid",
    worldRef:"world_local_ocean_fid",
  });
  const source = {
    role:"official_id_photo",
    threadId:THREAD_ID,
    candidatePhotoRef:"fid_photo_local_ocean",
    candidatePhotoDigest:fidRenderPhotoDigest(photo),
    canonicalVisualReferenceRef:"visual_local_ocean",
    canonicalVisualReferenceDigest:`sha256:${"b".repeat(64)}`,
    derivationReceiptRef:"receipt_local_ocean",
    sourceReferences:["visual_local_ocean"],
    targetAgeYears:30,
  };
  const inspection = {
    faceCount:1,
    faceVisible:true,
    occlusionAcceptable:true,
    cropCompliant:true,
    dimensionsCompliant:true,
    poseCompliant:true,
    framingCompliant:true,
    visualIdentityConsistent:true,
    ageConsistent:true,
  };
  let tick = 0;
  const now = () => new Date(Date.parse("2026-09-19T12:01:00.000Z") + tick++ * 1000).toISOString();
  const authority = createFibreIdentityAuthority({
    civilRegistry:{
      async lookupByThreadId(threadId) { return threadId === THREAD_ID ? registration : null; },
      async lookupByFin(fin) { return fin === FIN ? registration : null; },
    },
    issuanceStore,
    registry,
    photoAdmissionStore:admissions,
    photoSource:{ async resolveCandidate() { return source; } },
    photoExaminer:{ async inspect() { return inspection; } },
    now,
  });
  const infra = createMemoryInfraDriver();
  const { issuerSigner, credentialProtector } = createFidCredentialCrypto(process.env);
  const executor = createFidCardIssuanceExecutor({
    authority,
    threadRegistry:{
      async get(threadId) {
        return threadId === THREAD_ID
          ? { threadId:THREAD_ID, fibreIdentityNumber:FIN, displayName:DISPLAY_NAME, birthDate:BIRTH_DATE }
          : null;
      },
    },
    registry,
    infra,
    contentCredentialSigner:signer,
    issuerSigner,
    credentialProtector,
    loadPhoto:async () => photo,
    loadTemplate:async () => template,
    now,
  });

  const result = await executor.cut({
    threadId:THREAD_ID,
    idempotencyKey:"local_ocean_fid_card_1",
  });
  if (result.state !== "active") throw new Error(`local FID did not activate: ${result.state}`);
  if (result.issuance?.templateVersion !== TEMPLATE_VERSION) {
    throw new Error(`local FID used unexpected template ${String(result.issuance?.templateVersion)}`);
  }

  const [front, back] = await Promise.all([
    infra.objects.get(result.issuance.front.objectRef),
    infra.objects.get(result.issuance.back.objectRef),
  ]);
  if (front === null || back === null) throw new Error("local FID final card objects are missing");

  await mkdir(OUTPUT_ROOT, { recursive:true });
  await Promise.all([
    writeFile(join(OUTPUT_ROOT, "front.png"), front.bytes),
    writeFile(join(OUTPUT_ROOT, "back.png"), back.bytes),
    writeFile(join(OUTPUT_ROOT, "issuance.json"), JSON.stringify({
      threadId:THREAD_ID,
      fin:FIN,
      identitySnapshot:result.identitySnapshot,
      credential:result.credential,
      issuance:result.issuance,
    }, null, 2) + "\n"),
  ]);

  console.log("LOCAL OCEAN FIN CARD: OK");
  console.log(`template: ${TEMPLATE_VERSION}`);
  console.log(`credentialId: ${result.credential.credentialId}`);
  console.log(`front: ${join(OUTPUT_ROOT, "front.png")}`);
  console.log(`back: ${join(OUTPUT_ROOT, "back.png")}`);
  console.log(`issuance: ${join(OUTPUT_ROOT, "issuance.json")}`);
} finally {
  admissions.close();
  issuanceStore.close();
  registry.close();
  await rm(tempRoot, { recursive:true, force:true });
}
