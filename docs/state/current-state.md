---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-05
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
- Thawing after accepted authorization assembles a relevant execution context capsule and invokes temporary workers and tools.
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

This repository contains a concept foundation, schemas, synthetic fixtures, a minimal domain package, a static Thread Editor prototype, a canonical AI context manifest, a hardened M1 SQLite persistence spine, an independently running local world-kernel HTTP process, restricted request/appraisal/stance records, and the first persistent deterministic thaw runtime.

The persistence spine stores a versioned Thread projection, immutable Thread events, and idempotent command witnesses in a schema-versioned file-backed database. It normalizes seed projection metadata, rejects illegal lifecycle writes, atomically validates expected versions, appends one event, advances the projection, computes deterministic SHA-256 state hashes, survives close and reopen, and verifies the projection by replaying ordered events.

Normal reads verify Thread identity, canonical state hash, denormalized projection columns, and agreement with the last immutable event. Replay independently verifies seed identity, sequence and version transitions, command digests, derived event IDs, command witnesses, and per-event state hashes. A projection-repair operation can re-derive the current row from intact event history.

The local world-kernel service exposes health, Thread projection, public event timeline, integrity, seed, command preview, preview-bound command acceptance, and explicit administrative projection repair. Transport, application operations, and SQLite remain separate modules. The process binds only to loopback, rejects non-loopback Host headers, enables no CORS, caps request bodies, emits stable error codes, and redacts integrity details from public responses.

Command preview is deterministic and read-only. Its SHA-256 receipt binds the exact command, expected version, current state hash, proposed event ID, and proposed resulting hash. Acceptance recomputes that receipt against current state and verifies that the persisted event and projection match the preview. The receipt is not participation authorization or proof of kernel origin.

The world-kernel persists one immutable activation request and one Thread-owned Request Appraisal Capsule per request attempt, plus one restricted private participation stance per appraisal. Request fingerprints match the portable domain's SHA-256 binding. Appraisal integrity reconstructs the historical Thread snapshot and verifies copied private state and complete, disjoint included/excluded partitions of memory, relationship, and obligation references owned by that snapshot.

Appraisal and stance IDs are opaque random values; SHA-256 content digests remain separate integrity witnesses. Exact retries are idempotent and conflicting reuse fails visibly. A compiled appraisal cannot be inserted after an intervening Thread write, but an already persisted historical appraisal remains answerable: its private stance may be recorded after unrelated later Thread changes while staying bound to the original version and state hash.

For M1, a request ID identifies one immutable request/appraisal attempt. A historical attempt cannot authorize a changed Thread. Recovery uses a new request-attempt ID under the same correlation ID, followed by appraisal and stance against the current snapshot. Earlier attempts remain attributable history.

The M1 runtime atomically persists an accepted Participation Authorization, one exclusive thaw lease, and one runtime session. Authorization is bound to the current Thread version/state hash, exact request fingerprint, requester, appraisal, stance, policy, evidence, and any recorded-obligation override. Blank, invented, and absent override references fail; eligible obligations currently resolve from the Thread's unresolved intentions.

The kernel owns runtime time. Authorization issuance, lease acquisition/expiry, Actor completion, and Guardian completion are stamped from an injectable server clock. Runtime HTTP requests cannot supply those timestamps. Lease expiry and reclamation therefore operate on kernel time rather than caller claims.

The execution context is compiled only after accepted authorization and records included and excluded Thread-owned memory and relationship references. The deterministic Actor produces a bounded proposal and no direct world command. Its evidence-bearing life-change proposal cites selected Thread-owned memory or relationship context.

The M1 Goal Guardian is a declaration and consistency auditor, not a capability sandbox. It verifies the Actor record's Thread, request, objective, authorization, declared tool use, declared direct commands, and bounded life-change evidence. Every check is independently falsifiable, and an injected divergent Actor produces a durable reject. Future tool-capable workers require independently observed capability traces from an isolated worker/tool gateway.

Thaw leases are exclusive per Thread through a partial unique database index, including across separate SQLite connections. An overlapping lease fails; an actually expired lease may be reclaimed, which marks the old lease expired and its active session aborted before creating a replacement. Aborted sessions and expired leases cannot continue work.

One SQLite `PRAGMA user_version` governs the complete file. Schema version 3 adds runtime tables transactionally to the version-2 world/private schema. WorldStore and RuntimeStore retain separate WAL connections, but runtime acquisition rereads Thread and stance witnesses inside its own immediate transaction before writing.

Private runtime IDs are opaque random values; SHA-256 content and operation digests remain separate witnesses. A session digest independently binds execution context to immutable session/lease metadata. Authorizations and worker records are append-only. Lease and session rows permit only trigger-constrained status transitions and cannot be deleted.

The current runtime invokes no production LLM, external tool, network service, or requester-facing communication. The durable Thread projection remains frozen while temporary cognition is represented by the runtime session. PR #20 will validate proposed changes, consume authorization, mutate or discharge obligations through freeze, persist lifecycle events, and release runtime resources.

Restricted records remain outside the public Thread event stream. Every private subpath requires a separate local token before route dispatch, and unauthenticated health does not advertise private access. The token is a local milestone boundary, not production identity, consent, or a general execution credential.

Disclosure strategy, audience-visible external response, authorization consumption, freeze orchestration, runtime release, API-backed editor views, production access control, model gateway, relationship service, production database, and production cloud deployment remain deferred.
