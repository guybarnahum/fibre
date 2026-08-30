import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createNodeServiceHandler } from "#infra/providers/local/service";
import {
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
} from "#services/asset-generator/src/index.mjs";
import { createGenesisPresentationWriteApi } from "#services/thread-presentation/src/http/genesis-write-api.mjs";
import { createPresentationReadApi } from "#services/thread-presentation/src/http/read-api.mjs";
import { threadPresentationChannelId } from "#services/thread-presentation/src/public-asset-resolver.mjs";
import {
  bindVerifiedCanonicalVisualIdentityProof,
  planCanonicalVisualIdentityGeneration,
} from "#services/world-kernel/src/canonical-visual-identity-generation.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "#services/world-kernel/src/embodiment-domain.mjs";
import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { createPresentationAssetCompletionService } from "#services/world-kernel/src/presentation-asset-completion-service.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetPublisher } from "#services/world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationEmbodimentRewriteService } from "#services/world-kernel/src/thread-presentation-embodiment-rewrite-service.mjs";
import { createThreadPresentationIdentityMediaRewriteService } from "#services/world-kernel/src/thread-presentation-identity-media-rewrite-service.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { attachTestCivilRegistration } from "#services/world-kernel/test/support/civil-registration-fixture.mjs";
import { createScriptedGuardianModelAdapter } from "#services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";
import {
  selectContentCredentialIntegration,
  selectImageIntegration,
  selectImageProviderProfile,
} from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { startWorldKernelFromEnvironment } from "./server.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8"),
);
const ASSET_DEPLOYMENT = resolveServiceDeployment(LOCAL_MANIFEST, "asset-generator");
const PRIVATE_TOKEN = "one-birth-visual-recovery-private-token";
const THREAD_ID = "thr_one_birth_visual_recovery_001";
const PRODUCTION_SIGNER_ID = "fibre-c2pa-production-v1";
const MANIFEST_DIGEST = `sha256:${"e".repeat(64)}`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const sha = (char) => `sha256:${char.repeat(64)}`;

function worldSpec() {
  return {
    worldSpecId: "world_one_birth_visual_recovery_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-30T18:34:00Z" },
    places: [{ placeId: "place_one_birth_visual_recovery", description: "A bounded ordinary city context." }],
    householdShape: "One ordinary household.",
    familyRelations: ["Household members share ordinary routines."],
    languages: ["English"],
    materialCircumstances: "Stable housing and ordinary public services.",
    mobilityPattern: "Walking and public transit.",
    schoolingOrCommunityContext: "Public schools and community institutions.",
    culturalContext: "Mixed neighborhood institutions.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books and ordinary discussion are available.",
    affordedRoles: ["caregiver", "peer", "teacher"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic one-birth visual-publication recovery fixture.",
      relocationWitness: "No source biography is used as Thread history.",
      familiarityProbe: null,
      createdAt: "2026-08-30T18:30:00Z",
    },
    createdAt: "2026-08-30T18:30:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 40 },
  });
  return {
    passA: surface("a"),
    passB: surface("c"),
    passC: surface("d"),
    recordRepair: surface("e"),
    policyVersion: "genesis-v1",
    eventStructurePoolDigest: sha("f"),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function birth() {
  const thread = structuredClone(mina);
  thread.threadId = THREAD_ID;
  thread.status = "active";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-30T18:31:00Z",
    createdBy: "fibre.genesis",
    lastEventId: `evt_seed_${THREAD_ID}`,
  };

  return attachTestCivilRegistration({
    manifest: {
      genesisId: `gen_${THREAD_ID}`,
      threadId: THREAD_ID,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-30T18:29:00Z",
        justification: "One-birth visual-publication recovery fixture.",
        policyRef: "entry-policy-v1",
      },
      worldSpecRef: worldSpec().worldSpecId,
      sourceBundleRefs: [],
      parentOrAncestorRefs: [],
      genomeRef: null,
      cognition: cognition(),
      publication: {
        status: "published",
        publishedAt: "2026-08-30T18:33:00Z",
        resultingThreadVersion: thread.version,
      },
      createdAt: "2026-08-30T18:30:30Z",
    },
    thread,
  });
}

