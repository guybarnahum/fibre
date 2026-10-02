import test from "node:test";
import assert from "node:assert/strict";

import {
  InfraImmutableObjectConflictError,
  InfraWorkflowConflictError,
} from "../infra-driver.mjs";
import { createCloudflareInfraDriver } from "../providers/cloudflare/driver.mjs";

function fakeR2Bucket() {
  const objects = new Map();
  let etag = 0;
  function view(key, value, withBody) {
    if (!value) return null;
    return {
      key,
      customMetadata: structuredClone(value.customMetadata),
      etag: value.etag,
      ...(withBody ? { async arrayBuffer() { return value.bytes.slice().buffer; } } : {}),
    };
  }
  return {
    keys: objects,
    async put(key, bytes, options = {}) {
      if (options.onlyIf?.etagDoesNotMatch === "*" && objects.has(key)) return null;
      const copied = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes);
      const value = {
        bytes: copied,
        customMetadata: structuredClone(options.customMetadata ?? {}),
        etag: `etag-${++etag}`,
      };
      objects.set(key, value);
      return view(key, value, false);
    },
    async get(key) { return view(key, objects.get(key), true); },
    async head(key) { return view(key, objects.get(key), false); },
  };
}

function fakeWorkflowBinding({ failCreateOnce = false } = {}) {
  const instances = new Map();
  const statuses = new Map();
  let creates = 0;
  let shouldFail = failCreateOnce;
  function instance(id) {
    return {
      id,
      async status() { return structuredClone(statuses.get(id) ?? { status: "queued" }); },
    };
  }
  const createdIds=[];
  return {
    get createCount() { return creates; },
    get createdIds() { return [...createdIds]; },
    expire(id) { instances.delete(id); },
    setStatus(id, status) { statuses.set(id, structuredClone(status)); },
    async create({ id }) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("transient create failure");
      }
      if (instances.has(id)) throw new Error("instance already exists");
      creates += 1;
      createdIds.push(id);
      const value = instance(id);
      instances.set(id, value);
      return value;
    },
    async get(id) {
      if (!instances.has(id)) throw new Error("instance not found");
      return instances.get(id);
    },
  };
}

const digestA = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const digestB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("cloudflare-v1 R2 object port enforces Fibre immutable-object semantics", async () => {
  const bucket = fakeR2Bucket();
  const infra = createCloudflareInfraDriver({ objectBucket: bucket });
  const first = await infra.objects.putImmutable("object_1", new TextEncoder().encode("hello"), digestA, { kind: "fixture" });
  const duplicate = await infra.objects.putImmutable("object_1", new TextEncoder().encode("hello"), digestA, { kind: "fixture" });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(bucket.keys.has("fibre/objects/object_1"), true);
  assert.deepEqual((await infra.objects.head("object_1")).metadata, { kind: "fixture" });
  assert.equal(new TextDecoder().decode((await infra.objects.get("object_1")).bytes), "hello");

  await assert.rejects(
    () => infra.objects.putImmutable("object_1", new TextEncoder().encode("different"), digestB, { kind: "fixture" }),
    InfraImmutableObjectConflictError,
  );
});

test("cloudflare-v1 workflow port uses durable input witness for idempotency and conflict detection", async () => {
  const bucket = fakeR2Bucket();
  const workflow = fakeWorkflowBinding();
  const infra = createCloudflareInfraDriver({
    objectBucket: bucket,
    workflowBindings: { asset_generation_v1: workflow },
  });
  const input = { jobId: "job_1", value: "same" };
  const first = await infra.workflows.start("asset_generation_v1", "job_1", input);
  const duplicate = await infra.workflows.start("asset_generation_v1", "job_1", input);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(workflow.createCount, 1);

  await assert.rejects(
    () => infra.workflows.start("asset_generation_v1", "job_1", { jobId: "job_1", value: "different" }),
    InfraWorkflowConflictError,
  );
});

test("cloudflare-v1 workflow status preserves safe Cloudflare failure details", async () => {
  const bucket = fakeR2Bucket();
  const workflow = fakeWorkflowBinding();
  const infra = createCloudflareInfraDriver({
    objectBucket: bucket,
    workflowBindings: { asset_generation_v1: workflow },
  });
  const input = { jobId: "job_error", providerProfile: "fixture-provider" };
  await infra.workflows.start("asset_generation_v1", "job_error", input);
  workflow.setStatus("job_error", {
    status: "errored",
    error: {
      name: "AssetGenerationAttemptFailed",
      message: "generation provider returned an error",
    },
  });

  const status = await infra.workflows.get("asset_generation_v1", "job_error");
  assert.equal(status.status, "errored");
  assert.deepEqual(status.error, {
    name: "AssetGenerationAttemptFailed",
    message: "generation provider returned an error",
  });
  assert.deepEqual(status.input, input);
});

