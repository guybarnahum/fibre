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

const TOKEN = "private-test-token";

function birth() {
  const threadId = "thr_genesis_write_001";
  const genesisId = "gen_genesis_write_001";
  const worldRef = "world_genesis_write_001";
  const publishedAt = "2026-08-30T04:00:00Z";
  const civilRegistration = buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload("7K3M2Q8W5"),
    registeredAt: publishedAt,
    birthEventRef: "evt_seed_genesis_write_001",
    worldRef,
  });
  const thread = {
    threadId,
    status: "frozen",
    identity: {
      name: "Ari Vale",
      selfDescription: "I notice concrete details, keep commitments, and revise my view when evidence changes.",
    },
  };
  const manifest = {
    genesisId,
    threadId,
    worldSpecRef: worldRef,
    publication: { status: "published", publishedAt, civilRegistration },
  };
  return {
    genesisId,
    publicationDigest: `sha256:${"a".repeat(64)}`,
    bundle: projectNewbornThreadPresentation({ thread, manifest, civilRegistration }),
  };
}

function request(body, { token = TOKEN } = {}) {
  return new Request("https://presentation.local/internal/genesis/presentations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": token,
    },
    body: JSON.stringify(body),
  });
}

test("private Genesis write API persists a real newborn presentation and reuses an identical retry", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const api = createGenesisPresentationWriteApi({ presentationServer, privateToken: TOKEN });
  const input = birth();

  const created = await api.fetch(request(input));
  assert.equal(created.status, 201);
  const first = await created.json();
  assert.equal(first.ok, true);
  assert.equal(first.reused, false);
  assert.equal(first.threadId, input.bundle.presentation.manifest.threadId);

  const retried = await api.fetch(request(input));
  assert.equal(retried.status, 200);
  const second = await retried.json();
  assert.equal(second.reused, true);
  assert.equal(second.snapshotDigest, first.snapshotDigest);

  const catalog = await infra.catalog.get(first.channelId);
  assert.equal(catalog.publiclyVisible, true);
  assert.equal(catalog.genesisId, input.genesisId);
  assert.equal(catalog.publicationDigest, input.publicationDigest);
  assert.equal(catalog.projectionKind, "genesis_birth");
});

test("private Genesis write API rejects unauthorized writes and conflicting retries", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  const api = createGenesisPresentationWriteApi({ presentationServer, privateToken: TOKEN });
  const input = birth();

  const unauthorized = await api.fetch(request(input, { token: "wrong" }));
  assert.equal(unauthorized.status, 403);

  const created = await api.fetch(request(input));
  assert.equal(created.status, 201);

  const conflicting = structuredClone(input);
  conflicting.bundle.presentation.introduction.summary = "Different projection content.";
  const conflict = await api.fetch(request(conflicting));
  assert.equal(conflict.status, 409);
});
