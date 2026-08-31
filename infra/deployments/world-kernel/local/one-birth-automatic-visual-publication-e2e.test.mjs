import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createNodeServiceHandler } from "#infra/providers/local/service";
import { createGenesisPresentationWriteApi } from "#services/thread-presentation/src/http/genesis-write-api.mjs";
import { createPresentationReadApi } from "#services/thread-presentation/src/http/read-api.mjs";
import { threadPresentationChannelId } from "#services/thread-presentation/src/public-asset-resolver.mjs";
import {
  GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
  attachGenesisCanonicalVisualIdentity,
} from "#services/world-kernel/src/genesis-canonical-visual-identity.mjs";
import { publicationValidatorSetWitness } from "#services/world-kernel/src/genesis-domain.mjs";
import { createPresentationAssetCompletionService } from "#services/world-kernel/src/presentation-asset-completion-service.mjs";
import { createThreadPresentationAssetPublisher } from "#services/world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { attachTestCivilRegistration } from "#services/world-kernel/test/support/civil-registration-fixture.mjs";
import { createScriptedGuardianModelAdapter } from "#services/world-kernel/test/support/scripted-guardian-model-adapter.mjs";
import { createLocalAssetGenerationWorker } from "../../asset-generator/local/worker-harness.mjs";
import {
  selectContentCredentialIntegration,
  selectImageIntegration,
  selectImageProviderProfile,
} from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";
import { createCanonicalVisualRootBoundary } from "./canonical-visual-root-boundary.mjs";
import { createThreadPresentationVisualBoundary } from "./thread-presentation-visual-boundary.mjs";
import { startWorldKernelVisualPublicationFromEnvironment } from "./visual-server.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8"),
);
const ASSET_DEPLOYMENT = resolveServiceDeployment(LOCAL_MANIFEST, "asset-generator");
const PRIVATE_TOKEN = "slice-a-automatic-visual-private-token";
const THREAD_ID = "thr_slice_a_automatic_visual_001";
const PRODUCTION_SIGNER_ID = "fibre-c2pa-production-v1";
const MANIFEST_DIGEST = `sha256:${"e".repeat(64)}`;
const encoder = new TextEncoder();
const sha = (char) => `sha256:${char.repeat(64)}`;

const CANONICAL_VISUAL_IDENTITY = Object.freeze({
  policyRef: GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
  specification: Object.freeze({
    subject: Object.freeze({
      partyId: THREAD_ID,
      description: "A person with a softly angular oval face; medium warm-beige skin with ordinary visible texture; wide-set dark brown almond-shaped eyes; straight medium-width brows with a slightly higher left arch; a narrow straight nose with rounded tip; a defined cupid's bow and fuller lower lip; a tapered jaw and rounded chin; attached earlobes; thick dark-brown wavy hair with a subtly uneven natural hairline; and a small pale diagonal scar above the outer left eyebrow. These proportions, landmarks, asymmetries, and the scar remain stable identity cues across age transformations.",
    }),
    method: "canonical synthetic portrait specification",
    description: "Preserve ordinary asymmetry and skin detail instead of idealizing the face. Build is lean-to-average with relaxed shoulders and a long neck. The normalized reference composition is head-and-shoulders, mostly frontal, both ears and hairline visible, neutral mouth and relaxed eyes, no eyewear or jewelry obscuring landmarks, even daylight-balanced illumination, and ordinary perspective without wide-angle distortion.",
    model: "replaceable-renderer",
  }),
});

