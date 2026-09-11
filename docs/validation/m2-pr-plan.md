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

Presence is a relation, not only geography. A Thread may want or need to be at a place, connected to a mediated meeting, with or away from another person, or alone somewhere quiet. Role labels never mechanically decide the desired relation.

## Flight Plan

A Flight Plan is a Thread's **bounded mental itinerary for roughly the next half-day/day**: where/how she expects, wants or needs to be present, what she wants or needs to do, with whom, and when it matters.

It is not a scheduler and not World truth. Physical movement is lived time. Delays, obstacles, unexpected meetings, discoveries and surprises may change regulatory pressure and bend the enacted day without rewriting the original plan.

The immutable plan preserves intended life; World history preserves lived life. Regulation makes the difference between the two felt; autobiographical memory later decides what was worth retaining.

Children/dependent persons additionally may be subject to a caregiver-owned care plan. The caregiver may legitimately constrain enacted life without overwriting the dependent person's personal will.

```text
care requirement != dependent person's private desire
```

## Resume sequence

### A1 — Flight Plan + Lived Now — CLOSED

A Thread can author an ordered half-day/day itinerary of desired physical and mediated presence. World-observed CurrentSituation is persisted separately from the plan and can record place, transit progress, mediated presence, activity and participants.

Plan and reality may diverge without rewriting one another. Persisted current life can feed Flight Plan regulation after restart.

### A2 — Care plan + conflicting wills — CLOSED

Care uses the same itinerary semantics while retaining separate ownership and authority. A caregiver-owned required plan may govern enacted life without rewriting the dependent Thread's personal Flight Plan or becoming the dependent Thread's private drive.

### A3 — Current-life projection + Thread Editor — CLOSED

One computed current-life projection assembles the existing authorities into the authorized operator view. It is not a store, cache, second current-life authority or Editor-owned state.

### A4 — Public present + insidefibre.com scene — CLOSED

Thread Presentation publishes only the allowed current-life subset. `/meet` is scene-first: the visitor enters a life already underway. Viewer selection never generates the person's current situation.

### A5 — Situated encounter — CLOSED

A human encounter is bound to the exact already-published situation. The browser supplies only an utterance plus the displayed `situationId` as a stale-scene precondition. Presentation verifies the published scene and World independently verifies authoritative CurrentSituation before cognition.

Private Semantic State may shape cognition but does not cross the public boundary. The visitor cannot author World state, private motives, plans, care authority or semantic state. The response is ephemeral at the public seam; A5 itself does not create transcript history, memory or relationship state.

### B1 — Encounter becomes experience — ACTIVE

B1 separates objective lived evidence from the Thread's subjective internalization:

```text
objective lived encounter
  -> private contemporaneous interpretation
  -> optional private Thread Journal entry
  -> selective autobiographical retention or none
  -> optional durable remembered meaning
```

The Thread Journal is private inner voice: a first-person contemporaneous reflection linked to the objective event. It is neither objective history nor autobiographical memory. A journal entry may survive as a historical artifact even if the Thread later does not remember the encounter. Later reinterpretation appends new inner life; it does not rewrite what the Thread thought then.

B1 implementation slices:

```text
B1.1 objective encounter <-> private Thread Journal       ACTIVE
B1.2 selective autobiographical carry-forward            NEXT
```

Do not store a transcript as memory. Human encounters receive no special retention privilege. Shared event does not imply shared meaning, and journal existence does not imply durable memory.

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
- No generic planner, emotion simulator, child engine, conversation store or world simulator ahead of proof.
- No fixed drive-to-emotion mapping.
- No transcript-as-memory shortcut.
- No Viewer-owned current state.
- Keep private journal and autobiographical recall distinct.
- Use focused invariant tests plus one representative lived proof.
- Run `npm run check`, `npm run test:all`, `npm run validate`, `npm run test:audit -- --check --quiet` at slice gates.

The success criterion remains simple: **the meeting becomes interesting because someone was already living, wanting, regulating, experiencing and becoming before we arrived.**
