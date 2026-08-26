import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import { createGenerationAttemptObjectPort } from "../src/generation-attempt-object-port.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

test("GenerationAttempt object port atomically commits attempt metadata and provider bytes as one physical object", async () => {
  const infra = createMemoryInfraDriver();
  const port = createGenerationAttemptObjectPort(infra.objects);
  const suffix = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_1";
  const attemptRef = `generationattempt_${suffix}`;
  const outputRef = `provideroutput_${suffix}`;
  const attemptBytes = encoder.encode(JSON.stringify({ attempt: 1, request: "witness" }));
  const outputBytes = encoder.encode("provider-image-bytes");
  const attemptDigest = await sha256(attemptBytes);
  const outputDigest = await sha256(outputBytes);
  const attemptMetadata = {
    kind: "generation_attempt",
    jobId: "assetjob_atomic_fixture",
    jobDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    attemptNumber: 1,
  };
  const outputMetadata = {
    kind: "staged_provider_output",
    jobId: "assetjob_atomic_fixture",
    jobDigest: attemptMetadata.jobDigest,
    generationAttemptId: attemptRef,
    generationAttemptDigest: attemptDigest,
  };

  await port.putImmutable(attemptRef, attemptBytes, attemptDigest, attemptMetadata);
  assert.equal(await infra.objects.head(attemptRef), null,
    "attempt metadata must not become durable before provider bytes can commit with it");

  await port.putImmutable(outputRef, outputBytes, outputDigest, outputMetadata);
  const physical = await infra.objects.get(attemptRef);
  assert.equal(physical.metadata.kind, "generation_attempt_bundle");
  assert.equal(await infra.objects.get(outputRef), null,
    "the underlying InfraDriver stores one physical attempt bundle, not a second raw-output object");

  const virtualAttempt = await port.get(attemptRef);
  const virtualOutput = await port.get(outputRef);
  assert.equal(virtualAttempt.digest, attemptDigest);
  assert.equal(decoder.decode(virtualAttempt.bytes), decoder.decode(attemptBytes));
  assert.equal(virtualOutput.digest, outputDigest);
  assert.equal(decoder.decode(virtualOutput.bytes), decoder.decode(outputBytes));
});

test("an abandoned pre-output buffer leaves no durable half-attempt for a later runtime instance", async () => {
  const infra = createMemoryInfraDriver();
  const first = createGenerationAttemptObjectPort(infra.objects);
  const attemptRef = `generationattempt_${"b".repeat(64)}_1`;
  const attemptBytes = encoder.encode("attempt-only");
  const attemptDigest = await sha256(attemptBytes);

  await first.putImmutable(attemptRef, attemptBytes, attemptDigest, {
    kind: "generation_attempt",
    jobId: "assetjob_crash_fixture",
    jobDigest: `sha256:${"b".repeat(64)}`,
    attemptNumber: 1,
  });
  assert.equal(await infra.objects.get(attemptRef), null);

  const afterRestart = createGenerationAttemptObjectPort(infra.objects);
  assert.equal(await afterRestart.get(attemptRef), null,
    "a process ending before raw output arrives must leave no durable provider-success witness");
});