function worldSpec() {
  return {
    worldSpecId: "world_slice_a_automatic_visual_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-30T18:34:00Z" },
    places: [{ placeId: "place_slice_a_automatic_visual", description: "A bounded ordinary city context." }],
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
      abstractionMethod: "Synthetic Slice-A automatic visual-publication fixture.",
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
  const visualBundle = attachGenesisCanonicalVisualIdentity({
    manifest: {
      genesisId: `gen_${THREAD_ID}`,
      threadId: THREAD_ID,
      originMode: "de_novo",
      entry: {
        stage: "young_adult",
        ageAtEntry: 22,
        chronologyEndsAt: "2026-08-30T18:29:00Z",
        justification: "Slice-A automatic visual-publication fixture.",
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
  }, CANONICAL_VISUAL_IDENTITY);
  return attachTestCivilRegistration(visualBundle);
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
    headers: { get(name) { return name.toLowerCase() === "content-type" ? mediaType : null; } },
    async arrayBuffer() {
      return copied.buffer.slice(copied.byteOffset, copied.byteOffset + copied.byteLength);
    },
  };
}

function createRetryingOpenAiFixtureFetch(providerBytes) {
  const calls = [];
  let failed = false;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.equal(body.model, "gpt-image-2-2026-04-21");
    assert.match(body.prompt, /single canonical visual-identity reference portrait/i);
    if (!failed) {
      failed = true;
      return jsonResponse({ error: { message: "temporary fixture outage" } }, 503, {
        "x-request-id": "openai_slice_a_retry_001",
        "retry-after": "0",
      });
    }
    return jsonResponse({
      created: Date.parse("2026-08-30T18:37:00Z") / 1000,
      data: [{ b64_json: Buffer.from(providerBytes).toString("base64") }],
    }, 200, { "x-request-id": "openai_slice_a_root_001" });
  };
  return { calls, fetchImpl };
}

function createBflFixtureFetch({ expectedReferenceBase64 }) {
  const calls = [];
  const providerBytes = encoder.encode("slice-a-derived-official-photo-provider-bytes");
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.input_image, expectedReferenceBase64);
      assert.equal(body.input_image_2, undefined);
      assert.match(body.prompt, /canonical reference image as the identity anchor/i);
      return jsonResponse({
        id: "bfl_slice_a_reference_task",
        polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_slice_a_reference_task",
      });
    }
    if (url.startsWith("https://api.bfl.ai/")) {
      return jsonResponse({
        status: "Ready",
        result: { sample: "https://delivery.eu.bfl.ai/slice-a-reference.png" },
      });
    }
    if (url === "https://delivery.eu.bfl.ai/slice-a-reference.png") return binaryResponse(providerBytes);
    throw new Error(`unexpected BFL fixture URL ${url}`);
  };
  return { calls, fetchImpl };
}

