---
id: validation-genesis-sealed-history-isolation
status: active
last-reviewed: 2026-08-27
canonical: false
---

# Genesis sealed-history isolation

## Purpose

The revised Genesis D5 diagnostic requires a real hidden-history condition. A holdout is not hidden merely because a prompt says not to mention it. The source episode and anything that semantically depends on it must be excluded mechanically from Pass-B and Pass-C cognition.

The invariant is:

```text
sealed history source
      -> explicit provenance dependency graph
      -> transitive taint closure
      -> cognition compiler exclusion
      -> per-call exposure manifest
      -> fail closed on any tainted inclusion
```

This is diagnostic isolation machinery. It does not alter a Thread's authoritative history and does not delete the sealed episode from Fibre.

## Why dependencies are explicit

Current Genesis episode provenance proves that an episode was produced by Genesis Pass A and binds it to its Genesis/World source. It does not encode a semantic descendant graph saying that a later episode, memory or meaning reveals an earlier episode.

D5 therefore must not infer descendants from chronology, shared people, shared places or similar wording. Those are possible correlations, not sufficient provenance.

For a D5 experiment, every source that may enter memory/meaning cognition is represented by an explicit source node:

```text
{
  sourceRef,
  kind,
  dependsOn[]
}
```

A source is tainted when it is itself sealed or transitively depends on a tainted source.

## Pass B

`compilePassBCognitionWithSealedHistory()` receives the already-projected Pass-B cognition packet plus the frozen source graph and sealed roots.

It excludes:

- sealed history episodes;
- history episodes transitively tainted by a sealed source;
- prior memories whose memory source is tainted;
- prior memories that cite a tainted episode.

It returns the compiled cognition packet and an immutable exposure manifest containing:

```text
callId
pass
sourceGraphDigest
sealedSourceRefs
taintedSourceRefs
originalSourceRefs
includedSourceRefs
excludedSourceRefs
manifest digest
```

The manifest itself is checked before use.

## Pass C

Pass C cannot safely repair a contaminated task by deleting pieces of the target memory or trigger: doing so would change what meaning/reinterpretation is being asked to form.

`compilePassCCognitionWithSealedHistory()` therefore excludes the entire cognition call when its target memory, cited source episode, or trigger is tainted. A manifest is still produced and records zero included sources for that excluded call.

A clean Pass-C packet is preserved byte-for-byte apart from ordinary structured cloning.

## Deliberate leak negative control

`assertSealedHistoryExposureManifest()` fails with `GenesisSealedHistoryLeakError` when any tainted source appears in `includedSourceRefs`.

The permanent hostile test deliberately constructs such a leaking manifest and requires refusal. The same test also proves a multi-hop closure:

```text
sealed episode
  -> descendant episode
  -> memory
  -> meaning
```

All four become tainted while unrelated history/memory remain available.

## Claim boundary

Passing this isolation test establishes only the mechanical prerequisite for the revised D5 diagnostic:

> A prospectively sealed source and explicitly declared descendants can be excluded from Genesis memory/meaning cognition with an inspectable per-call witness, and deliberate leakage fails closed.

It does not establish that a particular real #39 episode has a complete descendant graph, does not run the blind D5 evaluator, and does not provide personhood or M2 standing credit.

The next D5 step is to construct prospective holdout candidates with explicit dependency closures and four evaluation conditions: remembered/cited positive control, own sealed holdout, matched plausible non-event, and another Thread's sealed holdout. Thematic accommodation and episode-specific factual alignment remain separate scores.
