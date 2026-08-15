---
id: adr-0012
status: accepted
date: 2026-08-14
---

# ADR-0012: Meaning-bearing semantic content remains authoritative over derived categories

## Context

The Whole-Person development sequence before Fibre milestone #39 was intended to answer a narrow question: can a Thread's particular non-professional life become relevant to present judgment without being reduced to competence, task fit, or a hand-authored personality rule?

The experiments did not earn M2 standing. They did, however, expose the same architectural failure mode at three different layers:

```text
historical event        != remembered autobiographical meaning
semantic appraisal      != an effect/valence enum derived from it
personal stance         != a compressed disposition category derived from it
```

The result was not planned in advance. It emerged through failed and adversarially reviewed experiments:

1. **Event-only interpretation collapsed.** Candidate v1 made childhood evidence visible but both Threads converged. When a durable `rememberedMeaning` was supplied separately from the historical event, the Threads acquired different present meanings.
2. **The corrected stored-meaning control was asymmetric but informative.** Thread A's stored interpretation moved appraisal from the consumer default `supports_participation` to `mixed`; when that interpretation was explicitly unavailable, A reverted to the default. Thread B remained at the default in both conditions. This is one demonstrated case, not a universal symmetric result.
3. **A derived label could override its own semantic source.** In the Stage-2 label-swap diagnostic, A retained semantic text describing erasure risk but was given `effect=supports_participation`; downstream cognition moved toward `supports_willingness`. Removing the label preserved the semantic separation. The verdict label was therefore not merely redundant; it could outrank contradictory meaning.
4. **A compressed stance enum was less stable than the surrounding semantics.** With one pinned personal-meaning appraisal, `meaningImpact=mixed` was stable 12/12 and final `accept` was stable 12/12, while the intermediate category split 6/12 `willing` and 6/12 `willing_with_reservation`. The experiment does not freeze a replacement schema, but it shows that a categorical boundary can be noisier and less faithful than the meaning it summarizes.
5. **Unforced attribution remained visible.** Once citation was no longer validator-mandated, the model still cited durable remembered meaning and the bounded personal-meaning appraisal at high rates. Attribution must therefore be measured honestly rather than manufactured by a schema that makes omission impossible.

The hostile review also sharpened an independent Fibre argument: even if some future cognition could infer an interpretation from historical fact, that inference is not authoritative autobiographical state. A re-derived interpretation has no stable revision lineage, cannot be disputed or corrected as the Thread's own remembered meaning, and may change silently between judgments about the same past.

The detailed development record is:

- `docs/validation/whole-person-benchmark.md`
- `docs/validation/whole-person-prefreeze-characterization.md`
- `docs/validation/m2-pr39-genesis-quality-constraints.md`

## Decision

### 1. Semantic meaning is authoritative; derived categories are secondary views

For meaning-bearing Thread state, Fibre treats the semantic content and its provenance as authority.

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

Enums, labels, ranks, scores, sentiment classes, salience buckets, and similar derived values may exist for indexing, inspection, comparison, control, or ablation. They may not replace, erase, or become the sole authoritative representation of the underlying meaning.

This decision strengthens ADR-0002's preference for natural-language meaning-bearing fields: structure exists to make meaning inspectable and computable, not to substitute a smaller category for the meaning itself.

### 2. Fibre-derived verdicts must not masquerade as evidence to downstream cognition

A downstream cognition stage may receive evidence type, stable reference, provenance, chronology, and bounded semantic content.

A Fibre-derived conclusion about that evidence must not be presented as though it were the evidence itself when doing so can pre-answer the downstream appraisal.

Examples:

```text
OK:
  kind = autobiographical_memory_meaning
  ref = memory:...
  semantic content = "..."

NOT authoritative evidence:
  effect = mixed
  relevance = high
  confidence = strong
  supports_participation = true
```

Such derived conclusions may remain Fibre-side metadata. If a later contract genuinely consumes an earlier *decision* or *authorization* as a fact, that is a separate domain fact and must be named as such; this rule is specifically against laundering semantic verdicts into evidence.

### 3. `rememberedMeaning` is durable Thread state independent of reconstructability

Historical fact and autobiographical interpretation remain distinct authorities.

```text
history            = what Fibre has evidence happened
remembered meaning = what the experience durably came to mean to this Thread
```

A model may be capable of proposing or reconstructing an interpretation, but reconstruction is not authority for the Thread's autobiographical state.

A durable `rememberedMeaning` must support:

- stable identity/reference;
- provenance and source event/memory references;
- chronology / `asOf` perspective;
- append-only revision or supersession;
- correction, dispute, retraction, and reinterpretation;
- stable citation across future judgments.

The Whole-Person experiment supports this distinction but does not carry the architecture by itself.

### 4. Ambivalence must preserve its tensions, not collapse into `mixed`

Where a remembered meaning contains materially distinct or opposing interpretations, Fibre must preserve enough semantic granularity for those tensions to remain independently inspectable and citable.

Conceptually:

