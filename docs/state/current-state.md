---
id: fibre-current-state
status: accepted
last-reviewed: 2026-08-06
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
- In the portable M1 implementation, obligation references resolve against the Thread's own unresolved intentions and use exact UTF-8 prose identity.
- Disclosure may be candid, tactful, selective, ambiguous, evasive, or deceptive, but cannot silently create or expand authorization.
- Restricted disclosure mode and private rationale remain on the private strategy; requester-facing response carries only audience-visible content and safe references.
- Dignity outcomes may create private affect and propose bounded, evidenced fondness or resentment toward humans, Threads, companies, institutions, and other requesters.
- Relationship consequences are validated and persisted as events rather than directly written by cognition.
- Thawing after accepted authorization assembles a relevant execution context capsule and invokes temporary workers.
- Freezing validates life changes, supports idempotent retry, can resolve unresolved intentions, consumes execution authority, and releases runtime resources.
- A Goal Guardian rejection can be closed explicitly: the runtime is aborted, the lease is released, and neither authorization nor obligation is consumed.
- Live Threads are not stored in Git; the monorepo contains laws, implementation, editor, schemas, tests, experiments, templates, and synthetic fixtures.
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

## Deterministic M1 is complete

The repository now contains and proves the complete deterministic M1 Persistent Thread Round Trip. A Thread persists independently of cognition, privately appraises an externally initiated request, records a private stance, receives current-state Participation Authorization, acquires one kernel-timed thaw lease, runs replaceable deterministic cognition, receives a Goal Guardian audit, then either freezes validated life changes or closes a rejected episode without changing Thread life state.

Run the consolidated proof with:

```bash
npm run demo:m1
```

The command generates per-run private, administrative, and editor credentials; starts an independent world-kernel process and a separate credentialed Thread Editor process; uses only their HTTP APIs; drives Mina through the full lifecycle; stops both processes; and emits a redacted JSON proof report.

The consolidated scenario proves one coherent Mina history:

1. seed at version 1 and restart with the same state hash;
2. create a request attempt, advance Mina through an admin-authorized self-model command, and reject the now-stale attempt with an explicit recovery instruction;
3. create a fresh attempt under the same correlation ID, acquire runtime, run Actor, receive Guardian `pass`, and freeze one evidence-bearing memory;
4. run an injected divergent Actor, receive Guardian `reject`, and explicitly abandon the episode without consuming authorization or obligation;
5. leave another rejected episode unattended, display `Timed out — not yet reclaimed` from fresh kernel time, and later reclaim it as an expired lease with an aborted session;
6. authorize a low-dignity private refusal through one exact recorded-obligation override, freeze, discharge the obligation, and reject later reuse;
7. restart again, replay the same final state hash, inspect the complete history through the editor, verify two freeze-created memories, reject authorization replay, and finish with zero active runtimes.

The final demonstrated Mina projection is version 4 with this public event sequence:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

## Persistence and authority boundaries

The SQLite persistence spine stores a versioned Thread projection, immutable Thread events, command witnesses, request/appraisal/stance records, authorizations, leases, sessions, Actor outputs, Guardian audits, freeze reports, accepted memories, authorization consumption, obligation discharge, and rejected-runtime abandonment. One `PRAGMA user_version` governs the complete file; schema version 4 is current.

WorldStore, RuntimeStore, FreezeStore, and LifecycleHardeningStore use separate WAL connections over the same file. Each writing transaction rereads every cross-interface witness required for the dependent write. Replay rederives event, command, freeze, memory, and state-hash witnesses; projection repair reconstructs current state from intact event history.

Live command acceptance and projection repair require administrative authority. Private request and runtime records require the separate world-kernel private token. Editor API reads require a third, per-run editor credential. These local tokens are milestone controls, not production identity or role-based authorization.

Runtime, Actor, Guardian, freeze, abandonment, preview, and displayed expiry time are kernel-owned. Caller timestamps cannot acquire, extend, reclaim, complete, freeze, or abandon a runtime. The editor fetches current kernel time for every runtime selection; when time is unavailable it displays `Expiry unknown` rather than asserting that a lease remains active.

The deterministic Actor proposes changes only. It performs no external tool, network, or requester-facing action and cannot mutate authoritative state. Goal Guardian is a declaration and consistency auditor, not a capability sandbox. A model-, network-, or tool-capable Actor is prohibited until an isolated worker/tool gateway supplies independently observed capability traces.

Freeze is the only current boundary from Actor proposal to Thread life. One SQLite transaction appends `THREAD_FROZEN`, advances the projection, records accepted memories and rejected rationale, consumes authorization once, discharges any obligation override, completes the session, and releases the lease. Failed freeze, Guardian rejection, explicit abandonment, expiry, and state races consume neither authorization nor obligation.

An obligation-mediated freeze removes the exact unresolved-intention reference and preserves it in event and consumption history. Historical consumption independently blocks the identical reference from authorizing another override even if the same prose is later reintroduced.

## Thread Editor

The Thread Editor is a separate loopback-only, same-origin inspection process over the live world kernel. It displays current state, public events, integrity, private request traces, runtime episodes, authorization, Actor, Guardian, freeze, abandonment, timeout, and raw inspection records.

Every `/api/editor/*` request requires a random per-run credential delivered in a URL fragment. The browser stores it for the session and removes the fragment from the current address. The private world-kernel token remains server-side and is injected only into allowlisted upstream reads.

The editor is non-authoritative. It exposes one deterministic `UPDATE_SELF_MODEL` preview and no route for command acceptance, runtime acquisition, workers, freeze, abandonment, repair, or obligation mutation. The raw preview ID is omitted from the browser response, but its identity is derivable from the returned public receipt; the administrative token, not redaction, is the actual acceptance boundary.

Unknown authenticated API paths return a prompt 404. Static serving rejects encoded traversal, symlinked path segments, and realpath escape; upstream JSON and inbound request bodies are capped.

## Still unfinished after M1

M1 proves the durable participation and cognition lifecycle, but it does **not** implement persistent live-kernel disclosure strategy or requester-visible external response. Those records remain deliberately distinct from private stance, authorization, temporary cognition, freeze, performed action, and public event projection.

Structured obligations with stable IDs, issuer, scope, terms, expiry, recurrence, and satisfaction criteria remain post-M1 work. Production authentication, encryption, principal/role authorization, model gateway, worker isolation, relationship service, production database topology, distributed leases, cloud deployment, marketplace execution, embodiment, family, and broader society remain deferred.
