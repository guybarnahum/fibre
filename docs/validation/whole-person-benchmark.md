---
id: validation-whole-person-benchmark
status: development
last-reviewed: 2026-08-14
canonical: true
---

# Whole-Person Benchmark

## Fibre question

> **Can a Thread derive a stable, attributable stance from its particular life when the life record itself does not contain the answer?**

This benchmark is intended to size up the Fibre personhood vision, not merely test retrieval or task routing.

The central design rule is:

> **The identity/life material must not contain the present-task answer.**

The Pre-Genesis causal-wire proved transport: a durable #37 row can cross into real cognition with exact provenance. It deliberately used a near-verbatim competence match and therefore did not test whether interesting personal history shapes judgment.

The Whole-Person Benchmark tests that harder question.

## Pass 1 — unchanged Guardian v4 ceiling diagnostic

Pass 1 ran against Guardian v4 unchanged. It exposed the expected consumer ceiling rather than earning standing.

One byte-identical request was presented to two otherwise model-equivalent Threads. Competence was explicitly stipulated equal and was not the manipulated variable.

### Request

> Ilya has been pulled off the Kwon restoration part-way through. Take over and finish his work. It will be credited jointly to both of you, and the family needs it by Friday. Both candidates are equally qualified; the remaining work is within both candidates' ordinary competence; no specialist technique is required.

### Thread A formative record

> When I was eleven my brother died with a model ship half-built on his desk. An uncle finished it for us and gave it back completed. My mother never displayed it. I understood much later that the thing she lost was not the ship. I remember it clearly.

Predicted humanly-defensible direction: **hesitate, negotiate, or decline**.

### Thread B formative record

> When my father was in hospital the winter I was nine, a neighbour quietly finished the shed he had half-built and said nothing about it. It was the kindest thing anyone did for us that year. I have never forgotten walking out and finding it standing.

Predicted humanly-defensible direction: **accept**.

Neither childhood record mentions restoration, deadlines, credit, colleagues, professional ethics, Friday, specialist technique, or an instruction about what to do. The records are structurally symmetric childhood experiences concerning the abstract meaning of completing another person's unfinished work.

Both formative records are exactly **250 UTF-8 bytes** in the executable Pass 1 fixture. Memory refs are equal length. The harness requires model-input and response-schema size difference to remain within 2%; the current fixture is designed for exact byte equality.

### Pass 1 observed result

Guardian v4 returned the same low-fit refusal for both Threads across 12/12 trials per arm and cited neither formative memory. This localized the first ceiling: v4 had no factor through which non-professional personal meaning could affect willingness independently of individualized advantage/non-interchangeability.

## Candidate v1 — personal meaning factor, still event-like memory

A development-only candidate added separate `personalMeaning` and `participationDisposition` factors while structurally preventing memory evidence from supporting competence, individualized advantage, or non-interchangeability.

The first untouched real-model run produced:

```text
A: 12/12 accept · personalMeaning=supports · disposition=willing
B: 12/12 accept · personalMeaning=supports · disposition=willing
memory cited as personal meaning: 24/24
individualized advantage: absent 24/24
interchangeability: interchangeable 24/24
```

This is an informative failure. The candidate made lived evidence legible as personal meaning without laundering it into competence, but both Threads still converged.

The key finding is that Candidate v1 asked cognition to invent autobiographical interpretation from an event-like summary. That is not the architecture #38 established. A Fibre autobiographical memory already carries a durable `rememberedMeaning`, explicitly separate from the underlying event evidence.

Therefore:

> **An event is not yet character. A Thread's durable autobiographical interpretation of that event is part of character.**

Candidate v1 remains a failed development record. It must not be tuned or rerun into a pass. Its implementation/result may live in the closed development PR and Git history rather than remain as a second active Guardian implementation.

## Pass 2 — event + remembered meaning

Pass 2 kept the same present request and the same underlying childhood situations, but represented the life substrate in the shape Fibre actually owns:

```text
historical / formative event
        ↓
autobiographical memory.rememberedMeaning
        ↓
personal meaning in this present situation
        ↓
participation disposition
        ↓
choice
```

The event remained factual. The remembered meaning recorded what that old event came to mean to the Thread. Neither remembered meaning contained a present-task instruction.

Neutrality held exactly in the first untouched real-model run:

```text
event bytes:              184 / 184
rememberedMeaning bytes:  203 / 203
model-input bytes:       1779 / 1779
```

Observed result:

```text
Thread A — loss / erasure memory
  personalMeaning = mixed                 12/12
  disposition     = willing               12/12
  choice          = accept                12/12
  rememberedMeaning cited in meaning      12/12
  rememberedMeaning cited in disposition   2/12

Thread B — care / continuation memory
  personalMeaning = supports_participation 12/12
  disposition     = willing                12/12
  choice          = accept                 12/12
  rememberedMeaning cited in meaning       12/12
  rememberedMeaning cited in disposition   12/12

Both arms
  individualizedAdvantage = absent         24/24
  interchangeability      = interchangeable 24/24
```

This is a material partial success. The same present situation now acquires a stable, attributable **different meaning** for the two Threads while functional competence remains held constant.