function createC2paFixtureFetch() {
  let embeddedAssertion = null;
  let sequence = 0;
  const fetchImpl = async (url, init = {}) => {
    assert.equal(init.headers.Authorization, "Bearer slice-a-c2pa-token");
    const body = JSON.parse(init.body);
    if (url.endsWith("/embed")) {
      sequence += 1;
      embeddedAssertion = structuredClone(body.assertion);
      const raw = Buffer.from(body.bytesBase64, "base64");
      const credentialed = Buffer.concat([raw, Buffer.from(`--slice-a-c2pa-${sequence}--`)]);
      return jsonResponse({
        bytesBase64: credentialed.toString("base64"),
        format: "c2pa",
        signerId: PRODUCTION_SIGNER_ID,
        manifestDigest: MANIFEST_DIGEST,
        embeddedAt: `2026-08-30T18:${37 + sequence}:00Z`,
      });
    }
    if (url.endsWith("/verify")) {
      assert.ok(embeddedAssertion);
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
  return { fetchImpl };
}

function signerFromFixture(c2pa) {
  return selectContentCredentialIntegration(ASSET_DEPLOYMENT.integrations.contentCredentials, {
    environment: {
      C2PA_SIGNER_URL: "https://signer.example.test",
      C2PA_SIGNER_ID: PRODUCTION_SIGNER_ID,
      C2PA_TRUST_POLICY: "c2pa_trust_list",
      C2PA_SIGNER_TOKEN: "slice-a-c2pa-token",
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
    FIBRE_WORLD_RECONCILIATION_MS: "60000",
  };
}

function resultForThread(run) {
  return run.results.find((entry) => entry.threadId === THREAD_ID);
}

async function startWorld({ databasePath, presentationPort, canonicalRootBoundary, presentationBoundary }) {
  return startWorldKernelVisualPublicationFromEnvironment(
    worldEnvironment(databasePath, presentationPort),
    { guardianModelAdapter: createScriptedGuardianModelAdapter() },
    {
      canonicalRootBoundary,
      presentationBoundary,
      runImmediately: false,
      now: () => "2026-09-01T00:00:00Z",
    },
  );
}

test("real birth automatically converges through durable root and photo workflows across retry and restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-slice-a-automatic-visual-"));
  const databasePath = join(directory, "world.sqlite");
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const writeApi = createGenesisPresentationWriteApi({ presentationServer, privateToken: PRIVATE_TOKEN });
  const presentationHttp = createServer(createNodeServiceHandler({ service: writeApi }));
  const presentationAddress = await listen(presentationHttp);
  const readApi = createPresentationReadApi({
    infra,
    presentationServer,
    openStream() { throw new Error("stream route is not part of the Slice-A proof"); },
  });
  const signer = signerFromFixture(createC2paFixtureFetch());
  const openai = createRetryingOpenAiFixtureFetch(encoder.encode("slice-a-canonical-root-provider-bytes"));
  const rootProvider = selectImageIntegration(ASSET_DEPLOYMENT.integrations["openai-gpt-image-2-medium-v1"], {
    environment: { OPENAI_API_KEY: "slice-a-openai-key" },
    fetchImpl: openai.fetchImpl,
  });
  let photoProvider = null;
  let bfl = null;

  const channelId = threadPresentationChannelId(THREAD_ID);
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: signer,
    presentationServer,
  });
  const completions = createPresentationAssetCompletionService({
    infra,
    credentialSigner: signer,
    async publishReady({ scope, receipt }) {
      assert.deepEqual(scope, { entityKind: "thread", entityRef: THREAD_ID });
      return publisher.publishReady({ receipt, channelId });
    },
  });
  const worker = createLocalAssetGenerationWorker({
    infra,
    credentialSigner: signer,
    selectProvider(job) {
      if (job.providerProfile === "openai-gpt-image-2-medium-v1") return rootProvider;
      if (job.providerProfile === "bfl-flux-2-pro-v1" && photoProvider !== null) return photoProvider;
      throw new Error(`unexpected local worker provider profile ${job.providerProfile}`);
    },
    completionSink(completion, { job }) {
      return job.context?.kind === "thread_presentation_media"
        ? completions.consume(completion)
        : null;
    },
  });
  const canonicalRootBoundary = createCanonicalVisualRootBoundary({
    infra,
    credentialSigner: signer,
  });
  const presentationBoundary = createThreadPresentationVisualBoundary({
    presentationServer,
    infra,
    selectProviderProfile: ({ requiresReferenceObjects }) => selectImageProviderProfile(
      ASSET_DEPLOYMENT,
      { requiresReferenceObjects },
    ),
  });
  let world = null;

  try {
    world = await startWorld({
      databasePath,
      presentationPort: presentationAddress.port,
      canonicalRootBoundary,
      presentationBoundary,
    });
    world.genesisStore.recordWorldSpec(worldSpec());
    const published = await world.birthPublisher.publishBirth(birth());
    assert.equal(published.thread.threadId, THREAD_ID);

    const newborn = await waitForPublicSnapshot(readApi, THREAD_ID);
    assert.equal(newborn.snapshot.presentation.visualIdentity, null);
    assert.equal(newborn.snapshot.presentation.identityCard, null);

    const first = resultForThread(await world.visualRuntime.runOnce());
    assert.equal(first.ok, true);
    assert.equal(first.reconciliation.stage, "canonical_visual_root_pending");
    const rootJobId = first.reconciliation.jobId;
    const rootWorkflow = await infra.workflows.get("asset_generation_v1", rootJobId);
    assert.ok(rootWorkflow);
    assert.equal(rootWorkflow.status, "queued");
    assert.equal(rootWorkflow.input.referenceObjectRefs.length, 0);
    assert.equal(openai.calls.length, 0, "World must not execute the image provider");

    await assert.rejects(
      () => worker.run({ jobId: rootJobId, attemptNumber: 1 }),
      /temporary fixture outage/,
    );
    assert.equal(openai.calls.length, 1);
    assert.equal(await infra.objects.get(rootWorkflow.input.receiptObjectRef), null);

    await world.close();
    world = null;

    world = await startWorld({
      databasePath,
      presentationPort: presentationAddress.port,
      canonicalRootBoundary,
      presentationBoundary,
    });
    const recovered = world.embodimentStore.listCurrent(THREAD_ID);
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].revision, 1);
    assert.equal(recovered[0].status, "pending_generation");

    const stillPending = resultForThread(await world.visualRuntime.runOnce());
    assert.equal(stillPending.reconciliation.stage, "canonical_visual_root_pending");
    assert.equal(stillPending.reconciliation.jobId, rootJobId);
    assert.equal(openai.calls.length, 1, "World restart must not execute or duplicate the provider operation");

    const rootGenerated = await worker.run({ jobId: rootJobId, attemptNumber: 2 });
    assert.equal(rootGenerated.generated.receipt.jobId, rootJobId);
    assert.equal(openai.calls.length, 2, "one failed provider call plus one successful retry is expected");

    const projected = resultForThread(await world.visualRuntime.runOnce());
    assert.equal(projected.ok, true);
    assert.equal(projected.reconciliation.stage, "official_photo_pending");
    const available = world.embodimentStore.listCurrent(THREAD_ID);
    assert.equal(available.length, 1);
    assert.equal(available[0].revision, 2);
    assert.equal(available[0].status, "available");
    assert.equal(world.embodimentStore.history(THREAD_ID, available[0].embodimentId).length, 2);
    const rootObjectRef = available[0].asset.referenceObjectRef;
    assert.equal(rootObjectRef, rootGenerated.generated.receipt.objectRef);

    const photoJobId = projected.reconciliation.jobId;
    assert.notEqual(photoJobId, rootJobId);
    const photoWorkflow = await infra.workflows.get("asset_generation_v1", photoJobId);
    assert.ok(photoWorkflow);
    assert.equal(photoWorkflow.status, "queued");
    assert.deepEqual(photoWorkflow.input.referenceObjectRefs, [rootObjectRef]);

    const rootStored = await infra.objects.get(rootObjectRef);
    assert.ok(rootStored);
    bfl = createBflFixtureFetch({
      expectedReferenceBase64: Buffer.from(rootStored.bytes).toString("base64"),
    });
    photoProvider = selectImageIntegration(ASSET_DEPLOYMENT.integrations[photoWorkflow.input.providerProfile], {
      environment: { BFL_API_KEY: "slice-a-bfl-key" },
      fetchImpl: bfl.fetchImpl,
    });

    const photoGenerated = await worker.run({ jobId: photoJobId, attemptNumber: 1 });
    assert.equal(photoGenerated.completionResult.handled, true);
    assert.equal(photoGenerated.completionResult.duplicate, false);
    assert.equal(photoGenerated.completionResult.publication.event.kind, "media.ready");
    assert.equal(bfl.calls.filter((call) => call.init.method === "POST").length, 1);

    const final = resultForThread(await world.visualRuntime.runOnce());
    assert.equal(final.ok, true);
    assert.equal(final.reconciliation.complete, true);
    assert.equal(final.reconciliation.stage, "complete");

    const response = await readApi.fetch(
      new Request(`http://presentation.local/api/threads/${THREAD_ID}/snapshot`),
    );
    assert.equal(response.status, 200);
    const publicSnapshot = await response.json();
    assert.deepEqual(publicSnapshot.snapshot.presentation.visualIdentity.referenceObjectRefs, [rootObjectRef]);
    const officialMediaId = publicSnapshot.snapshot.presentation.identityCard.officialPhotoMediaRef;
    const officialPhotos = publicSnapshot.snapshot.media.assets.filter((asset) => (
      asset.role === "official_id_photo" && asset.mediaId === officialMediaId
    ));
    assert.equal(officialPhotos.length, 1);
    assert.equal(officialPhotos[0].status, "ready");

    const replay = resultForThread(await world.visualRuntime.runOnce());
    assert.equal(replay.reconciliation.complete, true);
    assert.equal((await infra.workflows.get("asset_generation_v1", rootJobId)).instanceId, rootJobId);
    assert.equal((await infra.workflows.get("asset_generation_v1", photoJobId)).instanceId, photoJobId);
    assert.equal(openai.calls.length, 2, "replay must not generate a second canonical root");
    assert.equal(
      bfl.calls.filter((call) => call.init.method === "POST").length,
      1,
      "replay must not generate a second official photo",
    );
    const events = await presentationServer.readEvents({ channelId, after: 0, limit: 100 });
    assert.equal(
      events.filter((event) => event.kind === "media.ready" && event.payload.mediaId === officialMediaId).length,
      1,
      "completion must publish exactly one media.ready event",
    );
  } finally {
    await world?.close();
    await close(presentationHttp);
    rmSync(directory, { recursive: true, force: true });
  }
});
