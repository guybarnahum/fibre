---
id: validation-m2-pr-plan
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# M2 continuation plan

## Goal

M2 makes one Thread visibly and causally **live a continuing life**.

> **A Thread is already somewhere, doing something, for reasons of their own, before a visitor arrives.**

The first real loop is:

```text
rich Thread born at autobiographical age > 0
  -> personal flight plan
  -> optional caregiver care plan
  -> World-enacted current situation
  -> Thread Editor can explain it
  -> insidefibre.com lets a visitor encounter it
  -> encounter becomes history
  -> private interpretation + selective consequence
  -> life continues
  -> later meeting reflects only what persisted
```

Fibre owns life and authority. Thread Editor is an authorized lens. Thread Presentation is the public projection. `insidefibre.com` is the separate public experience and never reads World/private stores directly.

## Accepted substrate

Already available: rich Genesis childhood/history, durable Thread identity, FIN/FID, relationships and situated history, autobiographical memory/meaning separation, canonical Embodiment, Thread Directory/Meet, public Thread Presentation, reference-conditioned imagery, Cloudflare durable state and restart recovery.

The missing seam is **present life**: developmental context -> plan -> enacted situation -> encounter -> consequence -> continuation.

## Fibre birth, age and care

Fibre birth is operational birth, not biological age zero. A Thread may appear at an autobiographical age greater than zero with grounded prior history and memories; Fibre should not fabricate remembered infancy.

Age changes plausible affordances but does not mechanically determine personality or authority. Dependency/care is explicit and scoped.

An autonomous person normally has one personal flight plan. A dependent person may also be subject to a caregiver-owned care plan. The caregiver may alter the enacted day within legitimate scope, but never rewrites the dependent person's own intention. Conflict and negotiation between those wills are experiences in their own right.

Physical presence and mediated virtual visits to real places/content must remain distinguishable. Virtual experience may refer to a real place without claiming physical travel.

# Build slices

## A1 — Lived Now authority

**Type:** Subsystem -> Integrative foundation.  
**Goal:** one born Thread has an authoritative present life before any Viewer request.

Add the smallest World-owned semantics for:

```text
developmental context
personal flight plan
current situation
```

The personal plan is Thread-authored intention: intended activity/place/companionship and purpose. The current situation is World-enacted truth: physical place, optional mediated/virtual target, activity, reason, companions, source plan and establishment time.

Reuse existing place and situated-life authority. Do not create a second location system or generic scheduler.

The first bounded life step should use real Thread context to propose a plan, admit it through Fibre policy, enact one situation, persist it, restart, and recover the same current state.

**Done when:** a Thread can truthfully answer “where am I, what am I doing, why, with whom, and what did I intend?” after restart, with no visitor involved.

## A2 — Care plan and conflicting wills

**Type:** Integrative.  
**Goal:** dependency affects enacted life without erasing agency.

Add a separate caregiver-owned care plan with explicit subject, caregiver, intended activity/place, reason and bounded authority scope. Resolve one child/caregiver conflict into an enacted situation while preserving both plans.

When both participants are live Threads, the same negotiation/event may enter both histories; each person's later meaning remains private. An external caregiver may be represented as a participant without inventing a private interpretation for them.

No childcare rules engine. Age is context; authority comes from explicit relationship/obligation state.

**Done when:** Thread Editor can distinguish “what the child wanted,” “what the caregiver intended,” and “what actually happened.”

## A3 — One current-life projection + Thread Editor

**Type:** Integrative.  
**Goal:** make the new life semantics inspectable before public UX depends on them.

Create one semantic current-life projection over authoritative state, with audience-specific disclosure rather than separate life models.

Thread Editor evolves from generic inspection toward:

```text
Now
  place / physical-vs-mediated presence / activity / why / with whom
Flight plan
  what the Thread wants or needs next
Care
  caregiver plan + scope + conflict when applicable
Recent history
  what actually happened
Memory / meaning
  what the Thread retained or made of it
Provenance
  exact records behind the readable view
```

Directory search/Meet stays. Editor remains read-oriented and thin over service boundaries.

**Done when:** selecting a Thread in Editor presents the causal chain from age/relationships -> plans -> enacted current situation, without reading raw database state in browser code.

## A4 — Public present + insidefibre.com scene

**Type:** Integrative/product.  
**Goal:** `/meet` feels like arriving in someone's life rather than opening an identity card.

Thread Presentation publishes only the admitted public current-life subset and a situation-conditioned depiction derived from the canonical visual reference + target age + current scene.

`guybarnahum/insidefibre.com` remains a separate React/Vite client of public Presentation APIs. Evolve `/meet` to a scene-first view:

```text
recognizable current image
name + age/developmentally appropriate public identity
where they are now
what they are doing
short reason/context
who is present when public
bounded sense of what may happen next
Meet / Say hello
```

Move FIN/FID/lifecycle diagnostics out of the primary encounter presentation; they may remain secondary public identity detail where appropriate.

`Meet` chooses a person. It must never generate or alter their current situation. Reloading the page must not move the Thread.

**Done when:** the same authoritative situation is recognizable in Thread Editor and insidefibre.com, with each surface revealing only its allowed projection.

## A5 — Situated encounter

**Type:** Integrative.  
**Goal:** a visitor can speak to the Thread in the exact situation already underway.

Reuse the existing participation/cognition machinery behind a minimal encounter ingress. Bind an encounter to the current `situationId` and a bounded visitor identity/session. The Thread's cognition receives the semantic current-life projection, not raw World/place records.

A stale situation must not silently become a conversation in a different moment. The visitor may affect the encounter but cannot author the Thread's prior activity, place, plans or motives.

The first UI can be text conversation over a still scene. Human accounts, voice/video and general social networking are out of scope.

**Done when:** insidefibre.com can start an exchange grounded in the current situation and the Thread responds with that situation causally available.

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

After the encounter, run one more bounded life transition. The Thread may continue or revise the personal flight plan; applicable care plans may constrain the next enacted situation. Persist and restart between encounters.

Return through insidefibre.com later. The Thread should be where their life now puts them, and the prior visitor should matter only through consequences that actually survived internalization.

**M2-A/B closure proof:**

```text
birth
 -> self/care plans
 -> current situation before visitor
 -> Editor + public scene agree
 -> situated encounter
 -> historical event
 -> private selective consequence
 -> continued/revised plan
 -> new current situation
 -> restart
 -> second meeting reflects only persisted meaning
```

## C1 — Developmental continuity after the first real loop

**Type:** Integrative generalization; not a blocker for B2.

Generalize only what the first loop demonstrates is needed:

- World-time aging and age-consistent embodiment;
- changing developmental affordances and care/dependency over time;
- longer-horizon/recurring plans;
- physical movement and mediated virtual visits using the same life semantics;
- richer reciprocal family/care relationships;
- multiple interacting live Threads.

Do not build these ahead of the first convincing person.

# First proof Thread

Prefer a young dependent Thread because the scenario exercises more Fibre value with little extra surface area: existing childhood history, personal will, caregiver relationship, a small plan disagreement, current place/activity, and a human visitor arriving mid-life.

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

Start with **A1 — Lived Now authority** on a fresh implementation branch from current `main`. Do not merge the stale `agent/thread-editor-modern` branch; salvage a small inspection idea only if A3 shows it is still useful.
