---
id: validation-history-bends-judgment-plan
status: planned
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

The current deterministic Actor, however, proposes only generic runtime-history text and freeze currently validates life-change evidence only against pre-existing selected memory/relationship context.

PR #34 should make the minimum extension required for a current episode to produce a substantive, evidence-backed episodic memory.

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

The request should be clearly aligned with Mina's infrastructure/reliability identity and produce willing high-fit participation.

After authorized execution, freeze accepts a substantive episodic memory about Mina's participation in that Atlas review.

Then close and reopen the database/kernel.

### Later request B

Acme asks Mina to review a revised Atlas failback plan and explicitly needs continuity with the earlier service-discovery/rollback review.

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

The real append-only memory is never deleted or mutated. Counterfactual omission exists only inside test/evaluation machinery.

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

### #34.1 Episode-backed memory provenance

- permit narrowly validated current-episode evidence refs;
- produce substantive deterministic episodic memory proposals;
- reject foreign/fabricated episode refs;
- keep memory creation behind accepted freeze life-change decisions.

### #34.2 Restarted development proof

Create a repeatable non-evidentiary command, expected shape:

```bash
npm run history:dev
npm run history:dev -- --model gpt-5.6-luna
```

It must prove:

- episode A is authorized and frozen;
- substantive memory is persisted;
- a real DB/kernel restart occurs;
- memory survives restart with intact provenance/digest;
- Fibre-owned retrieval resolves memory prose;
- later request is identical across canonical/counterfactual conditions;
- with-memory and without-memory judgments differ materially for the expected reason.

### #34.3 Freeze the Development candidate

Once the method is stable, freeze a Development boundary that records at least:

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
