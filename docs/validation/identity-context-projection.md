---
id: validation-identity-context-projection
status: active
last-reviewed: 2026-08-27
canonical: false
---

# Identity context projection

This is the provider-free acceptance boundary for the first Identity Projection & Causal Consumption slice.

Its purpose is to prove that Fibre can compile a bounded, replayable cognition context from authoritative Thread-owned state without granting a stateless reasoning worker direct access to a Thread, its stores, or its history.

## Authority boundary

The compiler reads existing semantic authorities; it creates no new identity authority and persists no competing copy of Thread state.

The source inventory includes the current identity view, current semantic state, current autobiographical memories, current situated-life records, current embodiment records, and the Thread's symbolic genome. Every inventoried source receives a stable reference, source version where the domain exposes one, a deterministic content digest, visibility/status metadata, and provenance sufficient to explain why it was included or excluded.

The Thread snapshot is used only for Thread identity and snapshot version. Its body is not copied or hashed into the capsule, so legacy/full-Thread fields and sealed-history content do not become an implicit cognition dependency.

## Inclusion policy

The first compiler is deliberately conservative.

- current/corrected identity assertions may enter semantic cognition only when already marked `candidate_causal` or `accepted_causal` and not `protected_source`;
- current semantic state is selected by the existing Fibre-owned semantic-state attention policy for the request;
- autobiographical memory may enter only when selected identity/state already cites that memory and the memory is currently usable and accessible;
- raw relationship/place records remain provenance-bearing context sources but require a semantic projection before cognition;
- embodiment remains presentation context rather than local reasoning evidence;
- symbolic genome loci remain excluded under the accepted pre-#40 `CONTEXT_ONLY` standing until a later controlled slice defines an attributable consumer.

This policy does not promote any domain's causal standing and does not strengthen genome prompting.

## Privacy and selection

Selection authority is Fibre-owned. The activation request schema contains no field for caller-nominated memory, relationship, identity, state, genome, or other private refs; extra selector fields fail validation.

Included and excluded refs partition the inventoried authoritative sources. Exclusions retain reasons for audit without placing excluded semantic prose in the worker input.

The compiler does not query raw Thread events or authoritative history. A worker therefore cannot obtain sealed history through this boundary merely because the history exists in Fibre.

## Worker boundary

The worker packet resolves its system prompt from:

```text
services/world-kernel/prompts/identity-context.local-reasoning.md
```

The semantic model input contains exactly five sections:

1. Task
2. Actors
3. Evidence
4. Rules
5. Output schema

Prompt-resolution metadata, source digests, domain registries, provenance machinery, selection policy, and excluded refs remain outside that semantic model input. The worker is not asked to understand Fibre ontology.

## Provider-free acceptance

This slice is accepted only if deterministic and hostile tests establish:

- source ordering does not change the compiled capsule;
- exact included/excluded refs and exclusion reasons are stable;
- bounded item and byte budgets fail by exclusion rather than full-Thread dumping;
- a requester cannot nominate private refs;
- cross-Thread authoritative sources fail closed;
- protected-source text, unselected memory, symbolic-genome text, and full-Thread/sealed-history canaries do not reach the capsule's semantic evidence or worker input;
- the worker packet has only the five semantic input sections above;
- the new reasoning prompt resolves through the prompt-asset registry while all previously pinned scientific prompt digests remain unchanged.

No provider call is part of this acceptance slice.

## Scientific standing

This slice is architecture and provenance scaffolding only. It earns no Whole Person / M2 score movement and does not establish behavioral causality, non-interchangeability, genome effect, self-authorship, or personhood evidence.

A later controlled slice must hold the external situation fixed and vary a legitimate Thread-owned factor through this boundary, then show an attributable downstream cognitive difference without treating identity as deterministic destiny. Only that experiment can change causal standing.
