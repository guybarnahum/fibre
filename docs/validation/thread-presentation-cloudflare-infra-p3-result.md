---
id: validation-thread-presentation-cloudflare-infra-p3-result
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation Cloudflare InfraDriver — P3 validation handoff

## Status

**NEEDS MAINTAINER VALIDATION.**

This slice implements the first production-provider capabilities of the general Fibre `InfraDriver` for Cloudflare:

```text
InfraDriver.objects    -> R2 binding
InfraDriver.workflows  -> Cloudflare Workflows binding
```

It does **not** yet implement the full Thread Presentation Cloudflare profile (`streams`, `realtime`, `catalog`) and it does not yet prove a deployed Worker or real remote Cloudflare resources.

## Capability proved by this slice

The implementation is intended to prove that application services can use the same `InfraDriver` object/workflow contracts against Cloudflare-shaped bindings without importing Cloudflare products into Fibre domain/application semantics.

### R2 object port

Logical Fibre object references map privately to:

```text
fibre/objects/<objectRef>
```

The provider key is not exposed as Fibre semantic identity.

`putImmutable()`:

- uses an R2 conditional create (`etagDoesNotMatch: "*"`);
- sends the caller's SHA-256 checksum to R2;
- stores Fibre digest + canonical object metadata as R2 custom metadata;
- on an existing key, accepts only byte-for-byte + digest + metadata equality as an idempotent duplicate;
- otherwise raises `InfraImmutableObjectConflictError`.

`get()` / `head()` recover Fibre digest and metadata rather than exposing R2-specific locators.

### Workflow port

Cloudflare Workflow instance IDs are operational provider identities. Fibre therefore persists its own durable witnesses through the object port:

```text
workflowinput:<workflowName>:<instanceId>
workflowstarted:<workflowName>:<instanceId>
```

The input witness establishes the exact Fibre job identity/input. Reusing the same workflow instance ID with a different input raises `InfraWorkflowConflictError` before the provider may execute a conflicting job.

The separate started witness distinguishes:

```text
input reserved
  !=
Cloudflare execution confirmed
```

This matters because a transient `Workflow.create()` failure after input-witness persistence must remain retryable. A same-input retry may call `create()` while the input witness exists but no started witness exists.

Once a start is confirmed, later loss/expiry of Cloudflare operational instance status returns `status: "unknown"`; it does not silently create another execution.

## Cross-service atomicity boundary

R2 object creation and Cloudflare Workflow creation are different provider operations and cannot be committed as one atomic transaction by this adapter.

The driver therefore provides the strongest practical sequence available through these capabilities:

```text
1. reserve exact input identity immutably
2. check whether execution was previously confirmed
3. create or recover Workflow instance
4. persist immutable start-confirmed witness
```

A process failure after provider creation but before the start-confirmed witness remains a theoretical ambiguity window. On retry, the driver first attempts to recover the same provider instance by ID; if recovery succeeds it records the start witness rather than creating a second semantic job.

This is not permission for asset-generation effects to be non-idempotent. Generated outputs, GenerationRecords and StoredAssetReceipts remain deterministic/idempotent immutable writes keyed by Fibre job identity. A later provider implementation must preserve that discipline.

## R2 metadata bound

The v1 adapter stores the small Fibre object metadata envelope in R2 custom metadata for efficient `head()` behavior. Cloudflare currently places a finite size limit on R2 custom metadata. This is an infrastructure implementation bound, not a Fibre semantic-record bound.

Application services must keep object-port metadata compact. Large semantic/provenance records belong in immutable object bytes and should be linked by Fibre object reference/digest rather than copied into R2 metadata.

If a later application needs arbitrarily large object metadata, the Cloudflare driver may introduce a companion immutable metadata object without changing the `InfraDriver.objects` contract.

## Current Cloudflare driver profile

Implemented:

```text
objects     R2-shaped binding adapter
workflows   Cloudflare Workflows-shaped binding adapter
```

Not yet implemented:

```text
streams      per-Thread ordered Durable Object + SQLite
realtime     Durable Object WebSocket fanout/resume
catalog      D1 query/discovery mirror
queues       optional fan-out/backpressure
```

The driver exports from:

```text
@fibre/infra/cloudflare-v1
```

## Targeted validation

From the `fibre` repository:

```bash
git fetch origin
git switch agent/thread-presentation-milestones-v1
git pull --ff-only

git status --short

node --test packages/infra/test/cloudflare-v1.test.mjs
node --test services/asset-generator/test/credentialed-asset-generation.test.mjs
node --test services/world-kernel/test/thread-presentation-asset-publisher.test.mjs
node --test tools/test-infra/test-suite-lifecycle.test.mjs

npm run includes:check
npm run validate
npm test

git diff --check agent/pr39-genesis-childhood-birth-v1...HEAD
```

Expected new targeted results:

```text
packages/infra/test/cloudflare-v1.test.mjs                 4 pass / 0 fail
services/asset-generator/test/credentialed-asset-generation.test.mjs
                                                             5 pass / 0 fail
services/world-kernel/test/thread-presentation-asset-publisher.test.mjs
                                                             2 pass / 0 fail
```

The lifecycle test must prove the new `packages/infra/test/*.test.mjs` regressions are part of the normal active suite.

## Negative properties pinned

The Cloudflare driver tests require:

- an immutable R2 logical object cannot be silently overwritten;
- exact duplicate immutable writes are idempotent;
- R2 provider keys remain private implementation details;
- same workflow ID + different Fibre input fails closed;
- same workflow ID + same Fibre input does not create a second confirmed execution;
- an expired provider status does not silently restart a confirmed Fibre job;
- a transient create failure before the start-confirmed witness remains retryable;
- Fibre's durable workflow input remains recoverable even when provider operational status is gone.

The adjacent provenance tests additionally require that generated public media cannot become `media.ready` without successful credential/provenance verification.

## Causal / scope posture

This is infrastructure behavior, not personhood evidence. It makes async derived-media execution and storage portable and more reliable; it does not establish Thread life, embodiment, memory, meaning, agency or autonomous activity.

Generated media remains `generated_reconstruction` and cannot become Thread-life evidence through this driver.

## P3 relationship

After this slice validates, P3-D/E has:

```text
CLEAR / validated foundations
  PresentationServer semantics
  memory InfraDriver
  async AssetGenerationService
  credentialed asset provenance/publication gate
  insidefibre snapshot viewer + reducer

new Cloudflare provider implementation
  objects + workflows
```

P3 still remains **open** until the remaining Cloudflare presentation profile and one real vertical path are demonstrated:

```text
Cloudflare streams/realtime/catalog
        +
real deployed/local Worker bindings
        +
real image provider
        +
real C2PA-compatible ContentCredentialSigner
        ->
one eligible Cần Thơ place reconstruction
        -> R2 final credentialed asset
        -> media.ready
        -> insidefibre render
```

Portrait generation remains deferred until an accepted embodiment reconstruction brief exists.
