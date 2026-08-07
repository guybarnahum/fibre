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
- Private stance, desired action, authorization, disclosure strategy, audience-visible response, performed action, and durable life change are separate records.
- Public or audience-visible wording is not authoritative evidence of private motive, desire, dignity, consent, authorization, performed action, delivery, or completion.
- Fibre requires externally initiated requests to receive a bounded Thread-owned dignity appraisal before full task execution. In the current M1 implementation the kernel owns appraisal-capsule compilation, validation, binding, and persistence, while the consequential assessment and private stance are still supplied by the caller; endogenous Thread-owned stance production remains post-M1 work.
- Runtime selection may narrow Thread-owned memory, relationship, and obligation context, but records included and excluded references and cannot inject unowned records.
- Dignity evaluates fit with the particular Thread, individualized advantage, requester need, relationship meaning, participation terms, recorded obligations, resources, respect, and reciprocity.
- A private dignity stance records attributable evidence, concrete alternatives, and may desire acceptance, clarification, negotiation, delegation, or refusal even when a request is safe and feasible.
- Participation Authorization is bound to the same Thread, snapshot version, requester, policy version, causation chain, appraisal, private stance, and SHA-256 digest of every material request field.
- Accepted execution authority is minted only through the thaw/runtime boundary. A separate non-execution path may persist `clarify`, `negotiate`, `delegate`, or `refuse`, but cannot mint execution-capable `accept` authority.
- Authorization may differ from private desire only through an exact recorded obligation or governing decision; the conflict and governing reference remain private durable evidence and do not become consent.
- In M1, obligation references resolve against the Thread's own unresolved intentions and use exact UTF-8 prose identity. Historical discharge permanently prevents reuse of the same exact reference.
- Disclosure may be candid, tactful, selective, ambiguous, evasive, or deceptive as private strategy intent, but cannot create, expand, contradict, or silently negate authorization.
- An audience-visible response is a separate sanitized record. Its posture cannot contradict authorized participation and its payload does not newly copy private dignity details, private rationale, withheld reasons, or governing obligation references.
- Compelled acceptance remains distinguishable from willing acceptance. The private chain preserves `refuse -> accept` as `obligation_override`; outward wording cannot rewrite the refusal as consent.
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

## M1 is fully closed

The repository now contains and proves the complete deterministic M1 Persistent Thread Round Trip, including the interior-to-exterior expression boundary.

Run the consolidated proof with:

```bash
npm run demo:m1
```

The command generates per-run private, administrative, and editor credentials; starts an independent world-kernel process and a separate credentialed Thread Editor process; uses their HTTP APIs for the demonstrated lifecycle; restarts repeatedly against the same SQLite world; and emits a redacted JSON proof report. A reviewed proof layer then reopens the completed database and independently verifies load-bearing lifecycle, obligation, expression, and zero-active-runtime evidence.

The coherent Mina history proves:

1. seed at version 1 and restart with the same state hash;
2. create a request attempt, advance Mina through an admin-authorized self-model command, and reject the now-stale attempt with an explicit correlated recovery path;
3. create a fresh high-dignity attempt, acquire runtime, persist a truthful willing-acceptance expression before work, run Actor, receive Guardian `pass`, and freeze one evidence-bearing memory;
4. while Mina is stable, create a separate low-dignity generic request, persist private `refuse`, non-execution `refuse` authorization, disclosure strategy, and respectful audience response, and prove that request never acquires runtime;
5. run an injected divergent Actor, receive Guardian `reject`, and explicitly abandon the episode without consuming authorization or obligation;
6. leave another rejected episode unattended, display `Timed out — not yet reclaimed` from fresh kernel time, and later reclaim it as an expired lease with an aborted session;
7. authorize an obligation-mediated `refuse -> accept`, persist a full-candor expression before work that preserves `obligation_override`, run Actor and Guardian, freeze, discharge the exact obligation once, and reject later reuse;
8. restart again, replay the same final state hash, verify two freeze-created memories, five participation-authority summaries, three complete disclosure/response chains, authorization replay rejection, and zero active runtimes.

The three completed M1 expression branches are:

