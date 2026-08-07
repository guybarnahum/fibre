# Fibre

**Fibre is a framework and persistent world for artificial persons called Threads.**

A Thread is not a temporary prompt or agent process. It is a durable person-like identity with inherited personality, family and cultural context, memories, relationships, economic accounts, reputation, obligations, embodiment, a private interior life, and developmental history. Most of the time a Thread is frozen as persistent world state. Fibre thaws it into temporary cognition through replaceable LLM workers, lets it privately appraise and authorize participation, think, work, communicate through interest-mediated expression, audit results, and freeze validated life changes back into the world.

This repository is the canonical, version-controlled source for Fibre's concept, architecture, experiments, implementation, tests, and human-visible artifacts. **Live Threads do not live in Git.** The repository contains the laws and machinery of Fibre; databases and object stores contain the living world.

## The Thirteen Principles of Fibre

The exact list below is generated from the canonical region in [`docs/vision/principles.md`](docs/vision/principles.md). Edit the source and run `npm run includes:sync`; repository validation rejects drift.

<!-- fibre:include src="docs/vision/principles.md" region="canonical-list" -->
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

1. Read [`docs/vision/constitution.md`](docs/vision/constitution.md).
2. Read [`docs/vision/principles.md`](docs/vision/principles.md).
3. Read [`docs/state/current-state.md`](docs/state/current-state.md).
4. Read [`docs/vision/invariants.md`](docs/vision/invariants.md).
5. Read [`docs/concepts/interiority-and-expression.md`](docs/concepts/interiority-and-expression.md).
6. For implementation, read [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md).
7. For LLM workers, read [`AGENTS.md`](AGENTS.md).

## Repository map

- `docs/` — canonical concepts, architecture, use cases, decisions, validation, and history.
- `apps/thread-editor/` — a dependency-free human-inspectable Thread Editor prototype.
- `packages/domain/` — portable Fibre domain types and freeze/thaw logic.
- `services/` — service boundaries and implementation contracts.
- `schemas/` — machine-readable schemas for Thread, memory, task, contract, and ledger records.
- `fixtures/` — synthetic Threads and world states for tests only.
- `scenarios/` — executable canonical use-case populations.
- `experiments/` — falsifiable behavioral experiments.
- `artifacts/` — white papers, proposals, diagrams, and generated context packs.
- `source-material/` — historical source documents; not automatically canonical.

## Canonical Markdown includes

Exact fragments that must remain identical across Markdown documents use generated include blocks:

```md
<!-- fibre:include src="docs/vision/principles.md" region="canonical-list" -->
...generated Markdown...
<!-- /fibre:include -->
```

Canonical sources declare named `fibre:region` blocks. `npm run includes:sync` refreshes every include target in README, AGENTS, CLAUDE, and `docs/`; `npm run includes:check` and repository validation reject drift, traversal, symlinked sources, malformed regions, and nested includes.

Use includes only when exact in-place visibility is valuable. Otherwise link to the canonical source or include it directly through the AI context manifest.

## AI context packs

[`docs/ai-context-manifest.json`](docs/ai-context-manifest.json) is the canonical machine-readable source for bounded LLM context. Run `npm run context-pack` to generate:

- `artifacts/generated/fibre-core-context.md` — minimum Fibre principles, identity, interiority, dignity, and invariant context.
- `artifacts/generated/fibre-request-processing-context.md` — private appraisal, authorization, disclosure, affect, and response behavior.
- `artifacts/generated/fibre-full-context.md` — broad cross-cutting concept, milestone, and architecture context.
- `artifacts/generated/fibre-context-pack.md` — compatibility alias for the full profile.

Generated packs include the repository revision, manifest version, source list, and content digest. They are reproducible build artifacts, ignored by Git, and never canonical. External LLMs should receive the smallest profile sufficient for the task.

Every accepted canonical Markdown document under `docs/` must appear in at least one manifest profile. Repository validation enforces full canonical-document coverage and synchronized Markdown includes. `npm run check` verifies includes, builds and tests the domain package, rejects textual or symlink context-path escapes, generates all packs deterministically, and validates the resulting outputs.

## Quick commands

```bash
npm run build
npm test
npm run validate
npm run includes:sync
npm run includes:check
npm run context-pack
npm run check
npm run demo:m1
npm run demo:m1:editor
npm run editor
```

## Current status

**M1 Persistent Thread Round Trip is fully closed.** The local world kernel persists Thread state, append-only life history, private request appraisal and stance, request-bound participation authority, restricted disclosure strategy, audience-visible participation response, temporary cognition, Goal Guardian audit, freeze/abandon/timeout outcomes, authorization consumption, accepted memories, and obligation discharge across process restart.

The consolidated Mina proof demonstrates willing participation, low-dignity refusal without runtime, and obligation-mediated `refuse -> accept` without converting compulsion into consent. The credentialed Thread Editor and read-only database inspector expose the same durable chain for human audit while keeping exact JSON as the technical authority.

The implementation remains a local deterministic milestone, not production infrastructure. Production authentication/roles, encryption, real message delivery, a generalized performed-action ledger, model/tool worker isolation, structured obligations, identity/embodiment, relationships, marketplace execution, cloud topology, and broader society remain future work.

## License

Private research and development repository. See [`LICENSE`](LICENSE).
