---
id: validation-experiment-lifecycle
status: accepted
last-reviewed: 2026-08-24
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
  -> commit authoritative evidence when continuing audit value justifies it
  -> record diagnosis and lesson
  -> retire provider-executable cycle
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

When exact bytes retain continuing scientific, replay, interoperability or audit value, keep the machine-readable bundle under `artifacts/validation/`. The human-readable validation document interprets the result; Git history remains the archive for retired executables and intermediate cycles.

A sealed result may retain a read-only inspection command. That command must fail closed if authoritative evidence is unavailable and must never contain or reach a provider/model execution path.

## What remains in the active tree

Keep active only what is useful for current engineering:

- the latest accepted/frozen candidate needed to understand the accepted boundary;
- the accepted standing result when useful for auditability;
- exceptional retained exact-byte evidence with a continuing purpose;
- reusable Development-cycle harnesses that remain useful;
- generalized invariant/evidence-consistency tests learned from prior failures;
- shared experiment infrastructure such as provider progress and evidence helpers;
- optionally, a read-only sealed-result inspector that cannot call a provider.

After a standing cycle is sealed, its provider-executable proof/runner should normally be removed from the active command surface and active tree. Exact historical source remains recoverable from preserved repository history.

Do not keep every historical gate provider-executable merely because it once existed.

## What is preserved forever

For every accepted standing claim, preserve enough canonical information to reconstruct and audit the claim:

- experiment and candidate IDs;
- PASS / FAIL status;
- failure classification when applicable;
- provider and model ID;
- exact model outputs/rationales and normalization record when continuing audit value requires them;
- factor/evidence refs used by the evaluator when applicable;
- request/scenario fingerprints and causal witness IDs when applicable;
- frozen prompt/schema/source hashes or source commit SHA;
- scenario authorship/freeze boundaries when material;
- provider attempts/retries/failures relevant to interpreting the run;
- authoritative result summary;
- postmortem and methodological lesson;
- immutable repository history containing the exact retired executable source.

Human-readable accepted standing records remain under `docs/validation/`. Exceptional exact-byte evidence retained in HEAD belongs under `artifacts/validation/`. Repository history is the exact executable archive.

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
  -> canonical postmortem / retained lesson
  -> generalized lesson/invariant
  -> retired scenario/material
  -> executable source retained by reachable repository history
```

Retain exact machine evidence in HEAD only when it still serves a named scientific, replay, interoperability or audit purpose.

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

The accepted current record is [`history-bends-judgment-standing-gate-v4.md`](history-bends-judgment-standing-gate-v4.md). It records Candidate 4 as PASSED / SEALED: a Fibre-owned durable episode record survived restart and causally moved the same later request from `refuse/low` to `accept/high` under exact one-memory withholding.

Candidates/gates 1–3 remain preserved in Git history as failed sealed cycles and methodological lessons; their superseded per-cycle documents and machine bundles are not current-tree authorities.

The retained exact machine evidence is:

- `artifacts/validation/history_bends_judgment_standing_gate_v4.evidence.json`

The provider-capable History standing proof/runner/template stack is no longer active after sealing. `npm run history:gate` imports only the read-only sealed-evidence inspector and cannot reach model/provider execution. `npm run history:dev` is the repeatable provider-backed Development-cycle command and uses the shared provider heartbeat.

The v4 Development credit is deliberately limited: Episode A's setup appraisal was scripted; deterministic Actor v1 stored requester/objective/criteria-derived descriptive memory rather than Thread-authored reflection; the later standing comparison invoked Guardian v4 directly in the harness; and the default live runtime has not generalized this into rich experience-driven self-development.

## Semantic Guardian / dignity reasoning archive

The accepted current record is [`semantic-guardian-v4-standing-gate-v4.md`](semantic-guardian-v4-standing-gate-v4.md). Candidate 4 PASSED / SEALED with fresh held-out semantic identity/state differentials and earned the accepted standing credit.

Candidates/gates 1–3 remain preserved in Git history as failed sealed cycles and methodological lessons; their superseded per-cycle documents and machine bundles are not current-tree authorities.

The retained exact machine evidence is:

- `artifacts/validation/semantic_guardian_v4_standing_gate_v4.evidence.json`

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
