---
id: validation-developmental-exploration-x0-baseline
status: accepted
last-reviewed: 2026-10-06
canonical: true
---

# X0 developmental exploration causal-gap baseline

## Purpose

X0 records the exact existing causal boundary before any developmental-exploration runtime change.

No production behavior is added by X0.

The question is:

> Fibre can already become mechanically pulled toward novelty after sustained sameness. Where does that signal go today, and where does it stop?

## Baseline result

The current path is:

```text
two enacted CurrentSituations
+ same place
+ same mediated context
+ same activity
+ same participants
+ >= 20 minutes apart
        |
        v
explorationRegulationForLivedContinuity()
        |
        v
evaluateIntrinsicRegulation({
  exploration: { novelty: 0 }
})
        |
        v
RegulationFrame
  drive.family = exploration
  orientation = approach
  targetRef = world:novelty
  evidenceRefs = [previousSituationId, currentSituationId]
        |
        v
lived-social-meeting
        |
        v
evaluateSalience(...)
        |
        v
anchor: exploration_pressure
        |
        v
an otherwise-background co-present Thread may reach social cognition
```

That path is real and already accepted.

The grounded exploration frame does **not** currently continue into ordinary Flight Planning.

## 1. Grounded producer

### Intrinsic regulator

`core/src/intrinsic-regulation.mjs` already defines the general organismic mechanism.

When a percept contains exploration novelty below the Thread species floor, the regulator produces:

```text
family: exploration
targetRef: world:novelty
orientation: approach
pressure: bounded numeric pressure
evidenceRefs: percept evidence
```

This is subsemantic control state.

It does not say:

- I am bored;
- I need novelty;
- I want company;
- go meet someone.

### Lived sameness grounding

`services/world-kernel/src/lived-now-regulation.mjs` contains the first concrete World-grounded exploration input.

`explorationRegulationForLivedContinuity()` requires:

- two distinct enacted CurrentSituations;
- both at physical places;
- at least 20 minutes of elapsed lived time;
- the same physical place;
- the same mediated context;
- the same activity;
- the same participant set.

Only then does it call the intrinsic regulator with:

```text
exploration.novelty = 0
evidenceRefs = [
  previousSituation.situationId,
  currentSituation.situationId
]
```

This means the current exploration pressure is grounded in admitted lived sameness rather than caller-authored boredom or curiosity.

## 2. Current real consumer: social salience

The only production consumer of `explorationRegulationForLivedContinuity()` is currently:

```text
services/world-kernel/src/lived-social-meeting.mjs
```

The social meeting service:

1. ensures the initiator's actual current LivedNow;
2. discovers naturally co-present Threads;
3. projects Situated Percepts;
4. derives the grounded exploration RegulationFrame from the initiator's previous/current enacted situations;
5. passes that frame into `evaluateSalience()`.

`services/world-kernel/src/salience-gate.mjs` looks for:

```text
drive.family === exploration
&& drive.pressure > 0
```

and, when present, adds:

```text
exploration_pressure
```

as an inspectable salience anchor.

The exploration drive therefore already has one behaviorally meaningful effect:

> sustained sameness can widen what reaches cognition.

It still does not force social initiation. The downstream Thread may choose `not_initiate`.

## 3. Generic interoception can already carry exploration

`services/world-kernel/src/interoceptive-cognition.mjs` is already generic enough for this future bridge.

`projectInteroception(regulationFrame)` preserves active drives as bounded control evidence:

```text
family
targetRef
orientation
pressure
urgency
progressError
predictionError
attained
```

and preserves the relevant evidence references.

Nothing in that projection requires the drive to be thermal, social, presence or exploration.

Therefore X1 does **not** need a new exploration-specific interoception format.

## 4. But ordinary LivedNow regulation does not currently feed this exploration frame into interoception

`runLivedNowRegulationPulse()` in `services/world-kernel/src/lived-now-regulation.mjs` uses `frameForSituation()`.

That frame is currently built from:

```text
CurrentSituation
  -> governing personal Flight Plan
  -> assessFlightPlanPresence(...)
  -> presence target
  -> evaluateIntrinsicRegulation(...)
```

It does not merge or include the separate sameness-derived exploration RegulationFrame.

So although `interpretIntrinsicRegulation()` could interpret an exploration drive if one reached it, the current ordinary LivedNow regulation pulse does not pass this grounded exploration signal through that path.

This distinction matters:

```text
generic capability exists
!=
current lived causal edge exists
```

## 5. Existing Interior Cognition already carries semantic developed-self state

`services/world-kernel/src/interior-cognition.mjs` already selects bounded Thread-owned evidence including:

- current semantic states;
- identity assertions;
- autobiographical memories;
- current life relationships.

It also carries current:

