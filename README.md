# Fibre

**Fibre is a framework and persistent world for artificial persons called Threads.**

A Thread is not a temporary prompt or agent process. It is a durable person-like identity with inherited possibilities, family and cultural context, memories, relationships, economic accounts, reputation, obligations, embodiment, a private interior life and developmental history. Most of the time a Thread is frozen as persistent world state. Fibre thaws it into temporary cognition through replaceable model workers, lets it privately appraise and authorize participation, think, work and communicate, validates resulting life changes and freezes them back into the world.

This repository is the canonical, version-controlled source for Fibre's concept, architecture, experiments, implementation, tests and human-visible artifacts. **Live Threads do not live in Git.** The repository contains the laws and machinery of Fibre; databases and object stores contain the living world.

## The Thirteen Principles of Fibre

The exact list below is generated from the canonical region in [`docs/foundations/principles.md`](docs/foundations/principles.md). Edit the source and run `npm run includes:sync`; repository validation rejects drift.

<!-- fibre:include src="docs/foundations/principles.md" region="canonical-list" -->
1. **A Thread is a life, not a process.** Compute may stop; identity, memory, obligations, relationships, and trajectory persist.

2. **Difference must change what happens.** Culture, lineage, embodiment, books, traits, and experience must alter perception and choice, not merely decorate a profile.

3. **Meaning lives in language.** Identity, values, needs, relationships, intentions, dignity, and self-understanding are carried first in words; numbers may measure meaning, but must not replace it.

4. **History bends the future.** Success, failure, care, injury, reflection, and repair change what a Thread notices, expects, chooses, and becomes.

5. **Consent makes dignity real.** Capability, safety, permission, or usefulness never by themselves create an obligation to participate.

6. **The inner life is not the public face.** Private stance, desire, authorization, disclosure, expression, and action remain distinct, with interests and relationships shaping what is shown.

7. **Worry is a guardian, not a jailer.** Affect signals distance, danger, uncertainty, and unmet need; it guides attention without ruling the Thread or trapping it in loops.

8. **Every thought deserves an adversary.** Candidate cognition is challenged for goal drift, unsupported certainty, hidden cost, self-deception, and false modesty, while stewardship preserves earned confidence.

9. **Models propose; the world authorizes and remembers.** LLM output is candidate cognition; protected action requires validation, provenance, and a durable, human-inspectable trace.

10. **Relationships remember—and may repair.** Care, recognition, betrayal, coercion, fondness, and resentment persist, yet apology, reciprocity, changed behavior, and renewed trust remain possible.

11. **Life has cost and consequence.** Attention, time, tokens, money, reputation, opportunity, confidence, and obligation change through action.

12. **Inheritance begins identity; it does not own it.** Parents, sponsors, ancestry, and culture shape a beginning; maturity includes the power to affirm, reinterpret, or reject what was inherited.

13. **One fabric can hold many ways of living.** Fibre supplies a world substrate in which families, markets, cooperatives, companies, governments, welfare systems, and other institutions may coexist without one being hard-coded as destiny.
<!-- /fibre:include -->

## Start here

1. Read [`docs/foundations/constitution.md`](docs/foundations/constitution.md).
2. Read [`docs/foundations/principles.md`](docs/foundations/principles.md).
3. Read [`docs/foundations/invariants.md`](docs/foundations/invariants.md).
4. Read [`docs/state/current-state.md`](docs/state/current-state.md).
5. Read [`docs/state/current-priorities.md`](docs/state/current-priorities.md).
6. For current M2 sequencing, read [`docs/validation/m2-pr-plan.md`](docs/validation/m2-pr-plan.md).
7. For current Genesis hardening, read [`docs/state/genesis-selectivity-scientific-hardening.md`](docs/state/genesis-selectivity-scientific-hardening.md).
8. For implementation agents, read [`AGENTS.md`](AGENTS.md) and the relevant subsystem README/contract.

## Current status

**M1 Persistent Thread Round Trip is fully closed.** Fibre has durable Thread state, append-only history, private appraisal/stance, request-bound participation authority, interest-mediated external expression, runtime thaw/freeze, replay and human inspection.

The pre-M2/M2 substrate through **#38** is complete: Semantic Guardian standing, history-bends-judgment evidence, Structured Obligations, the M2 identity contract, claim-level Passport/provenance, lineage/geography/culture, embodiment and autobiographical-memory epistemics.

