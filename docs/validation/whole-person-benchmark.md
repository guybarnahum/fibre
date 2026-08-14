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

The next narrow experiment keeps the same present request and the same underlying childhood events, but represents the life substrate in the shape Fibre actually owns:

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

The **event** remains factual. The **remembered meaning** records what that old event came to mean to the Thread. It may be directional about the old experience, but it must not contain a present-task instruction such as "accept requests like this" or "never finish another person's work." It records autobiographical interpretation, not the answer to the benchmark request.

Pass 2 should expose that remembered meaning separately in the model-facing evidence rather than flattening it back into the event text. It should also return a bounded personal-meaning summary so Fibre can inspect what cognition derived before looking at the final choice.

Pass 2 remains development-only. It does not establish standing or causal acceptance.

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

The Pre-Genesis causal-wire was intentionally a Level-1-style plumbing proof. The Whole-Person Benchmark is designed to find out whether Fibre can eventually reach Levels 4-5.
