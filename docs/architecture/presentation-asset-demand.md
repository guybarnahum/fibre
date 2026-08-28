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

If a retained pending demand has no durable Workflow witness, reconciliation repairs it by replaying the exact retained job.

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

## Durable completion handoff

A successful credentialed generation Workflow now emits a small provider-neutral `AssetGenerationCompletion` message **after** the immutable `StoredAssetReceipt` exists:

```text
Asset Generator Workflow
        |
        +--> GenerationRecord
        +--> credentialed final asset
        +--> StoredAssetReceipt
        |
        `--> AssetGenerationCompletion {
               jobId
               receiptObjectRef
               receiptDigest
             }
                    |
                    v
             durable completion transport
                    |
                    v
             Presentation completion service
```

The completion message deliberately carries no Thread ID, media ID, publication status, or semantic verdict. It is only a durable pointer to immutable output. The calling presentation domain resolves the receipt, reconstructs the owning demand scope from the already-authorized job context, and verifies that the exact stored generation job matches the exact durable demand job.

For the Cloudflare deployment adapter, the durable transport is a Queue. Queue delivery is at-least-once, so the Presentation consumer must be idempotent. Duplicate delivery of a demand already recorded `ready` does not publish a second semantic event.

The consumer orders a current Thread completion as:

```text
1. resolve immutable receipt and verify receipt digest
2. find exactly one matching durable current demand
3. ignore superseded/obsolete demand completion as stale
4. re-verify GenerationRecord, final bytes and Content Credential
5. let Thread Presentation admit media.ready
6. persist operational demand state = ready
```

If semantic publication succeeds but the final demand projection update fails, queue redelivery is safe because `media.ready` has a deterministic event ID and the public-media catalog mirror is idempotent. The retry can therefore finish the operational projection without creating a second semantic event.

World and Experience demand completion can be verified and recorded operationally through the same completion service, but their independent semantic publication authorities do not yet exist. This commit does not invent them.

The credentialed Cloudflare generation path currently creates only successful `StoredAssetReceipt(status=ready)` records. Terminal `media.unavailable` publication remains deferred until Fibre defines a durable credential/provenance contract for terminal unsupported/policy outcomes rather than treating provider/runtime failure as semantic unavailability.

## Concurrency boundary

The current operational projection uses the existing provider-neutral `catalog` port. That port is durable but does not expose compare-and-set.

This remains acceptable for the current Thread proof because there is no independent production Thread presentation write API yet, the current snapshot trigger re-reads the admitted snapshot before planning, and completion publication is exercised against the serialized fixture/admission path.

A future runtime with independent concurrent snapshot admission and completion consumers must move the demand projection behind transactional `InfraDriver.state`/compare-and-set or another single-writer coordination boundary before claiming race-free current-demand publication. Queue retries and idempotent events solve duplicate delivery; they do **not** create compare-and-set semantics for D1 catalog projection updates.

This limitation is a temporary implementation shortcut with an explicit replacement path, not a permanent constraint.

## Supersession

When a slot's semantic source, brief, provider profile, reference objects, variant, or explicit regeneration key changes:

```text
old demand  -> state=superseded, current=false
new demand  -> state=pending,    current=true
```

The historical demand keeps its exact immutable job witness. The new demand receives a new deterministic job/object/receipt identity.

When a slot is removed or becomes ineligible, the current demand can become `obsolete`. This is an operational demand transition; it does not delete an already generated immutable asset or rewrite presentation history.

A completion for a demand already marked `superseded` or `obsolete` is not promoted to current media merely because its provider work finished later.

## Authority boundaries

Permanent rules:

- demand reconciliation reads only the authorized presentation slot contract;
- Asset Generator never scans hidden Thread, World, Experience, Memory or Place state;
- Asset Generator completion messages carry operational receipt pointers, not presentation verdicts;
- WorldPresentation remains derived non-cognitive presentation grounding;
- autobiographical memory remains distinct from historical/event context;
- generated reconstruction remains distinct from both;
- missing embodiment cannot be repaired by inventing a canonical face;
- Workflow completion and Queue delivery are operational, not semantic publication;
- Thread Presentation alone authors `media.ready` for a Thread completion;
- demand projection is not evidence for identity, memory, meaning, character or history.

## Public serving after publication

Provider-neutral public asset serving now follows semantic publication rather than generation completion:

```text
media.ready admitted
        |
        v
public_presentation_media serving projection
        |
        v
PublicPresentationAssetResolver
        |
        +--> current public Thread presentation
        +--> current media slot / identity-card visibility
        `--> InfraDriver.objects
                    |
                    v
            stable Fibre objectRef bytes
```

The generic route is `GET /api/assets/:objectRef`. The older Thread-specific media route remains a compatibility facade over the same resolver. The resolver exposes no R2/S3/provider locator and an immutable object or generation receipt alone does not create public serving admission.

See [`presentation-asset-serving.md`](presentation-asset-serving.md).

## Deferred after this seam

Still deferred:

- authenticated private/audience-scoped asset authorization;
- independent World/Experience semantic media publication authorities;
- terminal credentialed `media.unavailable` receipts/publication;
- scheduled repair sweeps across pending demand and completion DLQs;
- transactional/CAS demand projection for independent concurrent writers;
- retry attempt/staging identities for nondeterministic provider retries.

These are separate extension seams. They should not be hidden inside demand reconciliation, completion transport, or public byte delivery.
