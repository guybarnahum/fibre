# Asset generation reuse semantics

Asset Generator reuse is provider-neutral and exact. It is an execution/provenance optimization, not a Thread meaning, memory, identity, or presentation-authority decision.

## Cache key

The cache proof is the full SHA-256 digest of the complete normalized `AssetGenerationJob` witness. The visible 12-hex `jobId`, output ref, and receipt ref are durable Fibre identifiers, but they are not sufficient evidence that two job witnesses are identical.

If a short identifier resolves to an existing completed asset whose full job witness differs, execution fails closed with an immutable conflict. It does not return the old asset and it does not generate a replacement under the occupied identity.

There is no fuzzy prompt cache or cross-job semantic-similarity cache. Similar or identical-looking briefs in distinct jobs remain distinct provider generations. A future cross-job cache would require explicit provenance, authorization, attribution, and policy semantics.

## Reuse modes

`AssetGenerationReuse` records one of three modes:

```text
none
  A media-provider generation call was performed by this invocation.

staged_provider_output
  An earlier successful GenerationAttempt for the exact job digest supplied the raw provider bytes.
  No media-provider generation call was performed by this invocation.

completed_asset
  The exact job already had a valid immutable StoredAssetReceipt and final credentialed asset.
  No media-provider generation call or Content Credential embed was performed by this invocation.
  The existing credential is re-verified before reuse.
```

Every observation names `cacheScope: exact_job_digest` and the full job digest. Staged-output reuse also names the durable `GenerationAttempt` that owns those provider bytes.

## Credential policy is part of safe completed reuse

A completed asset is reusable only when the requested prompt-disclosure policy matches the verified embedded Content Credential assertion.

For example, an asset created under `digest_only` cannot later be returned as though it were a `public_text` asset. Fibre does not mutate or silently re-sign an immutable completed asset under the same identity. A caller that intentionally wants a different credential policy must request a distinct generation identity.

## Relationship to retries

Workflow retry count is not a cache identity.

Before provider success is durably staged, a transient provider failure may cause a later provider attempt. Once provider success is staged, retries resume that exact attempt rather than buying another nondeterministic provider result. Once the whole job is complete, repeated execution uses `completed_asset` reuse.

The GenerationAttempt record and raw provider bytes are committed as one immutable physical bundle behind the provider-neutral Asset Generator object-port decorator. This prevents a crash from leaving a provider-success record without the bytes required to resume it.

## Thread Presentation

Thread Presentation owns the semantic generation demand. Its reconciliation identity already changes when the semantic source, provider profile, or explicit `regenerationKey` changes. Unchanged reconciliation retains the original persisted demand and exact job witness rather than rebuilding a merely similar job with a new timestamp or snapshot-local context.

Asset Generator does not infer those semantics. It receives the resulting job and only decides whether that exact job witness already has safely reusable execution state.
