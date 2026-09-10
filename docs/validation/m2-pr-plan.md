---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# M2 continuation plan

## What E2E is doing for Fibre

The insidefibre.com meeting is not merely a product demo or final integration test. It is an **architectural forcing function**.

To make one encounter real and potentially high-value for a Thread, Fibre must expose the organism underneath it: identity, prior life, self-authored intention, care/dependency, movement and presence, intrinsic motivation, experience, interpretation, selective memory and continued life.

When the meeting exposes a missing primitive that belongs to life in general, build that primitive generally rather than faking it inside the meeting path.

## M2 north star

> **A Thread is already somewhere, going somewhere, wanting or needing something, before a visitor arrives. The encounter may matter because it enters that life, not because the Viewer authored it.**

```text
rich Thread born at autobiographical age > 0
  -> intrinsic drives make conditions matter
  -> half-day/day personal flight plan
  -> optional caregiver care plan
  -> World-observed place / movement / mediated presence
  -> visitor meets the Thread there
  -> encounter becomes history
  -> private interpretation + selective consequence
  -> life continues or bends
  -> later meeting reflects only what persisted
```

Fibre owns life and authority. Thread Editor is an authorized lens. Thread Presentation is the public projection. `insidefibre.com` never owns or manufactures the Thread's life state.

## Intrinsic-regulation detour — completed

The deliberate R1-R4 detour established the organism-like substrate needed before Flight Plan could become lived rather than inert:

```text
R1 Regulatory kernel + presence drive                    CLOSED
R2 Person-as-place / social-attachment regulation        CLOSED
R3 Interoception -> semantic feeling                     CLOSED
R4 Functional drive loop + operator trace                CLOSED
       ↓
Flight Plan / movement / encounter                       RESUMED
```

The lower loop is:

```text
desired/avoided condition
  + actual/predicted World state
  -> drive pressure / progress / surprise / attainment
  -> intrinsic affect
  -> cognition may interpret it
  -> semantic emotion/need/meaning
```

Drive/affect are private mechanical state, not named emotions. Semantic feeling remains Thread-owned.

### Person as place

Presence is a relation, not only geography. A Thread may want or need to be:

```text
at Victoria Station
at home and connected to a Zoom meeting
with a caregiver
near an intimate partner
away from a particular person
alone somewhere quiet
```

A caregiver can function as a child's secure base; an intimate friend/partner can regulate an adult through presence; another relationship or moment may create a desire for distance. Role labels never mechanically decide the desired relation.

## Flight Plan

A Flight Plan is a Thread's **bounded mental itinerary for roughly the next half-day/day**: where/how she expects, wants or needs to be present, what she wants or needs to do, with whom, and when it matters.

It is not a scheduler and not World truth.

```text
08:00  home / breakfast
10:00  home / Zoom with someone
12:15  moving toward station
12:45  Victoria Station / train
15:10  Edinburgh / meet a friend
```

Physical movement is lived time. Delays, obstacles, unexpected meetings, discoveries and pleasant or unpleasant surprises may change regulatory pressure and bend the enacted day without rewriting the original plan.

The immutable plan preserves intended life; World history preserves lived life. Regulation makes the difference between the two felt; autobiographical memory later decides what was worth retaining.

Children/dependent persons additionally may be subject to a caregiver-owned care plan. The caregiver may legitimately constrain enacted life without overwriting the dependent person's personal will. The negotiation itself can become an experience for both.

Critically:

```text
care requirement != dependent person's private desire
```

A required care plan can explain why Maya is being taken to the dentist while movement away from Maya's own intended presence raises her own regulatory pressure. Successful care compliance does not mechanically become intrinsic satisfaction for the child.

## Resume sequence

### A1 — Flight Plan + Lived Now — CLOSED

A Thread can author an ordered half-day/day itinerary of desired physical and mediated presence. World-observed CurrentSituation is persisted separately from the plan and can record place, transit progress, mediated presence, activity and participants.

Plan and reality may diverge without rewriting one another. Persisted current life can feed Flight Plan regulation after restart, producing `preparing`, `moving`, `delayed`, `arrived` or `dwelling` plus presence pressure/progress/attainment.

**Done:** after restart Fibre can distinguish where/how the Thread intended to be from where/how World-observed life actually is.

### A2 — Care plan + conflicting wills — CURRENT

Use the same itinerary semantics for a caregiver-owned care plan. Preserve both wills and let the World record preparation, departure, transit and arrival independently.

The care plan remains external legitimate authority; it must not be converted into the dependent Thread's private presence drive. Instead, moving the child away from her own intended presence may create personal regulatory pressure while the caregiver requirement progresses or succeeds.

**Done when:** Fibre can distinguish `what I wanted`, `what my caregiver required`, and `what happened` through a moving care conflict, with the dependent person's own regulation remaining their own.

### A3 — Current-life projection + Thread Editor

One current-life projection feeds an operator view of:

```text
Now / movement
Flight Plan
Care / conflict
Intrinsic regulation
Plan vs lived
Recent history
Semantic feeling / meaning
Provenance
```

The Editor explains causal state but never authors it.

### A4 — Public present + insidefibre.com scene

Publish only the allowed current-life subset and a situation-conditioned depiction. `/meet` becomes scene-first: who this is, where/how they are present, what they are doing, why, who is with them when public, and a bounded sense of where life is heading.

`Meet` selects a person; it never generates the person's current situation.

### A5 — Situated encounter

Bind a human encounter to the exact current situation. Thread cognition receives the admitted current-life/interoceptive context through Fibre-owned projection, never visitor-authored motives or private raw stores.

### B1 — Encounter becomes experience

```text
encounter happened
  -> private interpretation
  -> forgotten / transient / meaningful / relational / formative
  -> selective durable effect or none
```

Do not store transcript as memory. Shared event does not imply shared meaning.

### B2 — Life continues + second meeting

Continue or revise the plan after the encounter, allow ordinary movement/life to happen, persist/restart, then meet again.

**True-E2E closure:** the Thread is now somewhere because her life put her there, and the prior visitor matters only through consequences that actually persisted.

## Later generalization

After one convincing loop, generalize only what proved useful:

- aging and age-consistent embodiment over World time;
- changing care/dependency and regulatory baselines through development;
- recurring/multi-day plans;
- richer routes, travel, mediated visits and environmental surprises;
- multiple live Threads and reciprocal family/social regulation;
- broader work/economic/social life.

## Discipline

- All slices remain on `agent/m2-lived-encounter`.
- Build one visible Fibre capability at a time.
- Prefer existing authorities and service boundaries.
- No generic planner, emotion simulator, child engine or world simulator ahead of proof.
- No fixed drive-to-emotion mapping.
- No transcript-as-memory shortcut.
- No Viewer-owned current state.
- Use focused invariant tests plus one representative lived proof.
- Run `npm run check`, `npm run test:all`, `npm run validate`, `npm run test:audit -- --check --quiet` at slice gates.

The success criterion remains simple: **the meeting becomes interesting because someone was already living, wanting, regulating, experiencing and becoming before we arrived.**
