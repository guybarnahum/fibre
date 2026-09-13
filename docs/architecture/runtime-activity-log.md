---
id: architecture-runtime-activity-log
status: proposed
last-reviewed: 2026-09-13
canonical: false
---

# Fibre Runtime Activity Log v0.1

## Purpose

Provide one global, queryable, append-only operational log that answers a practical debugging question:

> For this Genesis request, Thread, Experience or runtime operation, what succeeded, what failed, what retried, what directly caused it, and where did the chain stop?

The first consumer is the fully-cloud Slice G birth-to-Viewer E2E. The same facility should later cover ordinary Thread Experiences and other asynchronous runtime work.

This is deliberately a simplified durable activity log plus Fibre causal correlation. It is **not** a full distributed tracing/OpenTelemetry system and is **not** another Fibre semantic authority.

## Non-authority rule

The Activity Log observes Fibre; it does not decide Fibre.

Authoritative state remains in the existing domain authorities:

- World `thread_events` and projections own admitted Thread/world history;
- Birth Center owns provisional Genesis development/recovery state;
- Genesis/World stores own publication provenance;
- Embodiment, identity, memory, relationship and other domain stores keep their existing authority;
- Presentation remains a projection.

An Activity record may reference an authoritative `eventId`, object digest, FIN, Embodiment ID, provider request ID or other witness. It never replaces that witness.

A telemetry outage must not create, suppress, roll back or authorize a Fibre semantic transition. Missing Activity records are an observability failure, not evidence that the underlying semantic event did or did not occur.

## v0.1 goals

The first version must make these queries easy:

```text
show everything for requestId X
show everything for genesisId Y
show everything for threadId Z
show all failed stages for Thread Z
show retries/recovery for one stage
show where the Slice G E2E stopped
show all failures in staging since time T
```

It should generate a human-readable runtime chain without inspecting five independent services by hand.

## Identity and causal linkage

Do not use only `threadId`. Failures can occur before a live Thread exists.

Every record may carry:

```text
requestId          outer operation/request; primary key for one Genesis E2E chain
genesisId          provisional Genesis identity when known
threadId           canonical machine Thread identity when known
experienceId       later: one lived Experience/episode when defined
sessionId          later: thaw/runtime session when defined
correlationId      root operational correlation; defaults to requestId when present
operationId        one stable identity shared by one runStage start/terminal pair
parentOperationId  direct nested operational parent when the caller actually knows it
causationId        direct Fibre/domain cause when the work is asynchronous or restart-driven
```

Use two deliberately small causal mechanisms:

1. `parentOperationId` for **synchronous/nested operational work**. Example: Genesis cognition calls are children of the enclosing Genesis life-development operation; World admission calls are children of the Birth World-submission operation.
2. `causationId` for **domain causation across asynchronous/restart boundaries**. Prefer the authoritative witness already present in Fibre: World event ID, Embodiment ID, canonical object ref, asset job ID, command ID, or similar.

Never infer causation from timestamps or D1 row order. If the caller does not know a parent or direct cause, leave it null rather than manufacture a graph.

For Genesis, `correlationId = requestId` is the root operational grouping unless an emitter provides a stronger explicit correlation. `genesisId` and `threadId` are attached as soon as they are derivable/known.

A full distributed `traceId/spanId` model remains deferred. `operationId` is intentionally narrower: enough to pair one operation and name real nested children, without importing generic tracing machinery.

## Tiny activity state model

Keep status vocabulary intentionally small:

```text
started
succeeded
failed
retrying
```

Detailed resolution comes from the **stage name**, not from a large status machine.

A later version may add `recovered` or `abandoned` if real runtime cases demonstrate that they materially improve inspection. Do not add them preemptively.

## Activity record v0.1

Conceptual shape:

