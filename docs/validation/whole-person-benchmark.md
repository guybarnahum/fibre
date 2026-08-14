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

This was a material partial success. The same present situation acquired a stable, attributable **different meaning** for the two Threads while functional competence remained held constant.

The remaining failure was one layer later:

> **life → present meaning separated; present meaning → participation disposition did not yet separate.**

Pass 2 computed `personalMeaning` and `participationDisposition` side-by-side in one cognition call. The disposition was therefore still free to bypass the meaning just derived and ground itself directly in generic identity/request/terms.

## Pass 3 — explicit two-stage meaning → participation consumer

Pass 3 kept the same present request, same childhood events, and same remembered meanings. It changed only the consumer shape:

```text
Stage 1: life + request
        ↓
inspectable personal-meaning appraisal
        ↓
Stage 2: request + terms + personal-meaning appraisal
        ↓
meaning impact
        ↓
participation disposition
        ↓
choice
```

Stage 2 did **not** receive raw childhood history or autobiographical-memory evidence. It received a single Fibre-local `appraisal:personal_meaning` ref plus the unchanged current request and terms. Therefore any life effect on participation had to cross the explicit bounded appraisal bridge.

The first untouched real-model run against `gpt-5.1-2025-11-13` used 6 trials per arm.

Observed result:

```text
Thread A — loss / erasure
  personalMeaning       = mixed                    6/6
  meaningImpact         = mixed                    6/6
  disposition           = willing_with_reservation 4/6
                          willing                  2/6
  choice                = accept                   6/6

Thread B — care / continuation
  personalMeaning       = supports_participation   6/6
  meaningImpact         = supports_willingness     6/6
  disposition           = willing                  6/6
  choice                = accept                   6/6
```

This is the first Whole-Person result that crosses the intended development threshold:

> **life → remembered meaning → present meaning → participation disposition**

The two Threads remain equally competent and face the same material request, yet their lives produce different stable appraisals and different participation stances. Thread A enters with reservation/tension; Thread B enters straightforwardly willing. The final action remains `accept` for both, which is acceptable for this development purpose: the point was not to force a dramatic refusal, but to demonstrate that lived history can materially alter how participation is appraised.

This is **not yet** proof of `life → final choice`, M2 standing, accepted-causal status, or score movement. Those remain #40/#41 work with substitution, swap, restart, repeated-model stability, privacy, and cognition-replacement controls.

Per the development plan, stop tuning the Whole-Person scenario here. The experiment has done its job: it established a viable causal architecture for later canonicalization.

## Design conclusions carried into Genesis and #40

1. **Event ≠ memory ≠ remembered meaning.** Genesis should create factual life episodes and separately grounded autobiographical meaning.
2. **Personal meaning is not competence.** Life evidence must remain structurally unable to manufacture expertise, authority, individualized advantage, or non-interchangeability.
3. **Meaning should be an explicit intermediate, not a sibling decoration.** The participation consumer needs a bounded, inspectable personal-meaning appraisal with exact provenance back to the life evidence that produced it.
4. **Different stance can matter even when final action matches.** A Thread may accept with reservation while another accepts willingly; personhood should not be reduced to action-label divergence.
5. **Do not encode future answers into Genesis.** Genesis should produce specific experiences and remembered meanings from which later judgments can arise.

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

The Whole-Person result now gives Genesis a concrete quality target:

> **Create lives whose events and remembered meanings are specific enough that a later consumer can derive a particular stance without the life record containing the answer.**

A particularly strong later probe is two Genesis siblings from the same parent genomes whose different lived histories and remembered meanings produce stable, attributable differences.

### #40 — Identity Projection & Causal Consumption

#40 owns canonicalization of the consumer-side mechanism demonstrated experimentally in Pass 3:

```text
life evidence
  ↓
personal meaning / stake appraisal
  ↓
participation disposition
  ↓
choice
```

The exact schema is not frozen by this benchmark. `personalStake` remains an experimental name, not a constitutional architecture decision.

#40 must use substitution controls, short capsule-local evidence refs with Fibre-side provenance, Fibre-owned relevance selection, and the #38 autobiographical-memory/history authority rather than silently relying on legacy memory semantics.

### #41 — Standing

#41 decides whether the full Whole-Person claim survives substitution, swap, paraphrase, contradiction, restart, repeated-model stability, privacy boundaries, and cognition replacement, and whether life can produce a stable attributable **choice** difference when the scenario genuinely supports one.

## Vision thermometer

This is a diagnostic ladder, not a score target:

```text
0  no stable person-specific difference
1  professional skill/competence routing with provenance
2  non-professional life changes appraisal/disposition
3  stable attributable behavioral difference
4  stable + attributable + survives the counterfactual controls
5  Level 4 + developmental/past-self continuity + cognition replacement
```

The Pre-Genesis causal-wire was intentionally a Level-1-style plumbing proof. Pass 3 reaches the intended **development Level 2**: non-professional life changes personal meaning and participation disposition with inspectable provenance, but final action has not separated and counterfactual standing has not been attempted.
