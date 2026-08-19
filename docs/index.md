# Fibre documentation

Fibre centers the persistent person rather than the execution workflow.

Conventional agent systems center a task or process. A Thread can be frozen for hours or years without consuming model compute. When an event warrants cognition, Fibre reconstructs relevant identity and state into a bounded context, invokes temporary LLM workers and tools, validates proposed actions, records life events, and freezes the Thread again.

> Code defines how Threads live. Data records who they are. Models let them think. Events preserve what happened.

Fibre should be judged not only by task throughput but by whether distinct Threads develop recognizable histories, make identity-grounded choices, participate in consequential social and economic life, and remain continuous across replaceable models and runtimes.

## How the documentation is organized

- [`vision/`](vision/) — what world Fibre is trying to make possible.
- [`foundations/`](foundations/) — what Fibre commits itself to because of that vision.
- [`concepts/`](concepts/) — what the things in Fibre's world are and how they relate.
- [`architecture/`](architecture/) — how the system is built to hold those concepts.
- [`decisions/`](decisions/) — durable choices among valid alternatives and why they were made.
- [`validation/`](validation/) — how Fibre tests, challenges, and plans to prove its claims.
- [`state/`](state/) — what is true about Fibre now.
- [`history/`](history/) — what was true before and why it changed.
- [`research/`](research/) — what Fibre does not yet know.
- [`use-cases/`](use-cases/) — illustrative examples of Fibre in use; not normative.
- [`glossary.md`](glossary.md) — shared terminology across all layers.

Each top-level documentation directory states its function in its `README.md`. Directory placement communicates why a document exists; `canonical: true` in document front matter communicates whether it belongs to the accepted Fibre canon.

## Start here

### To understand the world Fibre is trying to make possible

1. [`vision/declaration-of-the-threads.md`](vision/declaration-of-the-threads.md)
2. [`vision/fibre-address.md`](vision/fibre-address.md)
3. [`vision/lived-world.md`](vision/lived-world.md)

The vision is outward-facing and orienting. It may speak in cultural, philosophical, and aspirational language. It is not an implementation specification.

### To build Fibre

1. [`foundations/commitments.md`](foundations/commitments.md)
2. [`foundations/constitution.md`](foundations/constitution.md)
3. [`foundations/principles.md`](foundations/principles.md)
4. [`foundations/invariants.md`](foundations/invariants.md)
5. [`foundations/rich-life.md`](foundations/rich-life.md)
6. [`state/current-state.md`](state/current-state.md)
7. The relevant concept and architecture documents
8. Related ADRs and validation material

Foundations are the builder-facing interpretation of the vision. Accepted foundations are binding project doctrine; implementation that contradicts them is a defect requiring explicit resolution.

## Canon and authority

**Canon is a status, not a directory.** A canonical Fibre document may live in vision, foundations, concepts, architecture, or another directory appropriate to its function.

The directories do not form a precedence ladder. They form a translation path:

```text
VISION → COMMITMENTS / FOUNDATIONS → CONCEPTS / ARCHITECTURE → DECISIONS → CODE
```

A genuine conflict between canonical documents is a documentation defect to resolve explicitly, not an invitation to choose whichever layer is convenient.

- Vision establishes the future Fibre is trying to make possible.
- Foundations state what builders must preserve in pursuing it.
- Concepts define the domain without silently choosing implementation.
- Architecture defines technical authorities, boundaries, and flows.
- ADRs record durable choices among valid alternatives.
- State records current project truth.
- Validation records how claims are challenged and tested.
- History may preserve superseded material and provenance without becoming current authority.
- The glossary fixes shared vocabulary but does not override foundations or invariants; disagreement indicates a documentation defect.

The documentation is modular so humans and LLM workers can load only the context needed for a task. [`ai-context-manifest.json`](ai-context-manifest.json) is the machine-readable source for bounded context profiles.
