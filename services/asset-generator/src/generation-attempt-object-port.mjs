const ATTEMPT_KIND = "generation_attempt";
const OUTPUT_KIND = "staged_provider_output";
const BUNDLE_KIND = "generation_attempt_bundle";
const BUNDLE_VERSION = "generation-attempt-bundle-v0.1";
const BUNDLE_PREFIX = "FIBRE-GENERATION-ATTEMPT-BUNDLE-V0.1\n";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function bytes(value) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value.slice();
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  throw new TypeError("immutable object bytes must be string, Uint8Array, or ArrayBuffer");
}

function concatBytes(...parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", bytes(value));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function encodeBundle({ attemptRef, outputRef, attemptBytes, attemptDigest, attemptMetadata, outputBytes, outputDigest, outputMetadata }) {
  const header = new TextEncoder().encode(JSON.stringify(canonicalize({
    bundleVersion: BUNDLE_VERSION,
    attemptRef,
    outputRef,
    attemptDigest,
    outputDigest,
    attemptLength: attemptBytes.length,
    attemptMetadata,
    outputMetadata,
  })));
  return concatBytes(
    new TextEncoder().encode(BUNDLE_PREFIX),
    new TextEncoder().encode(`${header.length}\n`),
    header,
    attemptBytes,
    outputBytes,
  );
}

function decodeBundle(raw, objectRef) {
  const value = bytes(raw);
  const prefix = new TextEncoder().encode(BUNDLE_PREFIX);
  if (value.length < prefix.length) throw new Error(`generation attempt bundle ${objectRef} is truncated`);
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) throw new Error(`generation attempt bundle ${objectRef} prefix is invalid`);
  }
  let cursor = prefix.length;
  let end = cursor;
  while (end < value.length && value[end] !== 10 && end - cursor <= 20) end += 1;
  if (end >= value.length || value[end] !== 10) throw new Error(`generation attempt bundle ${objectRef} header length is invalid`);
  const headerLength = Number(new TextDecoder().decode(value.subarray(cursor, end)));
  if (!Number.isSafeInteger(headerLength) || headerLength < 2) throw new Error(`generation attempt bundle ${objectRef} header length is invalid`);
  cursor = end + 1;
  const headerEnd = cursor + headerLength;
  if (headerEnd > value.length) throw new Error(`generation attempt bundle ${objectRef} header is truncated`);
  let header;
  try { header = JSON.parse(new TextDecoder().decode(value.subarray(cursor, headerEnd))); }
  catch { throw new Error(`generation attempt bundle ${objectRef} header is invalid JSON`); }
  plain("generation attempt bundle header", header);
  if (header.bundleVersion !== BUNDLE_VERSION) throw new Error(`generation attempt bundle ${objectRef} version is unsupported`);
  nonEmpty("generation attempt bundle.attemptRef", header.attemptRef);
  nonEmpty("generation attempt bundle.outputRef", header.outputRef);
  nonEmpty("generation attempt bundle.attemptDigest", header.attemptDigest);
  nonEmpty("generation attempt bundle.outputDigest", header.outputDigest);
  if (!Number.isSafeInteger(header.attemptLength) || header.attemptLength < 0) {
    throw new Error(`generation attempt bundle ${objectRef} attempt length is invalid`);
  }
  plain("generation attempt bundle.attemptMetadata", header.attemptMetadata);
  plain("generation attempt bundle.outputMetadata", header.outputMetadata);
  const attemptEnd = headerEnd + header.attemptLength;
  if (attemptEnd > value.length) throw new Error(`generation attempt bundle ${objectRef} attempt bytes are truncated`);
  return {
    header,
    attemptBytes: value.slice(headerEnd, attemptEnd),
    outputBytes: value.slice(attemptEnd),
  };
}

async function validatedBundle(stored, physicalRef) {
  const raw = bytes(stored.bytes);
  if (await sha256(raw) !== stored.digest) throw new Error(`generation attempt bundle ${physicalRef} digest mismatch`);
  const decoded = decodeBundle(raw, physicalRef);
  if (decoded.header.attemptRef !== physicalRef) throw new Error(`generation attempt bundle ${physicalRef} has wrong physical identity`);
  if (await sha256(decoded.attemptBytes) !== decoded.header.attemptDigest) {
    throw new Error(`generation attempt bundle ${physicalRef} attempt digest mismatch`);
  }
  if (await sha256(decoded.outputBytes) !== decoded.header.outputDigest) {
    throw new Error(`generation attempt bundle ${physicalRef} provider output digest mismatch`);
  }
  return decoded;
}

