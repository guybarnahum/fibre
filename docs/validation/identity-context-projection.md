---
id: validation-identity-context-projection
status: active
last-reviewed: 2026-08-28
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

The compiler is deliberately conservative.

- current/corrected identity assertions may enter semantic cognition only when already marked `candidate_causal` or `accepted_causal` and not `protected_source`;
- current semantic state is selected by the existing Fibre-owned semantic-state attention policy for the request;
- autobiographical memory already linked by selected identity/state may enter when current and accessible;
- independently of those links, at most two current accessible `autobiographical_memory_v2` records with admitted `durable_meaning` may enter through the Fibre-owned availability fallback, ordered deterministically by accessibility, then salience, then recency;
- the total memory budget remains four, so linked context has room to coexist with the bounded availability fallback;
- unlinked memory without durable meaning does not enter through this fallback;
- raw relationship/place records remain provenance-bearing context sources but require a semantic projection before cognition;
- embodiment remains presentation context rather than local reasoning evidence;
- symbolic genome loci remain excluded under the accepted pre-#40 `CONTEXT_ONLY` standing until a later controlled slice defines an attributable consumer.

The durable-memory fallback is a context-availability rule, not a claim that the selected memories caused a future judgment. It does not promote any domain's causal standing and does not strengthen genome prompting.

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
- the durable-memory availability fallback is bounded and deterministic;
- no-durable-meaning memory does not become ambient fallback context merely because it exists;
- a requester cannot nominate private refs;
- cross-Thread authoritative sources fail closed;
- protected-source text, unavailable memory, symbolic-genome text, and full-Thread/sealed-history canaries do not reach the capsule's semantic evidence or worker input;
- the worker packet has only the five semantic input sections above;
- the new reasoning prompt resolves through the prompt-asset registry while all previously pinned scientific prompt digests remain unchanged.

No provider call is part of this acceptance slice.

## Canonical born-World characterization

The provider-free characterization runs the exact compiler against the canonical civil-registered Threads produced by Genesis rather than reconstructing candidate files or inventing a richer fixture.

`tools/inspect/inspect-identity-context.mjs` opens the World read-only, discovers civil-registered Threads (or an explicit FIN subset), compiles each capsule twice, and reports only source counts, included refs, exclusion reasons and digests. It intentionally does **not** print private identity or memory prose.

The fixed characterization request is the same for every Thread. It is only a probe for the projection boundary; no model consumes it and no behavioral conclusion is drawn from it.

The closed #39 birth tool wrote the canonical local World below the frozen closure root at:

```text
.fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

For the closed five-Thread Genesis cohort, the local run is:

```text
node tools/inspect/inspect-identity-context.mjs \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite \
  --fin QA00-HG-BAJF \
  --fin NXR7-DH-C885 \
  --fin 8PKH-A4-VH5R \
  --fin S22Y-SF-MWY5 \
  --fin EBYE-Z1-0434
```

The inspector separates two questions:

- **structural validity** — deterministic compilation, exact source partition, bounds, privacy exclusions, genome exclusion and the five-field worker boundary all hold;
- **consumer readiness** — the current conservative policy actually exposes semantic evidence for the probe.

### Policy-v1 born-World finding

A maintainer run at `4d344a411c78da7e84e2c6a3c6f14dfbcdf57943` produced:

```text
Threads structurally valid     5 / 5
Consumer-ready projections     5 / 5
Identity evidence              5 / 5
Memory evidence                0 / 5
Semantic-state evidence        0 / 5
```

Every Thread had exactly one included identity item of 20 UTF-8 bytes. Each had six current autobiographical memories, but all six were excluded as `memory_not_referenced_by_selected_context`. Semantic-state storage was absent in the canonical birth World. Raw relationship/place records and symbolic genome loci were correctly excluded under their existing standing.

This was a useful negative result: the boundary was safe but the born lives were effectively inert for ordinary memory context. It exposed a projection-policy seam rather than a #39 birth-data defect.

The #39 closeout record independently establishes that all 30 current cohort memories have durable meaning. Policy v2 therefore uses only that already-admitted semantic memory authority for the narrow fallback instead of broadening access to raw history or arbitrary recollection.

An empty or sparse projection remains a legitimate characterization result, not a reason to alter the born life or silently promote causal standing. The underlying #39 cohort remains unchanged.

No provider call is part of this characterization or the policy-v2 correction.

## Scientific standing

This slice is architecture, selection and provenance scaffolding only. It earns no Whole Person / M2 score movement and does not establish behavioral causality, non-interchangeability, genome effect, self-authorship, or personhood evidence.

A later controlled slice must hold the external situation fixed and vary a legitimate Thread-owned factor through this boundary, then show an attributable downstream cognitive difference without treating identity as deterministic destiny. Only that experiment can change causal standing.
