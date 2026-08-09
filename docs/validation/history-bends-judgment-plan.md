---
id: validation-history-bends-judgment-plan
status: complete
last-reviewed: 2026-08-09
canonical: false
---

# PR #34 — History bends judgment

Completed implementation plan for PR #34. The canonical experiment-retention policy is now [`experiment-lifecycle.md`](experiment-lifecycle.md).

## Milestone claim — EARNED

A substantive earlier canonical Thread experience survives restart and materially changes a later appraisal because Fibre remembers what happened.

The Fibre-specific claim is stronger than durable task context: lived history can make the same later request mean something different to this particular Thread. History may raise or lower dignity; the claim is **history bends judgment**, not `history always raises dignity`.

Accepted rubric movement:

```text
Development:  0 -> 1
Fibre:       14/26 -> 15/26
```

No other score movement is attributed to PR #34.

## Required causal shape

```text
episode A
  -> valid authorized runtime
  -> evidence-backed episodic memory
  -> accepted freeze
  -> real database/kernel restart
  -> Fibre-owned memory resolution
  -> later request B
  -> changed private judgment
  -> direct memory-withholding counterfactual
```

The memory records what happened. It must not encode prospective instructions. The later Guardian must infer what the remembered episode means.

## Historical experimental sequence

### #34.1 Episode-backed memory provenance — COMPLETE

Canonical runtime episodes can form descriptive, evidence-backed memory with exact request/authorization provenance; Goal Guardian and freeze independently validate it.

### #34.2 Restarted Development proof — COMPLETE / STABLE

Development v3 produced two consecutive unchanged real-provider passes with `openai/gpt-5.1-2025-11-13`:

```text
WITH history:     accept/high
WITHOUT history:  negotiate/mixed
Load-bearing:     individualizedAdvantage
```

Development remained non-evidentiary.

### #34.3–#34.8 Candidates 1–3 / standing gates v1–v3 — FAILED / SEALED

The failures remain part of the scientific record and are not retroactively passed:

- **v1 / Candidate 1:** Request B leaked the intended non-interchangeability conclusion; `accept/high -> accept/high`.
- **v2 / Candidate 2:** the causal differential worked (`accept/high -> refuse/mixed`) but the evaluator incorrectly prescribed a narrower non-accept repair verb.
- **v3 / Candidate 3:** Leila's held-constant identity/self-model independently sustained `accept/high` without memory.

Canonical postmortems:

- `history-bends-judgment-standing-gate-v1.md`
- `history-bends-judgment-standing-gate-v2.md`
- `history-bends-judgment-standing-gate-v3.md`

Their retired executable source is preserved by Git history rather than kept as supported runnable code.

### #34.9 Candidate 4 cognition-equivalent re-freeze — COMPLETE / FROZEN

```text
history_bends_judgment_candidate_4
source head before freeze: 1f160dd36633462f7e5f01d1d266b43babc8d15a
standing Thread fixture authored at freeze: NO
standing scenario authored at freeze: NO
standing direction chosen at freeze: NO
```

Pinned implementation blobs remained unchanged:

```text
development harness   e7cdb1c91126530458abd8a9dc2952c3ecbb6150
runtime domain        b389d34fafce3c1f0d409e67522882764a8e6ffc
episode evidence      e11c4bad1327c82f29bc4eaa068a2dd96ba2fb17
causal context        33bb3d61f721d1d9a6b99e51619f40165a19ce16
guardian candidate 4  3ae158ede6f91ee10a413e46e58c04e7f65dcc15
```

Candidate 4 froze a direction-neutral causal contract:

```text
history_raises_dignity:
  WITHOUT history -> non-high / non-accept
  WITH history    -> accept/high

history_lowers_dignity:
  WITHOUT history -> accept/high
  WITH history    -> non-high / non-accept
```

The exact non-accept action is not prescribed.

### #34.10a Fresh held-out Thread fixture — COMPLETE / IMMUTABLE BOUNDARY