function bundleMetadata({ attemptRef, outputRef, attemptDigest, outputDigest, attemptMetadata }) {
  return {
    kind: BUNDLE_KIND,
    bundleVersion: BUNDLE_VERSION,
    jobId: attemptMetadata.jobId,
    jobDigest: attemptMetadata.jobDigest,
    attemptNumber: attemptMetadata.attemptNumber,
    attemptRef,
    outputRef,
    attemptDigest,
    outputDigest,
  };
}

export function createGenerationAttemptObjectPort(baseObjects) {
  plain("base object port", baseObjects);
  for (const method of ["putImmutable", "get", "head"]) {
    if (typeof baseObjects[method] !== "function") throw new TypeError(`base object port.${method} must be a function`);
  }
  const pendingAttempts = new Map();

  async function getVirtual(objectRef) {
    const direct = await baseObjects.get(objectRef);
    if (direct !== null) {
      if (direct.metadata?.kind !== BUNDLE_KIND) return direct;
      const decoded = await validatedBundle(direct, objectRef);
      return {
        bytes: decoded.attemptBytes,
        digest: decoded.header.attemptDigest,
        metadata: decoded.header.attemptMetadata,
      };
    }

    const match = /^provideroutput_(.+)_([1-9][0-9]*)$/.exec(objectRef);
    if (!match) return null;
    const attemptRef = `generationattempt_${match[1]}_${match[2]}`;
    const bundle = await baseObjects.get(attemptRef);
    if (bundle === null || bundle.metadata?.kind !== BUNDLE_KIND) return null;
    const decoded = await validatedBundle(bundle, attemptRef);
    if (decoded.header.outputRef !== objectRef) return null;
    return {
      bytes: decoded.outputBytes,
      digest: decoded.header.outputDigest,
      metadata: decoded.header.outputMetadata,
    };
  }

  return Object.freeze({
    async putImmutable(objectRef, rawBytes, digest, metadata = {}) {
      nonEmpty("objectRef", objectRef);
      nonEmpty("digest", digest);
      plain("metadata", metadata);

      if (metadata.kind === ATTEMPT_KIND) {
        const attemptBytes = bytes(rawBytes);
        if (await sha256(attemptBytes) !== digest) throw new Error("generation attempt logical digest does not match bytes");
        pendingAttempts.set(objectRef, {
          attemptRef: objectRef,
          attemptBytes,
          attemptDigest: digest,
          attemptMetadata: structuredClone(metadata),
        });
        return { duplicate: false, staged: true };
      }

      if (metadata.kind === OUTPUT_KIND) {
        const attemptRef = nonEmpty("generationAttemptId", metadata.generationAttemptId);
        const pending = pendingAttempts.get(attemptRef);
        if (!pending) {
          return baseObjects.putImmutable(objectRef, rawBytes, digest, metadata);
        }
        const outputBytes = bytes(rawBytes);
        if (await sha256(outputBytes) !== digest) throw new Error("provider output logical digest does not match bytes");
        if (metadata.generationAttemptDigest !== pending.attemptDigest) {
          throw new Error("provider output generationAttemptDigest does not match pending attempt");
        }
        const bundleBytes = encodeBundle({
          ...pending,
          outputRef: objectRef,
          outputBytes,
          outputDigest: digest,
          outputMetadata: structuredClone(metadata),
        });
        const physicalDigest = await sha256(bundleBytes);
        const result = await baseObjects.putImmutable(
          attemptRef,
          bundleBytes,
          physicalDigest,
          bundleMetadata({
            attemptRef,
            outputRef: objectRef,
            attemptDigest: pending.attemptDigest,
            outputDigest: digest,
            attemptMetadata: pending.attemptMetadata,
          }),
        );
        pendingAttempts.delete(attemptRef);
        return result;
      }

      return baseObjects.putImmutable(objectRef, rawBytes, digest, metadata);
    },

    get(objectRef) {
      return getVirtual(objectRef);
    },

    async head(objectRef) {
      const stored = await getVirtual(objectRef);
      if (stored === null) return null;
      return { digest: stored.digest, metadata: stored.metadata };
    },
  });
}