function pendingEmbodiment(threadId) {
  const specification = {
    subject: {
      partyId: threadId,
      description: "A person with a softly angular oval face; medium warm-beige skin with ordinary visible texture; wide-set dark brown almond-shaped eyes; straight medium-width brows with a slightly higher left arch; a narrow straight nose with rounded tip; a defined cupid's bow and fuller lower lip; a tapered jaw and rounded chin; attached earlobes; thick dark-brown wavy hair with a subtly uneven natural hairline; and a small pale diagonal scar above the outer left eyebrow. These proportions, landmarks, asymmetries, and the scar remain stable identity cues across age transformations.",
    },
    method: "canonical synthetic portrait specification",
    description: "Preserve ordinary asymmetry and skin detail instead of idealizing the face. Build is lean-to-average with relaxed shoulders and a long neck. The normalized reference composition is head-and-shoulders, mostly frontal, both ears and hairline visible, neutral mouth and relaxed eyes, no eyewear or jewelry obscuring landmarks, even daylight-balanced illumination, and ordinary perspective without wide-angle distortion.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: [],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt: "2026-08-30T18:36:00Z",
  };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("test HTTP server did not bind a TCP address");
  return address;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function waitForPublicSnapshot(readApi, threadId, { timeoutMs = 3_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await readApi.fetch(new Request(`http://presentation.local/api/threads/${threadId}/snapshot`));
    if (response.status === 200) return response.json();
    assert.equal(response.status, 404);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`public Thread Presentation for ${threadId} was not projected before timeout`);
}

function jsonResponse(payload, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return headers[name.toLowerCase()] ?? headers[name] ?? null; } },
    async json() { return payload; },
  };
}

function binaryResponse(bytes, mediaType = "image/png") {
  const copied = bytes.slice();
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) { return name.toLowerCase() === "content-type" ? mediaType : null; },
    },
    async arrayBuffer() {
      return copied.buffer.slice(copied.byteOffset, copied.byteOffset + copied.byteLength);
    },
  };
}

function createOpenAiFixtureFetch(providerBytes) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "gpt-image-2-2026-04-21");
    assert.match(body.prompt, /single canonical visual-identity reference portrait/i);
    return jsonResponse({
      created: Date.parse("2026-08-30T18:37:00Z") / 1000,
      data: [{ b64_json: Buffer.from(providerBytes).toString("base64") }],
    }, 200, { "x-request-id": "openai_h_root_001" });
  };
  return { calls, fetchImpl };
}

function createBflFixtureFetch({ expectedReferenceBase64 }) {
  const calls = [];
  const providerBytes = encoder.encode("one-birth-derived-official-photo-provider-bytes");
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.input_image, expectedReferenceBase64);
      assert.equal(body.input_image_2, undefined);
      assert.match(body.prompt, /canonical reference image as the identity anchor/i);
      return jsonResponse({
        id: "bfl_h_reference_task",
        polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_h_reference_task",
      });
    }
    if (url.startsWith("https://api.bfl.ai/")) {
      return jsonResponse({
        status: "Ready",
        result: { sample: "https://delivery.eu.bfl.ai/h-reference.png" },
      });
    }
    if (url === "https://delivery.eu.bfl.ai/h-reference.png") {
      return binaryResponse(providerBytes);
    }
    throw new Error(`unexpected BFL fixture URL ${url}`);
  };
  return { calls, providerBytes, fetchImpl };
}

function createC2paFixtureFetch() {
  const calls = [];
  let embeddedAssertion = null;
  let sequence = 0;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    assert.equal(init.headers.Authorization, "Bearer one-birth-c2pa-token");
    const body = JSON.parse(init.body);
    if (url.endsWith("/embed")) {
      sequence += 1;
      embeddedAssertion = structuredClone(body.assertion);
      const raw = Buffer.from(body.bytesBase64, "base64");
      const credentialed = Buffer.concat([raw, Buffer.from(`--h-c2pa-${sequence}--`)]);
      return jsonResponse({
        bytesBase64: credentialed.toString("base64"),
        format: "c2pa",
        signerId: PRODUCTION_SIGNER_ID,
        manifestDigest: MANIFEST_DIGEST,
        embeddedAt: `2026-08-30T18:${37 + sequence}:00Z`,
      });
    }
    if (url.endsWith("/verify")) {
      assert.ok(embeddedAssertion, "C2PA verify must follow an embed in the H fixture");
      return jsonResponse({
        valid: true,
        format: "c2pa",
        signerId: PRODUCTION_SIGNER_ID,
        manifestDigest: MANIFEST_DIGEST,
        assertion: structuredClone(embeddedAssertion),
        verifiedAt: `2026-08-30T18:${38 + sequence}:00Z`,
        failureReason: null,
        trust: { policy: "c2pa_trust_list", trusted: true },
      });
    }
    throw new Error(`unexpected C2PA fixture URL ${url}`);
  };
  return { calls, fetchImpl };
}