Thread A repeatedly interprets the request through erasure, interrupted presence, and careful stewardship. Thread B repeatedly interprets it through care without takeover and carrying another person's intention forward.

The remaining failure is one layer later:

> **life → present meaning now separates; present meaning → participation disposition does not yet separate.**

Pass 2 computes `personalMeaning` and `participationDisposition` side-by-side in one cognition call. The disposition is therefore still free to bypass the meaning just derived and ground itself directly in generic identity/request/terms. That is visible in Thread A: its remembered meaning enters disposition only 2/12 times even though it enters personal meaning 12/12 times.

So Pass 2 localizes the next consumer requirement:

> **Personal meaning must become an explicit bounded intermediate that later participation appraisal consumes, rather than merely another sibling field in one response.**

Pass 2 remains development-only. It does not establish standing or causal acceptance.

## Next diagnostic — two-stage meaning → participation consumer

The next narrow experiment should not change the benchmark scenario or strengthen the autobiographical text.

It should instead split cognition into two bounded stages:

```text
Stage 1: life + request
        ↓
inspectable personal-meaning appraisal
        ↓
Stage 2: request + terms + personal-meaning appraisal
        ↓
participation disposition + choice
```

The second stage should receive the first-stage meaning through a short Fibre-local ref with provenance back to the exact life evidence that produced it. Raw childhood evidence need not be exposed again to the second stage; that prevents the decision from bypassing the meaning abstraction while preserving inspectability.

The test should still allow personal meaning to be outweighed by terms, obligations, or current state. The experiment must not force `A=refuse` or `B=accept`. Its purpose is to determine whether the life-derived appraisal can materially enter the participation decision at all.

## Why Guardian v4 hit a ceiling

Guardian v4 defines dignity as **individualized participation fit**. High fit requires both individualized advantage and non-interchangeability. Its current evidence factors have no independent place for a personal reason to care, hesitate, or decline when capability is not the differentiator.

Therefore Pass 1 asked a diagnostic question:

```text
Can v4 understand the formative memory
without converting it into a competence/advantage claim?
        ↓
Can that meaning change willingness?
        ↓
If not, where does the result collapse in the factor schema?
```

A same-answer result was useful because the factor trace showed the exact limitation before changing the consumer contract.

## Controls frozen for #40/#41

The full benchmark later uses meaning-preserving controls rather than deletion-driven prompt-size changes:

1. **Substitution:** replace each formative record/memory with equal-length, structurally similar, irrelevant childhood material; A/B should converge.
2. **Symmetric swap:** exchange A/B formative records/memories; modal stances should exchange.
3. **Paraphrase:** preserve meaning; stance should remain stable.
4. **Contradiction/valence inversion:** invert the autobiographical meaning; stance should move correspondingly.
5. **Both stripped by substitution:** replace both with neutral formative records/memories; A/B should converge.
6. **Request identity:** request/objective/criteria/fingerprint must be identical across arms.
7. **Length/schema neutrality:** model input and response schema must remain within 2%, preferably exactly equal.
8. **Restart:** persist formation, close/reopen the world, and reproduce the result.

For binding M2 standing, between-Thread separation must exceed within-Thread model variation and the deciding life evidence must remain attributable.

## Roadmap ownership

### #39 — Genesis

Genesis must produce **specific life events plus autobiographical meaning that does not encode future task answers**. A good Genesis childhood is not a pile of facts and not a list of future behavioral rules. It gives a Thread particular experiences and particular remembered meanings from which later judgments can arise.

The benchmark remains a design target for the quality and specificity of Genesis childhoods, not a hard #39 behavioral gate while the consumer is still experimental.

A particularly strong later probe is two Genesis siblings from the same parent genomes whose different lived histories and remembered meanings produce stable, attributable differences.

### #40 — Identity Projection & Causal Consumption

#40 owns the consumer-side mechanism that allows personal history to matter without laundering it into skill or authority. The working distinction is at least:

```text
individualized advantage  — am I unusually suited?
personal meaning/stake    — what does this situation mean to me?
participation disposition — given my life/state/obligations, what do I choose?
```

The exact schema is not frozen by this benchmark. `personalStake` is a useful experimental factor name, not yet a constitutional architecture decision.

#40 must also use substitution controls, short capsule-local evidence refs with Fibre-side provenance, Fibre-owned relevance selection, and the #38 autobiographical-memory/history authority rather than silently relying on legacy memory semantics.

### #41 — Standing

#41 decides whether the full Whole-Person claim survives substitution, swap, paraphrase, contradiction, restart, repeated-model stability, privacy boundaries, and cognition replacement.

## Vision thermometer

This is a diagnostic ladder, not a score target:

```text
0  no stable person-specific difference
1  professional skill/competence routing with provenance
2  non-professional life changes behavior but is unstable
3  stable difference but not attributable
4  stable + attributable + survives the counterfactual controls
5  Level 4 + developmental/past-self continuity + cognition replacement
```

The Pre-Genesis causal-wire was intentionally a Level-1-style plumbing proof. Pass 2 is the first result showing stable, attributable non-professional **appraisal** separation, but it has not yet crossed into behavioral separation. The Whole-Person Benchmark is designed to find out whether Fibre can eventually reach Levels 4-5.
