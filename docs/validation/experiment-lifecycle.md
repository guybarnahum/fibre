---
id: validation-experiment-lifecycle
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Experiment lifecycle and evidence retention

Fibre uses provider-backed experiments to test causal personhood claims such as semantic dignity and development through durable history. These experiments are scientific evidence, not product-version APIs.

The canonical lifecycle is:

```text
Development cycle
  -> freeze Candidate N
  -> author fresh held-out Standing Gate N
  -> preflight
  -> first real provider attempt
  -> seal PASS or FAIL
  -> commit authoritative evidence
  -> record diagnosis and lesson
  -> archive provider-executable cycle
```

`Development cycle` here is an **experiment evidence class**. It is distinct from both the vision-integrity rubric dimension named **Development** and any roadmap milestone that may also use that word.

This lifecycle axis is also orthogonal to the capability-status vocabulary in the vision/invariants documents (`deferred`, `experimental`, `rejected`, `permanent constraint`). A standing gate can be sealed evidence for an experimental capability without making that capability permanent or complete.

## Evidence classes

### Development cycle

Development cases may be iterated. They exist to form a hypothesis, debug methodology, and establish a candidate worth freezing. Development-cycle evidence never moves the vision-integrity score by itself.

### Frozen candidate

A frozen candidate identifies the cognition/runtime/policy boundary to be tested. Once a standing scenario is authored against it, that candidate must not be tuned against the standing result.

### Standing gate

A standing gate is fresh held-out evidence. The first real provider attempt consumes the cycle and seals it pass or fail. A failed standing gate is not "broken code" to repair in place; it is an observation to preserve and diagnose.

### Sealed evidence

Sealed evidence is immutable in meaning. Later repository changes may improve non-semantic tooling such as summaries or progress indication, but they must not rewrite the authoritative outcome or silently turn a failed cycle into a pass.

Every sealed standing cycle must commit its exact machine-readable evidence bundle when the bundle contains no secret material. The bundle is the machine authority; the validation document is the human-readable interpretation.

A sealed result may retain a read-only inspection command. That command must fail closed if authoritative evidence is unavailable and must never contain or reach a provider/model execution path.

## What remains in the active tree

Keep active only what is useful for current engineering:

- the latest accepted/frozen candidate needed to understand the accepted boundary;
- the accepted standing scenario when useful for auditability;
- the committed sealed evidence bundle;
- reusable Development-cycle harnesses that remain useful;
- generalized invariant/evidence-consistency tests learned from prior failures;
- shared experiment infrastructure such as provider progress and evidence helpers;
- optionally, a read-only sealed-result inspector that cannot call a provider.

After a standing cycle is sealed, its provider-executable proof/runner should normally be removed from the active command surface and active tree. Exact historical source remains recoverable from the preserved repository history.

Do not keep every historical gate provider-executable merely because it once existed.

## What is preserved forever

For every sealed standing cycle, preserve enough canonical evidence to reconstruct and audit the claim:

- exact machine-readable evidence bundle;
- experiment and candidate IDs;
- PASS / FAIL status;
- failure classification when applicable;
- provider and model ID;
- exact model outputs/rationales and normalization record when applicable;
- factor/evidence refs used by the evaluator when applicable;
- request/scenario fingerprints and causal witness IDs when applicable;
- frozen prompt/schema/source hashes or source commit SHA;
- scenario authorship/freeze boundaries when material;
- provider attempts/retries/failures relevant to interpreting the run;
- authoritative result summary;
- postmortem and methodological lesson;
- immutable repository history containing the exact retired executable source.

The per-cycle documents under `docs/validation/` are the human-readable authority. The committed evidence bundles under `artifacts/test-results/` are the machine-readable authority. Repository history is the exact executable archive.

### Archive-preservation rule for squash merges

If a candidate/standing executable is **introduced and retired within the same pull request**, a squash merge alone may erase the intermediate executable history from the target branch. Before such a PR is squash-merged, preserve the final experiment branch history with either:

- a normal merge commit that retains the PR commit ancestry; or
- a permanent experiment tag/ref pointing at the reviewed final PR head.

Do not claim `git show <commit>:<path>` recoverability unless the referenced commit will remain reachable after branch cleanup.

## Failed experiments are evidence

A failed gate must remain visible in the scientific record. It must not remain in the active provider-execution surface simply to prove that it happened.

The correct transformation is:

```text
failed executable cycle
  -> sealed committed evidence bundle
  -> canonical postmortem
  -> generalized lesson/invariant
  -> retired scenario/material
  -> executable source retained by reachable repository history
```

