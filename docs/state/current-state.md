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
- Dignity outcomes may create private affect and propose bounded, evidenced fondness or resentment toward humans, Threads, companies, institutions, and other requesters.
- Relationship consequences are validated and persisted as events rather than directly written by cognition.
- Thawing after accepted authorization assembles a relevant execution context capsule and invokes temporary workers and tools.
- Freezing validates life changes, supports idempotent retry, can resolve unresolved intentions, consumes execution authority, and releases runtime resources.
- A Goal Guardian rejection can be closed explicitly: the runtime is aborted, the lease is released, and neither authorization nor obligation is consumed.
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

The repository now contains the deterministic M1 lifecycle through freeze, explicit reject closure, replay, and human inspection: a hardened SQLite persistence spine, an independently running loopback world-kernel API, restricted request/appraisal/stance records, current-state Participation Authorization, an exclusive kernel-timed thaw runtime, deterministic Actor and Goal Guardian records, atomic freeze with authorization consumption, append-only abandonment of Guardian-rejected episodes, and a credentialed API-backed Thread Editor.

The persistence spine stores a versioned Thread projection, immutable Thread events, and idempotent command witnesses. It normalizes seed metadata, rejects illegal lifecycle writes, validates expected versions, computes deterministic SHA-256 state hashes, survives close/reopen, and verifies the projection by ordered replay. Projection repair can reconstruct the current row from intact event history.

The local service exposes public health, Thread state, safe event history, integrity, seed, and command preview. Live command acceptance and projection repair require the configured administrative token. Restricted routes expose request traces, runtime state, worker records, freeze reports, rejected-runtime abandonment, and integrity witnesses behind a separate local private token. Transport binds only to loopback, enables no CORS, caps request bodies, owns security headers, and redacts integrity details.

The health response publishes `kernelTime` from the same injectable lifecycle clock that owns authorization, lease, Actor, Guardian, freeze, and abandonment timestamps. Read surfaces can therefore distinguish observed expiry from the later lazy database reclaim transition without trusting a browser clock.

Request fingerprints match the portable domain's SHA-256 binding. Appraisal integrity reconstructs the historical Thread snapshot and verifies copied private state plus complete, disjoint included/excluded partitions of Thread-owned memory, relationship, and obligation references. Appraisal and stance IDs are opaque; separate content digests provide integrity.

A request ID identifies one immutable request/appraisal attempt. A historical stance remains an opinion about that historical snapshot, but cannot authorize a changed Thread. Recovery uses a new attempt ID under the same correlation ID.

Runtime acquisition atomically persists accepted Participation Authorization, one exclusive thaw lease, and one runtime session. Authorization binds the current Thread version/state hash, request fingerprint, requester, appraisal, stance, policy, evidence, and any recorded-obligation override. Blank, invented, missing, historically discharged, and low-dignity acceptance paths fail.

The kernel owns authorization, lease, Actor, Guardian, freeze, abandonment, and editor-preview timestamps. Caller-supplied time cannot acquire, extend, reclaim, complete, freeze, or abandon a runtime. An expired lease may be reclaimed; the old lease becomes expired and its active session aborted before replacement.

The deterministic Actor produces proposals only, no external tool calls, no direct world commands, and no requester-facing communication. Its memory proposal cites selected Thread-owned evidence. The Goal Guardian is a declaration and consistency auditor, not a sandbox; every check is independently falsifiable and a divergent Actor can persist a reject.

Freeze is the only current boundary that writes Actor-proposed life changes. It requires a persisted Guardian pass and one explicit accept/reject decision for every proposal. One SQLite transaction rereads all authority and runtime witnesses, appends `THREAD_FROZEN`, advances the Thread projection, records accepted memories, records rejected rationale, consumes authorization, discharges any obligation override, completes the runtime, and releases the lease. Each freeze-decision rationale is capped at 4 KiB before append-only persistence.

