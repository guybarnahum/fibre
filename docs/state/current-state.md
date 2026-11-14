---
id: fibre-current-state
status: accepted
last-reviewed: 2026-11-09
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
| Inherited urges v2 (13 families) tuning the shared Body ([ADR-0030](../decisions/ADR-0030-inherited-urges.md)) | Deployed | `social_contact`, `exploration`, `presence` and (from S2) `social_energy` are enabled by policy. |
| The social Body: library v4 adds `social_energy` and `trust`; late expression gives every Thread the loci of families it never expressed, from its own genome ([ADR-0036](../decisions/ADR-0036-social-body.md)) | Deployed | All 88 non-retired staging Threads expressed their missing loci on November 9. |
| The social battery and familiarity in conversation and messages; `PAUSE:` and lulls; guard at 24 (ADR-0036 S2) | Observed | November 10: messages fell from 55 a day to one; contact decisions cite the felt body; conversations end on their own, often with a pause. Trust (S3) is still a species baseline. |
| Trust per person, felt by the Body (ADR-0036 S3) | Deployed | Lived contact and kept faith raise it, broken faith lowers it; trusted friends drain the battery far less; wariness is felt toward strangers and toward anyone who let the Thread down. The stance remains the Thread's own. |
| Curiosity toward the unfamiliar (ADR-0036 S5a) | Deployed | A hardly-known person draws a Body inherited to seek new people, in the glance, in choosing whom to approach and in talk. The eight living Threads know each other well, so it matters most for newcomers and visitors. |
| Knowing and being current; wounds and how they heal (ADR-0036 R1) | Deployed | Knowing barely fades, being up to date does; trust no longer fades with absence; a harm leaves a wound by severity, closeness and repetition that heals by time at the inherited pace and by later kept faith, except a serious harm's scar; a new harm brings back old ones. No harms have happened among the eight living Threads yet, so wounds are shown by tests until one does. |
| Bond, longing and reunion (ADR-0036 R2) | Deployed | A person comes to matter from knowing, trust and open doors; apart, the Body misses them by its inherited attachment; seeing them again is felt in proportion to the missing. A stranger is never missed. |
| Perceived regard, recorded in reflection (ADR-0037 C2) | Deployed — Stored-only | Each Thread's consolidation may record who credited, corrected, talked over or gave way to whom, as it perceived it. Nothing reads it yet; one staging morning is read before the Body's felt status uses it. |
| Library v5: `standing` (with `selfRegard`), `provocation` and `remorse` ([ADR-0037](../decisions/ADR-0037-status-and-conflict.md) C1) | Deployed | All 88 staging Threads expressed the three loci on November 10. |
| Felt status, self-status, slights and recognition (ADR-0037 C3) | Deployed | Where each person stands with the Thread, from the regard it perceived (the same act by the same person within a day counts once); calm or frustration with its place, leaned by its inherited self-regard; a sting at a public correction or exclusion; private slights hurt and build trust, public ones break it. Deployed November 12. |
| Weariness of the same (ADR-0036 S5b) | Deployed | World states when an exchange repeats recent ones; the Thread reads how each exchange holds it, with its interests in view; its Body accumulates those readings at its inherited pace into a pull toward something new. Deployed November 12. |
| Presence: going over, being among people, messages that ease (ADR-0036) | Deployed | A Thread with something on its mind can go over to someone it has seen in the same place instead of writing (no door needed, at most three times a person per visit), carrying the thought into the ordinary approach. Time among people and each message ease the need for company by what the Body inherited to want. |
| Two signals of standing; slights from asserting it (ADR-0037 C3b, library v6) | Deployed | Each Thread holds how it is treated apart from where it holds it stands, which the world revises only as far as its inherited stubbornness lets it; it reads, turn by turn, how the other's words treated it, ordinary regard included, and may act on its standing. Slights come from the mismatch. Deployed November 13; all 88 staging Threads completed their stubbornness. |
| Body levels: a baseline, and spikes that fade back to it ([ADR-0038](../decisions/ADR-0038-body-levels.md) B1) | Deployed | One pure component computes Body states; weariness, the battery, knowing and being current, treated place and wound healing run on it unchanged. An admin Body panel shows a Thread's social Body over the last day and its inherited urges, derived on demand from World records with nothing stored. |
| Frustration as a Body level; stings that fade (ADR-0038 B2) | Built | Its baseline is the self-view gap a Thread will not reconcile; slights and turned-down approaches spike it, recognition eases it, and it fades back at the inherited standing persistence. It costs patience with anyone (every turn tires more) and is felt in words. Stings and recognition fade by the same persistence instead of lasting one day. |

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
| A glance on arrival over the people present and the books on a library's display; meeting and reading a real public-domain book from where one left off ([ADR-0035](../decisions/ADR-0035-glance-and-books-at-places.md)) | Built | Books come from Project Gutenberg; reading is observed on staging since November 10. Returning to a book (in the glance and in plans) and a book in hand seen by others are built (November 10). The first display is English public-domain only, a named limitation. |

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
| Model cost control: rest, one call per conversation turn, explicit prompt caching (write only a reused prefix), a cheaper deferred tier for cognition that can wait minutes with immediate fallback, memory gists | Observed | About $109 a day with 88 living Threads (November 4, billed) → about $2.1 a day with four to eight (November 6, at list prices), roughly $0.45–0.50 per living Thread per day. |
| World write budget per day (Cloudflare Durable Objects) | Observed | About 2–5k rows a day with 4–8 living Threads, against a 100k free-tier allowance ([write diet](../operations/world-write-diet.md)). |

## Accepted, not yet built

- [Attraction and orientation](../concepts/attraction-and-orientation.md) — inherited felt pull and lived self-understanding, held apart; adults only.
- [Interests, felt expertise and livelihood](../concepts/interests-expertise-and-livelihood.md) — fascinations, feedback-weighted felt expertise, kindred minds as an emergent effect, showing and paid work, and a Thread's own judgement of its social life.
- The time, place, confidence, care, romance and commitment relationship doors.
- Mature society and economy, live-Thread reproduction, institutions, continued physical embodiment and human browser voice ([future capabilities](future-capability-map.md)).

## Known limits

- Conversations are warm and agreeable: no invitation has been declined in staging and every stance so far is positive. Measured from November 7 by the [Social Life Scorecard](../architecture/social-life.md#8-measuring-social-life) (agreement, pushback, topic overlap, how conversations end).
- A continued conversation founds no acquaintance (ADR-0029 grants it only after an accepted invitation), so strangers can talk without learning names unless they introduce themselves.
- Most of the population rests: social findings come from one city and eight living Threads.
