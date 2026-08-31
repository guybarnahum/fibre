import assert from "node:assert/strict";
import test from "node:test";

import { createGenesisDevelopmentApi } from "../src/genesis-development-api.mjs";
import { createGenesisDevelopmentInspectionService } from "../src/genesis-development-inspection.mjs";

const TOKEN = "development-inspection-token-123";

function runtimeFixture() {
  const reservation = {
    requestId: "request-inspection-001",
    requestDigest: "sha256:request",
    planDigest: "sha256:plan",
    admissionDigest: "sha256:admission",
    genesisId: "genesis_inspection_001",
    threadId: "thr_inspection_001",
    status: "submitted",
    plan: { freshModelRequestDomain: "genesis-development:abc:model" },
  };
  const records = [{
    request: {
      clientRequestId: "genesis-development:abc:model:slot-01:pass-a:episode-01",
      provider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      requestDigest: "sha256:model-request",
    },
    result: {
      output: { private: "must-not-escape" },
      provenance: {
        provider: "openai",
        modelId: "gpt-5.1-2025-11-13",
        providerRequestId: "resp_provider_001",
      },
    },
    resultDigest: "sha256:model-result",
    recordedAt: "2026-08-31T23:50:00Z",
  }];
  return {
    developmentRequestStore: {
      get(requestId) { return requestId === reservation.requestId ? structuredClone(reservation) : null; },
    },
    provisionalBirthStore: {
      get(genesisId) { return genesisId === reservation.genesisId ? { status: "published" } : null; },
    },
    invocationJournal: {
      listByPrefix(prefix) {
        assert.equal(prefix, reservation.plan.freshModelRequestDomain);
        return structuredClone(records);
      },
    },
  };
}

test("Genesis development inspection exposes durable provider witnesses without model content", () => {
  const inspection = createGenesisDevelopmentInspectionService({ runtime: runtimeFixture() })
    .inspect("request-inspection-001");
  assert.equal(inspection.requestStatus, "submitted");
  assert.equal(inspection.provisionalStatus, "published");
  assert.equal(inspection.invocationCount, 1);
  assert.deepEqual(inspection.invocations[0], {
    clientRequestId: "genesis-development:abc:model:slot-01:pass-a:episode-01",
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    requestDigest: "sha256:model-request",
    resultDigest: "sha256:model-result",
    providerRequestId: "resp_provider_001",
    recordedAt: "2026-08-31T23:50:00Z",
  });
  assert.equal(Object.hasOwn(inspection.invocations[0], "result"), false);
});

test("authenticated development inspection route reports absence and durable witnesses", async () => {
  const inspectionService = createGenesisDevelopmentInspectionService({ runtime: runtimeFixture() });
  const api = createGenesisDevelopmentApi({
    privateToken: TOKEN,
    developmentService: { async develop() { throw new Error("must not develop"); } },
    inspectionService,
  });

  const unauthorized = await api.fetch(new Request(
    "https://birth.internal/internal/births/develop/request-inspection-001/inspection",
  ));
  assert.equal(unauthorized.status, 403);

  const missing = await api.fetch(new Request(
    "https://birth.internal/internal/births/develop/request-missing/inspection",
    { headers: { "x-fibre-private-token": TOKEN } },
  ));
  assert.equal(missing.status, 404);

  const found = await api.fetch(new Request(
    "https://birth.internal/internal/births/develop/request-inspection-001/inspection",
    { headers: { "x-fibre-private-token": TOKEN } },
  ));
  assert.equal(found.status, 200);
  const payload = await found.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.inspection.threadId, "thr_inspection_001");
  assert.equal(payload.inspection.invocationCount, 1);
});
