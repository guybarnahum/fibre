---
id: m2-pr39-pre-g-stage7-documentation-reconciliation
status: implemented_awaiting_verification
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Pre-G Stage 7: documentation and context reconciliation

## Purpose

Stage 7 reconciles Fibre's **current operating documentation** with the implemented post-F, pre-G branch before the final #39 protocol is frozen.

The problem was not missing historical evidence. Fibre had the opposite problem: current orientation documents still stopped around #37 while AI context selection mixed current authority with sealed/failed historical gate material. That combination can make a human or temporary model worker reason from the wrong project state even when the underlying code and evidence are correct.

Stage 7 therefore applies one documentation principle:

> **Preserve history as history; present current authority as current authority.**

This is a documentation/context stage. It does not change any A–F experimental result, compiler prompt/schema, admission rule, WorldSpec, genome, treatment assignment, rater or causal-status claim.

## Repository guidance applied

The reconciliation was performed after reading the repository-wide operating guidance and its required conceptual chain, including `AGENTS.md`, root contributor/connector guidance, Fibre foundations, current state, architecture, behavior/interiority documents and the current #39 compiler/implementation records.

The relevant `AGENTS.md` rules are load-bearing here:

- do not silently redefine accepted concepts;
- current state must match accepted decisions;
- preserved/deferred capabilities must remain visible;
- a passing test count is not itself evidence;
- failed/sealed experimental evidence may not be rewritten away;
- generated context profiles must consume current canonical sources rather than accidental historical substitutes.

## Drift corrected

### 1. Current-state drift

`docs/state/current-state.md` and `docs/state/current-priorities.md` described #37 as active and #38/#39 as future work. They now record:

```text
#36 complete / frozen
#37 complete / frozen
#38 complete / frozen
#39 active
Gate C CLEAR
Gate D CLEAR
Gate F CLEAR
Pre-G cleanup seam active
```

The Whole-Person checkpoint remains 15/26. #39 earns no causal-standing score movement.

### 2. Root orientation drift

The README described identity/embodiment and Structured Obligations as future work. It now points to the active #39 sequence and exposes the active/repro/all test lifecycle created in Stage 6.

### 3. Persistence-description drift

The world-store version remains v6, while #38 adds situated-life/embodiment/autobiographical-memory authorities and #39 adds bounded Genesis/symbolic-genome provenance tables. The storage model now describes these separately and preserves the rule that Genesis does not become a parallel biography/memory/identity authority.

### 4. Roadmap numbering/status drift

`prototype-roadmap.md` now follows stable planning IDs from `m2-pr-plan.md`:

```text
#39 Genesis, Childhood & Thread Birth v1
#40 Identity Projection & Causal Consumption
#41 M2 Standing Gate / M2 closure
#42 Self-authored Development v1
#43 Reciprocal Relationships v1
#44 Economic Consequence / M3 foundation
```

### 5. AI-context lifecycle drift

The prior `core` profile mixed current doctrine with sealed/failed Guardian and history-gate material. The manifest now makes lifecycle explicit:

- **core** — current doctrine/state, active M2/#39 authority and current causal discipline;
- **request-processing** — current dignity/interiority/runtime behavior built on core;
- **full** — broad context including historical/sealed/failed evidence and older bridge material.

No historical source is deleted from context coverage merely because it leaves `core`.

## Semantic reconciliation finding: real Pre-G integration gap

The Stage-7 audit also found one place where the **plan is more complete than the live publication path**.

The accepted [`symbolic-thread-genome-implementation-plan.md`](symbolic-thread-genome-implementation-plan.md) still correctly leaves this item unchecked:

```text
[ ] synthetic-ancestor source owners bound to admitted #38 lineage at Slice E/birth
```

Code review confirms the gap is real:

- `SymbolicGenomeStore` can verify persisted genome/source ownership and deterministic recombination;
- #38 `life_relation_records` can represent `biological_parent` with `parent_genome_source` and a `synthetic_ancestor` related party;
- Rich-Life policy code can derive a synthetic-lineage witness from an actual recombined genome and intentionally keeps it out of Pass A;
- `GenesisManifest` records `genomeRef` and `parentOrAncestorRefs`;
- **but `GenesisStore.publishBirth()` does not resolve `manifest.genomeRef` against persisted symbolic-genome state or bind the genome source owners to the admitted #38 parent-genome-source relations before the child becomes live.**

The first Stage-7 storage rewrite briefly overstated the current birth transaction by including `genome` in its atomic-boundary description. The follow-up correction removes that overclaim and records the real boundary explicitly.

### Classification

This is not a documentation-only defect and is not a reason to reopen Gate F. It is a **known Pre-G implementation blocker** already anticipated by the accepted symbolic-genome plan.

Before G, the live publication boundary must prove at least:

```text
manifest.genomeRef resolves
resolved genome owner == child Thread
resolved genome genesisId == birth genesisId
synthetic-lineage manifest parent/ancestor refs == genome source owners
source owners == admitted #38 biological_parent + parent_genome_source relations
failure/mismatch leaves no live child
```

The implementation must preserve Pass-A genome blindness and must not turn lineage/genome facts into childhood-event authoring instructions.

## Files reconciled

Stage 7 updates:

```text
README.md
docs/state/current-state.md
docs/state/current-priorities.md
docs/architecture/storage-model.md
docs/validation/prototype-roadmap.md
docs/ai-context-index.md
docs/ai-context-manifest.json
docs/validation/m2-pr39-pre-g-stage5-test-value-audit.md
docs/validation/m2-pr39-pre-g-seam-status.md
```

and adds this Stage-7 record.

## What remains historical on purpose

Stage 7 does **not** modernize a sealed experiment so it looks like the current mechanism. Guardian standing v1-v3 remain failed/sealed; History-bends-judgment candidate/gate lineage remains historical; E1/E2/A0/H6/A2/A2b/N1/N2/V1/V2 retain their original interpretation; burned prompts are not rewritten; `tools/repro/` compatibility paths do not become current tool ownership; Gate F remains development evidence rather than final-cohort evidence.

## Vision / ambition check

**Fidelity:** the repository now describes Fibre as a persistent society of developing Threads rather than a pile of accumulated agent experiments. Genesis remains subordinate to existing life authorities and #40/#41 causal claims remain explicitly unearned.

**Ambition:** no preserved ambition path is removed. Self-authored development, reciprocal relationships, economics, institutions, endogenous motivation, model/runtime replacement and broader society remain visible as deferred work.

**Causal individuality:** Stage 7 earns none. It accurately records that #39 creates a particular prior-life substrate, #40 will make selected identity/history causally matter, and #41 must prove stable non-interchangeable individuality.

No ADR is required because Stage 7 changes no accepted conceptual boundary. The newly surfaced genome/lineage integration gap is an implementation completion obligation under the already accepted #39 genome plan.

## Verification required

Because Stage 7 changes canonical Markdown and the context manifest, it is not COMPLETE until the maintainer runs:

```bash
npm run includes:check
npm run context-pack
npm run validate
npm run check
```

Expected result:

```text
Markdown includes synchronized
all accepted canonical docs covered by at least one context profile
context packs generate deterministically
no context source/output path violations
repository check green
```

No provider/model execution is required or permitted for Stage 7.

After that verification, Stage 7 may be marked **COMPLETE**. The genome/lineage publication gap remains a separate explicit Pre-G implementation item to close before Slice G, naturally alongside Stage 8 final integration/repository hygiene.