- willing acceptance: private `accept`, authorized `accept`, outward `I can take this on.`;
- low-dignity non-participation: private `refuse`, authorized `refuse`, outward `I will not take this request on.`, no runtime;
- obligation-mediated participation: private `refuse`, authorized `accept`, private basis `obligation_override`, outward full-candor wording that says Mina proceeds because of a recorded obligation without exposing the private obligation reference.

Every demonstrated audience-response record is created before any performed work for that request and explicitly records:

```text
deliveryStatus = not_sent
performedActionStatus = none_recorded
completionStatus = not_claimed
```

Those are bounded status witnesses at response-record time. Later Actor, Guardian, freeze, abandonment, timeout, delivery, or performed-action records remain separate facts.

The final demonstrated Mina projection remains version 4 with this public event sequence:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

Expression closure adds restricted records; it does not manufacture additional public Thread life events.

## Persistence and authority boundaries

The SQLite persistence spine stores a versioned Thread projection, immutable Thread events, command witnesses, request/appraisal/stance records, participation authorizations, thaw leases, runtime sessions, Actor outputs, Guardian audits, freeze reports, accepted memories, authorization consumption, obligation discharge, rejected-runtime abandonment, restricted disclosure strategies, and audience participation responses. One `PRAGMA user_version` governs the world file; schema version 4 remains current, with M1 expression tables installed as the accepted additive extension.

WorldStore, RuntimeStore, FreezeStore, LifecycleHardeningStore, and ExpressionStore use separate WAL connections over the same file. Load-bearing writes reread their cross-interface witnesses inside the relevant transaction. Replay rederives event, command, freeze, memory, and state-hash witnesses; expression integrity independently rechecks request, stance, authorization, disclosure, response linkage, the participation basis derived from private desire versus kernel authorization, and the deterministic audience wording implied by the stored disclosure strategy.

M1 integrity hashes, digests, and cross-record derivation checks are **unkeyed self-consistency evidence under the append-only local storage model**. They detect inconsistent or substituted records, including a re-signed audience message or participation basis that no longer derives from its authoritative witnesses, but they are not cryptographic signatures against an attacker with arbitrary SQLite DDL/write access who can coherently rewrite every witness. Production tamper evidence requires a stronger trust anchor such as keyed signatures, protected signing authority, or externally anchored history.

Live command acceptance and projection repair require administrative authority. Private request, runtime, and expression records require the separate world-kernel private token. Editor API reads require a third per-run editor credential. These local tokens are milestone controls, not production identity or role-based authorization.

Runtime, Actor, Guardian, freeze, abandonment, preview, and displayed expiry time are kernel-owned. Expression record IDs and timestamps are also kernel-owned. Caller timestamps cannot acquire, extend, reclaim, complete, freeze, abandon, or mint expression records.

The deterministic Actor proposes changes only. It performs no external tool, network, delivery, or requester-facing action and cannot mutate authoritative state. Goal Guardian is a declaration and consistency auditor, not a capability sandbox. A model-, network-, or tool-capable Actor remains prohibited until an isolated worker/tool gateway supplies independently observed capability traces.

Freeze remains the only current boundary from Actor proposal to Thread life. One SQLite transaction appends `THREAD_FROZEN`, advances the projection, records accepted memories and rejected rationale, consumes authorization once, discharges any obligation override, completes the session, and releases the lease. Failed freeze, Guardian rejection, explicit abandonment, expiry, and state races consume neither authorization nor obligation.

An obligation-mediated freeze removes the exact unresolved-intention reference and preserves it in event and consumption history. Historical consumption independently blocks identical reuse even if the prose later reappears.

## Thread Editor and database inspection

The Thread Editor is a separate loopback-only, same-origin inspection process over the live world kernel. It displays current state, public events, integrity, private request traces, expression summaries and drill-down, runtime episodes, authorization, Actor, Guardian, freeze, abandonment, timeout, and exact JSON witnesses.

Its **Expression boundary** view presents separately:

- the Thread's private response;
- the kernel-authorized action;
- dignity band and participation basis;
- private disclosure intent and disclosed/withheld reason categories;
- exact audience-visible message;
- delivery, performed-action, and completion status witnesses;
- obligation-mediated divergence explicitly labeled as compelled participation, not consent.

