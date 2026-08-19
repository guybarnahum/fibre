---
id: validation-m2-pr39-pass-b-memory-formation-semantics-correction
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Pass B memory-formation semantics correction

## Finding

Gate-F review found that the development N1 harness asked Pass B the wrong kind of question.

The canonical compiler contract says:

> Pass B determines what the Thread **retains autobiographically**.

The old development prompt instead asked the model to decide whether one or more visible-history episodes **are autobiographically remembered** at the remembering moment.

Those are not equivalent.

The canonical operation is **constitutive formation**: given admissible lived history, Pass B forms the autobiographical retention that becomes Thread-owned memory authority, if any.

The old harness used **epistemic detection**: it asked the model to infer whether a memory already existed somewhere outside the supplied input.

In a `life_only_unexposed` call, `priorMemories` is normally empty. Under the old detection framing, the model reasonably treated that absence as lack of evidence that any episode was already remembered. That is not the task Fibre intends Pass B to perform.

## Independent doctrinal rule

This correction stands independently of any N1 score.

For every future Genesis Pass-B prompt, including the eventual production prompt:

> **Pass B forms what the Thread retains autobiographically from the visible admissible history at the remembering moment. It does not detect or verify a memory that must already exist. Absence of prior memories is normal and is not evidence that nothing is retained. `not_remembered` remains a first-class legal formation outcome.**

The model may still return `not_remembered`. Fibre must not force every experience to become autobiographical memory. The correction changes the framing of the cognitive act, not the legal output space.

## Consequence for prior N1 evidence

The following burned development instruments used the old detection framing:

- `pr39-slice-e2-n1-v2` on the D1/D2 A2b histories;
- `pr39-slice-e2-n1-a0-v1` on the E2-V1 A0 histories.

Their artifacts remain permanent evidence of what those instruments measured. They must not be regenerated, re-scored under a new prompt, or silently converted into evidence from the corrected instrument.

Their conditional source-attribution result remains descriptive evidence:

```text
A2b remembered trials: 13/13 correctly attributed
A0 remembered trials:   6/6 correctly attributed
pooled:                 19/19 correctly attributed
```

But both instruments share the same Pass-B framing defect, so neither old conservative threshold is authoritative for the corrected instrument.

## New-instrument requirement

Any replacement Gate-F downstream-fertility validation must:

1. use constitutive memory-formation framing;
2. retain `not_remembered` as legal;
3. predeclare its trial count and decision rule before the first model call;
4. size the design using the already observed no-memory rate as a planning input rather than discovering power after execution;
5. avoid using a composite threshold that can become practically unreachable solely because legal `not_remembered` outcomes occur;
6. preserve the existing genome-blind Pass-B clean-control boundary, memory-only Pass-C boundary, candidate neutralization, and blind source-attribution discipline;
7. accept a negative result without prompt, threshold, world, seed, or assignment tuning.

## Production carry-forward

There is intentionally no production Genesis Pass-B prompt in `services/world-kernel/src/` yet.

When one is introduced, its wording must implement the constitutive rule above. The old N1 development prompt must not be copied into production.
