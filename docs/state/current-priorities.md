---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Current priorities

[`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md) is the continuation authority.

## Active sequence

```text
A1 Lived Now authority                                  CURRENT
A2 Care plan + conflicting wills                       NEXT
A3 Current-life projection + Thread Editor             NEXT
A4 Public present + insidefibre.com scene              NEXT
A5 Situated encounter                                  NEXT
B1 Encounter -> selective experience                   NEXT
B2 Life continues + second meeting                     TRUE-E2E CLOSURE
C1 Aging/mobility/developmental generalization         AFTER FIRST LOOP
```

The product goal is one Thread who is already living before the visitor arrives.

## A1 now

Implement the smallest authoritative chain:

```text
developmental context
  -> Thread-authored personal flight plan
  -> World-enacted current situation
```

The current situation must answer where the Thread actually is, what they are doing, why, with whom, and which plan led there. It exists and survives restart before Thread Editor, Presentation or insidefibre.com reads it.

Reuse existing situated-life/place authority. Do not add a second location system or generic scheduler.

Model physical presence separately from mediated/virtual experience so a Thread can later visit a real place online without recording false physical travel.

## UI path

Thread Editor and insidefibre.com are two views of the same life:

```text
World / Thread authorities
       |
current-life semantic projection
       |---------------------------|
authorized operator view      public Presentation
       |                           |
Thread Editor              insidefibre.com /meet
```

Thread Editor should expose the causal chain and provenance. insidefibre.com should expose the human encounter: current scene, activity/context and a natural entry to conversation.

Neither UI owns life state.

## Child/caregiver proof

A2 should add one care-plan conflict without creating a child-specific runtime:

```text
child's plan       caregiver's care plan
       \             /
        World resolution
              |
       enacted situation
```

The caregiver may legitimately constrain the enacted day while the child's intention remains intact and attributable. Negotiation can become shared history; private meaning remains participant-specific.

## Stop rules

- No broad planning framework before A1 works.
- No childcare policy engine before one real care conflict works.
- No public chat abstraction before the situated encounter works.
- No transcript-as-memory shortcut.
- No new place, identity, relationship or memory authority for UI convenience.
- No broad aging/travel simulator before B2 closes true E2E.
- Keep tests focused on semantic invariants and demonstrated regressions.

## Existing foundations to reuse

- rich Genesis childhood and autobiographical prior life;
- SituatedLifeStore and existing World place authority;
- identity-context selection/cognition boundary;
- canonical visual identity + reference-conditioned media;
- Thread Directory/Meet;
- Thread Presentation public snapshots/events/assets;
- existing request-participation/runtime cognition;
- Thread Editor Directory and inspection surface;
- separate `guybarnahum/insidefibre.com` React/Vite Viewer.

## Branch

Implementation should begin from current `main` on `agent/m2-lived-encounter`. Planning identifiers are Fibre milestones, not GitHub PR numbers.