```text
rememberedMeaning {
  summary: "I was grateful someone finished it, and something of him felt lost when they did."
  parts: [
    "someone cared enough to finish what he could not",
    "completion made part of his interrupted presence feel less visible"
  ]
}
```

The exact physical schema is not fixed by this ADR. The invariant is that two different ambivalences must not become interchangeable merely because both can be categorized as `mixed`.

### 5. Attribution used as evidence must be observable, not forced

When Fibre claims that cognition used a memory, relationship, identity assertion, obligation, or prior appraisal, standing evidence must be capable of observing non-use.

A validator may reject an invalid or unauthorized citation. It must not make the presence of a citation a prerequisite when the metric being claimed is "how often cognition used this evidence," because then the metric cannot fail.

This is an evidence-discipline rule, not a ban on production contracts that legitimately require explicit authority references for safety or execution.

### 6. Same action does not imply same person or same private stance

Two Threads may rationally perform the same outward action while carrying materially different personal meaning, reservation, cost, or relationship consequence.

Therefore development experiments must not be tuned merely to force `accept` versus `refuse` separation. Final action divergence remains useful standing evidence when a held-out situation genuinely supports it, but personhood is not reduced to maximizing action-label difference.

### 7. Genesis must create lives, not answers

Milestone #39 Genesis must create causally prior life state without access to future request answers.

Genesis quality criteria are stated in terms of the life itself:

- specificity;
- provenance;
- developmental coherence;
- uncertainty;
- ambivalence;
- non-prescriptiveness;
- corrigibility;
- separately addressable tensions.

Genesis prompts and validators must not ask for experiences that will later support participation, willingness, Guardian factors, task refusal/acceptance, or a known benchmark.

A remembered meaning may describe what an experience came to mean. It may not encode a future behavioral policy disguised as memory.

### 8. Held-out causal proof comes after the Genesis cohort exists

The Kwon Whole-Person scenario is closed as development material.

The next Whole-Person claim scenario must be authored only after a Genesis cohort exists and without access to that cohort's private childhood/interior material. This prevents both consumer-fitting to the scenario and Genesis-fitting to the benchmark.

## Empirical limits retained with the decision

This ADR intentionally records what the experiments did **not** prove:

- The clean stored-meaning result is carried by Thread A; Thread B matched the consumer default in both stored/unavailable conditions.
- A pro-participation prior with negative/ambivalent material as the only mover remains an alternative account and belongs to #40 consumer work.
- The unavailable-meaning control explicitly told cognition that no durable interpretation was recorded; it is stronger than literal absence.
- No experiment established that a dedicated reconstruction stage could never infer useful meaning from history.
- The unstable `willing` versus `willing_with_reservation` enum has not been blind-rated against the text, so this ADR does not mandate a replacement disposition schema.
- Valence/content disentanglement, cross-situation transfer, symmetric swap, contradiction, restart, provider replacement, and final-choice standing remain unearned.

These limits are part of the accepted understanding, not footnotes to be dropped later.

## Consequences for #39 — Genesis

- Persist event, autobiographical memory, and remembered meaning as distinct state.
- Treat semantic remembered meaning as authoritative, not a derived valence category.
- Preserve materially different tensions as separately addressable content.
- Avoid sentiment monoculture and clean moral lessons.
- Do not create episodes merely to prove a genome locus or future behavioral tendency.
- Keep generator quality rules blind to future consumers and benchmarks.

## Consequences for #40 — Identity Projection & Causal Consumption

- Resolve and transport semantic content, not just opaque refs or derived verdicts.
- Do not expose precomputed effect/relevance/confidence labels as evidence shortcuts to downstream cognition.
- Keep meaning separate from competence and authority.
- Characterize consumer priors and valence/content effects on held-out material.
- Let derived categories remain inspectable Fibre-side views unless a later ADR establishes a narrower authoritative use.
- Revisit willingness/reservation representation using evidence rather than inheriting the Pass-3 enum.

## Consequences for #41 — Standing

Standing must use fresh Genesis Threads and held-out situations, with counterfactual controls that preserve semantic meaning and prompt shape where possible.

The standing claim remains stronger than this ADR:

> different persistent lives must produce stable, attributable consequential differences that survive appropriate controls and cognition replacement.

## Alternatives rejected

### Reconstruct autobiographical meaning from history whenever needed

Rejected as authority. Even if technically feasible, it loses durable perspective, revision history, corrigibility, and stable citation.

### Store only categories such as `positive`, `negative`, or `mixed`

Rejected. It destroys particularity and makes different tensions interchangeable.

### Feed both semantic content and Fibre verdict labels downstream

Rejected as a default. The label-swap diagnostic showed the verdict can override contradictory content.

### Force opposite actions to prove non-interchangeability

Rejected as a development strategy. It encourages benchmark fitting and treats plausible convergence as failure.

### Continue tuning the Kwon scenario before Genesis

Rejected. Remaining questions concern #40 consumer semantics and standing methodology; #39 now has enough information to persist the right life substrate.

## Status

Accepted before Fibre milestone #39 begins.

This ADR records architectural understanding only. It does **not** move the M2 score, create accepted causal assertions, or upgrade Whole-Person development evidence to standing.