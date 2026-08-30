function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return value;
}

function parseJsonObject(bytes, label) {
  const text = new TextDecoder().decode(bytes);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return parsed;
}

/**
 * Deployment adapter for World-owned canonical visual-root generation.
 *
 * Asset Generator remains the generic executor. Reconciliation re-submits the
 * same deterministic job; Asset Generator's durable resumable execution makes
 * this restart-safe and prevents a second provider operation after a durable
 * checkpoint or completed asset already exists.
 */
export function createCanonicalVisualRootBoundary({
  infra,
  assetRuntime,
  credentialSigner,
} = {}) {
  if (!infra?.objects || typeof infra.objects.get !== "function") {
    throw new TypeError("canonical visual root boundary requires object storage");
  }
  requireMethod("assetRuntime", assetRuntime, "execute");
  requireMethod("credentialSigner", credentialSigner, "verify");

  return Object.freeze({
    async reconcile({ job } = {}) {
      let generated;
      try {
        generated = await assetRuntime.execute(job);
      } catch (error) {
        if (error?.retryable === true) {
          return Object.freeze({ state: "pending", retryable: true });
        }
        throw error;
      }

      const asset = await infra.objects.get(generated.receipt.objectRef);
      if (!asset) throw new Error(`canonical visual root asset ${generated.receipt.objectRef} is not durable`);
      const generationRecordStored = await infra.objects.get(generated.generationRecordObjectRef);
      if (!generationRecordStored) {
        throw new Error(`canonical visual root generation record ${generated.generationRecordObjectRef} is not durable`);
      }
      const verification = await credentialSigner.verify({
        bytes: asset.bytes,
        mediaType: generated.receipt.mediaType,
      });
      if (verification.valid !== true) {
        throw new Error("canonical visual root credential verification failed");
      }
      return Object.freeze({
        state: "ready",
        recordedAt: generated.receipt.completedAt,
        proof: Object.freeze({
          receipt: generated.receipt,
          generationRecord: parseJsonObject(
            generationRecordStored.bytes,
            `canonical visual root generation record ${generated.generationRecordObjectRef}`,
          ),
          verification,
        }),
      });
    },
  });
}
