---
id: validation-n6-public-lived-encounter-slices
status: accepted
last-reviewed: 2026-10-05
canonical: true
---

# N6 — Rich Public Lived Encounter

N6 proves a simple public Fibre truth:

> **You do not summon a Thread into a meeting. You find them living, approach them where they already are, and they decide what happens next.**

The scene comes from the Thread's ordinary life:

```text
Thread-owned Flight Plan
  -> World-enacted CurrentSituation
       at a place
       or in transit between places
  -> bounded public present
  -> visitor observes that life
  -> visitor approaches
  -> Thread appraises whether to engage from that lived context
```

A meeting is one voluntary social event inside continuing life. It does not create the scene, rewrite the Flight Plan, establish a special visitor shift, or trap the Thread in a browser session.

N5 already proved the general Encounter Story -> Thread Experience -> selective aftermath machinery. N6 reuses that authority after the Thread actually chooses to engage.

## Current boundary

Already accepted and reusable:

- continuous World-owned LivedNow across bounded dormancy;
- Thread-authored rolling Flight Plans;
- World-owned CurrentSituation at a physical place or in transit;
- public current-present projection;
- N6.1 public visit: `GET /api/threads/:threadId/present`;
- N6.2 Viewer scene-first presentation;
- Interior Cognition as the reusable private person-level deliberation seam;
- social `accept | decline | defer` cognition grounded in current life;
- situation-bound lived encounter response;
- Encounter Story -> Thread Experience -> journal/memory consequence;
- canonical public identity/embodiment and optional scene media.

Accepted but **not a prerequisite for ordinary N6 meeting**:

- bounded paid Inside Fibre visitor-work commitments;
- visitor-work-mediated presence;
- Fibre Credit work compensation.

Those remain separate work/economy capabilities. N6.3 does not schedule or pay a Thread merely so a visitor can approach them.

Not yet accepted:

- a public visitor request appraised by the Thread from the ordinary displayed scene;
- accepted/declined/deferred public participation over that exact lived context;
- later public continuity after an accepted encounter.

The Viewer remains projection-only. World owns LivedNow and participation; Presentation owns the bounded public API; Viewer owns display and interaction.

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

## N6.1 — visit a current life — ACCEPTED IN STAGING 2026-10-05

**Capability:** a public visitor can observe a selected public Thread's current bounded life without requesting a meeting.

Implemented shape:

- `GET /api/threads/:threadId/present` is public/read-only;
- Thread Presentation first confirms the selected Thread is already publicly visible;
- Presentation then asks World `/internal/lived-now/ensure` for server-time now;
- World reconciles and publishes the bounded current present through the existing authority;
- the public response contains only `currentPresent.payload`;
- query parameters are rejected, so callers cannot choose `at`, place, activity, participants or another scene fact;
- no visitor-work availability, meeting request, Encounter Story, cognition or compensation is created by the visit.



The smallest seam is:

```text
public visit
  -> selected public Thread
  -> World ensure LivedNow(now)
  -> Presentation publishes bounded current present
  -> public response
```

This is deliberately distinct from a meeting request:

```text
public visit
  -> observe ordinary current life

visitor request
  -> Thread participation cognition
  -> accept | decline | defer
  -> accepted encounter only
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

Staging acceptance evidence on 2026-10-05:

- public Thread `thr_23cea3246a752a403adabda88a7c89d47f5a59c9` returned HTTP 200 from `GET /api/threads/:threadId/present`;
- request latency was 3.66s;
- World established a fresh present at `2026-10-05T18:28:38.788Z`;
- the response carried authoritative `situationId=sit_120fe471ff5c14a041cb3708aa90f04b079dd1e22158149f83c41e809378ead8`;
- the bounded public present exposed phase, activity, participants and depiction media without visitor-work, encounter or compensation payload;
- `phase=at_place` with `location.place=null` is retained as truthful bounded public projection rather than filled from private World state or Viewer inference.

The local semantic test separately proves caller-authored query parameters are rejected before World reconciliation.

## N6.2 — enter the moment — ACCEPTED IN STAGING 2026-10-05

**Capability:** insidefibre.com presents the current life as a lived moment rather than a chatbot shell.

Implemented in the separate `guybarnahum/insidefibre.com` Viewer repository:

- opening `/meet` now performs `GET /api/threads/:threadId/present` before loading the public snapshot/events;
- initial page entry does **not** call `POST /meet` and does not render encounter input;
- the current public present, not visitor-work `livedScene`, drives the primary scene;
- current activity, phase, bounded place/transit, participants, scene age and existing depiction media are rendered from Fibre public authority only;
- `location.place=null` renders as an unnamed current place rather than being inferred from home, identity or other context;
- identity/history remain secondary below the current scene;
- a small `loadMeetPageVisit` boundary has a semantic test proving page entry can only use the visit capability;
- the Viewer cross-repo contract now consumes Fibre's real public current-life API shape before replaying Presentation.

Explicit meeting entry is intentionally deferred to N6.3. N6.2 does not add a Viewer-side meeting/session authority.

Staging acceptance evidence on 2026-10-05:

- Viewer test suite passed, including the semantic page-entry boundary and Fibre cross-repo contract;
- staging build and Cloudflare validation passed;
- staging Viewer deployment succeeded;
- opening `/meet` presented the current lived moment before identity/history detail;
- page entry did not start a meeting and did not render encounter input;
- missing public place detail remained unnamed rather than inferred;
- current scene media remained optional rather than a prerequisite for current life;
- Fibre and Viewer stayed on separate authority boundaries: World owns LivedNow, Presentation owns bounded public projection, Viewer owns rendering only.





Use existing public authority first:

- public identity and canonical embodiment;
- exact `situationId`;
- place or transit;
- current activity;
- appropriate public participants/context;
- existing scene media when available;

Do not expose private Flight Plan details, private memory, semantic state, cognition reasons or operator evidence.

Do not invent mood, intention or scene narration merely to enrich presentation. Add a new public projection field only when the Viewer prototype demonstrates a concrete missing lived fact.

Scene imagery is optional. Slow or absent generation must not make current life unavailable.

**Acceptance:** what the Visitor sees corresponds to the exact published present and contains no Viewer-authored life facts.

## N6.3 — meet the Thread where they are — CURRENT

**Capability:** the visitor approaches a Thread in the ordinary scene her Flight Plan already produced, and the Thread decides whether to engage from that lived context.

Canonical causal path:

```text
ordinary Flight Plan
  -> World CurrentSituation
  -> GET /present
  -> Viewer shows bounded current life
  -> visitor chooses Meet locally
  -> visitor sends first utterance/request
  -> World validates that ordinary scene still applies
  -> Thread participation cognition
       -> accept
       -> decline
       -> defer
  -> only accepted participation becomes a lived visitor encounter
```

There is no special meeting scene and no public meeting-session authority.

### N6.3a — remove obsolete public meeting admission semantics — IMPLEMENTING

Keep:

- scene-first public visit from N6.1;
- scene-first Viewer from N6.2;
- exact displayed `situationId` as the visitor's scene witness;
- explicit Viewer action before the composer becomes available;
- removal of pre-scene `GET /api/threads/meet` candidate selection.

Remove from the ordinary public meeting path:

- public `POST /api/threads/:threadId/meet`;
- Viewer `loadMeetingThread()`;
- public `livedScene` visitor-work projection;
- visitor-work availability as a prerequisite for meeting;
- work commitment / Fibre Credit settlement as the meaning of ordinary meeting.

The Meet button becomes **local Viewer state only**: it reveals the approach/composer UI but performs no World mutation and runs no cognition.

Do not delete the separate accepted Inside Fibre work/economy capability merely because N6 no longer uses it for ordinary meeting.

**N6.3a acceptance:** opening the page or clicking Meet cannot call a public meeting-admission endpoint. The only authoritative scene remains the ordinary public `currentPresent`.

### N6.3b — validate that the displayed lived segment still applies

The visitor supplies the `situationId` they saw.

World must not blindly re-author a new situation merely because the visitor clicked or spoke. Validate whether the displayed ordinary Flight Plan segment still governs the present:

For `at_place`:

- same governing personal plan / same planned stop;
- same physical place;
- same activity;
- same mediated context, if any;
- same planned participants relevant to the public scene.

For `in_transit`:

- same governing plan / same transit leg;
- same from -> to;
- same activity/context;
- transit progress may naturally advance.

If the life has moved to a different segment, return `409 encounter_scene_changed`. No retry loop and no frozen old scene; Viewer refreshes `GET /present`.

### N6.3c — reuse Interior Cognition for visitor participation

A visitor's first utterance is the concrete social request.

Reuse the existing social-response cognition semantics:

```text
current ordinary situation
+ remaining Flight Plan
+ current needs / feelings / unresolved intentions
+ bounded developed-self evidence
+ relevant relationship/history when real
  -> accept | decline | defer