```json
{
  "activityVersion": "fibre-runtime-activity-v0.1",
  "activityId": "act_...",
  "operationId": "op_...",
  "parentOperationId": "op_parent_...",
  "occurredAt": "2026-09-01T05:31:12.123Z",
  "recordedAt": "2026-09-01T05:31:12.129Z",

  "environment": "staging",
  "service": "birth-center",
  "deploymentGitSha": "<40-char-sha>",

  "requestId": "genesis-staging-...",
  "genesisId": "gen_...",
  "threadId": "thr_...",
  "experienceId": null,
  "sessionId": null,
  "correlationId": "genesis-staging-...",
  "causationId": null,

  "stage": "birth.genesis.history.cognition_call",
  "status": "failed",
  "attempt": 2,

  "message": "History realization call timed out",

  "error": {
    "category": "provider",
    "code": "MODEL_TIMEOUT",
    "retryable": true
  },

  "evidence": {
    "providerRequestId": "req_...",
    "eventId": null,
    "objectRef": null,
    "digest": null
  }
}
```

### Required fields

At minimum:

```text
activityVersion
activityId
occurredAt
environment
service
stage
status
attempt
```

`operationId`, parent/direct cause, request/genesis/thread and later experience/session identities are nullable because legacy or early records may precede them.

### Error categories

Keep error classification small and operational:

```text
validation
invariant
conflict
authorization
dependency
provider
timeout
network
storage
queue
workflow
reconciliation
unknown
```

`message` is diagnostic prose, not semantic Thread state.

### Safe evidence

Prefer identifiers and digests:

```text
providerRequestId
eventId
commandId
objectRef
digest
worldSpecId
genomeId
embodimentId
fibreIdentityNumber
queueMessageId / workflow instance identifier when useful
failedGate / repairOrdinal when a bounded validation repair occurred
```

Do not persist:

- API keys, authorization headers or tokens;
- raw model prompts or chain-of-thought;
- unrestricted provider responses;
- private Thread biography dumps;
- rejected biographical/action text merely to explain a repair;
- private stance/rationale content merely because it would be convenient for debugging.

Sensitive domain details stay inspectable through their existing access-controlled authorities. The Activity Log points to them.

## Stage vocabulary

The mechanism remains simple even if the stage vocabulary is detailed. Stage names are stable operational checkpoints and use hierarchical dot-separated names.

### E2E operator

```text
e2e.start
e2e.preflight.git
e2e.preflight.deployment_evidence
e2e.preflight.endpoints
e2e.prebirth.birth_absence
e2e.prebirth.world_absence
e2e.prebirth.presentation_absence
e2e.birth_submit
e2e.birth_publish_wait
e2e.birth_replay
e2e.world_convergence_wait
e2e.presentation_convergence_wait
e2e.viewer_visibility
e2e.asset_visibility
e2e.evidence_write
e2e.complete
```

### Birth Center / Genesis request lifecycle

```text
birth.request.receive
birth.request.validate
birth.request.plan
birth.request.persist
birth.request.resume

birth.genesis.start
birth.genesis.world_context
birth.genesis.genome_bind
birth.genesis.participant_context
birth.genesis.historical_envelope
birth.genesis.history
birth.genesis.memory_selection
birth.genesis.meaning_formation
birth.genesis.identity_bootstrap
birth.genesis.visual_identity_spec
birth.genesis.compile
birth.genesis.validate
birth.genesis.seal

birth.publish.prepare
birth.publish.world_submit
birth.publish.world_ack
birth.publish.reconcile
birth.publish.complete
```

Where one Genesis stage makes multiple provider calls, use a more precise child stage or evidence label rather than collapsing all cognition into one generic call:

```text
birth.genesis.history.cognition_call
birth.genesis.history.repair_call
birth.genesis.memory_selection.cognition_call
birth.genesis.meaning_formation.cognition_call
birth.genesis.meaning_reinterpretation.cognition_call
```

The exact list should follow real Genesis seams. Do not invent checkpoints that cannot be emitted from a durable code boundary.

### World admission

```text
world.birth.receive
world.birth.validate
world.worldspec.admission
world.genome.admission
world.lineage.admission
world.history.admission
world.memory.admission
world.identity.admission
world.civil_registration
world.thread.seed
world.thread.publication
world.birth.commit
world.birth.replay
```

### Downstream reconciliation / Embodiment

```text
world.reconciliation.wake
world.reconciliation.scan
world.visual_identity.demand
world.embodiment.reconcile
world.embodiment.admission
world.reconciliation.complete
```

