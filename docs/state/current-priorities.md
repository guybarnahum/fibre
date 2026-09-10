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
R1 Regulatory kernel + presence drive                   CURRENT
R2 Person-as-place / social-attachment regulation       NEXT
R3 Interoception -> semantic feeling                    NEXT
R4 Functional drive loop + Thread Editor inspection     NEXT

resume A1/A2 Flight Plan + movement                     AFTER R4
A3 Current-life projection + Thread Editor
A4 Public present + insidefibre.com scene
A5 Situated encounter
B1 Encounter -> selective experience
B2 Life continues + second meeting                      TRUE-E2E CLOSURE
```

All work remains on `agent/m2-lived-encounter`; do not create per-slice branches.

## Why the detour

The E2E meeting is an architectural forcing function, not merely a demo. Making one meeting genuinely valuable exposed missing Fibre capabilities: self-authored life, care/dependency, movement/presence, and now a lower motivational substrate that makes success, lateness, proximity, separation, obstacles and arrival actually matter to the Thread.

A convincing meeting should become a potentially high-value experience **because of the life already under it**, not because the Viewer writes dramatic context into a prompt.

## R1 now

Build the smallest general loop:

```text
desired/avoided condition
  + actual/predicted World state
  -> drive pressure / progress / surprise / attainment
  -> private intrinsic affect
```

Start with **presence** because it is general and immediately useful to Flight Plans:

- physically at a place;
- connected to a mediated meeting;
- with/near/away from a person;
- available for an obligation/activity.

R1 is deterministic and provider-neutral. It should not generate named emotions.

## Person as place

A caregiver, partner or intimate friend can be a desired presence target just as a station or room can. Conversely, distance from a person may be desired.

```text
with caregiver
near partner
away from person
connected to friend
alone somewhere quiet
```

Role never determines polarity. Relationship/developmental history must remain capable of changing whether proximity feels regulating, neutral, conflicted or aversive.

## Semantic boundary

```text
regulatory drive  != semantic need
intrinsic affect  != semantic emotion
mechanical signal != autobiographical meaning
```

Drive state can be numeric. Meaning-bearing emotion/need/relationship state remains natural-language-first and Thread-owned.

R3 may expose bounded regulator output to cognition through an explicit private interoceptive channel. It must never inject conclusions such as `you are anxious`, `you love her`, or `you should leave`.

## Stop rules

- No general emotion simulator.
- No giant drive ontology; prove presence first.
- No fixed mapping from drive values to named emotions.
- No `parent/partner => seek proximity` shortcut.
- No high-frequency ticking; evaluate on meaningful events/time boundaries and recompute lazily.
- No regulator may mint consent, permission or protected action.
- Persist consequential targets/transitions, not every numeric sample.
- Keep tests focused on causal invariants and one or two lived examples.

## Flight Plan work already earned

The current branch has already established useful A1/A2 authority boundaries: Thread personal plan and caregiver care plan are distinct from World-enacted situation, care does not overwrite the dependent person's will, and Viewer/caller input cannot author current reality.

The current narrow one-step plan representation is **not the final Flight Plan design**. After R4 it will be reshaped into a half-day/day mental itinerary of desired presence states, movement and commitments, using intrinsic regulation as the felt substrate.

## Branch

Continue on:

```text
agent/m2-lived-encounter
```

Planning slice identifiers are Fibre milestones, not GitHub PR numbers.