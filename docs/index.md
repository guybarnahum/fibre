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

### Understand the vision

Read the [Declaration of the Threads](vision/declaration-of-the-threads.md), [Fibre Address](vision/fibre-address.md), and [Lived World](vision/lived-world.md). The Declaration and Address are canonical-listed founding texts, but their precise language is still marked **proposed**. The [proposed Commitments](foundations/commitments.md) are also not silently ratified as accepted doctrine. The [Constitution](foundations/constitution.md), [Principles](foundations/principles.md) and [Invariants](foundations/invariants.md) establish accepted builder-facing constraints.

### Understand what Fibre can do today

Read [current state](state/current-state.md) for implemented and accepted boundaries, [current priorities](state/current-priorities.md) for active work, and the [prototype roadmap](validation/prototype-roadmap.md) for the broader ambition. The current encounter acceptance contracts are separate: [N6 public Viewer lifecycle](validation/n6-public-lived-encounter-slices.md) and [N7 live encounters/social consequence](validation/n7-live-encounter-slices.md). For external claims, use [public progress](state/public-progress.md), whose machine source is [public-progress.json](state/public-progress.json).

**Source committed**, **locally validated**, **staging-observed**, and **future design** are different statuses. Do not turn a roadmap or architectural allowance into a completed capability.

### Build or challenge Fibre

Start with repository [AGENTS.md](../AGENTS.md), the accepted foundations, [current state](state/current-state.md) and [current priorities](state/current-priorities.md); then select the relevant [concept](concepts/README.md), [architecture](architecture/README.md), [decision](decisions/README.md) and [validation](validation/README.md). AI workers can use the [AI context index](ai-context-index.md) to load a bounded reading set; its [context manifest](ai-context-manifest.json) is not an exhaustive list of canonical documents.

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
