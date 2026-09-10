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

resume A1/A2 Flight Plan + movement                      CURRENT
A3 Current-life projection + Thread Editor               NEXT
A4 Public present + insidefibre.com scene
A5 Situated encounter
B1 Encounter -> selective experience
B2 Life continues + second meeting                       TRUE-E2E CLOSURE
```

All work remains on `agent/m2-lived-encounter`; do not create per-slice branches.

## What the detour earned

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

The regulation cycle now also emits a compact `organismTrace` separating:

```text
regulation
  -> attention
  -> interoception
  -> Thread semantic interpretation
  -> next desired presence
```

Thread Editor has a readable projection for that trace. **Do not add a dedicated regulation store or private transport solely for this view.** A3 current-life projection will carry the live trace into Thread Editor when the lived-now path is wired end to end.

## Semantic boundary

```text
regulatory drive   != semantic need
intrinsic affect   != semantic emotion
sensory resonance  != empathy / love / anger
mechanical signal  != autobiographical meaning
```

Meaning-bearing emotion/need/relationship state remains natural-language-first and Thread-owned.

## Stop rules

- One regulator engine plus species profile, not parallel regulator subsystems.
- No giant drive or sensor ontology.
- No fixed mapping from sensor/drive values to named emotions.
- No `parent/partner => seek proximity` shortcut.
- No `smile => happy` or `shouting => angry` shortcut.
- No high-frequency ticking; evaluate meaningful events/time/sensory transitions and recompute lazily.
- No regulator may mint consent, permission or protected action.
- Persist consequential targets/transitions, not every numeric sample.
- Keep tests focused on causal invariants and a few lived examples.

## Flight Plan resumes now

The branch already established useful A1/A2 authority boundaries: Thread personal plan and caregiver care plan are distinct from World-enacted situation, care does not overwrite the dependent person's will, and Viewer/caller input cannot author current reality.

The resumed A1 path now has two further pieces:

- Thread cognition authors an ordered multi-stop itinerary across a bounded horizon rather than one inert next activity.
- plan-vs-World presence assessment converts observed physical/mediated progress into `preparing`, `moving`, `delayed`, `arrived`, or `dwelling` plus a real intrinsic-regulation target. The immutable plan is not rewritten when observed life diverges.

The next A1 step is to make observed World presence itself part of persisted current-life authority, so restart preserves `what I intended` separately from `where/how I actually am`. Care constraints must then govern what should be enacted without pretending they can teleport the dependent person or rewrite observed reality.

```text
intend presence
  -> predict attainability
  -> move / wait / encounter obstacle / make progress
  -> regulator pressure and surprise
  -> cognition / replanning when consequential
  -> arrive / fail / remain / leave
  -> World records enacted life without rewriting original intention
```

Physical places, mediated presences and people-as-places all use the same presence model.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```