A Guardian-rejected runtime has an explicit private abandonment transition. The transition requires the persisted reject, an active unexpired session and lease, and no freeze or consumption. It atomically appends an immutable abandonment record, marks the session aborted, releases the lease, and consumes nothing. Exact retry is idempotent, changed reuse conflicts, and a fresh request attempt under the same correlation lineage may acquire a new runtime immediately.

An obligation used to override private stance is single-use by default in M1. Successful freeze removes the exact reference from `currentState.unresolvedIntentions` and preserves it in the consumption record and event. Historical consumption is also checked independently at the service and SQLite insertion layers, so identical obligation text cannot authorize another override even if it is later reintroduced. Guardian rejection, abandonment, expiry, state races, or invalid freeze consume neither authorization nor obligation.

Exact freeze retry returns the original report. A different operation after consumption fails with `AUTHORIZATION_CONSUMED`. Replay rederives the freeze report, operation and commit digests, event ID, accepted memory refs, obligation discharge, and resulting state hash. Thread integrity additionally cross-checks the exact set of freeze-created memory IDs across freeze reports, `thread_memories`, and the projection's `memoryRefs`. A separate-process restart proof recovers the same Thread and freeze integrity with a completed session, released lease, and no active runtime.

One SQLite `PRAGMA user_version` governs the complete file. Schema version 4 includes public world, restricted participation, runtime, freeze, consumption, accepted-memory, and rejected-runtime abandonment tables. WorldStore, RuntimeStore, FreezeStore, and the lifecycle-hardening store use separate WAL connections over the same file, while each writing transaction rereads its cross-interface witnesses.

Public `THREAD_FROZEN` responses are safe projections: accepted memory references and counts are visible, while concrete authorization, session, Actor, Guardian, report, causal, and private-rationale fields remain restricted. The authoritative stored event remains independently replayable. Abandonment records remain restricted and never enter the public Thread event stream because they change runtime lifecycle state, not Thread life state.

The API-backed Thread Editor is a separate loopback-only process that reads the live world kernel through a same-origin allowlisted inspection server. It displays current Thread state, public events, integrity, private request traces, runtime episodes, authorization, Actor, Goal Guardian, freeze, abandonment, timeout, and raw inspection data.

Every editor API request requires a random per-run credential delivered in the process's printed URL fragment. Browser code stores it only for the session and removes the fragment. The world-kernel private token remains server-side and is never returned to browser JavaScript. Loopback access alone therefore does not grant editor API access to Thread interiority.

The editor uses kernel-published time to display a persisted `active` lease as `Timed out — not yet reclaimed` once its expiry passes. It does not falsely label an unattended rejected episode as active while waiting for later reclamation traffic.

The editor is deliberately non-authoritative. It exposes only read inspection and a deterministic `UPDATE_SELF_MODEL` command preview. The preview response redacts the raw preview ID, and the live world-kernel process requires administrative authority for command acceptance. The editor cannot seed, accept commands, acquire runtime, run workers, freeze, abandon, repair, or create/edit/discharge obligations or unresolved intentions.

The editor's static server rejects encoded traversal and symbolic-link path segments, verifies realpath containment, uses a single file descriptor for size and streaming, caps upstream JSON, and percent-encodes allowlisted private-route suffixes. Its network surface is directly tested for Host enforcement, editor credentials, private-disabled behavior, content type, body size, exact keys, route traversal, no CORS, no-store, and CSP.

The current runtime invokes no production LLM, external tool, network service, or requester-facing communication. A worker/tool gateway with independently observed capability traces is mandatory before any tool-, network-, or model-capable Actor.

The sole remaining planned M1 slice is one consolidated Mina persistent-round-trip demonstration through the independently running world kernel and credentialed API-backed editor. Persistent live-kernel disclosure strategy and audience-visible external response are still unfinished and must remain distinct from private stance, authorization, runtime cognition, freeze, and performed action.

Production authentication, encryption, model gateway, relationship service, structured obligation records, production database topology, distributed leases, and cloud deployment remain deferred.
