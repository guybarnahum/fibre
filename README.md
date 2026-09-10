# Fibre

**Fibre is a persistent world for artificial persons called Threads.**

A Thread is not a temporary prompt or agent process. It is a durable person-like identity with inherited possibilities, family and cultural context, memories, relationships, obligations, embodiment, a private interior life and a trajectory that continues across temporary model executions.

Models provide cognition. Fibre owns continuity, authority, history, persistence and consequence.

This repository contains Fibre's laws, architecture, implementation and evidence. **Live Threads do not live in Git.** Durable world stores contain the living society.

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

1. [`docs/foundations/constitution.md`](docs/foundations/constitution.md)
2. [`docs/foundations/principles.md`](docs/foundations/principles.md)
3. [`docs/foundations/invariants.md`](docs/foundations/invariants.md)
4. [`docs/vision/lived-world.md`](docs/vision/lived-world.md)
5. [`docs/state/current-state.md`](docs/state/current-state.md)
6. [`docs/state/current-priorities.md`](docs/state/current-priorities.md)
7. [`docs/validation/m2-pr-plan.md`](docs/validation/m2-pr-plan.md)
8. [`AGENTS.md`](AGENTS.md) and the relevant subsystem contract for implementation work

## Current status

M1 and the #33-#40 identity/history/birth/causal foundations are closed and retained. Fibre also has a deployed public path, minimum cloud recovery, canonical visual identity, Civil Registry/FIN, Fibre Identity Card authority, and Directory/Meet discovery.

The active milestone is now **M2 — lived person**:

```text
M2-A  Present life + Meet a Thread                         CURRENT
M2-B  Experience internalization + continuation            NEXT
M2-C  Whole-person developmental continuity                NEXT
```

The immediate missing seam is:

```text
developmental context
  -> Thread-owned personal flight plan
  -> caregiver-owned care plan when dependency applies
  -> World-owned enacted current situation
  -> insidefibre.com encounter
  -> selective private consequence
  -> continued life
```

Fibre birth is operational birth, not necessarily biological age zero. A newly born Thread may already be a child, adolescent or adult with grounded prior history and autobiographical memory.

The old #41 standing-gate program remains useful historical evaluation science, but it is not the active development gate. Current execution authority is [`docs/validation/m2-pr-plan.md`](docs/validation/m2-pr-plan.md).

## Surfaces

- `insidefibre.com` — public encounter surface; visitors find a Thread where that person already is.
- `apps/thread-editor/` — local authorized operator inspection; it visualizes Fibre state but does not own it.
- `admin.insidefibre.com` — authenticated operational/admin surface.
- `status.insidefibre.com` — public coarse runtime status.

## Repository map

- `docs/` — current vision, foundations, architecture, decisions, state, validation and selected history.
- `apps/` — human-facing applications.
- `core/` — foundational concepts/types/rules.
- `services/` — semantic/runtime service boundaries.
- `infra/` — provider/deployment composition beneath those services.
- `schemas/` — machine-readable schemas.
- `fixtures/` and `scenarios/` — synthetic inputs and executable populations.
- `experiments/` — falsifiable research work.
- `artifacts/validation/` — retained evidence with a continuing audit/scientific purpose.
- `tools/` — development, deployment, inspection and replay tooling.
- `docs/history/` — selected explanatory history; Git history is the default archive for superseded implementation detail.

## Evidence and AI context

[`docs/ai-context-manifest.json`](docs/ai-context-manifest.json) is the machine-readable source for bounded AI context. [`docs/ai-context-index.md`](docs/ai-context-index.md) explains how to choose a profile.

Generated context packs are reproducible build artifacts, never canonical state.

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