Every `/api/editor/*` request requires a random per-run credential delivered in a URL fragment. The browser stores it for the session and removes the fragment from the current address. The private world-kernel token remains server-side and is injected only into allowlisted upstream reads. Expression inspection is GET-only; the editor has no expression-mutation capability.

The database inspector opens the source database read-only with SQLite `query_only`, verifies source schema enforcement, validates a temporary snapshot through the Fibre stores, counts authorizations/strategies/responses/complete expression chains, and reports disclosure modes and communicated postures. Its tests independently pin both layers of the source-read boundary: the actual source handle remains non-writable even if `query_only` is disabled, and a source connection without `query_only` is reported as a verification failure.

The editor and expression-integrity API use structural audience-response status witnesses. The older store-level `audienceSafe` boolean is retained only as a compatibility field derived from those witnesses; it is not treated as a broad confidentiality or truthfulness verdict. In M1, response validation structurally fixes those three status fields to `not_sent`, `none_recorded`, and `not_claimed`, so every valid persisted M1 response satisfies the predicate by construction. Behavioral evidence therefore pins the structural witnesses and their live API/proof wiring, but cannot distinguish the compatibility derivation from a constant until delivery or performed-action states become representable.

## Vision-effectiveness boundary after M1

M1 established substantial personhood infrastructure, but its strength is concentrated in **persistence, authority, interior/exterior separation, and durable consequence**, not yet in causal individuality.

Two M1 loops already prove that history can bend the future:

- an obligation consumed at freeze is durably discharged and cannot authorize the same future participation again;
- a freeze-created memory survives restart and can be selected into a later cognition/appraisal context.

M1 also proves that compulsion and consent are not collapsed: a private `refuse` can be overridden by a genuine obligation while the conflict remains durable and outward wording does not falsely describe willing acceptance.

What M1 does **not** yet prove is that a distinctive Thread-owned identity or history **produces** a distinctive private judgment. The kernel prepares and protects an appraisal capsule from Thread-owned state, but `recordPrivateStance` currently receives the consequential assessment from its caller. The score, proposed action, factors, feelings, conflicting motives, uncertainties, and relationship impact are validated and bound to the trace rather than generated by an implemented Dignity Guardian policy.

Likewise, M1 does not yet contain a standing proof that giving the same material request to two Threads with materially different genome/identity/history causes them to record different stances and downstream participation or action. Identity and embodiment fields may be durable and inspectable without yet being load-bearing behavioral causes. A persistent relationship service that applies fondness/resentment consequences is also still deferred.

This does **not** reopen the accepted M1 contract. M1 built the socket into which Thread-owned cognition can plug. The next ambition gate is to prove that a Thread-owned difference makes a behavioral difference. That contract is now canonical in [`thread-differential-gate.md`](../validation/thread-differential-gate.md) and blocks M2 closure.

## Still unfinished after M1

M1 now proves durable participation, cognition, expression intent, audience-response persistence, life-change, closure, restart, replay, and human inspection. It still does **not** send email or chat, perform network/tool side effects, prove message delivery, or record a general performed-action layer outside the demonstrated deterministic runtime/freeze lifecycle.

The immediate vision-effectiveness follow-up is a Fibre-owned, versioned appraisal/cognition boundary — initially suitable for a deterministic Dignity Guardian — that derives the private assessment from Thread-owned state plus the request rather than accepting the caller's final score/action as authoritative. Its first acceptance proof is the standing differential scenario: same request, materially different Threads, attributable divergence in private stance and at least one downstream consequence.

Structured obligations with stable IDs, issuer, scope, terms, expiry, recurrence, satisfaction criteria, discharge history, provenance, and explicit visibility classification remain the immediate authority-hardening follow-up. The current public `unresolvedIntentions` prose is provisional; future obligation design must separate public standing from private terms.

Production authentication, encryption, principal/role authorization, model gateway, worker isolation, relationship service, production database topology, distributed leases, cloud deployment, marketplace execution, identity/embodiment implementation, family, and broader society remain deferred to later milestones.