function signerFromFixture(c2pa) {
  return selectContentCredentialIntegration(ASSET_DEPLOYMENT.integrations.contentCredentials, {
    environment: {
      C2PA_SIGNER_URL: "https://signer.example.test",
      C2PA_SIGNER_ID: PRODUCTION_SIGNER_ID,
      C2PA_TRUST_POLICY: "c2pa_trust_list",
      C2PA_SIGNER_TOKEN: "one-birth-c2pa-token",
    },
    fetchImpl: c2pa.fetchImpl,
  });
}

function worldEnvironment(databasePath, presentationPort) {
  return {
    FIBRE_WORLD_DATABASE: databasePath,
    FIBRE_WORLD_HOST: "127.0.0.1",
    FIBRE_WORLD_PORT: "0",
    FIBRE_PRIVATE_TOKEN: PRIVATE_TOKEN,
    FIBRE_THREAD_PRESENTATION_URL: `http://127.0.0.1:${presentationPort}`,
    FIBRE_PRESENTATION_RETRY_MS: "100",
  };
}

async function startWorld(databasePath, presentationPort) {
  return startWorldKernelFromEnvironment(
    worldEnvironment(databasePath, presentationPort),
    { guardianModelAdapter: createScriptedGuardianModelAdapter() },
  );
}

async function storedGenerationRecord(infra, objectRef) {
  const stored = await infra.objects.get(objectRef);
  assert.ok(stored, `generation record ${objectRef} must exist`);
  return JSON.parse(decoder.decode(stored.bytes));
}