```

The visitor does not become a fake Thread and does not supply private context.

Private reason/evidence remains private. Public output may include only an appropriate outward expression and, for defer, an explicitly suggested later time if cognition produced one.

### N6.3d — make /encounter the only public social boundary

Canonical public interaction:

```http
POST /api/threads/:threadId/encounter

{
  "situationId": "...",
  "utterance": "Hi — do you have a minute?"
}
```

World sequence:

```text
validate displayed ordinary scene
  -> participation cognition
  -> decline/defer: public expression only, no Encounter Story
  -> accept: run ordinary lived encounter response
```

Public outcomes:

- `accepted`;
- `declined`;
- `deferred`;
- `409 encounter_scene_changed`.

Do not expose private cognition, Flight Plan internals, memory IDs, needs/feelings or evidence refs.

### N6.3e — accepted conversation stays inside ordinary life

Only after `accept` should the existing lived-encounter response machinery run.

Accepted flow:

```text
visitor utterance
  -> accepted participation
  -> Thread response grounded in the same ordinary CurrentSituation
  -> Encounter Story
  -> Thread Experience
```

There is no conversation/session store. Each later visitor turn remains situation-bound. If life moves, the interaction ends and the Viewer returns to the Thread's new present.

### N6.3 high-value tests

Keep the suite small:

1. **ordinary life is not rearranged** — visitor request cannot change place/activity/Flight Plan;
2. **Thread retains agency** — decline/defer creates no accepted Encounter Story;
3. **accepted visitor meets existing life** — accepted encounter cites the displayed ordinary situation;
4. **life moved** — stale scene returns `encounter_scene_changed` with zero participation/encounter work;
5. **Viewer authority** — opening the page and clicking Meet perform no public mutation; only Send crosses the public social boundary.

Short failures; no DOM snapshots or transport matrix.

### N6.3 staging acceptance

Use real ordinary Thread life: studying, eating, working, relaxing, walking, traveling, or another Flight Plan activity.

A real decline/defer is valid agency evidence, not a failed system test. To close N6.3, additionally observe at least one naturally accepted visitor request without altering prompts, scheduling the Thread for the test, paying for availability, or brute-forcing acceptance.

For the accepted case prove:

- the ordinary scene existed before the visitor request;
- visitor did not create or move the scene;
- Thread chose to engage;
- response remained grounded in that scene;
- no visitor-work commitment or compensation was required;
- no session object was created.

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

**Acceptance:** retry cannot duplicate the Encounter Story or private consequence; later cognition sees only admitted retained consequence through normal authorities.

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
2. the visitor approaches that ordinary scene without scheduling or rearranging the Thread's life;
3. the Thread independently accepts, declines or defers from current life context;
4. for an accepted case, one objective Encounter Story and Thread Experience are admitted in that displayed situation;
5. the visitor leaves;
6. a later visit reconciles and displays a different current situation for the same Thread;
7. the old encounter is not resumed as a chat session;
8. retry is idempotent;
9. Fibre `npm run slice:validate` passes, while Viewer validation remains owned by the Viewer repository.

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