This prevents three forms of drift:

1. future engineers "fixing" a deliberately failed experiment;
2. obsolete scenarios being mistaken for supported tests or product behavior;
3. repeated copy/paste harnesses accumulating infrastructure bugs independently.

## Provider progress requirement

Any CLI experiment that can block on a real model/provider call must visibly report progress.

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
| `history_bends_judgment_standing_gate_v4` | Candidate 4 | PASSED / SEALED | A Fibre-owned durable episode record survived restart and causally moved the same later request from `refuse/low` to `accept/high` under exact one-memory withholding. |

Authoritative human-readable details remain in:

- `history-bends-judgment-standing-gate-v1.md`
- `history-bends-judgment-standing-gate-v2.md`
- `history-bends-judgment-standing-gate-v3.md`
- `history-bends-judgment-standing-gate-v4.md`
- `history-bends-judgment-candidate-4.md`

Exact machine evidence is committed as:

- `artifacts/test-results/history_bends_judgment_standing_gate_v1.evidence.json`
- `artifacts/test-results/history_bends_judgment_standing_gate_v2.evidence.json`
- `artifacts/test-results/history_bends_judgment_standing_gate_v3.evidence.json`
- `artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json`

Candidate 4 also records the retired standing IDs, diagnoses, fingerprints, and material that may not be reused.

The provider-capable History standing proof/runner/template stack is no longer active after sealing. `npm run history:gate` imports only the read-only sealed-evidence inspector and cannot reach model/provider execution. `npm run history:dev` is the repeatable provider-backed Development-cycle command and uses the shared provider heartbeat.

The v4 Development credit is deliberately limited: Episode A's setup appraisal was scripted; deterministic Actor v1 stored requester/objective/criteria-derived descriptive memory rather than Thread-authored reflection; the later standing comparison invoked Guardian v4 directly in the harness; and the default live runtime has not generalized this into rich experience-driven self-development.

## Semantic Guardian / dignity reasoning archive

Canonical records:

| Cycle | Candidate | Result | Lesson |
|---|---|---|---|
| `semantic_guardian_v4_standing_gate_v1` | Candidate 1 | FAILED / SEALED | Standing-gate specification defects. |
| `semantic_guardian_v4_standing_gate_v2` | Candidate 2 | FAILED / SEALED | Ambiguous semantic-state factor-direction assertion. |
| `semantic_guardian_v4_standing_gate_v3` | Candidate 3 | FAILED / SEALED | Counterfactual baseline defect plus an artificial runtime output ceiling. |
| `semantic_guardian_v4_standing_gate_v4` | Candidate 4 | PASSED / SEALED | Fresh held-out semantic identity/state differentials passed and earned standing credit. |

Exact machine evidence is committed as:

- `artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json`
- `artifacts/test-results/semantic_guardian_v4_standing_gate_v2.evidence.json`
- `artifacts/test-results/semantic_guardian_v4_standing_gate_v3.evidence.json`
- `artifacts/test-results/semantic_guardian_v4_standing_gate_v4.evidence.json`

Authoritative details remain in the corresponding `semantic-guardian-v4-standing-gate-v1.md` through `-v4.md` documents and in Candidate 4's frozen boundary, which records prior standing diagnoses.

Retired Candidate 1-3 standing executables are not active product/test APIs and may be recovered from reachable repository history when forensic reproduction is needed.

## Current episodic-memory limitation

Deterministic Actor v1 currently proposes episodic memory only for accepted participation. This is an **experimental limitation, not a permanent personhood constraint**.

That means the current substrate is sufficient for the accepted `history_raises_dignity` v4 case but is not yet a general substrate for history that lowers dignity through betrayal, refusal, compulsion, failure, disappointment, exhaustion, or other adverse experience.

Extension path:

- admit evidence-backed memory proposals from non-accepted/adverse lifecycle events without letting hostile requester prose become an instruction channel;
- distinguish observed/lived facts from requester-supplied facts;
- support Thread-authored observation/reflection as separately provenance-bound life changes;
- preserve descriptive-not-prescriptive validation and Fibre-owned selection;
- test both history-raises and history-lowers directions under fresh held-out causal gates.

## Rule for future experiments

Before adding `v2`, `v3`, or another copy of a standing runner, ask whether the change belongs in:

- the hypothesis/candidate;
- the held-out scenario;
- the evaluator contract; or
- reusable experiment infrastructure.

Only the first three justify a new sealed experimental cycle. Infrastructure improvements should normally be generalized instead of copied into another versioned runner.
