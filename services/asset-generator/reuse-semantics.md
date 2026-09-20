# Asset generation reuse semantics

Asset Generator reuse is provider-neutral and exact. It is an execution/provenance optimization, not a Thread meaning, memory, identity, or presentation-authority decision.

## Cache key

The cache proof is the full SHA-256 digest of the complete normalized `AssetGenerationJob` witness. The visible 12-hex `jobId`, output ref, and receipt ref are durable Fibre identifiers, but they are not sufficient evidence that two job witnesses are identical.

If a short identifier resolves to an existing completed asset whose full job witness differs, execution fails closed with an immutable conflict. It does not return the old asset and it does not generate a replacement under the occupied identity.

There is no fuzzy prompt cache or cross-job semantic-similarity cache. Similar-looking briefs in distinct jobs remain distinct provider generations.

## Reuse modes

`AssetGenerationReuse` records one of three modes:

```text
none
  A media-provider generation call was performed by this invocation.

staged_provider_output
  An earlier successful GenerationAttempt for the exact job digest supplied the provider bytes.
  No media-provider generation call was performed by this invocation.

completed_asset
  The exact job already has a valid immutable StoredAssetReceipt and final asset.
  No media-provider generation call was performed by this invocation.
  Fibre re-verifies the stored receipt, generation provenance and exact final bytes before reuse.
```

Every observation names `cacheScope: exact_job_digest` and the full job digest. Staged-output reuse also names the durable `GenerationAttempt` that owns those provider bytes.

## Relationship to retries

Workflow retry count is not a cache identity.

Before provider success is durably staged, a transient provider failure may cause a later provider attempt only when replay is safe. Once provider success is staged, retries resume that exact attempt rather than buying another nondeterministic provider result. Once the whole job is complete, repeated execution uses `completed_asset` reuse.

The GenerationAttempt record and provider bytes are committed through the provider-neutral Asset Generator object-port seam so a successful provider result remains recoverable across workflow retry/restart.

## Thread Presentation

Thread Presentation owns the semantic generation demand. Its reconciliation identity changes when the semantic source, provider profile, or explicit `regenerationKey` changes. Unchanged reconciliation retains the original persisted demand and exact job witness rather than rebuilding a merely similar job with a new timestamp or snapshot-local context.

Asset Generator does not infer those semantics. It receives the resulting job and only decides whether that exact job witness already has safely reusable execution state.
