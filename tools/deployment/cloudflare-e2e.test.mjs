import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("Cloudflare E2E dispatches to staging and requires Slice G public closure", async () => {
  let stagingCalls = 0;
  let verifyCalls = 0;
  const result = await runCloudflareE2E({
    environment: "staging",
    async runStaging() {
      stagingCalls += 1;
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
});
