# Asset Generator

Provider-neutral asynchronous media generation for Fibre. The stable consumer entry point is `src/index.mjs`.

Asset Generator owns generation mechanics, not Fibre meaning. It receives a versioned `AssetGenerationJob`, calls a selected media provider, records exact provider provenance, stores immutable bytes and receipts, and emits a minimal completion pointer. It does **not** own Thread identity, history, memory, embodiment, presentation authority, or the decision that generated media is publishable.

## Durable generation path

The current path is intentionally singular:

```text
AssetGenerationJob
  -> provider operation / retry-safe resume when needed
  -> GenerationAttempt
  -> immutable staged provider output
  -> GenerationRecord
  -> immutable final asset
  -> StoredAssetReceipt
  -> AssetGenerationCompletion
```

The `GenerationRecord` retains the exact Fibre semantic brief, the secret-stripped provider request witness, provider/model identity, and digests for the brief, provider request, and provider output. The final stored asset is checked against the receipt and durable provider-output digest before publication.

`ProviderOperation`, `GenerationAttempt`, and `AssetGenerationJob` have distinct identities. Once an asynchronous provider task is durably checkpointed, retries resume that same task. Once provider output is durably staged, retries reuse those exact bytes and never make another nondeterministic provider call.

Generated media remains reconstruction/presentation material unless another Fibre authority establishes a different status.

## Publication proof

Today, Asset Generator publication proof is Fibre-native immutable provenance:

- exact job and generation record;
- exact provider request witness with secrets removed;
- durable provider-output bytes and digest;
- exact final bytes and digest;
- immutable receipt binding those facts together.

Thread Presentation independently reloads and verifies that proof before emitting `media.ready`. Asset Generator never emits presentation events itself.

## Future embedded proof

Asset Generator does **not** currently add an embedded signature to generated media.

If Fibre chooses to embed signed provenance in generated PNGs, it must reuse the native mechanism already proven by FIN card images:

```text
canonical JSON assertion
  -> SHA-256 assertion digest
  -> Ed25519 signature
  -> Fibre proof envelope
  -> Fibre PNG chunk
  -> extraction + signature + raw-render digest verification
  -> immutable storage
```

The reference implementation is under `services/fibre-identity-authority/src/fid-card-proof*.mjs`. Asset Generator should reuse or extract the generic signing/PNG-envelope primitive, while defining an asset-specific assertion schema. It should not introduce an external signer service, a second trust framework, or FIN-specific identity semantics into generic asset generation.

## Provider adapters

Media providers are injected behavior providers, not `InfraDriver` capabilities. Current image integrations are OpenAI and BFL, selected by deployment profile in `infra/deployments/integration-selection.mjs`.

Provider credentials remain deployment secrets and never enter jobs, provider witnesses, generation attempts, or generation records.

BFL uses an asynchronous task API. Fibre durably records the accepted provider operation before polling/resuming it. Submission ambiguity remains terminal when Fibre cannot prove whether the provider accepted the request.

## Retry safety

`AssetGenerationError` and `assetGenerationRetryDecision(...)` carry provider-neutral retry semantics. Fibre retries only when it can prove doing so will not duplicate a nondeterministic or billable provider operation.

Important states are:

- before provider acceptance: retry only when the adapter establishes replay safety;
- accepted asynchronous task durably checkpointed: resume the same task;
- provider bytes returned but not durably staged: do not blindly regenerate;
- provider bytes durably staged: finalize from those exact bytes;
- completion publication: retryable because it republishes only a pointer to immutable output.

## Portable runtime

`createAssetGenerationRuntime({ infra, provider })` is the infrastructure-independent execution seam.

The runtime requires `InfraDriver.objects`; completion publication additionally uses `InfraDriver.queues`. Scheduling is handled through `InfraDriver.workflows`.

Cloud/runtime-specific composition belongs under `infra/deployments/`, not in the service.

## Completion contract

`AssetGenerationCompletion` contains only:

```text
completionVersion
jobId
receiptObjectRef
receiptDigest
```

It carries no Thread, World, media, status, or publication meaning. The receiving domain resolves the immutable receipt, verifies Fibre provenance, binds it to its own durable demand, and authors any semantic publication.

Related architecture:

- `docs/decisions/ADR-0014-generated-asset-provenance.md`
- `docs/architecture/asset-generation-service.md`
- `docs/architecture/production-persistence.md`
- `reuse-semantics.md`
- `provider-operation-recovery.md`
