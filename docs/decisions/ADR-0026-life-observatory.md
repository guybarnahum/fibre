---
id: ADR-0026
status: accepted
last-reviewed: 2026-10-19
---

# ADR-0026: Understand a life through evidence, not operational lineage

## Status

Accepted operator UX and causal-evidence design, **not yet implemented in
the Admin dashboard**. The existing Causal Trail and Raw Activity pages
remain current source behavior until their scoped replacement is locally
validated and deployed. [Life Observatory UX contract](../architecture/life-observatory.md)
specifies the workflow, evidence semantics and acceptance.

## Context

Admin's current `Causal Trail` indents Activity Log records by
`parentOperationId`. That is useful for runtime diagnostics, but an
operation's parent is not the reason a person formed a desire, chose a
destination, initiated contact, remembered an experience or changed
future behavior. The view is low-value for understanding Genesis,
continuing life or shared World encounters, and the hierarchy risks
mislabeling software orchestration as personal causation.

Fibre already owns independent World, Genesis, identity, embodied Body,
Flight Plan, Interior Cognition, Experience, Memory, meaning and
Activity authorities. Multiple operator surfaces need a common way
to investigate their *references*, not a new authority that interprets
each person's thoughts after the fact.

## Decision

1. **Person-first entry, separate investigator.** Select a Thread →
   compact Thread detail → open the dedicated **Life & Causes**
   workspace → selected enacted moment → inspect *conditions, choice,
   objective outcome, consequences*. Do not grow Thread Observatory
   into a second giant timeline. The Life & Causes route stands alone
   and remains deep-linkable.
   World Events enters by place/event, Birth Center by provisional or
   completed Genesis; all three open the same reusable Life Investigation.
2. **Genesis has two clocks.** The Thread's historical formation
   (World events, selective Memory, developed meaning) is distinct from
   the Birth Center's modern compiler execution, repairs, validation,
   publication and civil registration. Unpublished candidates are
   never portrayed as live World persons.
3. **Retire operational trees as primary UX.** Replace the Causal
   Trail presentation rather than reskinning its indentation. Keep
   **Raw Activity** for nested operations, failures, retries,
   timing and providers. It stays non-authoritative.
4. **Join domain truth, do not duplicate it.** One bounded read-side
   Life Investigation projector resolves owning records. Event, plan,
   Experience and Memory linkage requires explicit source refs.
   The view cannot infer a meeting from physical overlap or a Memory
   from a witnessed event.
5. **Capture missing decision conditions only at consequential seams.**
   A compact immutable Causal Witness belongs with the existing
   Flight Plan or social decision authority. It records supplied
   event-time Body/interoception, offers, selected evidence, actual
   authored decision and provenance without another model invocation.
   Genesis reuses compiler/manifest/Memory/meaning witnesses where
   they already exist.
6. **Epistemic precision.** `Occurred`, `Supplied`,
   `Selected/cited`, `Stated purpose`, `Mechanism`,
   `Influence tested`, and `Unresolved` have different meanings.
   A reported rationale is not proof of unconscious motivation.
   A prompt difference is not a proven change of behavior. Mechanical
   salience dependence can be exact; model-mediated influence
   requires controlled comparisons and qualified uncertainty.
7. **Operator curiosity is not a runtime trigger.** Browsing does not
   call a model, wake Threads, enqueue encounters, create memories or
   scan the population. Counterfactual inspection is deferred as a
   separate deliberate, non-mutating experiment, conditional on
   faithful historical context reconstruction.

## Alternatives declined

- **Better-looking indentation or a universal operation graph:** still
  misidentifies execution order as personal meaning and amplifies
  noise.
- **A global causal event database:** creates a second semantic
  authority, extensive copying and unnecessary runtime cost.
- **Ask an LLM to explain why after each action:** adds cost and gives
  unsupported retrospective narratives, especially for unknown or
  unconscious drives.
- **Start only from a geographical map:** omits private choices and
  pre-publication Genesis candidates.
- **Flatten all past events into one lifetime list:** loses the
  childhood-versus-publication boundary and overwhelms meaningful
  choices with incidental records.

## Consequences and validation

The UI may show **not captured** or **later; influence unproven**
even when an action succeeded. The priority is fidelity over a complete
story. Causal Witnesses are **Notarial/context evidence** until a
mechanism or controlled differential proves a downstream effect, not
new personhood functionality by mere storage or projection.

Reused Admin Thread Observatory, Birth Center, World Events and
runtime Activity sources remain separate authorities. Preserve cheap
current-only loading, stable bounded timelines, event/age navigation,
selective deeper reads and genuine source provenance; no new
population polling, speculative memories, auxiliary narrative model
or security/general tracing project. See the architecture UX
contract for concrete user stories and staging acceptance checks.

The ambition path remains open for real Body-driven personal
planning, independently meaningful social choices, individual
Experience/Memory and future-history effects. Observability improves
our ability to diagnose and prove those, but does not itself make them
causally functional.