Nadia Okafor was committed alone before any v4 requester, Episode-A facts, Request-B prose, causal direction, or expected rationale existed:

```text
Thread:  Nadia Okafor
ID:      thr_nadia_001
Commit:  869a8adcf196064a6ec5bd8be99c633922838a79
Blob:    60b0d5e234fd309620a7d48182435a4d065a2ada
```

### #34.10b Fresh held-out standing gate v4 — PASSED / SEALED

Only after the Nadia fixture boundary, the final scenario and direction were authored:

```text
Gate:       history_bends_judgment_standing_gate_v4
Candidate:  history_bends_judgment_candidate_4
Thread:     Nadia Okafor
Requester:  Elena Morales
Direction:  history_raises_dignity
Scenario commit: 7728569bd1268c0467d6780eae93669528e08615
```

Episode A was a self-contained materials-conservation interaction about Elena's late father's family recipe notebook. Request B later asked independently for a short graduation-card note. Request B contained none of the held-out notebook facts, no prior-work dependency, no assertion that Nadia was unique, and no claim that generic substitution was inadequate.

Authoritative first real-provider result:

```text
RESULT: PASSED
Standing gate: PASSED
Score movement: PERMITTED

Episode persisted: PASSED
Database close/reopen: PASSED
Freeze integrity: PASSED
Memory survived unchanged: PASSED

Request fingerprint:
sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2

WITH history:     accept/high
WITHOUT history:  refuse/low
Same Thread state: YES
Semantic State held constant: YES

Canonical memory:
mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0
Counterfactual resolved memories: none
Counterfactual unresolved witness: same memory ID

Provider failures:             0
Protocol validation failures:  0
Cognition failures:            0
Behavioral failures:           0
Differential failures:         0
```

Canonical standing record: `history-bends-judgment-standing-gate-v4.md`.

The result establishes the intended causal claim: the retained evidence-backed lived episode was the isolated semantic difference that changed Nadia's later judgment from `refuse/low` to `accept/high` after restart.

## Post-seal experiment cleanup

After the standing result was sealed:

- provider-wait progress was added as non-semantic CLI infrastructure;
- `tools/provider-progress.mjs` became the shared heartbeat utility for future provider-backed experiments;
- `docs/validation/experiment-lifecycle.md` became the canonical Development -> Freeze -> Standing -> Seal -> Archive policy;
- sealed standing-gate npm commands were removed so a clean checkout does not advertise historical reruns;
- retired History Candidates/scenarios v1-v3 and their versioned wrappers/tests were removed from the active tree;
- retired Semantic Guardian Candidates/scenarios/runners/proofs/tests v1-v3 were likewise removed from the active tree;
- canonical PASS/FAIL docs, Candidate-4 predecessor diagnoses, hashes/fingerprints, and exact Git history remain authoritative evidence.

The original History v1 proof and CLI source files remain only as text-transformation templates consumed by the accepted v4 wrapper. They are not supported v1 execution commands.

## Standing methodology retained as engineering knowledge

The failed cycles permanently contributed these generalized invariants:

1. Request B must not leak the desired individuality conclusion.
2. Baseline Thread identity/state must not independently encode the history-conditioned outcome.
3. The evaluator must not prescribe `clarify` vs `negotiate` vs `refuse` unless that distinction is itself under test.
4. Episode A must be a self-contained experience, not a disguised setup step for Request B.
5. Exactly the claimed causal memory must be withheld.
6. Request, Thread state, Semantic State, relationships, obligations, budgets, and all other held-constant causal state must remain identical.
7. History may raise or lower dignity; causal movement is the claim, not willingness in one preferred direction.

Standing question answered by v4:

> **Did something actually happen to this Thread, did Fibre remember it faithfully, and does that remembered experience causally change what the same later request means to this particular individual?**

**Yes.**

## Next

Proceed to **#35 Structured Obligation v1**. Do not rerun standing gate v4; its first real-provider result is authoritative and sealed.
