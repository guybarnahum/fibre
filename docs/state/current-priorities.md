---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Current priorities

Fibre has completed the intrinsic-regulation detour and resumed the lived-world meeting loop.

[`../architecture/intrinsic-regulation.md`](../architecture/intrinsic-regulation.md) is the regulation authority. [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) remains the M2 continuation authority.

## Active sequence

```text
R1 Layered regulator kernel + sensorium                  CLOSED
R2 Social presence + affective resonance                 CLOSED
R3 Interoception -> semantic feeling                     CLOSED
R4 Functional drive loop + organism trace                CLOSED

A1 Flight Plan + World-observed Lived Now                CLOSED
A2 Care plan + conflicting wills in movement             CLOSED
A3 Current-life projection + Thread Editor               CURRENT
A4 Public present + insidefibre.com scene
A5 Situated encounter
B1 Encounter -> selective experience
B2 Life continues + second meeting                       TRUE-E2E CLOSURE
```

All work remains on `agent/m2-lived-encounter`; do not create per-slice branches.

## What the regulation detour earned

The E2E meeting is an architectural forcing function, not merely a demo. Making one meeting genuinely valuable exposed a missing lower organism-like substrate beneath semantic cognition.

Fibre now has a causal chain:

```text
World / body / social evidence
  -> layered intrinsic regulation
  -> consequential attention
  -> private interoception
  -> Thread-authored semantic feeling / need
  -> changed ordinary presence choice
  -> next regulator state
```

The regulator is deterministic where inputs are deterministic, shaped by a Thread species profile plus narrow inherited baselines, and does not mint named emotion, consent, permission or protected action.

## R1-R4 closed

R1 established one small regulator kernel over normalized body/environment perception plus desired presence targets. It produces pressure, urgency, progress/prediction error, attainment and aggregate intrinsic affect without naming emotions.

R2 made people first-class regulatory destinations. Thread cognition may want `with`, `near`, `away_from`, `connected_to`, or no current relation to a person already in its life. World/sensorium independently determines whether that desired relation is actually satisfied. Observable laughter, crying, agitation, calm and contact can create low-level social resonance without claiming another creature's private emotion.

R3 created the explicit interoception boundary. Low-level regulation reaches cognition only as bounded control/sensory evidence; the Thread may author zero or more semantic emotion/need states through existing Semantic State. Similar regulator conditions can become materially different meanings for different Threads.

R4 made regulation behaviorally causal. A meaningful regulator transition can earn attention, alter durable semantic interior state, and thereby alter the Thread's next ordinary presence choice. Ordinary unchanged regulation does not wake cognition.

The regulation cycle emits a compact `organismTrace` separating regulation, attention, interoception, Thread semantic interpretation and next desired presence. Thread Editor has a readable projection for that trace. A3 will carry it into live current-life inspection; do not add a dedicated regulation store solely for UI transport.

## Semantic boundary

```text
regulatory drive   != semantic need
intrinsic affect   != semantic emotion
sensory resonance  != empathy / love / anger
mechanical signal  != autobiographical meaning
care requirement   != dependent person's private desire
```

Meaning-bearing emotion/need/relationship state remains natural-language-first and Thread-owned.

## A1/A2 closed

A Flight Plan is an ordered Thread-authored itinerary rather than one inert next activity. Physical and mediated presences can coexist across a bounded horizon.

The critical authority split is explicit and persistent:

```text
Flight Plan / care plan
  what someone intends or requires

CurrentSituation
  what the World actually observes as happening
```

`CurrentSituation` persists observed physical place or transit progress, mediated presence, activity, participants and evidence. It may diverge from the governing plan and survives restart independently from the immutable plan.

Care uses the same itinerary semantics but retains separate ownership and authority. A valid caregiver requirement can move a dependent person through observed World life without rewriting the dependent person's Flight Plan or becoming the dependent person's private drive. Successful compliance can therefore coexist with unresolved personal presence pressure.

This preserves four separate truths:

```text
what I wanted
what my caregiver required
what happened
what that did to me
```

## A3 current

A3 is integration/projection, not another authority.

The first current-life projection now assembles existing authoritative state into one causal operator view:

```text
observed Now
personal Flight Plan
care plan / care requirement
plan-vs-lived status
current Semantic State
optional organism trace
provenance
```

The projection does not persist or reinterpret any of those records. Thread Editor has a readable model for the projection that keeps personal will, caregiver authority, observed life and semantic interior visibly distinct.

Next, wire this projection through one private World read boundary into the running Thread Editor and render it in the Life state view. Do not add a current-life cache, new store, service hierarchy or mutation path merely for inspection.

## Stop rules

- No scheduler framework or route engine.
- No second location/current-life authority.
- No current-life projection store or Editor-authored state.
- Plan is never copied into reality merely because it governs.
- Care authority never rewrites the dependent Thread's own plan or becomes its private desire.
- World observation never authors private semantic meaning.
- No high-frequency organism ticking; evaluate meaningful transitions lazily.
- Keep tests focused on causal Fibre invariants and representative lived cases.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```
