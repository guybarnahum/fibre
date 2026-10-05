---
id: validation-n6-public-lived-encounter-slices
status: accepted
last-reviewed: 2026-10-05
canonical: true
---

# N6 — Rich Public Lived Encounter

N6 turns the already-proven lived-person and visitor-work machinery into one convincing public experience:

> **A visitor meets a person who was already living before the page opened, then later returns and finds the same person living a later moment.**

N6 is not a new meeting engine. N5 already proved the hard authority path in staging:

```text
prior voluntary visitor-work acceptance
  -> durable commitment
  -> Flight Plan revision
  -> enacted Inside Fibre mediated presence
  -> public Meet
  -> exact situation-bound visitor encounter
  -> Encounter Story
  -> Thread Experience
  -> selective aftermath
  -> exactly-once Fibre Credit compensation
```

N6 reuses that path. Its missing proof is public lived presence and later-life continuity.

## Current boundary

Already accepted and reusable:

- continuous World-owned LivedNow across bounded dormancy;
- Genesis -> continuing lived life;
- public current-present projection;
- voluntary paid Inside Fibre availability through Interior Cognition;
- accepted work bending Flight Plan;
- LivedNow-derived visitor availability;
- committed Thread discovery;
- `livedScene` projection with exact `situationId`;
- visitor encounter bound to that exact situation;
- Encounter Story -> Thread Experience -> journal/memory consequence;
- exactly-once Fibre Credit settlement;
- canonical public identity/embodiment and scene media projection.

Not yet accepted:

- a public **visit** that reconciles a selected Thread to now without requesting a meeting;
- a Viewer experience that visibly presents the bounded lived moment rather than feeling like a chat entry point;
- a later revisit proving the same Thread's life continued beyond the previous encounter.

The Viewer remains a separate deployment/repository and is projection-only. Fibre owns the public API and authority boundaries; Viewer owns presentation and interaction.

## N6.0 — roadmap truth alignment — CLOSED

**Capability:** HEAD has one current execution plan.

Align the authoritative repo docs so:

- N5/E0-E5 are closed live;
- N6 — Rich Public Lived Encounter is current;
- this document is the N6 execution authority;
- W/S coordinates remain historical implementation evidence, not competing current roadmaps;
- natural Thread -> Thread social life remains a preserved follow-on and does not block N6;
- public progress no longer claims W7p/W7b or E5 validation is current work.

No runtime or Viewer code belongs in N6.0.

**Acceptance:** current state, priorities, M2 plan, prototype roadmap and public-progress contract all point to N6 and do not contradict N5 closure.

## N6.1 — visit a current life

**Capability:** a public visitor can observe a selected public Thread's current bounded life without requesting a meeting.

The smallest seam is:

```text
public visit
  -> selected public Thread
  -> World ensure LivedNow(now)
  -> Presentation publishes bounded current present
  -> public response
```

This is deliberately distinct from:

```text
meeting request
  -> accepted visitor-work availability required
  -> encounter
```

A visit must not:

- create visitor-work availability;
- create a meeting request;
- create Encounter Story;
- run visitor-response cognition;
- settle compensation;
- let the caller author place, activity, plan, participants or private state.

Reuse the existing LivedNow/current-present publication authority. Do not add a new store.

**High-value proof:** two visits at different lived times can return different authoritative `situationId` values, while caller input cannot author the scene.

## N6.2 — enter the moment

**Capability:** insidefibre.com presents the current life as a lived moment rather than a chatbot shell.

Use existing public authority first:

- public identity and canonical embodiment;
- exact `situationId`;
- place or transit;
- current activity;
- appropriate public participants/context;
- existing scene media when available;
- bounded availability when the Thread is working an accepted visitor window.

Do not expose private Flight Plan details, private memory, semantic state, cognition reasons or operator evidence.

Do not invent mood, intention or scene narration merely to enrich presentation. Add a new public projection field only when the Viewer prototype demonstrates a concrete missing lived fact.

