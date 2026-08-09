---
id: validation-experiment-lifecycle
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Experiment lifecycle and evidence retention

Fibre uses provider-backed experiments to test causal personhood claims such as semantic dignity and development through lived history. These experiments are scientific evidence, not product-version APIs.

The canonical lifecycle is:

```text
Development
  -> freeze Candidate N
  -> author fresh held-out Standing Gate N
  -> preflight
  -> first real provider attempt
  -> seal PASS or FAIL
  -> record diagnosis and lesson
  -> archive retired executable cycle
```

## Evidence classes

### Development

Development cases may be iterated. They exist to form a hypothesis, debug methodology, and establish a candidate worth freezing. Development evidence never moves the vision-integrity score by itself.

### Frozen candidate

A frozen candidate identifies the cognition/runtime/policy boundary to be tested. Once a standing scenario is authored against it, that candidate must not be tuned against the standing result.

### Standing gate

A standing gate is fresh held-out evidence. The first real provider attempt consumes the cycle and seals it pass or fail. A failed standing gate is not "broken code" to repair in place; it is an observation to preserve and diagnose.

### Sealed evidence

Sealed evidence is immutable in meaning. Later repository changes may improve non-semantic tooling such as summaries or progress indication, but they must not rewrite the authoritative outcome or silently turn a failed cycle into a pass.

## What remains in the active tree

Keep active only what is useful for current engineering:

- the latest accepted/frozen candidate needed by current code;
- the accepted standing scenario and reference proof when useful for inspectability;
- reusable Development harnesses that remain useful;
- generalized invariant tests learned from prior failures;
- shared experiment infrastructure such as provider progress, evidence sealing, and summary helpers.

Do not keep every historical gate runnable merely because it once existed.

## What is preserved forever

For every sealed standing cycle, preserve enough canonical evidence to reconstruct and audit the claim:

- experiment and candidate IDs;
- PASS / FAIL status;
- failure classification when applicable;
- provider and model ID;
- request/scenario fingerprints and causal witness IDs when applicable;
- frozen source hashes or source commit SHA;
- scenario authorship/freeze boundaries when material;
- authoritative result summary;
- postmortem and methodological lesson;
- immutable Git history containing the exact retired executable source.

The per-cycle documents under `docs/validation/` are the human-readable authority. Git history is the exact executable archive. Historical source may be recovered with `git show <commit>:<path>` when forensic reproduction is actually needed.

## Failed experiments are evidence

A failed gate must remain visible in the scientific record. It must not remain in the active command surface simply to prove that it happened.

The correct transformation is:

```text
failed executable cycle
  -> sealed canonical result
  -> generalized lesson/invariant
  -> retired scenario/material
  -> executable source retained by Git history
```

This prevents three forms of drift:

1. future engineers "fixing" a deliberately failed experiment;
2. obsolete scenarios being mistaken for supported tests or product behavior;
3. repeated copy/paste harnesses accumulating infrastructure bugs independently.

## Provider progress requirement

Any new CLI experiment that can block on a real model/provider call must visibly report progress.

The standard non-TTY-safe form is:

```text
<experiment> · <phase> · Calling <provider/model>
<experiment> · <phase> · Awaiting provider response · 0s elapsed
<experiment> · <phase> · Awaiting provider response · 10s elapsed
...
<experiment> · <phase> · Provider call completed · <Ns> elapsed
```

Use `tools/provider-progress.mjs` rather than implementing a new heartbeat per experiment. TTY-specific richer progress is permitted, but provider waits must never look like a silent hang.

Progress reporting is experiment/CLI infrastructure. It must not change Thread cognition, provider inputs, evaluator semantics, persistence, retrieval, or causal interventions.

## History bends judgment archive

Canonical records:

| Cycle | Candidate | Result | Lesson |
|---|---|---|---|
| `history_bends_judgment_standing_gate_v1` | Candidate 1 | FAILED / SEALED | Request B leaked the intended individuality/non-interchangeability conclusion. |
| `history_bends_judgment_standing_gate_v2` | Candidate 2 | FAILED / SEALED | The causal differential worked, but the evaluator overprescribed the repair verb. |
| `history_bends_judgment_standing_gate_v3` | Candidate 3 | FAILED / SEALED | Baseline Thread identity/self-model independently established the high-fit target. |
| `history_bends_judgment_standing_gate_v4` | Candidate 4 | PASSED / SEALED | An evidence-backed lived episode survived restart and causally moved the same later request from `refuse/low` to `accept/high`. |

Authoritative details remain in:

- `history-bends-judgment-standing-gate-v1.md`
- `history-bends-judgment-standing-gate-v2.md`
- `history-bends-judgment-standing-gate-v3.md`
- `history-bends-judgment-standing-gate-v4.md`
- `history-bends-judgment-candidate-4.md`

Candidate 4 itself also records the retired standing IDs, diagnoses, fingerprints, and material that may not be reused.

The active History v4 wrapper still reads the original v1 proof/CLI files as transformation templates. Those two base files are therefore retained as implementation dependencies, not as supported v1 commands. The retired v1 scenario/candidate and v2/v3 executable generations are archived out of the active tree.

## Semantic Guardian / dignity reasoning archive

Canonical records:

| Cycle | Candidate | Result | Lesson |
|---|---|---|---|
| `semantic_guardian_v4_standing_gate_v1` | Candidate 1 | FAILED / SEALED | Standing-gate specification defects. |
| `semantic_guardian_v4_standing_gate_v2` | Candidate 2 | FAILED / SEALED | Ambiguous semantic-state factor-direction assertion. |
| `semantic_guardian_v4_standing_gate_v3` | Candidate 3 | FAILED / SEALED | Counterfactual baseline defect plus an artificial runtime output ceiling. |
| `semantic_guardian_v4_standing_gate_v4` | Candidate 4 | PASSED / SEALED | Fresh held-out semantic identity/state differentials passed and earned standing credit. |

Authoritative details remain in the corresponding `semantic-guardian-v4-standing-gate-v1.md` through `-v4.md` documents and in Candidate 4's frozen boundary, which records prior standing diagnoses.

Retired Candidate 1-3 standing executables are not active product/test APIs and may be recovered from Git history if needed.

## Rule for future experiments

Before adding `v2`, `v3`, or another copy of a standing runner, ask whether the change belongs in:

- the hypothesis/candidate;
- the held-out scenario;
- the evaluator contract; or
- reusable experiment infrastructure.

Only the first three justify a new sealed experimental cycle. Infrastructure improvements should normally be generalized instead of copied into another versioned runner.
