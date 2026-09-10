---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Current priorities

Fibre is taking a deliberate intrinsic-regulation detour before continuing the lived-world meeting loop.

[`../architecture/intrinsic-regulation.md`](../architecture/intrinsic-regulation.md) is the current implementation authority. [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) remains the M2 continuation authority.

## Active sequence

```text
R1 Layered regulator kernel + sensorium                  CURRENT
R2 Social presence + affective resonance                 NEXT
R3 Interoception -> semantic feeling                     NEXT
R4 Functional drive loop + Thread Editor inspection      NEXT

resume A1/A2 Flight Plan + movement                      AFTER R4
A3 Current-life projection + Thread Editor
A4 Public present + insidefibre.com scene
A5 Situated encounter
B1 Encounter -> selective experience
B2 Life continues + second meeting                       TRUE-E2E CLOSURE
```

All work remains on `agent/m2-lived-encounter`; do not create per-slice branches.

## Why the detour

The E2E meeting is an architectural forcing function, not merely a demo. Making one meeting genuinely valuable exposed missing Fibre capabilities: self-authored life, care/dependency, movement/presence, and now a lower sensory/motivational substrate that makes environmental comfort, social proximity, success, lateness, obstacles and arrival matter to the Thread before an LLM invents an emotion sentence.

## R1 now

Build one small deterministic evaluator:

```text
PerceptFrame
  -> basal RegulatorKernel
  + human-like Thread SpeciesProfile
  + bounded individual runtime baselines
  -> RegulationFrame
```

Prove only a few representative channels first:

- thermal/light state;
- ambient sound / sensory load;
- social density / openness;
- commitment/presence pressure.

Outputs are low-level control signals: pressure, urgency, progress, prediction error, attainment, activation, hedonic potential and attention candidates. R1 does not emit named emotions or protected actions.

## R2 social proof

Add person-targeted presence and observable social cues:

```text
with caregiver
near partner
away from person
connected to friend
alone somewhere quiet
laughter / crying / high-intensity voice / approach / withdrawal
```

A caregiver, partner or intimate friend may function as a regulatory destination. Density/crowding may be comforting, neutral or aversive depending on relationships and context.

Do not infer a private emotion from a face/voice/body cue and do not infer desired proximity from a relationship role.

## Semantic boundary

```text
regulatory drive   != semantic need
intrinsic affect   != semantic emotion
sensory resonance  != empathy / love / anger
mechanical signal  != autobiographical meaning
```

Meaning-bearing emotion/need/relationship state remains natural-language-first and Thread-owned. R3 exposes only bounded private interoceptive cues to cognition.

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

## Flight Plan work already earned

The branch already established useful A1/A2 authority boundaries: Thread personal plan and caregiver care plan are distinct from World-enacted situation, care does not overwrite the dependent person's will, and Viewer/caller input cannot author current reality.

Its plan representation is provisional. After R4, Flight Plan resumes as a half-day/day mental itinerary of desired presence states, movement and commitments, using intrinsic regulation as the felt substrate.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```

Planning slice identifiers are Fibre milestones, not GitHub PR numbers.