test("cloudflare-v1 workflow status preserves Fibre input witness after Cloudflare instance retention expires", async () => {
  const bucket = fakeR2Bucket();
  const workflow = fakeWorkflowBinding();
  const infra = createCloudflareInfraDriver({
    objectBucket: bucket,
    workflowBindings: { asset_generation_v1: workflow },
  });
  const input = { jobId: "job_2", purpose: "fixture" };
  await infra.workflows.start("asset_generation_v1", "job_2", input);
  workflow.expire("job_2");
  const status = await infra.workflows.get("asset_generation_v1", "job_2");
  assert.equal(status.status, "unknown");
  assert.equal(status.error, null);
  assert.deepEqual(status.input, input);
  const duplicate = await infra.workflows.start("asset_generation_v1", "job_2", input);
  assert.equal(duplicate.duplicate, true);
  assert.equal(workflow.createCount, 1, "expired operational status must not silently re-run a durable Fibre job");
});

test("cloudflare-v1 workflow retry remains possible until a start marker is committed", async () => {
  const bucket = fakeR2Bucket();
  const workflow = fakeWorkflowBinding({ failCreateOnce: true });
  const infra = createCloudflareInfraDriver({
    objectBucket: bucket,
    workflowBindings: { asset_generation_v1: workflow },
  });
  const input = { jobId: "job_retry", purpose: "fixture" };

  await assert.rejects(
    () => infra.workflows.start("asset_generation_v1", "job_retry", input),
    /transient create failure/,
  );
  assert.equal(workflow.createCount, 0);

  const retried = await infra.workflows.start("asset_generation_v1", "job_retry", input);
  assert.equal(retried.duplicate, true, "the durable job identity already existed even though execution had not started");
  assert.equal(retried.status, "queued");
  assert.equal(retried.error, null);
  assert.equal(workflow.createCount, 1);
});


test("cloudflare-v1 workflow port maps provider-incompatible logical IDs without changing Fibre identity", async () => {
  const bucket = fakeR2Bucket();
  const workflow = fakeWorkflowBinding();
  const infra = createCloudflareInfraDriver({
    objectBucket: bucket,
    workflowBindings: { population_lab_experiment_v1: workflow },
  });
  const logicalId = "plexp_78b720c721d949028c20b62a:visual";
  const input = { experimentId: "plexp_78b720c721d949028c20b62a", kind: "visual" };

  const started = await infra.workflows.start("population_lab_experiment_v1", logicalId, input);
  assert.equal(started.instanceId, logicalId, "InfraDriver leaked provider workflow identity");
  assert.equal(workflow.createdIds.length, 1, "workflow was not created");
  assert.match(workflow.createdIds[0], /^[A-Za-z0-9_-]{1,100}$/u, "Cloudflare workflow id remained provider-invalid");
  assert.notEqual(workflow.createdIds[0], logicalId, "provider-invalid logical id was passed through unchanged");

  const observed = await infra.workflows.get("population_lab_experiment_v1", logicalId);
  assert.equal(observed.instanceId, logicalId, "workflow read lost Fibre logical identity");
  assert.deepEqual(observed.input, input, "workflow read lost logical input witness");
});

test("cloudflare-v1 service port hides Worker binding transport behind InfraDriver", async () => {
  let observed=null;
  const infra=createCloudflareInfraDriver({
    serviceBindings:{
      asset_generator:{
        async fetch(request){
          observed={
            url:request.url,
            method:request.method,
            token:request.headers.get("x-fibre-private-token"),
            body:await request.json(),
          };
          return Response.json({ok:true,result:{state:"pending"}});
        },
      },
    },
    privateToken:"fixture-private-token-12345",
  });

  const result=await infra.services.call("asset_generator","generation.reconcile",{job:{jobId:"job_1"}});
  assert.deepEqual(result,{state:"pending"},"service call changed provider response");
  assert.equal(observed.url,"https://fibre.internal/internal/generation/reconcile","service operation did not map through provider adapter");
  assert.equal(observed.method,"POST","service operation used wrong transport method");
  assert.equal(observed.token,"fixture-private-token-12345","service adapter lost private service credential");
  assert.deepEqual(observed.body,{job:{jobId:"job_1"}},"service adapter changed semantic input");
});
