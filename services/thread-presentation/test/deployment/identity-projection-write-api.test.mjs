import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { projectNewbornThreadPresentation } from "../../src/newborn-presentation-projector.mjs";
import { createGenesisPresentationWriteApi } from "../../src/http/genesis-write-api.mjs";
import { createIdentityProjectionWriteApi } from "../../src/http/identity-projection-write-api.mjs";
import { threadPresentationChannelId } from "../../src/public-asset-resolver.mjs";

const TOKEN = "private-test-token";

function birth() {
  const threadId = "thr_identity_projection_001";
  const genesisId = "gen_identity_projection_001";
  const worldRef = "world_identity_projection_001";
  const publishedAt = "2026-09-18T10:00:00Z";
  const civilRegistration = buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber:fibreIdentityNumberFromPayload("7K3M2Q8W5"),
    registeredAt:publishedAt,
    birthEventRef:"evt_identity_projection_birth",
    worldRef,
  });
  const thread = {
    threadId,
    status:"active",
    identity:{
      name:"Ari Vale",
      birthDate:"2004-08-20",
      languages:["en"],
      selfDescription:"I carry my history forward and revise myself without losing it.",
    },
  };
  return {
    threadId,
    genesisId,
    publicationDigest:`sha256:${"a".repeat(64)}`,
    bundle:projectNewbornThreadPresentation({
      thread,
      manifest:{
        genesisId,
        threadId,
        worldSpecRef:worldRef,
        publication:{ status:"published", publishedAt, civilRegistration },
      },
      civilRegistration,
    }),
  };
}

function post(url, body) {
  return new Request(url, {
    method:"POST",
    headers:{ "content-type":"application/json", "x-fibre-private-token":TOKEN },
    body:JSON.stringify(body),
  });
}

test("World identity correction converges publicly without rewriting Genesis", async () => {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const genesisApi = createGenesisPresentationWriteApi({ presentationServer:server, privateToken:TOKEN });
  const identityApi = createIdentityProjectionWriteApi({ presentationServer:server, privateToken:TOKEN });
  const original = birth();

  const created = await genesisApi.fetch(post("https://presentation.local/internal/genesis/presentations", original));
  assert.equal(created.status, 201, "Genesis publication failed");

  const before = await server.getSnapshot(threadPresentationChannelId(original.threadId));
  const immutableBefore = await infra.objects.get(before.pointer.objectRef);

  const corrected = await identityApi.fetch(post(
    `https://presentation.local/internal/threads/${original.threadId}/identity-projection`,
    {
      projectedAt:"2026-09-18T11:00:00Z",
      projection:{
        threadId:original.threadId,
        displayName:"Ari North",
        birthDate:"2004-08-20",
        languages:["en"],
        lifecycleStatus:"active",
        fibreIdentityNumber:original.bundle.presentation.civilIdentity.fibreIdentityNumber,
        worldVersion:2,
        sourceReferences:[original.threadId, "evt_identity_name_002"],
      },
    },
  ));
  assert.equal(corrected.status, 201, "identity projection failed");

  const after = await server.getSnapshot(threadPresentationChannelId(original.threadId));
  assert.equal(after.snapshot.presentation.subject.displayName, "Ari North", "World name did not converge");
  assert.equal(after.snapshot.presentation.introduction.headline, "Ari North", "public headline stayed stale");
  assert.equal(
    after.snapshot.presentation.civilIdentity.fibreIdentityNumber,
    original.bundle.presentation.civilIdentity.fibreIdentityNumber,
    "FIN changed during correction",
  );

  const immutableAfter = await infra.objects.get(before.pointer.objectRef);
  assert.equal(immutableAfter.digest, immutableBefore.digest, "Genesis snapshot changed");
  assert.deepEqual(immutableAfter.bytes, immutableBefore.bytes, "Genesis bytes changed");
});
