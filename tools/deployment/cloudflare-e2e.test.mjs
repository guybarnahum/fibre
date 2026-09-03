import assert from "node:assert/strict";
import test from "node:test";

import {
  cloudE2EProgress,
  createCloudE2EFetch,
  normalizeCloudE2EEnvironment,
  parseCloudE2EArgs,
  runCloudflareE2E,
} from "./cloudflare-e2e.mjs";

test("Cloudflare E2E accepts staging only", () => {
  assert.equal(normalizeCloudE2EEnvironment("staging"), "staging");
  assert.throws(() => normalizeCloudE2EEnvironment("production"), /unsupported Cloudflare E2E environment/);
  assert.throws(() => normalizeCloudE2EEnvironment("local"), /unsupported Cloudflare E2E environment/);
});

test("Cloudflare E2E CLI requires an explicit environment", () => {
  assert.deepEqual(parseCloudE2EArgs(["--env", "staging"]), { environment: "staging" });
  assert.throws(() => parseCloudE2EArgs([]), /--env staging is required/);
  assert.throws(() => parseCloudE2EArgs(["--mode", "staging"]), /unsupported argument --mode/);
});

test("Cloudflare E2E maps lifecycle events to operator progress", () => {
  assert.equal(cloudE2EProgress({ event: "genesis-development-e2e-start" }), "running Genesis development");
  assert.equal(
    cloudE2EProgress({ event: "genesis-development-e2e-submitted", status: "pending" }),
    "Genesis generated; waiting for authoritative birth publication",
  );
  assert.equal(cloudE2EProgress({ event: "unrelated" }), null);
});

test("Cloudflare E2E bounds repeated birth-development requests without shortening the initial Genesis request", async () => {
  const calls = [];
  const originalSignal = AbortSignal.timeout(60_000);
  const fetchImpl = async (input, init) => {
    calls.push({ input, init });
    return { ok: true, status: 200 };
  };
  const bounded = createCloudE2EFetch({ fetchImpl, replayRequestTimeoutMs: 25 });
  const url = "https://birth.example.test/internal/births/develop";
  await bounded(url, { method: "POST", signal: originalSignal });
  await bounded(url, { method: "POST", signal: originalSignal });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.signal, originalSignal);
  assert.notEqual(calls[1].init.signal, originalSignal);
});

test("Cloudflare E2E dispatches to staging and requires Slice G public closure", async () => {
  let stagingCalls = 0;
  let verifyCalls = 0;
  const emitted = [];
  const result = await runCloudflareE2E({
    environment: "staging",
    emit(event) { emitted.push(event); },
    async runStaging({ emit }) {
      stagingCalls += 1;
      emit({ event: "genesis-development-e2e-start" });
      return Object.freeze({
        evidence: Object.freeze({
          contract: "fibre-slice-g-cloud-e2e-evidence-v1",
          request: Object.freeze({ developmentPlanThreadId: "thr_cloud_e2e_test" }),
        }),
      });
    },
    async verifySliceG({ evidence }) {
      verifyCalls += 1;
      assert.equal(evidence.contract, "fibre-slice-g-cloud-e2e-evidence-v1");
      return Object.freeze({
        closure: Object.freeze({
          credentialId: "fibre_card_test",
          cardSerial: "FIC-TEST",
          registrationId: "civil_reg_test",
          mediaId: "media_official_test",
          objectRef: "asset_official_test",
          canonicalRootObjectRef: "asset_root_test",
          generation: Object.freeze({
            provider: "bfl",
            model: "flux-2-pro",
            generatedAt: "2026-09-03T15:00:00Z",
            inputReferences: Object.freeze(["asset_root_test"]),
          }),
        }),
        officialPhotoAsset: Object.freeze({
          objectRef: "asset_official_test",
          status: 200,
          byteLength: 3,
          mediaType: "image/png",
          etag: "etag-test",
          provenanceClass: "generated_reconstruction",
        }),
      });
    },
  });

  assert.equal(stagingCalls, 1);
  assert.equal(verifyCalls, 1);
  assert.equal(result.environment, "staging");
  assert.equal(result.evidence.contract, "fibre-slice-g-cloud-e2e-evidence-v1");
  assert.equal(result.sliceGClosure.canonicalRootObjectRef, "asset_root_test");
  assert.equal(result.sliceGClosure.officialPhoto.objectRef, "asset_official_test");
  assert.ok(emitted.some((event) => event.progress === "running Genesis development"));
  assert.ok(emitted.some((event) => event.progress === "verifying Identity Card and official photo"));
});