test("one birth recovers through one canonical root and one public identity/photo publication", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-one-birth-visual-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  const presentationInfra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra: presentationInfra });
  const writeApi = createGenesisPresentationWriteApi({
    presentationServer,
    privateToken: PRIVATE_TOKEN,
  });
  const presentationHttp = createServer(createNodeServiceHandler({ service: writeApi }));
  const presentationAddress = await listen(presentationHttp);
  const readApi = createPresentationReadApi({
    infra: presentationInfra,
    presentationServer,
    openStream() { throw new Error("stream route is not part of the H recovery proof"); },
  });
  const channelId = threadPresentationChannelId(THREAD_ID);
  const c2pa = createC2paFixtureFetch();
  const signer = signerFromFixture(c2pa);
  let world = null;

  try {
    world = await startWorld(databasePath, presentationAddress.port);
    world.genesisStore.recordWorldSpec(worldSpec());
    const candidate = birth();
    const published = await world.birthPublisher.publishBirth(candidate);
    assert.equal(published.thread.threadId, THREAD_ID);

    const newborn = await waitForPublicSnapshot(readApi, THREAD_ID);
    const fin = newborn.snapshot.presentation.civilIdentity.fibreIdentityNumber;
    assert.equal(fin, candidate.manifest.publication.civilRegistration.fibreIdentityNumber);
    assert.equal(newborn.snapshot.presentation.visualIdentity, null);
    assert.equal(newborn.snapshot.presentation.identityCard, null);
    assert.deepEqual(newborn.snapshot.media.assets, []);

    const pending = world.embodimentStore.record(pendingEmbodiment(THREAD_ID));
    assert.equal(pending.revision, 1);
    assert.equal(pending.status, "pending_generation");
    assert.equal(pending.sourceReferences.length, 1, "World authority grounds synthetic identity to the durable origin event");

    const rootJob = planCanonicalVisualIdentityGeneration({
      embodiment: pending,
      requestedAt: "2026-08-30T18:36:10Z",
    });
    assert.deepEqual(rootJob.referenceObjectRefs, []);
    const rootProviderBytes = encoder.encode("one-birth-canonical-root-provider-bytes");
    const openai = createOpenAiFixtureFetch(rootProviderBytes);
    const rootProvider = selectImageIntegration(ASSET_DEPLOYMENT.integrations[rootJob.providerProfile], {
      environment: { OPENAI_API_KEY: "one-birth-openai-key" },
      fetchImpl: openai.fetchImpl,
    });
    const rootRuntime = createAssetGenerationRuntime({
      infra: presentationInfra,
      provider: rootProvider,
      credentialSigner: signer,
    });
    const rootGenerated = await rootRuntime.execute(rootJob);
    assert.equal(openai.calls.length, 1);
    const rootStored = await presentationInfra.objects.get(rootGenerated.receipt.objectRef);
    assert.ok(rootStored);
    const rootVerification = await signer.verify({
      bytes: rootStored.bytes,
      mediaType: rootGenerated.receipt.mediaType,
    });
    assert.equal(rootVerification.valid, true);
    const rootGenerationRecord = await storedGenerationRecord(
      presentationInfra,
      rootGenerated.generationRecordObjectRef,
    );
    const available = bindVerifiedCanonicalVisualIdentityProof({
      embodiment: pending,
      proof: {
        receipt: rootGenerated.receipt,
        generationRecord: rootGenerationRecord,
        verification: rootVerification,
      },
      recordedAt: rootGenerated.receipt.completedAt,
    });
    world.embodimentStore.record(available);
    const rootObjectRef = available.asset.referenceObjectRef;
    assert.equal(rootObjectRef, rootGenerated.receipt.objectRef);

    await world.close();
    world = null;

    world = await startWorld(databasePath, presentationAddress.port);
    const recoveredCivil = world.civilRegistryStore.getCivilRegistrationByThreadId(THREAD_ID);
    assert.equal(recoveredCivil.fibreIdentityNumber, fin);
    const recoveredEmbodiments = world.embodimentStore.listCurrent(THREAD_ID);
    assert.equal(recoveredEmbodiments.length, 1);
    assert.equal(recoveredEmbodiments[0].embodimentId, available.embodimentId);
    assert.equal(recoveredEmbodiments[0].revision, 2);
    assert.equal(recoveredEmbodiments[0].asset.referenceObjectRef, rootObjectRef);
    assert.equal(world.embodimentStore.history(THREAD_ID, available.embodimentId).length, 2);

    assert.throws(() => planCanonicalVisualIdentityGeneration({
      embodiment: recoveredEmbodiments[0],
      requestedAt: "2026-08-30T18:40:10Z",
    }), /pending_generation embodiment without an asset/);

    const visualRewrite = createThreadPresentationEmbodimentRewriteService({
      presentationServer,
      embodimentReader: world.embodimentStore,
    });
    const visual = await visualRewrite.project({
      channelId,
      embodimentId: available.embodimentId,
    });
    assert.equal(visual.rewritten, true);
    assert.deepEqual(visual.projection.referenceObjectRefs, [rootObjectRef]);

    const identityMedia = createThreadPresentationIdentityMediaRewriteService({ presentationServer });
    const issued = await identityMedia.ensureOfficialIdentityMedia({
      channelId,
      issuedAt: available.recordedAt,
    });
    assert.equal(issued.rewritten, true);
    const credentialId = issued.identityCard.credentialId;
    const officialMediaId = issued.identityCard.officialPhotoMediaRef;

    const current = await presentationServer.getSnapshot(channelId);
    const slots = planThreadPresentationAssetSlots({
      bundle: {
        presentation: current.snapshot.presentation,
        media: current.snapshot.media,
        provenance: current.snapshot.provenance,
      },
      snapshotObjectRef: current.pointer.objectRef,
      snapshotDigest: current.pointer.snapshotDigest,
    });
    const official = slots.slots.find((slot) => slot.mediaId === officialMediaId);
    assert.ok(official);
    assert.equal(official.status, "missing");
    assert.deepEqual(official.referenceObjectRefs, [rootObjectRef]);

    const providerProfile = selectImageProviderProfile(ASSET_DEPLOYMENT, {
      requiresReferenceObjects: true,
    });
    assert.equal(providerProfile, "bfl-flux-2-pro-v1");
    const demandService = createPresentationAssetDemandService({ infra: presentationInfra });
    const demand = await demandService.reconcile({
      scope: { entityKind: "thread", entityRef: THREAD_ID },
      slots: [official],
      requestedAt: "2026-08-30T18:42:00Z",
      providerProfile,
    });
    assert.equal(demand.reconciliation.jobs.length, 1);
    const [photoJob] = demand.reconciliation.jobs;
    assert.deepEqual(photoJob.referenceObjectRefs, [rootObjectRef]);

    const bfl = createBflFixtureFetch({
      expectedReferenceBase64: Buffer.from(rootStored.bytes).toString("base64"),
    });
    const photoProvider = selectImageIntegration(ASSET_DEPLOYMENT.integrations[providerProfile], {
      environment: { BFL_API_KEY: "one-birth-bfl-key" },
      fetchImpl: bfl.fetchImpl,
    });
    const photoRuntime = createAssetGenerationRuntime({
      infra: presentationInfra,
      provider: photoProvider,
      credentialSigner: signer,
    });
    const generatedPhoto = await photoRuntime.execute(photoJob);
    assert.equal(bfl.calls.filter((call) => call.init.method === "POST").length, 1);

    const publisher = createThreadPresentationAssetPublisher({
      infra: presentationInfra,
      credentialSigner: signer,
      presentationServer,
    });
    const completions = createPresentationAssetCompletionService({
      infra: presentationInfra,
      credentialSigner: signer,
      async publishReady({ scope, receipt }) {
        assert.deepEqual(scope, { entityKind: "thread", entityRef: THREAD_ID });
        return publisher.publishReady({ receipt, channelId });
      },
    });
    const completion = createAssetGenerationCompletion({
      jobId: generatedPhoto.receipt.jobId,
      receiptObjectRef: generatedPhoto.receiptObjectRef,
      receiptDigest: generatedPhoto.receiptDigest,
    });
    const accepted = await completions.consume(completion);
    assert.equal(accepted.handled, true);
    assert.equal(accepted.duplicate, false);
    assert.equal(accepted.proof.verification.valid, true);
    assert.equal(accepted.publication.event.kind, "media.ready");
    assert.equal(accepted.publication.event.payload.mediaId, officialMediaId);

    const publicSnapshotResponse = await readApi.fetch(
      new Request(`http://presentation.local/api/threads/${THREAD_ID}/snapshot`),
    );
    assert.equal(publicSnapshotResponse.status, 200);
    const publicSnapshot = await publicSnapshotResponse.json();
    assert.equal(publicSnapshot.snapshot.presentation.civilIdentity.fibreIdentityNumber, fin);
    assert.deepEqual(publicSnapshot.snapshot.presentation.visualIdentity.referenceObjectRefs, [rootObjectRef]);
    assert.equal(publicSnapshot.snapshot.presentation.identityCard.credentialId, credentialId);
    assert.equal(publicSnapshot.snapshot.presentation.identityCard.officialPhotoMediaRef, officialMediaId);
    assert.equal(
      publicSnapshot.snapshot.media.assets.filter((asset) => asset.role === "official_id_photo").length,
      1,
    );

    const eventsResponse = await readApi.fetch(
      new Request(`http://presentation.local/api/threads/${THREAD_ID}/events?after=${publicSnapshot.snapshot.cursor}&limit=100`),
    );
    assert.equal(eventsResponse.status, 200);
    const eventBody = await eventsResponse.json();
    const readyEvents = eventBody.events.filter((event) =>
      event.kind === "media.ready" && event.payload.mediaId === officialMediaId);
    assert.equal(readyEvents.length, 1);
    assert.equal(readyEvents[0].payload.objectRef, generatedPhoto.receipt.objectRef);

    const assetResponse = await readApi.fetch(
      new Request(`http://presentation.local/api/assets/${generatedPhoto.receipt.objectRef}`),
    );
    assert.equal(assetResponse.status, 200);
    assert.equal(assetResponse.headers.get("content-type"), generatedPhoto.receipt.mediaType);
    const publicAssetBytes = new Uint8Array(await assetResponse.arrayBuffer());
    const storedPublicAsset = await presentationInfra.objects.get(generatedPhoto.receipt.objectRef);
    assert.deepEqual(publicAssetBytes, storedPublicAsset.bytes);

    const visualReplay = await visualRewrite.project({
      channelId,
      embodimentId: available.embodimentId,
    });
    assert.equal(visualReplay.rewritten, false);
    assert.equal(visualReplay.reused, true);
    const identityReplay = await identityMedia.ensureOfficialIdentityMedia({
      channelId,
      issuedAt: "2026-08-30T18:50:00Z",
    });
    assert.equal(identityReplay.rewritten, false);
    assert.equal(identityReplay.reused, true);
    assert.equal(identityReplay.identityCard.credentialId, credentialId);
    assert.equal(identityReplay.officialPhoto.mediaId, officialMediaId);

    const duplicate = await completions.consume(completion);
    assert.equal(duplicate.handled, true);
    assert.equal(duplicate.duplicate, true);
    const eventsAfterReplay = await presentationServer.readEvents({
      channelId,
      after: 0,
      limit: 100,
    });
    assert.equal(
      eventsAfterReplay.filter((event) =>
        event.kind === "media.ready" && event.payload.mediaId === officialMediaId).length,
      1,
    );
    assert.equal(openai.calls.length, 1, "recovery must not create a second canonical root generation");
    assert.equal(
      bfl.calls.filter((call) => call.init.method === "POST").length,
      1,
      "replay must not create a second official-photo provider operation",
    );
    assert.equal(world.civilRegistryStore.getCivilRegistrationByThreadId(THREAD_ID).fibreIdentityNumber, fin);
    assert.equal(world.embodimentStore.listCurrent(THREAD_ID).length, 1);
    assert.equal(world.embodimentStore.listCurrent(THREAD_ID)[0].asset.referenceObjectRef, rootObjectRef);
  } finally {
    await world?.close();
    await close(presentationHttp);
    rmSync(directory, { recursive: true, force: true });
  }
});
