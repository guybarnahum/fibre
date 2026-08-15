---
id: fibre-pre-pr39-whole-person-understanding
status: accepted
last-reviewed: 2026-08-14
canonical: true
---

# Pre-#39 Whole-Person understanding

This checkpoint records the accepted Fibre understanding immediately before milestone **#39 — Genesis, Childhood & Thread Birth v1** begins.

It is a state/decision checkpoint, not a new milestone, standing gate, or score movement.

Canonical decision: [`ADR-0012`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md).
Detailed development evidence: [`whole-person-prefreeze-characterization.md`](../validation/whole-person-prefreeze-characterization.md).
#39 quality constraints: [`m2-pr39-genesis-quality-constraints.md`](../validation/m2-pr39-genesis-quality-constraints.md).

## What changed in our understanding

The Whole-Person experiments started with a narrower idea: if two equally capable Threads have different childhood experiences, perhaps those experiences can make them choose differently.

The experiments and hostile audit produced a more important architectural understanding:

> **A Thread's life cannot be reduced to facts plus categories. Fibre must preserve what events came to mean to the Thread as durable semantic state, and must preserve that meaning rather than replacing it with compressed labels.**

This surfaced at three different layers:

```text
historical event
  != durable remembered meaning

semantic personal meaning
  != effect / valence enum

personal stance with reservation or tension
  != one compressed disposition label
```

The recurring principle is now accepted repository-wide:

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

Categories remain useful derived views. They are not the Thread's authoritative meaning.

## Strongest experimental learning

The corrected stored-meaning control held prompt, schema, evidence shape, historical event, and total input bytes constant.

Observed:

```text
Thread A
  stored rememberedMeaning       -> mixed                  6/6
  rememberedMeaning unavailable  -> supports_participation 6/6

Thread B
  stored rememberedMeaning       -> supports_participation 6/6
  rememberedMeaning unavailable  -> supports_participation 6/6
```

The result is deliberately bounded:

- separation is carried by Thread A alone;
- `supports_participation` behaves as the consumer default;
- Thread B is uninformative for whether a positive interpretation can move the consumer away from its prior;
- a pro-participation prior with negative/ambivalent meaning as the only mover remains a live #40 question;
- the unavailable control explicitly states that no durable interpretation is recorded, which is stronger than literal absence.

The empirical conclusion is therefore narrow:

> **In this consumer, Thread A's historical event did not by itself sustain A's durable interpretation; when that interpretation was unavailable, appraisal reverted to the consumer default.**

The architectural conclusion is independent and stronger:

> **`rememberedMeaning` is durable Thread state whether or not some model could reconstruct a similar interpretation later.**

A Thread's autobiographical interpretation needs a stable lineage, chronology, corrigibility, dispute/correction/retraction, and stable citation across future judgments. Re-deriving it ad hoc at every decision cannot provide that authority.

## Downstream cognition lesson

The label-swap diagnostic showed that a Fibre-derived verdict can overpower the semantic content from which it was derived.

A summary describing erasure risk still moved toward `supports_willingness` when prefixed with `effect=supports_participation`.

Therefore #40 must distinguish:

```text
TYPE / PROVENANCE
  safe to expose when relevant

SEMANTIC CONTENT
  authoritative evidence

DERIVED VERDICT / SCORE / RANK / EFFECT LABEL
  Fibre-side view; not evidence semantics
```

This applies beyond Whole-Person appraisal to future relevance ranks, confidence/strength labels, sentiment classes, and factor enums whenever they summarize meaning-bearing evidence.

## Ambivalence lesson

Genesis should not create valence-simple lives:

```text
bad event  -> negative lesson
kind event -> positive lesson
```

That risks building moods with biographies attached.

A believable life contains unresolved tensions:

```text
"I was grateful someone finished it,
and something of him felt less present afterward."
```

When materially distinct tensions coexist, #39 should preserve them as separately addressable semantic parts rather than flatten them into one `mixed` category.

The exact physical schema remains an implementation choice. The required property is semantic granularity.

## Personhood and action lesson

Two persistent persons may perform the same action for different personally grounded reasons and with different private costs.

Therefore:

```text
same final action
!= same personal meaning
!= same private stance
!= interchangeability
```

Development work must not force theatrical `accept` versus `refuse` differences merely to make identity visible. Strong standing later still requires consequential, attributable differences where the situation genuinely supports them.

## Evidence-discipline lesson

Attribution must be capable of failing.

If a schema requires a citation before a run can complete, a 100% citation rate is not evidence that cognition chose to use the source.

Fibre may validate citations that exist for authority and provenance. But any experimental/standing claim about **how often evidence was used** must observe non-use rather than reject it out of the dataset.

## What #39 may now assume

#39 may treat these as accepted design constraints:

1. Event, autobiographical memory, and remembered meaning are distinct state.
2. Remembered meaning is durable, corrigible semantic state, not disposable inference.
3. Semantic content is authoritative over derived categories.
4. Material ambivalence should preserve separately addressable tensions.
5. Genesis must be blind to future request answers and downstream benchmark goals.
6. Genesis must create specific lives, not future behavioral rules.
7. Symbolic genome tendencies and lived experience may interact without either being flattened into an adult persona.
8. The next Whole-Person claim scenario must not be used to shape the Genesis cohort.

## What #39 must not assume

The experiments did **not** establish:

- that personal meaning always changes behavior;
- that positive and negative meanings receive symmetric consumer weight;
- that `mixed`, `supports`, `opposes`, or any other effect enum should be constitutional;
- that `willing_with_reservation` should be a durable disposition category;
- that the Pass-3 two-call architecture is canonical;
- that final action must differ for two Threads to be distinct;
- that historical events can never support useful inferred interpretation;
- that Whole-Person Level 2 standing has been earned.

These remain #40/#41 design and standing questions.

## Closed development material

The Kwon restoration scenario is closed.

Do not add Pass 4, tune the scenario, or use it as #39 acceptance evidence.

Its purpose was to discover architectural constraints. It succeeded at that purpose, including by producing failed diagnostics that changed the design.

## Next sequence

```text
NOW   #39 Genesis, Childhood & Thread Birth v1
THEN  #40 Identity Projection & Causal Consumption
FINAL #41 M2 Standing Gate / M2 closure
```

#39 should now build the life substrate needed for a genuine held-out test rather than continuing to optimize the old development benchmark.

No M2 score movement is awarded by this checkpoint.