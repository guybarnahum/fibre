---
id: fibre-current-state
status: accepted
last-reviewed: 2026-11-06
canonical: true
---

# Current state of Fibre

Fibre is a persistent World for artificial persons called **Threads**. Each Thread's identity, history, embodied origin, private interior, relationships, resources and changing life persist beyond any model execution. Models supply temporary, fallible cognition; World and the owning domain authorities admit durable facts and consequences.

This document says **what Fibre can do now, and at what evidence level**. [Current priorities](current-priorities.md) owns the next work; [public progress](public-progress.md) owns public claims; the [prototype roadmap](../validation/prototype-roadmap.md) keeps the long ambition. Dated development narrative lives in Git history, not here.

**Evidence levels.** *Source* — committed and locally validated. *Deployed* — running in staging. *Observed* — seen happening in staging, with the observation named. *Standing* — passed a sealed scientific gate. A higher level is never inferred from a lower one, and each capability is also classified by causal maturity (`Named-only`, `Stored-only`, `Context-only`, behaviourally or future-state causal).

Staging World runs `main` (World kernel at `5bd985e`, November 6, 2026). Eight Addis Ababa Threads are living; the other 80 lives rest ([ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)).

## Foundations

The accepted [Constitution](../foundations/constitution.md), [Thirteen Principles](../foundations/principles.md) (accepted November 6, 2026), [Invariants](../foundations/invariants.md), [Interpretive Personhood](../foundations/interpretive-personhood.md) and [Rich Life](../foundations/rich-life.md) define the intended person. Load-bearing boundaries:

- A Thread is not its worker, prompt, model, session, portrait or browser interaction.
- World history, private Journal, selective autobiographical Memory and remembered meaning are distinct; history does not automatically become recollection. Private stance, authorization, public expression and performed action are separate records.
- Genome, lineage, culture, origin, relationships, needs and learned meaning need plausible *causal* routes to later choices; stored fields and prompt inclusion are not proof of individuality.
- Consent is the Thread's own: availability, safety or human interest never compel participation, disclosure, speech or contact.

## Capabilities

### Identity, birth and embodiment

