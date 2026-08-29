import {
  INFRA_DRIVER_VERSION,
  InfraImmutableObjectConflictError,
  InfraWorkflowConflictError,
  assertInfraDriver,
} from "./infra-driver.mjs";
import {
  assertInfraId,
  assertInfraJsonValue,
  assertInfraNonEmpty,
  assertInfraPlainObject,
  infraCanonicalJson,
} from "./internal.mjs";
import {
  createCloudflareCatalogPort,
  createCloudflareRealtimePort,
  createCloudflareStreamPort,
} from "./cloudflare-presentation-ports.mjs";

const DIGEST_META = "fibre-digest";
const JSON_META = "fibre-metadata";
const OBJECT_PREFIX = "fibre/objects/";
const WORKFLOW_INPUT_PREFIX = "workflowinput";
const WORKFLOW_STARTED_PREFIX = "workflowstarted";

function assertR2Bucket(bucket) {
  if (!bucket || typeof bucket.put !== "function" || typeof bucket.get !== "function" || typeof bucket.head !== "function") {
    throw new TypeError("Cloudflare R2 bucket binding must provide put/get/head");
  }
  return bucket;
}

function assertWorkflowBinding(binding, workflowName) {
  if (!binding || typeof binding.create !== "function" || typeof binding.get !== "function") {
    throw new TypeError(`Cloudflare Workflow binding for ${workflowName} must provide create/get`);
  }
  return binding;
}

function cloneBytes(value) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value.slice();
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  throw new TypeError("object bytes must be string, Uint8Array, ArrayBuffer, or ArrayBufferView");
}

