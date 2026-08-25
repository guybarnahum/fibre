---
id: architecture-presentation-asset-demand
status: proposed
last-reviewed: 2026-08-25
canonical: false
---

# Presentation asset demand

## Purpose

Presentation asset demand is the operational bridge between an admitted Fibre presentation and the standalone Asset Generator.

It answers one question:

> Given the presentation that is currently authorized to be shown, which generated reconstruction assets should exist?

It does **not** decide Thread identity, World facts, Experience history, memory, meaning, embodiment, or public-media admission.

The dependency direction is:

```text
authorized presentation projection
        |
        v
entity-specific asset-slot planner
        |
        v
PresentationAssetSlot[]
        |
        v
PresentationAssetDemandService
        |
        +--> InfraDriver.catalog     durable operational projection
        `--> AssetGenerationService
                  |
                  `--> InfraDriver.workflows
```

Thread, World and Experience planners own semantic eligibility and grounding. Asset Generator only executes the resulting admissible job.

## Demand projection

`PresentationAssetDemandService` persists a provider-neutral operational projection per presented entity scope:

```text
scope {
  entityKind   thread | world | experience
  entityRef
}

demands[] {
  demand {
    demandId
    slotKey
    identityDigest
    sourceDigest
    providerProfile
    state
    current
    supersedesDemandId
    exact AssetGenerationJob witness
  }

  dispatch {
    workflowName
    instanceId
    workflowStatus
    duplicate
    observedAt
  } | null

  supersededByDemandId | null
  obsoleteReason       | null
}
```

The projection is stored under a deterministic `presentationassetdemand_*` catalog key. It is derived operational state, not Fibre semantic authority and not the public-media serving catalog contract.

The exact generation job is retained. A later reconciliation of unchanged demand does not rewrite `requestedAt`, context, input references, or another witness field merely because a newer presentation snapshot exists with semantically identical source material.

## Ordering and crash safety

The service deliberately orders work as:

```text
1. load prior demand projection
2. reconcile current desired slots
3. start every newly required Workflow
4. refresh durable Workflow witness/status for retained pending demand
5. persist the advanced demand projection
```

Workflow dispatch occurs before the mutable projection advances.

If Workflow start succeeds and projection persistence fails, retrying reconciliation is safe: the same semantic identity produces the same `jobId` and exact job input, and the Workflow port deduplicates the durable input witness.

If a retained pending demand has no Workflow witness, reconciliation repairs it by replaying the exact retained job.

Operational Workflow state remains separate from semantic media state. A Workflow being `queued`, `running`, `errored`, `unknown`, or complete does not by itself author `media.ready` or `media.unavailable`.

## Production trigger

Demand reconciliation runs **after** the owning presentation authority admits a presentation revision.

For Thread Presentation, `createThreadPresentationAssetDemandTrigger()` intentionally re-reads `PresentationServer.getSnapshot(channelId)` at trigger time and plans only from that current admitted snapshot. A delayed caller does not get to supply an older snapshot and cause generation from it.

Conceptually:

```text
Thread snapshot admitted
        |
        v
reconcileCurrent(channelId)
        |
        +--> reload current admitted snapshot
        +--> plan Thread slots
        `--> persist + dispatch demand
```

WorldPresentation and Experience presentation do not yet have independent production write endpoints in the repository. Their planners already produce the same normalized slot contract; their eventual admission authorities must call the same demand service only with the current admitted presentation revision. This commit does not invent placeholder HTTP authorities for them.

## Concurrency boundary

The current operational projection uses the existing provider-neutral `catalog` port. That port is durable but does not expose compare-and-set.

This is acceptable for the current Thread trigger because the presentation authority serializes snapshot admission and the trigger re-reads the current snapshot before planning. Future World/Experience admission stores must provide the same single-current-revision discipline.

If Fibre later needs independent concurrent writers for one presentation-demand scope, move this projection behind a transactional `InfraDriver.state`/compare-and-set port. That is an open extension path, not a permanent catalog requirement.

## Supersession

When a slot's semantic source, brief, provider profile, reference objects, variant, or explicit regeneration key changes:

```text
old demand  -> state=superseded, current=false
new demand  -> state=pending,    current=true
```

The historical demand keeps its exact immutable job witness. The new demand receives a new deterministic job/object/receipt identity.

When a slot is removed or becomes ineligible, the current demand can become `obsolete`. This is an operational demand transition; it does not delete an already generated immutable asset or rewrite presentation history.

## Authority boundaries

Permanent rules:

- demand reconciliation reads only the authorized presentation slot contract;
- Asset Generator never scans hidden Thread, World, Experience, Memory or Place state;
- WorldPresentation remains derived non-cognitive presentation grounding;
- autobiographical memory remains distinct from historical/event context;
- generated reconstruction remains distinct from both;
- missing embodiment cannot be repaired by inventing a canonical face;
- Workflow completion is operational, not semantic publication;
- demand projection is not evidence for identity, memory, meaning, character or history.

## Deferred after this seam

Still deferred:

- automatic durable completion signalling from Asset Generator back to Presentation;
- verification and presentation-owned transition from receipt to `media.ready` / `media.unavailable`;
- generic provider-neutral asset serving;
- public/private audience authorization for generic asset resolution;
- scheduled repair sweeps across pending demand;
- retry attempt/staging identities for nondeterministic provider retries.

These are separate extension seams. They should not be hidden inside demand reconciliation.
