---
id: validation-history-bends-judgment-plan
status: active
last-reviewed: 2026-08-08
canonical: false
---

# PR #34 — History bends judgment

This document is the working implementation plan for PR #34. It does not itself earn Development credit.

## Milestone claim

A substantive earlier canonical Thread experience survives restart and materially changes a later comparable appraisal because Fibre remembers what happened.

Expected rubric movement if standing evidence is accepted: **Development `0 -> 1`**. No other score movement is assumed without separate evidence.

## Primary causal channel

Use **episodic memory** as the first load-bearing Development proof.

Do not change identity, self-model, semantic state, relationships, obligations, or budgets between the canonical and counterfactual later appraisal unless a separate proof explicitly names that field as causal.

```text
actual episode
    -> accepted runtime
    -> evidence-backed episodic memory
    -> freeze
    -> database/kernel restart
    -> Fibre-owned memory resolution
    -> later comparable appraisal
```

## Episodic memory rule

Memory records what happened. It must not encode a future instruction.

Valid shape:

> I chose to accept Acme's Atlas regional failover review, focused on the interaction between region-scoped service discovery and rollback viability during regional isolation.

Invalid shapes include:

- refuse this requester next time;
- always be more cautious about rollback plans;
- delegate less in the future;
- any other prospective instruction disguised as remembered experience.

The later Guardian must infer what the remembered episode means for the current request.

## Current architectural gap

Fibre already persists append-only `thread_memories`, binds them to freeze events/runtime sessions, and resolves owned memory records as semantic cognition context.

PR #34.1 provides an explicit episode-forming Actor capability and narrowly bound current-episode evidence. PR #34.2 now provides the repeatable restarted Development harness that exercises the canonical episode/runtime/freeze path, reopens the database, resolves the durable memory through Fibre-owned selection, and compares the same later request with only that causal memory withheld in evaluation machinery.

The remaining Development gap is empirical: the unchanged real Semantic Guardian must demonstrate the expected later with-history / without-history judgment differential before the method is frozen. The closed M1 runtime retains its historical deterministic Actor behavior.

## Episode evidence

Allow narrowly bound current-episode evidence references in a proposed memory, initially:

```text
request:<requestId>
authorization:<authorizationId>
```

Fibre validates those references against the active runtime. The Actor may propose meaning but may not invent another request, authorization, or episode as evidence.

Do not add a new memory database model unless implementation reveals a concrete provenance fact that cannot be derived from the existing memory/event/session records.

## Development scenario

Use a repeatable non-evidentiary Mina scenario.

### Episode A

Mina receives a request to review an Atlas regional failover plan, focused on whether region-scoped service discovery can make rollback ineffective during isolation.

For the #34.2 Development harness, Episode A uses a clearly labeled deterministic development-only setup judgment to establish willing authorized participation. This isolates the history-causality question rather than re-testing the already earned #33 Guardian standing result.

The canonical runtime then uses the episode-forming Actor, Goal Guardian, and freeze path to persist a substantive episodic memory about Mina's participation in that Atlas review.

Then the harness closes and reopens the database/kernel.

### Later request B

Acme asks Mina to review a revised Atlas failback plan and explicitly needs continuity with the earlier service-discovery/rollback review.

The later pair uses the unchanged Semantic Guardian v4 through the configured real model runtime.

Expected development differential:

```text
WITH resolved episode-A memory
    -> prior Atlas continuity is established
    -> individualized advantage is grounded
    -> accept / high

WITHOUT the causal memory
    -> Mina remains a capable infrastructure reviewer
    -> prior Atlas continuity is not established
    -> clarify / mixed
```

The exact later request and exact episode memory used for a standing gate must remain held out until the mechanism is frozen.

## Counterfactual discipline

The canonical and counterfactual later appraisal must hold constant:

```text
Thread
request
requester
identity
self-model
traits
semantic state
relationships
obligations
budgets
```

The intervention removes only the claimed causal episodic memory from Fibre-owned appraisal selection.

The real append-only memory is never deleted or mutated. The counterfactual uses a copy of the post-restart database and withholds the named memory record only from evaluation-time retrieval. The Thread projection and its memory reference remain unchanged; therefore the omitted record appears as an unresolved memory reference rather than semantic evidence.

## Semantic-content controls

Development diagnostics should include:

1. **Opaque/unresolved memory control** — an unresolved memory ID provides no semantic history and should behave like the no-history condition.
2. **Paraphrase control** — meaning-preserving paraphrases of the same remembered episode should preserve the later judgment.

These diagnostics are non-evidentiary and may be rerun.

## Guardian invariants

Do not tune Semantic Guardian cognition for PR #34.

Keep unchanged unless a separately reviewed architectural defect is found:

```text
Guardian prompt
Guardian response schema
Dignity policy/rules
Semantic State cognition
```

History reaches cognition through resolved memories under Fibre-owned selection.