Scene imagery is optional. Slow or absent generation must not make current life unavailable.

**Acceptance:** what the Visitor sees corresponds to the exact published present and contains no Viewer-authored life facts.

## N6.3 — meet inside that moment

**Capability:** a visitor interaction happens inside the already-visible life.

Reuse the accepted public Meet/encounter APIs:

```text
visible lived scene
  -> accepted visitor-work availability
  -> visitor speaks into exact situationId
  -> World verifies that situation is still current/admissible
  -> response
  -> Encounter Story / Thread Experience
```

If life moved between display and interaction, surface that as the scene having changed. Do not preserve the old scene to behave like a chat session.

No conversation/session database.

**Acceptance:** visitor speech cannot author or freeze the Thread's pre-existing situation; the encounter remains bound to the admitted `situationId`.

## N6.4 — consequence, not session state

**Capability:** what happens may matter after the public interaction ends.

Reuse existing authorities only:

- objective Encounter Story;
- Thread-specific attention/experience;
- optional journal;
- autobiographical memory or `not_remembered`;
- warranted relationship/intention/semantic consequence;
- exactly-once visitor-work compensation.

N6 adds no public-meeting-specific memory rule and no conversation persistence authority.

**Acceptance:** retry cannot duplicate the Encounter Story, private consequence or Fibre Credit settlement; later cognition sees only admitted retained consequence through normal authorities.

## N6.5 — return later

**Capability:** the strongest public continuity proof: the same person is living later.

```text
visitor leaves
  -> time passes / compute may sleep
  -> ordinary LivedNow reconciliation
  -> public visit same Thread
  -> later current scene
```

The later visit does not resume the previous encounter. It asks for the person's present.

**Acceptance:**

- later `situationId` differs from the first scene;
- the old scene no longer accepts new visitor turns;
- the later place/activity may legitimately differ;
- the encounter transcript is not a session state source;
- any remembered consequence appears only if ordinary memory authority retained it.

## N6.6 — live public acceptance

Run one real staging path through the actual Viewer, public API, World and Presentation.

Required evidence:

1. a selected Thread has a bounded current public scene before the visitor speaks;
2. the Thread's visitor availability comes from prior voluntary accepted work;
3. the visitor enters the exact published situation;
4. one objective Encounter Story and Thread Experience are admitted;
5. compensation settles exactly once;
6. the visitor leaves;
7. a later visit reconciles and displays a different current situation for the same Thread;
8. the old encounter is not resumed as a chat session;
9. retry is idempotent;
10. Fibre `npm run slice:validate` passes, while Viewer validation remains owned by the Viewer repository.

## Natural Thread -> Thread life after N6

Natural social life remains important but is not an N6 blocker.

The preserved follow-on is:

```text
ordinary Flight Plans
  -> admitted shared World places
  -> independent LivedNow
  -> natural actor discovery
  -> salience
  -> initiate or not
  -> accept / decline / defer
  -> Encounter Story when mutual participation occurs
  -> asymmetric private consequence
  -> later relationship / life
```

Acceptance must not use Commons fallback, caller-selected counterparties, paid scheduling or sociability-biased cognition to manufacture an encounter.

The historical W0-W7 labels remain useful implementation archaeology in the N5 plan and Git history. Do not use them as the current execution roadmap.

## Non-goals

Do not build:

- a new meeting engine;
- a conversation/session store;
- a second current-life authority;
- a generic public-scene ontology;
- high-frequency simulation;
- mandatory scene-image generation;
- a general jobs marketplace;
- a new economy subsystem;
- broad relationship/society work before the public continuity proof closes.

## Implementation discipline

Build the smallest public seam that preserves the largest lived-person architecture.

Tests should prove:

- a visit observes life rather than creates it;
- meeting enters the observed scene rather than authors it;
- consequence persists through existing authorities rather than session state;
- a later visit finds later life.

Avoid tests of incidental HTTP/header/CSS/helper shape unless that detail carries the authority boundary itself.
