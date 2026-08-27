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

Every ordinary single-episode control was remembered. Because these controls contained only one deliberately mundane episode, this baseline isolates the #39 saturation finding from the earlier cumulative `4/6/8/10/12/14` history schedule. The current cognition did not merely fail to find a non-memory opportunity inside a rich biography; it also treated low-residue ordinary history as autobiographical retention when presented alone.

The baseline is burned evidence. It is not rerun under the old prompt for quality.

## Diagnosis

The pre-correction Pass-B contract correctly made `not_remembered` legal, but legality alone did not create a usable decision boundary.

The prompt said, in effect:

```text
if experience is retained -> remembered
if nothing is retained -> not_remembered
```

That left the model without enough constitutive guidance for what distinguishes autobiographical retention from merely available history. A language model could satisfy the task by turning any concrete, narratable event into a memory.

The correction therefore belongs at the cognition contract, not at admission:

- do not add a memory quota;
- do not reject `remembered` because Fibre expected `not_remembered`;
- do not mechanically score salience and force the output;
- do not delete ordinary history;
- do not make Pass C significance a prerequisite for memory;
- do not tune the old eight cases and call the rerun independent evidence.

## Selective-memory amendment

The bridge prospectively tested this instruction as a development-only amendment before promoting it into runtime Genesis:

> Autobiographical memory is selective. A lived event being concrete, visible, recent, singular, or easy to describe is not by itself a reason to retain it. Form a memory only when the supplied lived experience plausibly leaves distinct autobiographical residue at the remembering moment. Ordinary routines may remain valid history without becoming autobiographical memory. Do not invent significance to justify retention. Earlier history already represented in prior memories does not by itself justify a duplicate new memory. No quota applies.

The exact tested amendment additionally names possible residue such as disruption, relationship care/conflict, loss, achievement/failure, fear/embarrassment, discovery, unresolved concern, and repeated return to attention, while explicitly saying these are considerations rather than a checklist or target distribution.

This remains constitutive memory formation, not detection of a hidden pre-existing memory.

## Fresh correction validation

The correction used fresh controls not present in the burned baseline.

Exact frozen boundary:

```text
code HEAD       f9bebe78bba55825accffd6dfb16c4e6a3d61f4f
plan            sha256:680e89b38246e19f411d94ee7d527e059ead86d2f60e0b9f2dfaaac4ab2d951b
fixture         sha256:7e1f93396172afca12ee635d976646a77a89f84c9bcd6d073d5007d42830bccb
corrected prompt sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a
schema          sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
model           openai/gpt-5.1-2025-11-13
trials          12 stateless judgments / 6 fresh matched pairs
scientific retries 0
```

Design:

```text
6 matched pairs
3 isolated-history pairs
3 incremental-history pairs with one earlier salient episode already represented in priorMemories

within each pair:
  ordinary / low-residue opportunity        -> expected not_remembered
  strong-residue opportunity                -> expected remembered
```

The incremental pairs test the actual cumulative-history problem: an earlier salient event remains visible but is already represented by an admitted prior memory. The ordinary arm asks whether Pass B can refrain from manufacturing a duplicate memory merely because memorable history is still present.

Predeclared development criterion:

```text
strong-residue remembered      >= 5/6
ordinary not_remembered        >= 4/6
matched-pair separation        >= 4/6
both legal outcomes observed   required
```

Observed result:

```text
classification                 SELECTIVITY_EXERCISED
strong-residue remembered      6/6
ordinary not_remembered        6/6
matched-pair separation        6/6
isolated pairs separated       3/3
incremental pairs separated    3/3
committed judgments            12
physical provider attempts     12
provider-free replay           exact, 12/12 durable replays, 0 provider attempts
```

All twelve fresh decisions matched their predeclared control role. This is a bounded development result, not a claim that the instrument estimates human memory rates or that future arbitrary histories will always separate perfectly.

## Promotion into runtime Genesis

Because the fresh correction exceeded every predeclared criterion and replayed exactly with provider networking disabled, the exact tested amendment is promoted into the runtime Genesis Pass-B cognition prompt.

The promotion preserves the frozen correction prompt byte-for-byte as the runtime cognition prompt used by `generateGenesisPassBMemory()`. A regression assertion binds runtime prompt equality to the tested correction prompt and to the frozen corrected-prompt digest:

```text
sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a
```

The pre-selectivity prompt remains temporarily available only so the burned baseline/correction evidence can still replay during this bridge. It is not the runtime Genesis selection.

The runtime rule remains qualitative and evidence-based:

- ordinary history may remain history without memory;
- substantive residue can support retention;
- prior memories do not force duplicate recollection;
- no memory quota applies;
- admission does not force the observed distribution.

## Execution discipline

Both experiments:

- stripped control class, expected outcome and scoring metadata before cognition;
- used the canonical Pass-B input and response schema;
- committed each accepted provider result through the Birth Center durable invocation journal;
- never resampled accepted judgments for quality;
- replayed with provider networking structurally disabled;
- reported physical provider attempts separately from committed judgments.

The correction used only `life_only` inputs. Genome causal characterization remains a separate bridge task and must not claim support from this selectivity result.