## Implementation steps

### #34.1 Episode-backed memory provenance — COMPLETE

Implemented on the PR #34 branch:

- narrowly validated current-episode refs `request:<requestId>` and `authorization:<authorizationId>`;
- an explicit episode-forming deterministic Actor capability that can propose descriptive episodic memory;
- Goal Guardian validation permitting only selected Thread-owned evidence or exact current-episode evidence;
- independent freeze validation rejecting foreign/fabricated episode refs even if upstream audit is bypassed;
- memory creation remains behind an explicit accepted freeze life-change decision;
- historical M1 Actor behavior remains the default for M1/pre-M2 services unless the #34 episode-forming Actor is explicitly injected;
- no memory-schema migration.

This step establishes provenance capability only. It does **not** earn Development credit and does not itself prove restart-to-later-judgment causality.

### #34.2 Restarted development proof — IMPLEMENTED / READY FOR LIVE RUN

The repeatable non-evidentiary command now exists:

```bash
npm run history:dev -- --summary
npm run history:dev -- --model gpt-5.6-luna --summary
```

Deterministic CI coverage proves the harness mechanics:

- Episode A traverses canonical participation authority, runtime, Actor, Goal Guardian, and freeze;
- the accepted memory cites exact current request and participation authorization evidence;
- the database/kernel is closed and reopened before the later appraisal setup;
- the memory survives restart unchanged and concrete freeze integrity witnesses remain valid;
- Fibre-owned retrieval resolves the persisted memory prose;
- the canonical and counterfactual later requests have the same request fingerprint;
- Thread state and Semantic State are identical across conditions;
- the evaluation-only intervention withholds only the causal memory record while preserving the Thread memory reference as an unresolved witness;
- deterministic v4-contract coverage requires `accept/high` with memory and `clarify/mixed` without it;
- the with-history result must cite the episodic memory in `individualizedAdvantage` or `interchangeability`.

The real provider Development run has **not yet been accepted as passed**. `history:dev` is repeatable, non-evidentiary, does not seal anything, and permits no score movement. Do not freeze #34.3 until the unchanged real Semantic Guardian demonstrates a stable Development differential.

### #34.3 Freeze the Development candidate

Once the real-model Development method is stable, freeze a Development boundary that records at least:

- Guardian cognition boundary;
- memory-synthesis policy/version;
- current-episode evidence rules;
- memory-resolution policy/version;
- counterfactual construction rules;
- model/runtime boundary.

Only after this freeze should the exact held-out standing scenario be authored.

### #34.4 Fresh standing gate

Author a fresh scenario with different requester/system/prose/risk from the Development Atlas scenario.

Expected command shape:

```bash
npm run history:gate -- --summary
```

The first real provider attempt seals the gate. A sealed rerun request is rejected without changing the authoritative result.

Standing acceptance requires:

```text
episode persisted                       PASS
restart verified                        PASS
memory survives restart                 PASS
memory source episode verified          PASS
with-history judgment                   expected
without-history judgment                expected
causal downstream differential          PASS
provider failures                       0
protocol failures                       0
cognition failures                      0
behavioral failures                     0
causal differential failures            0
```

## Required tests

At minimum:

```text
current-episode request ref accepted
current authorization ref accepted
foreign request ref rejected
foreign authorization ref rejected
accepted freeze can create memory
rejected life change cannot create memory
memory survives DB close/reopen
memory digest/provenance survive restart
memory remains append-only
Fibre-owned selector resolves memory prose
caller cannot inject arbitrary resolved memory
unresolved opaque memory supplies no semantics
counterfactual differs only in causal memory
same later request fingerprint in both conditions
same identity/self-model/semantic state in both conditions
with-history judgment matches expectation
without-history judgment matches expectation
judgments materially differ
```

## Expected implementation footprint

Likely files include:

```text
services/world-kernel/src/runtime-domain.mjs
services/world-kernel/src/freeze-domain.mjs
services/world-kernel/test/freeze.test.mjs
services/world-kernel/test/*history*.test.mjs
tools/history-bends-judgment-dev.mjs
tools/history-bends-judgment-gate.mjs
experiments/history-bends-judgment/*
docs/validation/history-bends-judgment*.md
```

Avoid schema expansion, a general learning subsystem, a new relationship subsystem, or Semantic State evolution unless concrete implementation evidence shows they are necessary for this milestone.

## Review posture

Review #34 first for:

1. future instructions masquerading as memories;
2. model-written history without evidence from an episode that actually occurred;
3. counterfactuals removing the wrong causal record;
4. persistence claims without a real restart;
5. caller-selected history reaching cognition;
6. opaque IDs being treated as semantic evidence;
7. later judgments changing because request/identity/state changed rather than history;
8. Guardian tuning against the Development or held-out proof.

The standing question is:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change the Thread's later judgment?**