- self-model;
- needs;
- feelings;
- unresolved intentions.

Therefore if some prior episode legitimately produced a durable semantic `need:novelty_growth` or related state, ordinary Flight Planning could already encounter that state through shared Interior Cognition.

X0 must not claim that planning is isolated from all novelty/growth meaning.

The narrower missing edge is:

> the **current grounded exploration pressure from enacted sameness** is not directly available to the current Flight Planning episode unless some separate semantic-state episode has already interpreted and persisted meaning from it.

## 6. Flight Planning boundary today

`services/world-kernel/src/lived-plan-cognition.mjs` already uses shared `runInteriorCognition()`.

Its `lived_planning` concern currently supplies external context containing:

- planning horizon;
- local civil horizon when known;
- derived daily rhythm when available;
- available physical places;
- starting physical place when required;
- already accepted work commitments.

It does **not** currently receive:

- a RegulationFrame;
- projected interoception;
- current exploration pressure;
- the situation evidence that grounded that exploration pressure.

This is the exact X0 stop point.

## 7. The missing causal edge

The smallest credible X1 edge is:

```text
grounded exploration RegulationFrame
        |
        v
existing projectInteroception(...)
        |
        v
bounded planning interoception
        |
        v
existing lived_planning concern
        |
        v
existing runInteriorCognition(...)
        |
        v
existing Flight Plan
```

This should be implemented without:

- a new exploration service;
- a second planning engine;
- a curiosity score;
- a new durable intention store;
- a second model call merely to translate the regulator;
- mechanically creating `need:novelty_growth`;
- routing exploration only toward social activity.

Whether X1 should project only the exploration drive or a broader planning-relevant interoceptive capsule is an implementation detail for X1 review. The authority rule is already clear: the signal must remain grounded, bounded and subsemantic until the Thread interprets it.

## 8. Why a social-acceptance bias would solve the wrong problem

A rule such as:

```text
exploration pressure
  -> more likely to accept visitor
```

would skip the missing organismic step.

It would make Threads easier to demo while leaving their ordinary lives unchanged.

The Fibre target is:

```text
exploration pressure
  -> changes what the Thread considers when planning life
  -> Thread may choose a richer or different day
  -> that day may create opportunities
  -> concrete encounter remains independently voluntary
```

This preserves the difference between:

- endogenous motivation;
- self-directed planning;
- encounter opportunity;
- concrete consent.

## 9. X0 causal-status register

| Mechanism | Current status | Evidence |
| --- | --- | --- |
| Grounded exploration pressure from sustained enacted sameness | **Behaviorally causal** | Can change Salience Gate outcome |
| Exploration pressure -> social salience | **Behaviorally causal** | `exploration_pressure` can elevate an otherwise-background opportunity |
| Exploration pressure -> generic interoceptive projection | **Implemented capability, not currently wired from lived sameness** | `projectInteroception()` supports arbitrary active drives |
| Exploration pressure -> durable semantic novelty/growth meaning | **Possible through generic interoceptive cognition, not wired from the sameness exploration frame in ordinary LivedNow** | No current X0 causal edge |
| Current grounded exploration pressure -> Flight Planning | **Missing** | `lived_planning` receives no regulation/interoception |
| Retained prior semantic/memory meaning -> Flight Planning | **Behaviorally causal** | Existing Interior Cognition / lived-planning differential evidence |
| Exploration -> self-directed richer life -> experience -> later changed exploration | **Not yet** | X1-X4 target |

## 10. X0 acceptance

X0 is accepted when the source inspection can answer all four questions.

### Where is exploration pressure produced?

`explorationRegulationForLivedContinuity()` grounds sustained enacted sameness and delegates the subsemantic drive calculation to the existing intrinsic regulator.

### Where is it currently consumed?

The grounded sameness-derived frame is currently consumed by natural social salience through `lived-social-meeting.mjs -> evaluateSalience()`.

### Why does Flight Planning not yet consume it?

The `lived_planning` concern receives World planning context plus ordinary developed-self evidence, but no current RegulationFrame/interoceptive projection. The ordinary LivedNow regulation pulse also does not merge the separate sameness-derived exploration frame into its interoceptive interpretation.

### Why not bias meeting acceptance instead?

Because the missing Fibre capability is self-directed life exploration, not higher visitor compliance.

## 11. X1 handoff

X1 should add **one causal edge** and no new conceptual authority:

> Reuse the existing grounded exploration RegulationFrame and existing `projectInteroception()` projection as bounded input to the existing `lived_planning` Interior Cognition concern.

The first X1 test should prove that this edge exists while preserving:

- raw genome exclusion;
- no mechanical semantic-state minting;
- private regulation evidence separate from World plan evidence;
- one planning model call;
- non-social exploration remains possible.