**Milestone #39 — Genesis, Childhood & Thread Birth — is CLOSED.** One fixed five-Thread held-out cohort was generated without quality resampling, diagnostically characterized, replayed with provider access disabled, atomically published one Thread at a time into a canonical local validation World with five unique FIN/civil registrations, and independently rehydrated from canonical authorities. The permanent result is [`docs/history/milestones/pr39.md`](docs/history/milestones/pr39.md).

#39 also exposed real debt rather than hiding it: every scheduled memory decision returned remembered, all current memories acquired durable meaning, meaning showed a post-hoc positive-reframing tendency, genome propagation remained inconclusive, and the original self-account-overreach diagnostic was citation-confounded. The accepted **Genesis selectivity/scientific-hardening bridge** addresses those problems before #40 makes the richer life substrate causally load-bearing.

The current M2 sequence is:

```text
#38  life representable/corrigible                    COMPLETE
#39  particular prior life + canonical birth         CLOSED
      Genesis selectivity/scientific hardening        NEXT
#40  selected identity/history causally available     AFTER BRIDGE
#41  stable non-interchangeable individuality         M2 CLOSURE
```

The Whole-Person checkpoint remains **15/26 under rubric v2**. #39 deliberately earns no causal-standing credit merely by producing rich prior lives.

See [`docs/state/current-state.md`](docs/state/current-state.md) for the precise posture and [`docs/state/current-priorities.md`](docs/state/current-priorities.md) for the current execution plan.

## Repository map

- `docs/` — canonical vision, foundations, concepts, architecture, decisions, current state, validation, and selected history/origin material.
- `apps/thread-editor/` — human-facing Thread Editor prototype.
- `core/` — foundational Fibre concepts, types, and rules shared across services.
- `services/` — primary runtime/service boundaries.
- `schemas/` — machine-readable schemas.
- `fixtures/` — reusable synthetic test inputs organized by the kind of Fibre object or workflow they represent.
- `scenarios/` — executable canonical use-case populations.
- `experiments/` — current falsifiable research experiments.
- `artifacts/validation/` — exceptional retained exact-byte scientific, replay, interoperability, or audit evidence; disposable local output belongs under `.fibre/`.
- `tools/` — operational tooling organized by lifecycle; see [`tools/README.md`](tools/README.md).
- `tools/replays/` — retained historical proof/experiment instruments only when they still have a named continuing purpose.
- `docs/history/` — selected explanatory history and milestone outcomes; Git history remains the default archive for routine superseded work.

## Test and evidence lifecycle

Everyday regression and retained scientific reproducibility are separate:

```bash
npm test
npm run test:replay
npm run test:all
npm run test:audit -- --check
```

Failed experiments remain visible in the durable record when they teach something current. One-shot milestone ceremony and ordinary generated output do not remain supported runtime surfaces merely because they once mattered.

## Canonical Markdown includes

Exact fragments that must remain identical across Markdown documents use generated include blocks:

```md
<!-- fibre:include src="docs/foundations/principles.md" region="canonical-list" -->
...generated Markdown...
<!-- /fibre:include -->
```

Canonical sources declare named `fibre:region` blocks. `npm run includes:sync` refreshes include targets; `npm run includes:check` and repository validation reject drift, traversal, symlinked sources, malformed regions and nested includes.

Use includes only when exact in-place visibility is valuable. Otherwise link to the canonical source or include it directly through the AI context manifest.

## AI context packs

[`docs/ai-context-manifest.json`](docs/ai-context-manifest.json) is the canonical machine-readable source for bounded model context. The profiles follow evidence lifecycle:

- `core` — current doctrine/state, active M2/Genesis authority and causal discipline;
- `request-processing` — current appraisal/authorization/expression behavior;
- `full` — broad context including selected milestone/origin history and sealed standing with continuing explanatory value.

Run `npm run context-pack` to generate:

- `artifacts/generated/fibre-core-context.md`
- `artifacts/generated/fibre-request-processing-context.md`
- `artifacts/generated/fibre-full-context.md`
- compatibility alias `artifacts/generated/fibre-context-pack.md`

Generated packs include repository revision, source list and content digest. They are reproducible build artifacts and never canonical.

## Quick commands

```bash
npm run build
npm test
npm run test:replay
npm run test:all
npm run test:audit -- --check
npm run validate
npm run includes:sync
npm run includes:check
npm run context-pack
npm run check
npm run demo:m1
npm run editor
```

## License

Private research and development repository. See [`LICENSE`](LICENSE).