Asynchronous visual recovery should use real domain causes rather than preserving an artificial request span forever. The useful chain is:

```text
World origin event
  -> canonical Embodiment
  -> canonical visual object
  -> admitted Embodiment
  -> Presentation projection/media demand
  -> derived public asset
```

The corresponding `eventId`, `embodimentId`, and `objectRef` remain authoritative elsewhere; Activity only references them.

### Asset Generator

```text
asset.request.receive
asset.request.validate
asset.reference.resolve
asset.provider.select
asset.provider.request
asset.provider.output_stage
asset.provenance.record
asset.finalize
asset.completion.publish
```

Retries use the same stage with increasing `attempt` and status `retrying`/`started`/`succeeded` or `failed`.

### Thread Presentation

```text
presentation.completion.receive
presentation.completion.validate
presentation.world_authority.resolve
presentation.visual_identity.project
presentation.identity_media.ensure
presentation.media_demand.reconcile
presentation.catalog.publish
presentation.snapshot.publish
presentation.asset.serve
```

### Viewer / public visibility

```text
viewer.origin.reachable
viewer.thread.discoverable
viewer.thread.snapshot_resolvable
viewer.canonical_asset_resolvable
```

### Later ordinary Experience/runtime vocabulary

The first implementation does not need to instrument all of these, but the naming scheme should preserve the path:

```text
experience.start
experience.trigger
experience.context_select
experience.appraisal
experience.participation_stance
experience.authorization
experience.thaw
experience.reasoning
experience.action
experience.world_commit
experience.memory
experience.meaning
experience.relationship_effect
experience.freeze
experience.complete
```

These names are operational checkpoints, not new semantic authorities.

## Retry representation

Do not create a separate complex retry object in v0.1.

Example:

```text
asset.provider.request  attempt=1  started
asset.provider.request  attempt=1  failed     BFL_TIMEOUT
asset.provider.request  attempt=2  retrying
asset.provider.request  attempt=2  started
asset.provider.request  attempt=2  succeeded
```

The inspector derives "succeeded after 2 attempts" from the append-only records.

If the same Activity write is retried because telemetry acknowledgement was lost, the emitter should reuse a stable `activityId` where practical so the store can make admission idempotent. Duplicate transport delivery must not create misleading duplicate logical activities.

## API shape

Keep application usage tiny.

### `record()`

Conceptually:

```js
await activity.record({
  requestId,
  genesisId,
  threadId,
  causationId: embodimentId,
  stage: "world.visual_identity.demand",
  status: "succeeded",
  attempt: 1,
  evidence: { embodimentId, objectRef },
});
```

### `runStage()`

For ordinary start/success/failure boundaries:

```js
await activity.runStage(
  {
    requestId,
    genesisId,
    threadId,
    parentOperationId,
    stage: "birth.genesis.history.cognition_call",
    attempt,
  },
  async ({ operationId }) => {
    // A real nested child may use this operationId as parentOperationId.
    return cognition.invoke(...);
  },
);
```

`runStage()` allocates one stable `operationId`, emits `started`, then `succeeded` or `failed` with that same operation identity. Domain-specific retry code explicitly emits `retrying` before another attempt.

Do not hide domain retry policy or infer children inside the telemetry helper. The service that owns the operation remains the retry authority and names a parent only when it actually knows one.

## Provider-neutral boundary

The long-term application boundary belongs under the already-planned `InfraDriver.telemetry` capability.

Conceptually:

```text
Fibre service
    -> ActivityRecorder
    -> InfraDriver.telemetry
    -> local provider / cloud provider
```

For v0.1, only the smallest exercised surface is required. Do not turn `telemetry` into a large generic interface before the Activity Log proves what Fibre actually needs.

## Cloudflare storage shape

Current cloud implementation:

```text
Workers
   -> ActivityRecorder
   -> dedicated Activity Log D1 database
```

Use a separate operational/telemetry store rather than authoritative World state. This keeps the side facility outside World transaction semantics and allows retention/indexing to evolve independently.

Indexed table fields remain the small paging/query envelope:

```text
activity_id PRIMARY KEY
occurred_at
recorded_at
environment
service
deployment_git_sha
request_id
genesis_id
thread_id
experience_id
session_id
correlation_id
causation_id
stage
status
attempt
message
error_json
evidence_json
record_json
```

`operationId` and `parentOperationId` are additive fields in normalized `record_json`; v0.1 does not need a D1 migration or operation index merely to render a causal trail.

Useful indexes remain:

```text
(request_id, occurred_at)
(genesis_id, occurred_at)
(thread_id, occurred_at)
(stage, status, occurred_at)
(service, occurred_at)
(environment, occurred_at)
```

No global semantic sequence is required. D1 insertion/arrival order may be retained for display convenience but must never be described as causal World ordering.

## Local provider

The local implementation may use a dedicated SQLite database or deterministic in-memory implementation for tests. It should obey the same normalized record/query contract as Cloudflare.

## Query and inspection surface

The Admin Activity workspace provides two deliberately different surfaces:

- **Raw**: exact admitted Activity records.
- **Causal**: meaningful terminal/retry operations, hiding successful provider-commit plumbing while preserving failures, retries and durable replay evidence. It renders explicit operation parents and direct domain causes; it does not infer causality from chronology.

A Thread query resolves human identity and public Presentation media from their authorities rather than manufacturing name/FIN/assets from the current Activity page.

The raw JSON export remains available for machines and retained E2E evidence.

## Slice G integration

Instrument Slice G first because it crosses all relevant cloud boundaries.

Minimum emitters:

1. E2E runner
2. Birth Center
3. World Kernel
4. Asset Generator
5. Thread Presentation

The goal is not exhaustive logging. It is enough coverage to locate the failed boundary and reconstruct real handoffs without manually correlating each service.

The Slice G evidence file may retain the `requestId` plus an Activity Log query/reference. Authoritative Slice G assertions continue to be proved from their existing inspection/evidence surfaces. Activity Log success is not silently substituted for them.

## Acceptance criteria for v0.1

The Activity Log v0.1 is useful when all of these are true:

1. One cloud Genesis E2E request can be reconstructed by `requestId`.
2. After identity is known, the same chain is queryable by `genesisId` and `threadId`.
3. A deliberate provider or reconciliation failure shows the exact failed stage, service, attempt and retryability.
4. A successful retry is visible without overwriting the earlier failure.
5. Nested operations use explicit operation parentage rather than timestamp inference.
6. Restart-driven work points to authoritative domain causes such as events, Embodiments and object refs.
7. World semantic events are referenced by IDs/digests rather than copied into telemetry as authority.
8. No secret/token/raw chain-of-thought/private biography payload is stored.
9. Duplicate telemetry delivery is idempotent or visibly deduplicated by `activityId`.
10. Telemetry storage failure cannot create or roll back a Thread, birth, authorization, Embodiment or publication.
11. Raw remains exact while Causal can render a concise meaningful chain.
12. Local and Cloudflare providers expose the same normalized record/query behavior required by the exercised surface.

## Deliberately deferred

For v0.1 do not add:

- full OpenTelemetry dependency;
- generic distributed trace/span DAGs;
- a generic event-reduction framework;
- D1 parent/operation indexes without a demonstrated query need;
- metrics dashboards;
- log sampling policy beyond basic retention needs;
- arbitrary large diagnostic attachments;
- cross-region global ordering;
- semantic lifecycle authority;
- activity-derived personhood evidence.

These remain open extension paths. Add richer tracing only if real concurrency/debugging cases exceed the small Fibre-specific `operationId` + `parentOperationId` + `causationId` model.

## Vision and ambition check

**Fidelity:** this is operational/debugging infrastructure. It does not itself make a Thread more person-like and must not be counted as personhood evidence. It supports human inspectability and makes failures/recovery of the machinery surrounding persistent lives easier to audit.

**Ambition:** the narrow v0.1 does not redefine Thread history as logs, does not collapse World authority into telemetry, and leaves room for many interacting Threads, ordinary-life Experiences and distributed runtimes.

**Causal individuality:** none is claimed. Activity records observe causal/personhood-bearing mechanisms; they do not create or prove causal individuality by themselves.