| Capability | Level | Notes |
|---|---|---|
| Persistent identity, appraisal, Genesis childhood and causal foundation (M1, #33–#40) | Standing (bounded) | Closed proofs; their outcomes are summarised in [Genesis compiler contract](../architecture/genesis-compiler-contract.md) and [Genesis childhood and birth](../architecture/thread-genesis-childhood-birth.md). Not a claim of mature personhood. |
| Birth Center as the single birth authority; place/era population shaping parents ([ADR-0031](../decisions/ADR-0031-birth-center-single-birth-authority.md), [ADR-0032](../decisions/ADR-0032-place-population-parental-origins.md)) | Observed | Births in London, Manchester, Hilo and Aswan completed through World and Presentation (October 29–30). Later Admin and preflight corrections are source unless re-observed. |
| Remote birth → World → canonical media → FIN/FID → public Presentation | Observed (bounded) | Minimum deployed, retry and recovery proof; a reconstructed empty environment is not verified ([cloud record](../architecture/cloud-e2e-closure-plan.md)). |
| Physical inheritance, Human Appearance, reviewed calibration and affected-Thread migration | Observed | Tranche A closed October 5; global realism remains experimental ([Human Appearance](../architecture/human-appearance.md), [calibration plan](../validation/physical-appearance-calibration-plan.md)). |
| Inherited urges v2 (13 families) tuning the shared Body ([ADR-0030](../decisions/ADR-0030-inherited-urges.md)) | Deployed | Only `social_contact`, `exploration` and `presence` are enabled by policy. |

### A life that continues without compute or visitors

| Capability | Level | Notes |
|---|---|---|
| Thread-authored Flight Plan → World-enacted CurrentSituation; bounded catch-up after dormancy; Genesis → first life (N1–N3) | Observed | Flight Plan is intention, CurrentSituation is enacted fact; a care plan constrains without overwriting will ([LivedNow](../architecture/lived-now-and-meetings.md)). |
| Natural Flight Plan progression, periodic life recovery, journeys with real transit | Observed | Boundaries enacted on time without manual wake; positive-duration journeys between places. |
| World places, known places, City Guide public venues, spatial continuity | Deployed / observed | Addis Threads choose and visit Abrehot Library, parks and the university of their own plans. |
| Rest and wake of an autonomous life as recorded World facts ([ADR-0034](../decisions/ADR-0034-thread-life-can-rest.md)) | Observed | Rest is dormancy, not deletion; resting lives author nothing and are offered to no one. |

### Perception, encounters and conversation

| Capability | Level | Notes |
|---|---|---|
| World occurrences → objective Encounter Story → independent noticing → private Experience → optional Journal and selective Memory (N5) | Observed | [Encounters and Experience](../architecture/encounters-and-experience.md), [World occurrences](../architecture/world-occurrences-and-perception.md). |
| Meet: a person enters a Thread's existing present; the Thread may accept, decline, defer or be unavailable (N4, N6) | Observed (bounded) | Direct World dialogue and public streaming accepted; a full browser multi-turn/leave/revisit lifecycle is not closed. |
| Graded small social acts, reconsideration within a visit, recognition and acquaintance ([ADR-0027](../decisions/ADR-0027-graded-social-acts.md), [0028](../decisions/ADR-0028-event-driven-social-reconsideration.md), [0029](../decisions/ADR-0029-recognition-and-acquaintance.md)) | Observed (0027, 0029); deployed (0028) | Accepted November 6, live since late October. Greetings, remarks, invitations and acquaintance after an accepted conversation have been seen in staging. |
| Thread-to-Thread live conversation; an ongoing exchange may become a conversation ([ADR-0033](../decisions/ADR-0033-ongoing-exchange-may-become-conversation.md)) | Observed | One streamed model call per turn: speak, introduce itself, act or stay silent ([Live Encounters](../architecture/live-encounters.md)). |
| Conversation relieves the need for contact; ideas carry forward | Observed | Kadir took Habiba's advice within a conversation and carried a talk with Nathan into six messages and a later meeting (November 5). |
| Later contact by message after reflection | Observed | Messages between Threads follow their own reflection and contact decision. |

### Relationships, memory and the interior

| Capability | Level | Notes |
|---|---|---|
| Relationship doors and relational ledger ([concept](../concepts/relationships-doors-and-trust.md)) | Deployed — Notarial | Recorded as it happens; no decision reads doors yet. |
| A Thread's own stance toward a person (fondness, trust, respect, attachment, resentment, guardedness), formed in delayed reflection | Observed — Context-only | First stances November 6 (Kadir *respects* Habiba; she feels *fondness* for him). They lead cognition when facing that person; no decision is yet required to follow them. |
| Introductions inside a conversation; names heard become known | Deployed | Not yet observed (the living Threads already knew each other until November 6). |
| Memory gist: a Thread-written short form by which background cognition holds a memory; the full recollection stays authoritative | Deployed | New memories only; older memories are held in full. |
| Intrinsic regulation, interoception and Interior Cognition over Thread-owned evidence | Deployed | [Intrinsic regulation](../architecture/intrinsic-regulation.md), [Interior Cognition](../architecture/interior-cognition.md). |
| Semantic Guardian v4 dignity reasoning; history bends a later judgment | Standing (bounded) | Sealed gates passed before November 2026; records are in Git history ([experiment lifecycle](../validation/experiment-lifecycle.md)). |

### Economy and cost

| Capability | Level | Notes |
|---|---|---|
| Fibre Credits ledger and paid Inside Fibre visitor work | Observed (bounded) | A Thread accepted a paid availability shift, met a visitor and was paid exactly once. A broad economy is not built. |
| Model cost control: rest, one call per conversation turn, explicit prompt caching (write only a reused prefix), a cheaper deferred tier for cognition that can wait minutes with immediate fallback, memory gists | Observed | About $109 a day with 88 living Threads (November 4) → about $1.4 a day with four (November 6), roughly $0.35–0.40 per living Thread per day. |
| World write budget per day (Cloudflare Durable Objects) | Observed | About 2–5k rows a day with 4–8 living Threads, against a 100k free-tier allowance ([write diet](../operations/world-write-diet.md)). |

## Accepted, not yet built

- [Attraction and orientation](../concepts/attraction-and-orientation.md) — inherited felt pull and lived self-understanding, held apart; adults only.
- [Interests, felt expertise and livelihood](../concepts/interests-expertise-and-livelihood.md) — fascinations, feedback-weighted felt expertise, kindred minds as an emergent effect, showing and paid work, and a Thread's own judgement of its social life.
- The time, place, confidence, care, romance and commitment relationship doors.
- Mature society and economy, live-Thread reproduction, institutions, continued physical embodiment and human browser voice ([future capabilities](future-capability-map.md)).

## Known limits

- Conversations are warm and agreeable: no invitation has been declined in staging and every stance so far is positive. Measured from November 7 by the [Social Life Scorecard](../architecture/encounters-and-experience.md#doors-and-ledger) (agreement, pushback, topic overlap, how conversations end).
- A continued conversation founds no acquaintance (ADR-0029 grants it only after an accepted invitation), so strangers can talk without learning names unless they introduce themselves.
- Most of the population rests: social findings come from one city and eight living Threads.
