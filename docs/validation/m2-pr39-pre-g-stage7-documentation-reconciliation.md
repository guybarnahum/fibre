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

This is a documentation/context change only. It does not change any A–F experimental result, compiler policy, model prompt/schema, admission rule, source-rights rule, WorldSpec, genome, treatment assignment, rater, or causal-status claim.

## Repository guidance applied

The reconciliation was performed after reading the repository-wide operating guidance and its required conceptual chain, including:

- `AGENTS.md`;
- `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `GITHUB_CONNECTOR.md`;
- Constitution, Principles, Invariants, Glossary and Current State;
- System Overview, Thread Lifecycle and Storage Model;
- Interiority, Dignity, Emotions/Needs, Interest-Mediated Expression and Request Participation;
- the current #39 compiler/implementation plan and Pre-G records.

The relevant `AGENTS.md` rules are load-bearing here:

- do not silently redefine accepted concepts;
- current state must match accepted decisions;
- preserved/deferred capabilities must remain visible;
- a passing test count is not itself evidence;
- failed/sealed experimental evidence may not be rewritten away;
- generated context profiles must consume current canonical sources rather than generated or accidental historical substitutes.

## Drift found

### 1. Current-state drift

`docs/state/current-state.md` and `docs/state/current-priorities.md` still described #37 as active and #38/#39 as future work.

Actual branch state is:

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

The live Whole-Person checkpoint remains 15/26. #39 earns no causal-standing score movement.

### 2. Root orientation drift

The README's current-status section still described identity/embodiment and Structured Obligations as future work even though those layers are already implemented/merged substrate.

The README now points readers to the current M2 sequence and exposes the active/repro/all test lifecycle created in Stage 6.

### 3. Persistence-description drift

The world schema version remains **v6**, but the old storage narrative stopped at the #37 identity-ledger introduction. The current branch also has #38 situated-life/embodiment/autobiographical-memory authorities and #39 Genesis/symbolic-genome provenance tables.

The storage document now distinguishes:

```text
versioned world-store schema v6
        +
current #38 life ledgers
        +
#39 additive Genesis/genome provenance tables
```

Genesis provenance is not a second biography/memory/identity authority.

### 4. Roadmap numbering/status drift

The older prototype-roadmap continuation still used the pre-Genesis numbering in several places. The roadmap now follows the stable planning IDs in `m2-pr-plan.md`:

```text
#39 Genesis, Childhood & Thread Birth v1
#40 Identity Projection & Causal Consumption
#41 M2 Standing Gate / M2 closure
#42 Self-authored Development v1
#43 Reciprocal Relationships v1
#44 Economic Consequence / M3 foundation
```

### 5. AI-context lifecycle drift

The prior `core` profile mixed current doctrine with sealed/failed Guardian and history-gate development/standing records. Those records remain valuable evidence, but they are not the minimum current context a worker should use to reason about #39.

The manifest now makes the lifecycle explicit:

- **core** — current doctrine, state, active M2/#39 authority and current causal discipline;
- **request-processing** — current dignity/interiority/runtime behavior built on core;
- **full** — broad context including historical/sealed/failed evidence and older bridge material.

No historical source is deleted from context coverage merely because it leaves `core`.

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

Stage 7 does **not** modernize a sealed experiment so it looks like the current mechanism. In particular:

- Guardian standing v1-v3 remain failed/sealed;
- history-bends-judgment candidates/gates remain historical evidence;
- the E1/E2/A0/H6/A2/A2b/N1/N2/V1/V2 development lineage retains its original interpretation;
- burned Pass-B/Pass-C prompts are not rewritten to match later canonical prompts;
- compatibility paths under `tools/repro/` do not become current tool ownership;
- Gate F remains development evidence, not #39 final-cohort evidence;
- #39 still does not claim that identity/history has become the canonical causal cognition consumer.

## Vision / ambition check

**Fidelity:** this reconciliation makes the repository describe Fibre as a persistent society of developing Threads rather than as a pile of accumulated agent experiments. It keeps Genesis subordinate to existing life authorities and keeps #40/#41 causal claims explicitly unearned.

**Ambition:** no preserved ambition path is removed. Self-authored development, reciprocal relationships, economics, institutions, endogenous motivation, model/runtime replacement and broader society remain visible as deferred work rather than disappearing because #39 does not implement them.

**Causal individuality:** Stage 7 earns none. It only makes the documentation accurately state that #39 creates a particular prior life substrate, #40 will make selected identity/history causally matter, and #41 must prove stable non-interchangeable individuality.

No ADR is required because Stage 7 changes no durable conceptual boundary; it reconciles documentation to already accepted/implemented state.

## Verification required

Because Stage 7 changes canonical Markdown and the context manifest, it is not COMPLETE until the maintainer runs the repository's context/document validation on the resulting branch:

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

After that verification, Stage 7 may be marked **COMPLETE** and work proceeds to Stage 8 branch/repository hygiene.
