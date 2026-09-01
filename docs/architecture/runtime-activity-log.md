---
id: architecture-runtime-activity-log
status: proposed
last-reviewed: 2026-09-01
canonical: false
---

# Fibre Runtime Activity Log v0.1

## Purpose

Provide one global, queryable, append-only operational log that answers a practical debugging question:

> For this Genesis request, Thread, Experience or runtime operation, what succeeded, what failed, what retried, and where did the chain stop?

The first consumer is the fully-cloud Slice G birth-to-Viewer E2E. The same facility should later cover ordinary Thread Experiences and other asynchronous runtime work.

This is deliberately a simplified form of a durable activity log plus causal correlation. It is **not** a full distributed tracing/OpenTelemetry system and is **not** another Fibre semantic authority.

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

## Identity and correlation

Do not use only `threadId`. Failures can occur before a live Thread exists.

Every record may carry:

```text
requestId       outer operation/request; primary key for one Genesis E2E chain
genesisId       provisional Genesis identity when known
threadId        canonical machine Thread identity when known
experienceId    later: one lived Experience/episode when defined
sessionId       later: thaw/runtime session when defined
correlationId   existing Fibre causal/correlation identity when available
causationId     existing Fibre direct-cause identity when available
```

For Slice G v0.1, `requestId` is sufficient to reconstruct one birth chain. `genesisId` and `threadId` are attached as soon as they are derivable/known.

A separate distributed `traceId/spanId` model is deferred. The schema should leave room to add it later without replacing the basic identity envelope.

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
  "correlationId": null,
  "causationId": null,

  "stage": "birth.genesis.history.model_call",
  "status": "failed",
  "attempt": 2,

  "message": "OpenAI history realization call timed out",

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

`requestId`, `genesisId`, `threadId` and later experience/session identities are nullable because early failures may precede them.

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
```

Do not persist:

- API keys, authorization headers or tokens;
- raw model prompts or chain-of-thought;
- unrestricted provider responses;
- private Thread biography dumps;
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
birth.genesis.history.model_call
birth.genesis.history.repair_call
birth.genesis.memory_selection.model_call
birth.genesis.meaning_formation.model_call
birth.genesis.identity_bootstrap.model_call
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
  service: "world-kernel",
  requestId,
  genesisId,
  threadId,
  stage: "world.thread.publication",
  status: "succeeded",
  attempt: 1,
  message: "Authoritative Thread admitted",
  evidence: { eventId },
});
```

### `runStage()`

For ordinary start/success/failure boundaries:

```js
await activity.runStage(
  {
    service: "asset-generator",
    requestId,
    genesisId,
    threadId,
    stage: "asset.provider.request",
    attempt,
  },
  async () => provider.generate(...),
);
```

`runStage()` emits `started`, then `succeeded` or `failed`. Domain-specific retry code explicitly emits `retrying` before another attempt.

Do not hide domain retry policy inside the telemetry helper. The domain/service that owns the operation remains the retry authority.

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

Recommended first cloud implementation:

```text
Workers
   -> ActivityRecorder
   -> dedicated Activity Log D1 database
```

Use a separate operational/telemetry store rather than authoritative World state. This keeps the side facility outside World transaction semantics and allows retention/indexing to evolve independently.

Initial table fields should closely mirror the record envelope:

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
```

Useful indexes:

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

Initial CLI goal:

```text
npm run inspect:activity -- --request <requestId>
npm run inspect:activity -- --genesis <genesisId>
npm run inspect:activity -- --thread <threadId>
npm run inspect:activity -- --failures
```

Human output should be concise and chronological, for example:

```text
REQUEST genesis-staging-123
THREAD  thr_123
GENESIS gen_123

05:31:00.004  e2e                 e2e.start                         succeeded
05:31:00.122  birth-center        birth.request.validate            succeeded
05:31:03.902  birth-center        birth.genesis.history.model_call  succeeded  attempt=1
05:31:14.100  world-kernel        world.thread.publication          succeeded
05:31:15.225  asset-generator     asset.provider.request            failed     attempt=1 BFL_TIMEOUT
05:31:17.227  asset-generator     asset.provider.request            retrying   attempt=2
05:31:20.813  asset-generator     asset.provider.request            succeeded  attempt=2
05:31:21.102  thread-presentation presentation.snapshot.publish     succeeded
05:31:21.488  e2e                 viewer.thread.discoverable        succeeded

