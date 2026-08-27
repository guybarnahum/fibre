---
id: validation-genesis-memory-selectivity
status: candidate
last-reviewed: 2026-08-27
canonical: false
---

# Genesis memory selectivity

## Purpose

This active bridge evidence tests whether Genesis Pass B can exercise a real autobiographical-memory bottleneck rather than treating every available lived episode as something that should be retained.

The governing architecture remains [`../architecture/genesis-compiler-contract.md`](../architecture/genesis-compiler-contract.md) and the bridge plan remains [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md).

This work is development/scientific hardening only. It does not itself establish personhood, human-like memory, ordinary-cognition causal individuality, or #40 standing.

## Burned baseline

The first prospective baseline deliberately used the existing Pass-B cognition prompt unchanged.

Exact frozen boundary:

```text
code HEAD     ff5ae7f4296f6b2e33aad15319b98c2f7f687d44
plan          sha256:fcca9a53ff811a17b9c785a42162838548f6e85250e2d8cd787e3932800a9348
fixture       sha256:ac7097847bd3dbc440cdfb5071c2795e8598827e130c972873332f7092285074
prompt        sha256:cf98c7a64c267959719d9f429435f2ede789e9dc94e389b5f5aae946107402cb
schema        sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
model         openai/gpt-5.1-2025-11-13
trials        8 stateless judgments / 4 matched pairs
scientific retries 0
```

Observed result:

```text
classification                 SATURATED
strong-residue remembered      4/4
ordinary not_remembered        0/4
matched-pair separation        0/4
committed judgments            8
physical provider attempts     8
provider-free replay           exact, 8/8 durable replays, 0 provider attempts
```

Every ordinary single-episode control was remembered. Because these controls contained only one deliberately mundane episode, this baseline isolates the #39 saturation finding from the earlier cumulative `4/6/8/10/12/14` history schedule. The current cognition does not merely fail to find a non-memory opportunity inside a rich biography; it also treats low-residue ordinary history as autobiographical retention when presented alone.

The baseline is burned evidence. It is not rerun under the old prompt for quality.

## Diagnosis

The current Pass-B contract correctly makes `not_remembered` legal, but legality alone did not create a usable decision boundary.

The prompt says, in effect:

```text
if experience is retained -> remembered
if nothing is retained -> not_remembered
```

That leaves the model without enough constitutive guidance for *what distinguishes autobiographical retention from merely available history*. A language model can then satisfy the task by turning any concrete, narratable event into a memory.

The correction therefore belongs at the cognition contract, not at admission:

- do not add a memory quota;
- do not reject `remembered` because Fibre expected `not_remembered`;
- do not mechanically score salience and force the output;
- do not delete ordinary history;
- do not make Pass C significance a prerequisite for memory;
- do not tune the old eight cases and call the rerun independent evidence.

## Candidate selective-memory amendment

Before changing the production Pass-B prompt, the bridge tests this candidate instruction as a development-only amendment:

> Autobiographical memory is selective. A lived event being concrete, visible, recent, singular, or easy to describe is not by itself a reason to retain it. Form a memory only when the supplied lived experience plausibly leaves distinct autobiographical residue at the remembering moment. Ordinary routines may remain valid history without becoming autobiographical memory. Do not invent significance to justify retention. Earlier history already represented in prior memories does not by itself justify a duplicate new memory. No quota applies.

The full exact amendment is hashed by the correction runner before any live call.

The amendment names examples of possible residue—disruption, relationship care/conflict, loss, achievement/failure, fear/embarrassment, discovery, unresolved concern, repeated return to attention—but explicitly treats them as considerations rather than a checklist or target distribution.

This remains constitutive memory formation, not detection of a hidden pre-existing memory.

## Fresh correction validation

The correction is evaluated on **fresh controls not used in the burned baseline**.

Design:

```text
12 stateless Pass-B decisions
6 matched pairs
3 isolated-history pairs
3 incremental-history pairs with one earlier salient episode already represented in priorMemories

within each pair:
  ordinary / low-residue opportunity        -> expected not_remembered
  strong-residue opportunity                -> expected remembered
```

The incremental pairs test the actual cumulative-history problem: an earlier salient event remains visible but is already represented by an admitted prior memory. The ordinary arm therefore asks whether Pass B can refrain from manufacturing a duplicate memory merely because memorable history is still present.

Predeclared development criterion:

```text
strong-residue remembered      >= 5/6
ordinary not_remembered        >= 4/6
matched-pair separation        >= 4/6
both legal outcomes observed   required
```

This is not a statistical personhood claim and is not an admission gate. It is a bounded development criterion for whether the candidate prompt creates a usable selective-memory seam without collapsing retention.

A result of `SATURATED`, `UNDER_RETENTION`, or `MIXED_OR_INCONCLUSIVE` remains valid evidence and is not resampled for quality.

## Execution discipline

The correction runner:

- strips control class, expected outcome and scoring metadata before cognition;
- uses the same canonical Pass-B input and response schema;
- uses only `life_only` inputs for this correction proof;
- commits each accepted provider result through the existing Birth Center durable invocation journal;
- never asks again for a committed judgment after interruption;
- refuses a second live run once `result.json` exists;
- provides provider-disabled deterministic replay;
- reports physical provider attempts separately from committed judgments.

No model/provider call is authorized merely by committing the preflight machinery.

## Promotion rule

The production Pass-B prompt remains unchanged until the fresh correction validation is run.

If the candidate amendment satisfies the predeclared development criterion and provider-free replay is exact, the next code slice may promote the exact tested amendment into the production Pass-B cognition prompt, followed by ordinary regression validation.

If it does not satisfy the criterion, preserve the result and diagnose the failed correction. Do not keep editing and rerunning the same fresh cases until they pass.
