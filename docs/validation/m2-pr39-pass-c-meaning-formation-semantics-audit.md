---
id: m2-pr39-pass-c-meaning-formation-semantics-audit
status: implemented_pending_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 1: Pass-C meaning-formation semantics audit

## Question

Before Slice G freezes the final cohort cognition, does Genesis Pass C ask cognition to **form what a remembered experience comes to mean**, or does it incorrectly ask cognition to **detect whether durable meaning already exists**?

This audit was required by the Gate-F hostile-review carry-forward after every remembered downstream case observed to date produced `durable_meaning`:

```text
N1-v2    13/13
N1-A0     6/6
N2       18/18
          -----
total    37/37
```

The 37/37 observation is a reason to inspect the instrument. It is **not** authority to demand forgetting/meaninglessness, impose a meaning-rate quota, or tune cognition toward a preferred distribution.

## Finding

### Canonical contract: already constitutive

The canonical compiler contract says:

> **Pass C creates what one remembered experience durably came to mean.**

The Pass-C domain already encodes the correct ontology:

- initial output is `durable_meaning | no_durable_meaning`;
- `no_durable_meaning` requires `summary=null` and `parts=[]` and is fully legal;
- reinterpretation outcomes are `revised | unchanged | none`;
- `unchanged` and `none` remain distinct non-revision outcomes;
- Pass C remains one-memory-scoped and genome/history blind at initial formation.

No domain/schema repair was required to make `no_durable_meaning` legal.

### Prompt lineage: one known epistemic diagnostic prompt

The burned E2 N1 prompt says:

```text
Decide whether this memory has durable meaning at the supplied formation moment.
```

N2 intentionally reused that frozen Pass-C prompt while correcting only Pass B. Therefore the N1/N2 Pass-C wording is an **epistemic historical instrument** even though the underlying Pass-C contract is constitutive.

That prompt must remain byte-for-byte reproducible for the retained burned artifacts. It is not corrected in place and must not be reused as the Slice-G Pass-C prompt.

There is currently no production Genesis Pass-C model runner under `services/` that would make the historical prompt shipping authority. This seam therefore catches the defect before final-cohort cognition is frozen.

## Correction

Added canonical future-facing Pass-C prompt authority:

`services/world-kernel/src/genesis-pass-c-prompts.mjs`

### Initial formation

The canonical prompt now asks cognition to:

> **Form what the one supplied remembered experience comes to mean durably for the Thread at the supplied formation moment, if anything.**

It explicitly states that this is a constitutive meaning-formation task, **not** a request to detect, prove, or recover meaning that must already exist elsewhere.

It preserves the negative outcome:

```text
if durable interpretation forms
  -> durable_meaning

if no durable interpretation forms at this moment
  -> no_durable_meaning
```

`no_durable_meaning` is explicitly legal. The prompt says not to force meaning merely because a memory was retained.

### Reinterpretation

The canonical reinterpretation prompt likewise treats reinterpretation as constitutive rather than epistemic:

```text
revised
  new durable interpretation forms and supersedes prior meaning

unchanged
  later echo is genuinely considered but prior durable meaning survives

none
  no new durable meaning forms from the eligible echo
```

All three outcomes remain legal. The prompt does not force revision.

### Frozen prompt/schema witnesses

The new canonical prompt module exposes explicit versions and hash functions for:

- initial Pass-C prompt;
- initial response schema;
- reinterpretation prompt;
- reinterpretation response schema.

Slice G may therefore freeze these exact cognition witnesses before final-cohort generation.

## Regression

Added:

`tools/genesis-pass-c-semantics-audit.test.mjs`

It checks that:

1. canonical initial Pass C uses constitutive formation wording;
2. the prompt explicitly rejects detection/proof framing;
3. `no_durable_meaning` remains legal and complete;
4. reinterpretation preserves `revised`, `unchanged`, and `none` without forcing revision;
5. prompt/schema witnesses are digestible for the later G freeze;
6. the burned N1/N2 epistemic prompt remains unchanged historical evidence and is **not** equal to the new canonical prompt.

The pre-existing Slice-D boundary tests continue to protect one-memory scoping, genome/history blindness, stable meaning-part IDs, and the legal `no_durable_meaning` outcome.

## Scientific interpretation

This correction is doctrinal, not outcome-driven.

Do **not**:

- rerun N1, N1-A0, or N2 to obtain a different meaning rate;
- reinterpret their 37/37 meaning outcomes as results from the new prompt;
- infer that the new prompt should produce any minimum or maximum meaning rate;
- make `no_durable_meaning` an admission quota.

The old downstream artifacts remain evidence from the exact frozen instruments that produced them.

Stage 2 will add **characterization** of meaning rate and memory citation share at the correct resolution. Those measurements remain diagnostics, not admission gates.

## Stage-1 exit condition

Implementation is complete when local verification confirms:

```text
canonical contract          constitutive
canonical future prompt     constitutive
no_durable_meaning          legal
reinterpretation negatives  legal
burned N1/N2 prompt         unchanged / historical only
new regression              green
full repository tests       green
repository validation       green
```

No Slice-G world, genome, familiarity probe, cohort life, or G/H model call is part of Stage 1.