FINAL: completed; asset generation succeeded after one retry
```

The raw JSON query remains available for machines and retained E2E evidence.

## Slice G integration

Instrument Slice G first because it crosses all relevant cloud boundaries.

Minimum initial emitters:

1. E2E runner
2. Birth Center
3. World Kernel
4. Asset Generator
5. Thread Presentation

The first goal is not exhaustive logging. It is enough coverage to locate the failed boundary without manually correlating each service.

The Slice G evidence file may retain the `requestId` plus an Activity Log query/reference. The 13 authoritative Slice G assertions continue to be proved from their existing inspection/evidence surfaces. Activity Log success is not silently substituted for them.

## Implementation sequence

### AL-A — contract and deterministic local store

- freeze normalized activity schema;
- `ActivityRecorder.record()`;
- `runStage()` helper;
- local deterministic store;
- idempotent activity admission by `activityId`;
- query by request/genesis/thread;
- tests for failure/retry ordering and sanitization.

### AL-B — Slice G emitters

Add detailed checkpoints to:

- E2E runner;
- Birth Center request/development/publication;
- World birth/admission/reconciliation;
- Asset generation;
- Thread Presentation publication.

Do not refactor domain logic merely to add logging. Emit at existing durable/meaningful boundaries.

### AL-C — Cloudflare telemetry provider

- dedicated D1 database;
- provider-neutral `InfraDriver.telemetry` exercised surface;
- provision/config/deploy integration;
- query endpoint or operator-only read surface;
- prove telemetry failure does not change Fibre semantic outcomes.

### AL-D — inspector and E2E use

- `inspect:activity` CLI;
- compact runtime-chain renderer;
- cloud E2E records its `requestId` and log reference;
- deliberate-failure test demonstrates that one command identifies the failed stage and retry history.

## Acceptance criteria for v0.1

The Activity Log v0.1 is useful when all of these are true:

1. One cloud Genesis E2E request can be reconstructed by `requestId`.
2. After identity is known, the same chain is queryable by `genesisId` and `threadId`.
3. A deliberate provider or reconciliation failure shows the exact failed stage, service, attempt and retryability.
4. A successful retry is visible without overwriting the earlier failure.
5. World semantic events are referenced by IDs/digests rather than copied into telemetry as authority.
6. No secret/token/raw chain-of-thought/private biography payload is stored.
7. Duplicate telemetry delivery is idempotent or visibly deduplicated by `activityId`.
8. Telemetry storage failure cannot create or roll back a Thread, birth, authorization, Embodiment or publication.
9. The inspector can render a concise success/failure chain for a request.
10. Local and Cloudflare providers expose the same normalized record/query behavior required by the exercised surface.

## Deliberately deferred

For v0.1 do not add:

- full OpenTelemetry dependency;
- trace/span/parent DAGs;
- metrics dashboards;
- log sampling policy beyond basic retention needs;
- arbitrary large diagnostic attachments;
- cross-region global ordering;
- semantic lifecycle authority;
- activity-derived personhood evidence.

These remain open extension paths. If concurrency later makes `requestId` insufficient, add `traceId/spanId/parentSpanId` to the envelope rather than replacing the Activity Log.

## Vision and ambition check

**Fidelity:** this is operational/debugging infrastructure. It does not itself make a Thread more person-like and must not be counted as personhood evidence. It supports human inspectability and makes failures/recovery of the machinery surrounding persistent lives easier to audit.

**Ambition:** the narrow v0.1 does not redefine Thread history as logs, does not collapse World authority into telemetry, and leaves room for many interacting Threads, ordinary-life Experiences and distributed runtimes.

**Causal individuality:** none is claimed. Activity records observe causal/personhood-bearing mechanisms; they do not create or prove causal individuality by themselves.
