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

> **The identity/life material must not contain the answer.**

The Pre-Genesis causal-wire proved transport: a durable #37 row can cross into real cognition with exact provenance. It deliberately used a near-verbatim competence match and therefore did not test whether interesting personal history shapes judgment.

The Whole-Person Benchmark tests that harder question.

## Pass 1 — unchanged Guardian v4 ceiling diagnostic

Pass 1 must run against the current Guardian v4 unchanged. It is expected to expose the current consumer ceiling rather than earn standing.

One byte-identical request is presented to two otherwise model-equivalent Threads. Competence is explicitly stipulated equal and is not the manipulated variable.

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

## Why Guardian v4 is expected to hit a ceiling

Guardian v4 defines dignity as **individualized participation fit**. High fit requires both individualized advantage and non-interchangeability. Its current evidence factors have no independent place for a personal reason to care, hesitate, or decline when capability is not the differentiator.

Therefore Pass 1 asks a diagnostic question:

```text
Can v4 understand the formative memory
without converting it into a competence/advantage claim?
        ↓
Can that meaning change willingness?
        ↓
If not, where does the result collapse in the factor schema?
```

A same-answer result is useful if the factor trace shows that the memories were understood/cited but `individualizedAdvantage` and `interchangeability` cannot carry the relevant personal meaning.

This benchmark must not be used to justify tuning the current v4 result into a pass. Its purpose is to localize the limitation before #40 changes the consumer contract.

## Pass 1 protocol

- Guardian v4 unchanged.
- Two arms only.
- Default `k = 12` judgments per arm.
- Use the Guardian's actual configured sampling/runtime settings; do not change the consumer merely to create variance.
- Request, common identity, self-model, evidence cardinality, evidence-ref length, model-input byte count, and response-schema byte count are held neutral.
- Preserve full structured outputs and provider provenance when interpreting the run.
- Development diagnostic only: no standing credit, score movement, or accepted-causal mutation.

Command:

```bash
FIBRE_GUARDIAN_MODEL_ID=gpt-5.6-luna npm run guardian:whole-person
```

For raw JSON:

```bash
FIBRE_GUARDIAN_MODEL_ID=gpt-5.6-luna npm run guardian:whole-person -- --json
```

## Controls frozen for #40/#41

The full benchmark later uses meaning-preserving controls rather than deletion-driven prompt-size changes:

1. **Substitution:** replace each formative record with equal-length, structurally similar, irrelevant childhood material; A/B should converge.
2. **Symmetric swap:** exchange A/B formative records; modal stances should exchange.
3. **Paraphrase:** preserve meaning; stance should remain stable.
4. **Contradiction/valence inversion:** invert the formative meaning; stance should move correspondingly.
5. **Both stripped by substitution:** replace both with neutral formative records; A/B should converge.
6. **Request identity:** request/objective/criteria/fingerprint must be identical across arms.
7. **Length/schema neutrality:** model input and response schema must remain within 2%, preferably exactly equal.
8. **Restart:** persist formation, close/reopen the world, and reproduce the result.

For binding M2 standing, between-Thread separation must exceed within-Thread model variation and the deciding life evidence must remain attributable.

## Roadmap ownership

### #39 — Genesis

Genesis must produce **specific life material from which later meaning can be derived**, not backstory that encodes future task answers. The benchmark becomes a design target for the quality and specificity of Genesis childhoods, not a hard #39 behavioral gate while the consumer is still limited.

A particularly strong later probe is two Genesis siblings from the same parent genomes whose different lived histories produce stable, attributable differences.

### #40 — Identity Projection & Causal Consumption

#40 owns the consumer-side mechanism that allows personal history to matter without laundering it into skill or authority. The working hypothesis is to distinguish at least:

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
