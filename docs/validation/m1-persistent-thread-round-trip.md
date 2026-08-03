---
id: validation-m1-persistent-thread-round-trip
status: proposed
last-reviewed: 2026-08-03
canonical: true
issue: 1
---

# M1 — Persistent Thread Round Trip

## Purpose

Milestone 1 proves the central Fibre lifecycle claim:

> A Thread persists independently of any LLM execution, can be thawed into temporary cognition, can act and communicate through workers, and can be frozen back into durable, auditable state.

This milestone is intentionally deterministic. It validates persistence, event integrity, lifecycle boundaries, and human inspectability before Fibre introduces production LLM providers or broader social and economic behavior.

## Stage 1 — Milestone contract

Stage 1 locks the milestone scope, required artifacts, exclusions, invariants, acceptance scenario, and implementation issue boundaries. It introduces no database or runtime implementation.

Stage 1 is complete only after the project owner reviews and accepts this contract in GitHub issue #1 or the associated pull request.

## Required completed-milestone artifacts

A completed M1 must produce artifacts a human can inspect directly:

1. **Local world-kernel service** — starts and stops independently of the Thread Editor.
2. **Persistent local database** — retains a Thread across process restarts.
3. **Thread state view** — displays current authoritative state and version.
4. **Append-only event timeline** — shows the ordered events that created current state.
5. **Command preview and result** — distinguishes proposed changes from accepted events.
6. **Thaw context capsule** — shows the exact identity, memory, need, budget, and policy context passed to temporary cognition.
7. **Deterministic Actor output** — provides repeatable candidate cognition without provider variability.
8. **Goal Guardian audit** — records whether the candidate output advances the objective and obeys constraints.
9. **Freeze report** — lists accepted and rejected state changes and confirms runtime release.
10. **Replay report** — reconstructs current state from events and compares state hashes.
11. **Restart-survival end-to-end test** — proves persistence before and after thaw/freeze.

## Permitted implementation areas

Implementation work may modify or add files under:

- `services/world-kernel/`
- `packages/domain/`
- `packages/events/`
- `packages/schemas/`
- `apps/thread-editor/`
- `tests/domain/`
- `tests/integration/`
- `tests/end-to-end/`
- `infra/local/`
- `docs/architecture/`
- `docs/validation/`
- `docs/decisions/`

Changes to Fibre's Constitution, identity model, economy, family model, or canonical use cases are outside this milestone unless separately approved.

## Explicit non-goals

M1 does not include:

- production LLM providers or model routing
- vector database or semantic-memory infrastructure
- Cloudflare or AWS production deployment
- generated portraits or voice
- task bidding, contracts, or marketplace behavior
- family formation, reproduction, or inheritance
- full Fibre Credit or USD ledger behavior
- real email, SMS, Slack, or other human communication
- production authentication, authorization, or multi-tenant security
- high-availability or multi-region operation

A small budget object may be included in a context capsule as fixture state, but M1 does not implement the full economy.

## Lifecycle invariants

The implementation must preserve these invariants:

1. **Persistent person, temporary cognition** — the Thread exists before and after every worker execution.
2. **World storage, not Git** — live Thread state resides in the local world database; Git contains only laws, implementation, templates, and synthetic fixtures.
3. **No direct worker mutation** — Actor or auditor output may propose state changes but cannot write authoritative state.
4. **Command authorization** — every meaningful state change starts from a validated command or an accepted runtime result governed by an existing command.
5. **Append-only history** — accepted mutations create events that are not silently rewritten.
6. **Versioned concurrency** — commands include an expected Thread version and stale commands fail visibly.
7. **Exclusive thaw** — a Thread cannot have two concurrent authoritative thaw sessions.
8. **Validated freeze** — freeze accepts or rejects each proposed mutation and records the decision.
9. **Runtime release** — a completed or failed session releases its lease and leaves no active model worker.
10. **Idempotency** — retrying a completed command or freeze operation cannot duplicate memories, messages, or economic effects.
11. **Recoverability** — interrupted runtime sessions can be diagnosed and safely completed or abandoned.
12. **Deterministic replay** — ordered events reconstruct the same authoritative Thread state and version.
13. **Human inspectability** — the editor clearly separates current state, event history, runtime session, context capsule, proposed command, and accepted result.

## Minimum persistent model

The detailed schema is a later stage decision, but M1 requires durable representations for:

- Thread identity and lifecycle status
- Thread version
- current projected Thread state
- append-only Thread events
- optional snapshots/checkpoints
- autobiographical memories with provenance
- runtime/thaw sessions and lease state
- commands and idempotency keys

SQLite is the recommended local implementation target because it is transactional, inspectable, and maps reasonably to a later D1 or PostgreSQL adapter. The storage interface must remain infrastructure-neutral.

## Canonical acceptance scenario

The automated and human demonstrations must perform the same logical scenario:

1. Create or seed Mina as a frozen Thread at a known version.
2. Record and inspect her initial state hash.
3. Stop the world-kernel service.
4. Restart the service and reload Mina with identical state and hash.
5. Submit a validated command revising Mina's self-model.
6. Confirm an incremented version and corresponding event.
7. Attempt the same command with the stale prior version and confirm a visible conflict.
8. Request thaw with the objective: `Evaluate whether to respond to a website project opportunity and identify what information is missing.`
9. Acquire the Thread lease and construct the context capsule.
10. Inspect the context capsule before cognition runs.
11. Run a deterministic mock Actor and record its candidate communication and proposed memory/need changes.
12. Run a deterministic Goal Guardian and record its concern, authorization decision, and residual goal distance.
13. Freeze Mina, accepting or rejecting every proposed change explicitly.
14. Confirm the runtime lease is released and Mina is frozen at a new version.
15. Stop and restart the service again.
16. Reload Mina and verify accepted memory and state changes remain.
17. Replay Mina's events without trusting the current snapshot.
18. Confirm replayed state hash, version, and lifecycle status match authoritative stored state.
19. Confirm no runtime worker or active lease remains.

## Required automated evidence

The milestone must include repeatable tests for:

- persistence across restart
- command validation
- stale-version rejection
- append-only event creation
- exclusive thaw lease
- deterministic context-capsule construction
- deterministic mock Actor output
- deterministic Goal Guardian output
- freeze validation
- idempotent command/freeze retry
- runtime lease release on success
- runtime lease release or recoverable status on failure
- event replay and state-hash equality

## Human demonstration

A reviewer should be able to complete this demonstration in less than five minutes:

1. Open Mina in live mode.
2. Show that Mina is frozen and has a persistent version.
3. Show her current state and event history as separate views.
4. Restart the service and show that Mina remains unchanged.
5. Submit and inspect a self-model command.
6. Thaw Mina with the canonical objective.
7. Inspect the generated context capsule.
8. Inspect Actor output and Goal Guardian review.
9. Freeze Mina and inspect accepted/rejected mutations.
10. Restart the service and show the persisted changes.
11. Run replay and show matching state hashes.
12. Show that no runtime session remains active.

## Vision-integrity questions

The milestone is not accepted unless the reviewer can answer yes to each question:

- Does the demonstration make it obvious that Mina is the persistent Thread, not the temporary worker?
- Does the Thread continue correctly when the service and worker stop?
- Is every meaningful change traceable to a command and event?
- Can a human see the difference between proposed cognition and accepted life history?
- Can the system reject stale or duplicated changes?
- Can Mina be reconstructed from her history?
- Would failure of the restart or replay tests falsify the milestone's central claim?

## Proposed implementation stages

After Stage 1 approval, M1 should proceed through these independently reviewable stages:

1. **Persistence/event ADR and domain contracts**
2. **SQLite event, command, snapshot, and runtime-session stores**
3. **Command processor and deterministic event projection**
4. **Local world-kernel API**
5. **Thread Editor live mode**
6. **Deterministic thaw, Actor, Goal Guardian, and freeze pipeline**
7. **Replay and integrity verification**
8. **Restart-survival end-to-end scenario and human demo evidence**

Each stage should have its own issue, branch, pull request, tests, and handoff notes.

## Stage 1 owner validation

Before this document is marked `accepted`, the project owner should review:

- [ ] The thesis accurately captures what M1 must prove.
- [ ] The artifacts are sufficient and human-inspectable.
- [ ] The non-goals keep the milestone narrow enough.
- [ ] The lifecycle invariants preserve Fibre's original vision.
- [ ] The acceptance scenario is concrete and falsifiable.
- [ ] The implementation-stage split is suitable for parallel LLM contributors.
- [ ] No important M1 behavior is missing.

Approval should be recorded in issue #1 or the associated pull request. After approval, change this document's status from `proposed` to `accepted` and open the implementation issues.