function sameBytes(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

function objectKey(objectRef) {
  assertInfraId("objectRef", objectRef);
  return `${OBJECT_PREFIX}${objectRef}`;
}

function encodeMetadata(digest, metadata) {
  assertInfraNonEmpty("digest", digest);
  assertInfraPlainObject("metadata", metadata);
  assertInfraJsonValue("metadata", metadata);
  return {
    [DIGEST_META]: digest,
    [JSON_META]: infraCanonicalJson(metadata),
  };
}

function decodeStoredMetadata(object, objectRef) {
  const custom = object?.customMetadata ?? {};
  const digest = custom[DIGEST_META];
  const rawMetadata = custom[JSON_META];
  if (typeof digest !== "string" || typeof rawMetadata !== "string") {
    throw new Error(`Cloudflare R2 object ${objectRef} is missing Fibre metadata`);
  }
  let metadata;
  try { metadata = JSON.parse(rawMetadata); }
  catch { throw new Error(`Cloudflare R2 object ${objectRef} has invalid Fibre metadata`); }
  assertInfraPlainObject("stored metadata", metadata);
  assertInfraJsonValue("stored metadata", metadata);
  return { digest, metadata };
}

function sha256ArrayBuffer(digest) {
  if (!/^sha256:[0-9a-f]{64}$/.test(digest)) throw new TypeError("digest must be sha256:<64 lowercase hex>");
  const hex = digest.slice("sha256:".length);
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes.buffer;
}

async function readR2Bytes(object) {
  if (typeof object.arrayBuffer !== "function") throw new Error("Cloudflare R2 object body lacks arrayBuffer()");
  return new Uint8Array(await object.arrayBuffer());
}

export function createCloudflareObjectPort(bucketBinding) {
  const bucket = assertR2Bucket(bucketBinding);
  return Object.freeze({
    async putImmutable(objectRef, bytes, digest, metadata = {}) {
      const key = objectKey(objectRef);
      const copied = cloneBytes(bytes);
      const customMetadata = encodeMetadata(digest, metadata);
      const created = await bucket.put(key, copied, {
        onlyIf: { etagDoesNotMatch: "*" },
        customMetadata,
        sha256: sha256ArrayBuffer(digest),
      });
      if (created !== null) return { objectRef, digest, duplicate: false };

      const existing = await bucket.get(key);
      if (existing === null) throw new Error(`Cloudflare R2 conditional write for ${objectRef} failed but object is missing`);
      const stored = decodeStoredMetadata(existing, objectRef);
      const existingBytes = await readR2Bytes(existing);
      if (stored.digest !== digest
        || infraCanonicalJson(stored.metadata) !== infraCanonicalJson(metadata)
        || !sameBytes(existingBytes, copied)) {
        throw new InfraImmutableObjectConflictError(`immutable object ${objectRef} already exists with different content`);
      }
      return { objectRef, digest, duplicate: true };
    },

    async get(objectRef) {
      const object = await bucket.get(objectKey(objectRef));
      if (object === null) return null;
      const stored = decodeStoredMetadata(object, objectRef);
      return {
        bytes: await readR2Bytes(object),
        digest: stored.digest,
        metadata: structuredClone(stored.metadata),
      };
    },

    async head(objectRef) {
      const object = await bucket.head(objectKey(objectRef));
      if (object === null) return null;
      const stored = decodeStoredMetadata(object, objectRef);
      return {
        objectRef,
        digest: stored.digest,
        metadata: structuredClone(stored.metadata),
      };
    },
  });
}

async function sha256Text(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function workflowWitnessRef(workflowName, instanceId) {
  return `${WORKFLOW_INPUT_PREFIX}:${workflowName}:${instanceId}`;
}

function workflowStartedRef(workflowName, instanceId) {
  return `${WORKFLOW_STARTED_PREFIX}:${workflowName}:${instanceId}`;
}

function normalizeWorkflowStatus(status) {
  const value = status?.status;
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function normalizeWorkflowError(error) {
  if (!error || typeof error !== "object") return null;
  const name = typeof error.name === "string" && error.name.length > 0 ? error.name : "Error";
  const message = typeof error.message === "string" && error.message.length > 0 ? error.message : "Workflow failed";
  return Object.freeze({ name, message });
}

function observeWorkflowStatus(status) {
  return Object.freeze({
    status: normalizeWorkflowStatus(status),
    error: normalizeWorkflowError(status?.error),
  });
}

export function createCloudflareWorkflowPort({ workflowBindings, objects }) {
  assertInfraPlainObject("workflowBindings", workflowBindings);
  if (!objects || typeof objects.putImmutable !== "function" || typeof objects.get !== "function" || typeof objects.head !== "function") {
    throw new TypeError("Cloudflare workflow port requires the InfraDriver object port for durable workflow witnesses");
  }

  function bindingFor(workflowName) {
    assertInfraId("workflowName", workflowName);
    const binding = workflowBindings[workflowName];
    if (!binding) throw new TypeError(`no Cloudflare Workflow binding configured for ${workflowName}`);
    return assertWorkflowBinding(binding, workflowName);
  }

  return Object.freeze({
    async start(workflowName, instanceId, input) {
      assertInfraId("workflowName", workflowName);
      assertInfraId("workflow instanceId", instanceId);
      assertInfraJsonValue("workflow input", input);
      const binding = bindingFor(workflowName);
      const serialized = infraCanonicalJson(input);
      const inputDigest = await sha256Text(serialized);
      const witnessRef = workflowWitnessRef(workflowName, instanceId);
      const startedRef = workflowStartedRef(workflowName, instanceId);

      let duplicate = false;
      try {
        const stored = await objects.putImmutable(witnessRef, serialized, inputDigest, {
          kind: "cloudflare_workflow_input",
          workflowName,
          instanceId,
        });
        duplicate = stored.duplicate;
      } catch (error) {
        if (error instanceof InfraImmutableObjectConflictError) {
          throw new InfraWorkflowConflictError(`workflow ${instanceId} already exists with different input`);
        }
        throw error;
      }

      const started = await objects.head(startedRef);
      let instance;
      if (duplicate && started !== null) {
        try {
          instance = await binding.get(instanceId);
        } catch {
          return { workflowName, instanceId, status: "unknown", error: null, duplicate: true };
        }
        return {
          workflowName,
          instanceId,
          ...observeWorkflowStatus(await instance.status()),
          duplicate: true,
        };
      }

      try {
        instance = await binding.create({ id: instanceId, params: structuredClone(input) });
      } catch (error) {
        try { instance = await binding.get(instanceId); }
        catch { throw error; }
      }

      const startedDigest = await sha256Text("started");
      await objects.putImmutable(startedRef, "started", startedDigest, {
        kind: "cloudflare_workflow_started",
        workflowName,
        instanceId,
      });

      return {
        workflowName,
        instanceId,
        ...observeWorkflowStatus(await instance.status()),
        duplicate,
      };
    },

    async get(workflowName, instanceId) {
      assertInfraId("workflowName", workflowName);
      assertInfraId("workflow instanceId", instanceId);
      const witness = await objects.get(workflowWitnessRef(workflowName, instanceId));
      if (witness === null) return null;
      let input;
      try {
        input = JSON.parse(new TextDecoder().decode(witness.bytes));
      } catch {
        throw new Error(`Cloudflare workflow input witness for ${instanceId} is invalid`);
      }
      const binding = bindingFor(workflowName);
      let observation = { status: "unknown", error: null };
      try {
        const instance = await binding.get(instanceId);
        observation = observeWorkflowStatus(await instance.status());
      } catch {
        // Workflow operational retention may expire before Fibre's durable witnesses.
      }
      return { workflowName, instanceId, ...observation, input };
    },
  });
}

export function createCloudflareInfraDriver({
  objectBucket = null,
  workflowBindings = {},
  presentationChannels = null,
  catalogDatabase = null,
} = {}) {
  const driver = {
    driverId: "cloudflare-v1",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: [],
  };
  if (objectBucket !== null) {
    driver.objects = createCloudflareObjectPort(objectBucket);
    driver.capabilities.push("objects");
  }
  if (Object.keys(workflowBindings).length > 0) {
    if (!driver.objects) throw new TypeError("Cloudflare workflows require objectBucket for durable workflow witnesses");
    driver.workflows = createCloudflareWorkflowPort({ workflowBindings, objects: driver.objects });
    driver.capabilities.push("workflows");
  }
  if (presentationChannels !== null) {
    driver.streams = createCloudflareStreamPort(presentationChannels);
    driver.realtime = createCloudflareRealtimePort(presentationChannels);
    driver.capabilities.push("streams", "realtime");
  }
  if (catalogDatabase !== null) {
    driver.catalog = createCloudflareCatalogPort(catalogDatabase);
    driver.capabilities.push("catalog");
  }
  return assertInfraDriver(driver);
}

export {
  createCloudflareCatalogPort,
  createCloudflareRealtimePort,
  createCloudflareStreamPort,
};
