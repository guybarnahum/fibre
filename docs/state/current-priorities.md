---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Current priorities

Fibre has completed the intrinsic-regulation detour needed before continuing the lived-world meeting loop.

[`../architecture/intrinsic-regulation.md`](../architecture/intrinsic-regulation.md) is the regulation authority. [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) remains the M2 continuation authority.

## Active sequence

```text
R1 Layered regulator kernel + sensorium                  CLOSED
R2 Social presence + affective resonance                 CLOSED
R3 Interoception -> semantic feeling                     CLOSED
R4 Functional drive loop + organism trace                CLOSED

A1 Flight Plan + World-observed Lived Now                CLOSING
A2 Care plan + conflicting wills in movement             NEXT
A3 Current-life projection + Thread Editor
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
```

Meaning-bearing emotion/need/relationship state remains natural-language-first and Thread-owned.

## A1 now

A Flight Plan is now an ordered Thread-authored itinerary rather than one inert next activity. Physical and mediated presences can coexist across a bounded horizon.

The critical authority split is now explicit:

```text
Flight Plan / care plan
  what someone intends or requires

CurrentSituation
  what the World actually observes as happening
```

`CurrentSituation` persists observed physical place or transit progress, mediated presence, activity, participants and evidence. It may diverge from the governing plan and survives restart independently from the immutable plan.

A required care plan can govern what should happen without fabricating that it already happened. For example, a caregiver may require Maya to put the tablet away while World-observed life still records Maya watching the octopus stream. Both wills and the actual state remain distinguishable.

The persisted CurrentSituation can be projected back into Flight Plan regulation:

```text
intended presence
  + observed current life
  -> preparing / moving / delayed / arrived / dwelling
  -> presence pressure / progress / attainment
```

This is the A1 closure direction. After the focused gates, move to A2 and make a caregiver constraint participate in real movement/progress while preserving the dependent Thread's separate personal Flight Plan.

## Stop rules

- No scheduler framework or route engine.
- No second location/current-life authority.
- Plan is never copied into reality merely because it governs.
- Care authority never rewrites the dependent Thread's own plan.
- World observation never authors private semantic meaning.
- No high-frequency organism ticking; evaluate meaningful transitions lazily.
- Keep tests focused on causal Fibre invariants and representative lived cases.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```
