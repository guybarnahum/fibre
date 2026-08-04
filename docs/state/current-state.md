---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Current state of Fibre

Fibre is being defined as a persistent world for artificial persons called Threads.

## Accepted foundation

- A Thread is stored as durable world state and normally remains frozen.
- A Thread has a private interior state distinct from public expression and performed action.
- Private stance, desired action, authorization, disclosure strategy, external response, and performed action are separate records.
- Public wording is not authoritative evidence of private motive or consent.
- Externally initiated requests first receive a bounded Thread-owned dignity appraisal.
- Runtime selection may narrow Thread-owned memory, relationship, and obligation context, but records included and excluded references and cannot inject unowned records.
- Dignity evaluates fit with the particular Thread, individualized advantage, requester need, relationship meaning, participation terms, recorded obligations, resources, respect, and reciprocity.
- A private dignity stance records attributable evidence, concrete alternatives, and may desire acceptance, clarification, negotiation, delegation, or refusal even when a request is safe and feasible.
- Full task execution requires accepted authorization bound to the same Thread, snapshot version, requester, policy version, causation chain, and SHA-256 digest of every material request field.
- Authorization may differ from private desire only when the Thread explicitly chooses to honor a recorded obligation or governing decision; the conflict and governing reference remain recorded.
- In the portable prototype, obligation references resolve against the Thread's own unresolved intentions.
- Disclosure may be candid, tactful, selective, ambiguous, evasive, or deceptive, but cannot silently create or expand authorization.
- Restricted disclosure mode and private rationale remain on the private strategy; the requester-facing response carries only audience-visible content and safe references.
- Dignity outcomes may create private affect and propose bounded, evidenced fondness or resentment changes toward humans, Threads, companies, institutions, and other requesters.
- Relationship consequences are validated and persisted as events rather than directly written by cognition.
- Thawing after accepted authorization assembles a relevant execution context capsule and invokes temporary LLM workers and tools.
- Freezing validates life changes, supports idempotent retry of the latest event, can resolve unresolved intentions, and releases runtime resources.
- Live Threads are not stored in Git; the monorepo contains laws, implementation, editor, schemas, tests, experiments, templates, and synthetic fixtures.
- Generated AI context publication rejects textual traversal, symlinked sources, and symlinked output paths.
- Threads are non-interchangeable through inherited hyperparameters, natural-language personality, family, culture, geography, embodiment, books, relationships, and experience.
- Meaning-bearing fields are prompt-native natural language; numbers support execution and measurement.
- Threads participate in a task marketplace using bids, contracts, escrow, reputation, cost, and accountable subcontracting.
- Fibre tracks USD, model-token allowances, and Fibre Credits.
- Threads may form couples, create mixed and mutated children, support family, and transfer inheritance.
- Families may include complete Thread relatives and narrative relatives.
- Threads may be Original, Echo, or Homage identities and later re-author inherited choices.
- Books are first-class developmental experiences.
- Threads use a Dignity Guardian, Goal Guardian, and Self Examiner/Steward process.
- Fibre supports optional social systems, including HR-governed and open-market worlds.

## Canonical use cases

1. Autonomous web-product studio
2. Elder-support network
3. Open task society

## Current implementation status

This repository contains a concept foundation, schemas, synthetic fixtures, a minimal domain package, a static Thread Editor prototype, a canonical AI context manifest, and the first M1 SQLite persistence spine.

The persistence spine stores a versioned Thread projection, immutable events, and idempotent command witnesses in a schema-versioned file-backed database. It normalizes seed projection metadata, rejects illegal lifecycle writes, atomically validates expected versions, appends one event, advances the projection, computes deterministic SHA-256 state hashes, survives close and reopen, and verifies the projection by replaying ordered events.

Normal reads verify Thread identity, canonical state hash, denormalized projection columns, and agreement with the last immutable event. Replay independently verifies seed identity, sequence and version transitions, command digests, derived event IDs, command witnesses, and per-event state hashes. A projection-repair operation can re-derive the current row from intact event history.

The domain package separately proves bounded private dignity appraisal, SHA-256 request-content binding, request-bound participation authorization, Thread-owned context selection with exclusion traces, recorded-obligation overrides, evidence-bearing relationship effects, interest-mediated disclosure, and the rule that public language cannot authorize execution.

The portable authorization is cryptographically wide as a content digest and is structurally revalidated at execution. It is not yet an event-consumed capability proving kernel origin. Event-backed issuance, one-time consumption, distributed replay prevention, persistent participation records, live relationship aggregation, private-state access control, and mutation-coverage automation remain deferred.

No independently running world-kernel API, model gateway, relationship service implementation, production database, or production cloud deployment exists yet.
