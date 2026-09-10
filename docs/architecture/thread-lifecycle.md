---
id: architecture-thread-lifecycle
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Thread lifecycle: freeze, regulation and thaw

## Frozen does not mean nonexistent

A Thread persists without active model compute. Events, time and World conditions may change while no LLM is running.

Temporary cognition is not the Thread's life clock.

Fibre does not yet claim a complete autonomous ordinary-life loop in production, but the accepted direction is now explicit: **intrinsic regulation may change and request attention while cognition is frozen**.

## Triggers

Cognition may be requested by:

- external task/message/request;
- deadline or obligation;
- family/care event;
- scheduled reflection;
- budget/resource change;
- Thread-authored semantic need/intention;
- **intrinsic-regulation threshold or meaningful transition**.

Externally initiated requests preserve requester, objective, terms and provenance.

An intrinsic-regulation trigger is different. It is a private Fibre-computed transition over authoritative Thread/World state as defined by [`intrinsic-regulation.md`](intrinsic-regulation.md).

Conceptually it preserves:

```text
regulator / target ref
prior and current drive witness
threshold/transition policy
input evidence refs
asOf
resource policy
```

Do not persist every numerical tick; preserve the target/configuration and consequential transition needed for replay.

## Interoception is not a hidden conclusion

Earlier mechanical-condition work correctly prohibited feeding a Fibre-derived semantic verdict back into cognition as self-knowledge. Intrinsic regulation refines the allowed boundary.

A triggered cognition episode may receive a bounded private **interoceptive projection** of the control state:

```text
target: upcoming appointment
orientation: approach
pressure: rising
progress: behind expectation
```

It may not receive a Fibre-authored interpretation such as:

```text
you are anxious
you love this person
you resent your caregiver
you should cancel the appointment
```

The first is sensation/control evidence. The second pre-authors semantic interiority or action.

The Thread's temporary cognition may interpret the interoceptive signal using its own admissible history, relationships and current semantic state, then propose a semantic emotion/need/meaning through normal validation.

## Regulation may wake; it may not authorize

Intrinsic drives may alter salience, request cognition, and bias ordinary approach/avoid/explore/rest tendencies.

They may **not** mint consent, permission, money, relationship authority or protected external action.

A regulator-triggered episode may notice, reflect, form an intention, revise a Flight Plan or propose semantic state. Protected/external action still passes the ordinary authorization path.

## Private appraisal and authorization

For externally initiated requests, Fibre compiles a bounded Thread-owned appraisal capsule. The Thread forms a private stance and desired action. The kernel validates and records request-bound authorization tied to Thread/version/request/causation.

Clarification, negotiation, delegation and refusal may produce bounded responses without beginning the requested task. Public wording is not authorization evidence.

Private desire remains distinct from execution authority regardless of what caused cognition to wake.

## Thaw

A thaw resolves the Thread aggregate, acquires concurrency control, selects admissible context, allocates resources and invokes temporary cognition.

Different trigger kinds carry different bounded context:

```text
external request       -> requester/request appraisal context
intrinsic regulation   -> regulator witness + interoceptive projection
ordinary World event   -> event/situation context
```

They must not be disguised as one another merely to reuse a runtime path.

## Think, act, communicate

The Thread may use Actor, Dignity Guardian, Goal Guardian, Self Examiner, memory retrieval, tools and other Threads. Private stance, semantic feeling, intention, authorization, external expression and performed action remain separate.

For simpler non-verbal animals a bounded behavior controller may eventually consume intrinsic affect without semantic cognition for ordinary unprotected actions. That does not create a bypass for Thread authorization.

## Commit and freeze

Fibre validates proposed changes, records communications/actions, settles ledgers, stores admitted memories/semantic state, records unresolved intentions and life events, releases runtime leases, and returns temporary cognition to rest.

The durable person and any regulator targets/checkpoints survive the worker.

## Ordinary life — active architectural gap

> **A human encounter should enter an already unfolding life rather than create one when the human arrives.**

The current `agent/m2-lived-encounter` work is closing this gap in stages:

```text
intrinsic regulation
  -> Flight Plan / care plan
  -> World-enacted presence and movement
  -> encounter
  -> interpretation / selective consequence
  -> continued life
```

The regulator detour is not a general scheduler or simulation framework. It supplies the lower organism-like pressure that makes movement, deadlines, relationships, obstacles and arrival matter before the E2E meeting resumes.

Until the full loop is causally proven, Presentation/UI output alone remains insufficient evidence that autonomous life exists.