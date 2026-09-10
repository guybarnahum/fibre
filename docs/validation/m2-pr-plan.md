---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# M2 continuation plan

## Goal

M2 makes one Thread visibly and causally **live a continuing life**.

> **A Thread is already somewhere, going somewhere, or doing something for reasons of their own before a visitor arrives.**

The first real loop is:

```text
rich Thread born at autobiographical age > 0
  -> half-day/day personal flight plan
  -> optional caregiver care plan
  -> World-enacted place or movement
  -> Thread Editor can explain it
  -> insidefibre.com lets a visitor encounter it
  -> encounter becomes history
  -> private interpretation + selective consequence
  -> life continues through the plan or bends it
  -> later meeting reflects only what persisted
```

Fibre owns life and authority. Thread Editor is an authorized lens. Thread Presentation is the public projection. `insidefibre.com` is the separate public experience and never reads World/private stores directly.

## Accepted substrate

Already available: rich Genesis childhood/history, durable Thread identity, FIN/FID, relationships and situated history, autobiographical memory/meaning separation, canonical Embodiment, Thread Directory/Meet, public Thread Presentation, reference-conditioned imagery, Cloudflare durable state and restart recovery.

The missing seam is **present life**: developmental context -> plan -> place/movement -> encounter -> consequence -> continuation.

## Fibre birth, age and care

Fibre birth is operational birth, not biological age zero. A Thread may appear at an autobiographical age greater than zero with grounded prior history and memories; Fibre should not fabricate remembered infancy.

Age changes plausible affordances but does not mechanically determine personality or authority. Dependency/care is explicit and scoped.

An autonomous person normally has one personal flight plan. A dependent person may also be subject to a caregiver-owned care plan. The caregiver may alter the enacted day within legitimate scope, but never rewrites the dependent person's own intention. Conflict and negotiation between those wills are experiences in their own right.

## Flight plans, presence and movement

A flight plan is a Thread's **bounded mental itinerary for roughly the next half-day or day**. It records where and how the person expects, wants, or needs to be present, not merely one next action.

Typical stops include both geographic and mediated commitments:

```text
08:00  home / breakfast
10:00  home / Zoom meeting with someone
12:15  walk to station
12:45  Victoria Station / catch train
15:10  Edinburgh / meet a friend
```

Every stop has a physical place, a time window, an activity/reason, optional companions, and optional mediated context. “Be on Zoom at 10:00” therefore means physical presence somewhere plus mediated presence in the meeting; it is not falsely modeled as geographic travel.

Movement matters. When adjacent intended stops require different physical places, the interval between them is life **in transit**: the Thread is going somewhere for a reason. Transit is fertile lived time for observations, meetings, obstacles, delays, frustrations and good or bad surprises. These may bend the enacted trajectory without rewriting the original plan.

The durable flight plan also preserves what the Thread had intended. World situations preserve what actually happened. Looking back can therefore compare **planned life versus lived life** without pretending the plan itself is autobiographical memory.

Physical presence and mediated virtual visits to real places/content remain distinguishable. A Thread may physically remain at home while virtually visiting a museum, watching a live zoo feed, or joining a Zoom meeting.

# Build slices

## A1 — Flight plan + Lived Now authority

**Type:** Subsystem -> Integrative foundation.  
**Goal:** one born Thread has an authoritative present life and near-term itinerary before any Viewer request.

Add the smallest World-owned semantics for:

```text
developmental context
Thread-authored half-day/day flight plan
World-enacted current situation
```

A flight plan is an ordered set of intended stops. World derives whether the Thread is **at a place** or **in transit toward the next place** at a given life step. Current situation is enacted truth, not merely the plan: actual place/movement, activity, reason, companions, source plan and establishment time.

Reuse existing place and situated-life authority. Do not create a second location system, route engine, calendar product or generic scheduler.

The first bounded life proof should use real Thread context to form a multi-stop plan, admit it through Fibre policy, enact at least one place and one movement interval, persist it, restart, and recover the same current state.

**Done when:** a Thread can truthfully answer “where am I or where am I going, what am I doing, why, with whom, what did I intend for this part of my day?” after restart, with no visitor involved.

## A2 — Care plan and conflicting wills

**Type:** Integrative.  
**Goal:** dependency affects the itinerary and enacted life without erasing agency.

Add a separate caregiver-owned care plan using the same bounded itinerary shape. Resolve one child/caregiver conflict over where/how the child should be present while preserving both plans.

When both participants are live Threads, the same negotiation/event may enter both histories; each person's later meaning remains private. An external caregiver may be represented as a participant without inventing a private interpretation for them.

No childcare rules engine. Age is context; authority comes from explicit relationship/obligation state.

**Done when:** Thread Editor can distinguish “where the child wanted/planned to be,” “where the caregiver required them to be,” “what actually happened,” and whether they are now at a place or moving toward one.

## A3 — One current-life projection + Thread Editor

**Type:** Integrative.  
**Goal:** make the new life semantics inspectable before public UX depends on them.

Create one semantic current-life projection over authoritative state, with audience-specific disclosure rather than separate life models.

Thread Editor evolves from generic inspection toward:

```text
Now
  at place OR in transit / destination / activity / why / with whom
Flight plan
  today's/this half-day's intended stops and commitments
Care
  caregiver plan + scope + conflict when applicable
Plan vs lived
  where reality has followed or bent the itinerary
Recent history
  what actually happened
Memory / meaning
  what the Thread retained or made of it
Provenance
  exact records behind the readable view
```

Directory search/Meet stays. Editor remains read-oriented and thin over service boundaries.

**Done when:** selecting a Thread in Editor presents the causal chain from age/relationships -> plans -> movement/place -> enacted current situation, without reading raw database state in browser code.

## A4 — Public present + insidefibre.com scene

**Type:** Integrative/product.  
**Goal:** `/meet` feels like arriving in someone's life rather than opening an identity card.

Thread Presentation publishes only the admitted public current-life subset and a situation-conditioned depiction derived from the canonical visual reference + target age + current scene.

`guybarnahum/insidefibre.com` remains a separate React/Vite client of public Presentation APIs. Evolve `/meet` to a scene-first view:

```text
recognizable current image
name + age/developmentally appropriate public identity
where they are now OR where they are heading
what they are doing
short reason/context
who is present when public
bounded sense of the rest of their day
Meet / Say hello
```

Move FIN/FID/lifecycle diagnostics out of the primary encounter presentation; they may remain secondary public identity detail where appropriate.

`Meet` chooses a person. It must never generate or alter their current situation. Reloading the page must not move the Thread.

**Done when:** the same authoritative place/movement situation is recognizable in Thread Editor and insidefibre.com, with each surface revealing only its allowed projection.

## A5 — Situated encounter

**Type:** Integrative.  
**Goal:** a visitor can speak to the Thread in the exact situation already underway.

Reuse the existing participation/cognition machinery behind a minimal encounter ingress. Bind an encounter to the current `situationId` and a bounded visitor identity/session. The Thread's cognition receives the semantic current-life projection, not raw World/place records.

A stale situation must not silently become a conversation in a different moment. The visitor may affect the encounter but cannot author the Thread's prior activity, place, movement, plans or motives.

The first UI can be text conversation over a still scene. Human accounts, voice/video and general social networking are out of scope.

**Done when:** insidefibre.com can start an exchange grounded in the current place/movement situation and the Thread responds with that situation causally available.

## B1 — Encounter becomes experience

**Type:** Integrative.  
**Goal:** conversation becomes biography without becoming automatic memory.

Persist the encounter as historical evidence, then run Thread-owned interpretation:

```text
encounter happened
  -> private interpretation
  -> benign / weak / meaningful / relational / formative
  -> selective durable effect or none
```

Do not store the transcript as autobiographical memory. History, memory and meaning remain distinct. If multiple live Threads participated, each receives a separate interpretation opportunity.

Thread Editor should show the distinction between event, interpretation and retained consequence. insidefibre.com sees only disclosure-appropriate consequences.

**Done when:** the system supports both “it happened and was forgotten” and “it happened and something warranted persisted,” without the visitor choosing which.

## B2 — Life continues + second meeting

**Type:** **True-E2E.**  
**Goal:** prove that the Thread was not waiting in the browser.

After the encounter, continue through or revise the flight plan. Movement itself may produce ordinary events or unexpected friction; applicable care plans may constrain the next enacted situation. Persist and restart between encounters.

Return through insidefibre.com later. The Thread should be at another stop or on the way somewhere because their life put them there, and the prior visitor should matter only through consequences that actually survived internalization.

**M2-A/B closure proof:**

```text
birth
 -> half-day/day self/care plans
 -> place or movement before visitor
 -> Editor + public scene agree
 -> situated encounter
 -> historical event
 -> private selective consequence
 -> life continues / movement bends or completes
 -> new current situation
 -> restart
 -> second meeting reflects only persisted meaning
```

## C1 — Developmental continuity after the first real loop

**Type:** Integrative generalization; not a blocker for B2.

Generalize only what the first loop demonstrates is needed:

- World-time aging and age-consistent embodiment;
- changing developmental affordances and care/dependency over time;
- recurring/multi-day plans and commitments;
- richer physical movement, routes, delays and mediated visits using the same life semantics;
- richer reciprocal family/care relationships;
- multiple interacting live Threads.

Do not build these ahead of the first convincing person.

# First proof Thread

Prefer a young dependent Thread because the scenario exercises more Fibre value with little extra surface area: existing childhood history, personal will, caregiver relationship, a small itinerary disagreement, movement/place, and a human visitor arriving mid-life.

A1 must remain valid for any Thread. A2 adds care/dependency; it must not make childhood a special parallel runtime.

# Slice discipline

Each slice should:

1. add one visible Fibre capability;
2. reuse existing authority/service boundaries;
3. add only focused invariant tests and one representative proof;
4. run `npm run check`, `npm run test:all`, `npm run validate`, `npm run test:audit -- --check`;
5. stop before generic infrastructure or speculative scale work begins.

Evidence classification matters: seeded fixtures can prove mechanics but not endogenous life. By B2 the critical chain — personal plan, interpretation and continued life — must include real Thread cognition rather than only authored fixtures.

# Start point

Continue all slices on `agent/m2-lived-encounter`. Do not create per-slice branches. Do not merge stale historical feature branches; salvage only a small idea if a current slice proves it is still useful.
