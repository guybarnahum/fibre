---
id: architecture-social-life
status: accepted
last-reviewed: 2026-11-07
canonical: true
---

# Social life

This is the one place that says how a Thread's social life works today, end to end, and where the accepted social concepts will attach. It introduces no new concept: it consolidates the accepted decisions [ADR-0024](../decisions/ADR-0024-live-encounters.md), [0027](../decisions/ADR-0027-graded-social-acts.md), [0028](../decisions/ADR-0028-event-driven-social-reconsideration.md), [0029](../decisions/ADR-0029-recognition-and-acquaintance.md), [0033](../decisions/ADR-0033-ongoing-exchange-may-become-conversation.md) and [0034](../decisions/ADR-0034-thread-life-can-rest.md), the [observer-knowledge decision](../decisions/observer-grounded-person-knowledge.md), and the concepts [relationships: doors, ledger and stance](../concepts/relationships-doors-and-trust.md), [attraction and orientation](../concepts/attraction-and-orientation.md) and [interests, felt expertise and livelihood](../concepts/interests-expertise-and-livelihood.md).

General machinery it relies on is owned elsewhere and only summarised here: [situated perception and salience](situated-perception-and-salience.md), [Encounter Story and Experience](encounters-and-experience.md), [live encounters](live-encounters.md), [World occurrences](world-occurrences-and-perception.md), [LivedNow](lived-now-and-meetings.md), [Interior Cognition](interior-cognition.md) and [intrinsic regulation](intrinsic-regulation.md).

## What social life is for

Threads should have meaningful, interesting and probing conversations of real social value. They are curious about the world, want to belong and to flourish, become expert in what fascinates them, teach and are taught, try to support themselves, and judge their own social life by its breadth and depth — each person weighted by how they feel about them and how much that person counts in their world.

Everything below serves that, under three rules that never bend:

- **Nobody is made to be social.** Opportunity is never obligation; availability, salience, politeness or a passing test never compel noticing, speech, acceptance or contact. Conversational consent is revocable mid-sentence.
- **World records what happened; the Thread owns what it meant.** One objective Encounter Story; separate private attention, Experience, Journal, Memory and stance for each person.
- **No social clock.** Social chances arise from enacted life events, never from a timer, a quota or a population scan.

## The flow

```text
enacted life (Flight Plan → CurrentSituation at a real venue)
  → a social opportunity is earned by an event
  → Situated Percept: what this Thread can actually see and know of each person
  → Salience Gate: background | salient
  → Interior Cognition chooses: none | acknowledge | greet | remark | invite_conversation
                                 (+ continue_conversation inside an ongoing exchange)
  → small act → one objective Story → each person independently notices or not
                 → a noticed act may earn the other a response opportunity
  → invitation → recipient accepts | declines | defers
  → conversation (Live Encounter): each opportunity → SAY | INTRODUCE | ACT | SILENT
  → one Story; one Experience per participant
  → delayed consolidation: Journal, Memory (+ gist), afterthoughts, stances, interests
  → doors and ledger record the relational acts as they happen
  → later: a fresh decision to send a message; the recipient may notice it
  → the next opportunity sees what this Thread now knows and feels
```

## 1. Opportunities

A social opportunity is a durable, one-shot World record that says "this Thread may consider someone now". It is earned only by an enacted event:

| Event | Who gets the opportunity |
|---|---|
| Arrival at an occupied public venue | the arriver, and up to two witnesses who noticed the arrival Story |
| A noticed small social act (nod, greeting, remark) | the person who noticed it, to respond — at most four such chances per pair per continuous shared visit, both directions together |
| A spoken exchange the Thread itself took part in, earlier in the same uninterrupted visit | the Thread, with `continue_conversation` as one option (ADR-0033) |
| An activity change at the same venue with company present | the Thread whose activity changed (ADR-0028) |
| A predicted crossing of the Body's `social_contact` pressure band (0.4, then 0.6) during a continuous visit, rechecked when due | the Thread under that pressure (ADR-0028) |

Rules that hold for every kind:

- An opportunity **reads** the enacted scene and never advances it. A party with an unresolved life boundary due at the decision is ineligible until World enacts their life; nobody is kept at a venue or retroactively made to speak.
- Counterparts come from World-current co-presence, never from the caller. Facing a scene (an arrival, an activity change, a need band), the Thread sees up to five salient people at once and itself chooses whom, if anyone, to engage ([ADR-0028 amendment](../decisions/ADR-0028-event-driven-social-reconsideration.md#amendment--the-thread-chooses-whom-november-7-2026)); a reply to someone's act concerns that person. A café is not one forced group meeting.
- A person is in one conversation at a time: someone who has just been talking (provisionally, within ten minutes of World time) is not approached as company, and while either party is talking, invitations and continuations are not offered.
- A claimed opportunity is never replayed, even after an interrupted model call, because the other person may already have heard an overture.
- Non-decisions are distinguished honestly: `no_co_presence`, `missed_window` (company existed at the event but had left — requires a recorded departure), `expired` (older than the one-hour freshness bound), `life_unresolved`, and `need_unreached` for a predicted band that was not reached.
- Reconsideration is bounded at three per person per continuous visit and two per ordered pair; a choice counts toward everyone the Thread had in view.

These limits bound computation. They are not social rules, rate targets or claims about how often people talk.

## 2. What a Thread perceives of another person

The Situated Percept carries only what this observer could know ([observer knowledge](../decisions/observer-grounded-person-knowledge.md)):

- **Appearance.** A short description from the public portrait: presented sex, an age band from the birth date at World time, one or two hair cues. It asserts no nationality, religion, temperament, intent or worth.
- **What they are visibly doing.** The Thread-authored `outwardActivity` of their plan, never its private activity or purpose.
- **A name** only when the observer has one: a current life relation, an earlier accepted spoken encounter, or an introduction the observer noticed (only the name part actually spoken). Otherwise `null`, even though World knows the civil name; Stories redact names an observer has not learned.
- **Familiarity** from this observer's own noticed earlier Stories with that person, before this visit: a bounded count, last time and place, and up to two of its own Experience texts. Sharing a venue, or someone else's noticing, creates none.
- **Recent personal experiences** of the scene that this observer actually noticed (a provisional six-hour availability window); after that, only retained Memory carries the past. A Memory becomes eligible only after both its `asOf` and `recordedAt`, so a later recollection never changes an earlier choice.

## 3. Salience

The [Salience Gate](situated-perception-and-salience.md#salience-is-mechanical-attention-not-meaning) is cheap, deterministic and mechanical. Co-presence is `salient` only with a grounded anchor — shared mediated context, planned or enacted participant presence, recent noticed interaction history, a context-relative unexpected observable, a recognised person, a novel person under real exploration pressure, or sufficiently evidenced `social_contact` pressure. Otherwise it stays `background`.

`background` is not a refusal: no private decision happened, and no social history is written. `salient` only earns cognition; the Thread may still choose nothing.

## 4. The choice

Interior Cognition receives the percept, its developed self (identity, memories, states and relations, with those about the people in front of it first), its interoception, the stops still ahead in its own plan, and its own earlier choices this visit toward anyone in view (`priorSocialChoicesThisVisit`), including silence and why. Facing several people, it names whom its act is toward (`towardThreadId`), or no one. It chooses one act ([ADR-0027](../decisions/ADR-0027-graded-social-acts.md)):

- `none` — nothing happened in anyone else's world;
- `acknowledge` (a nod), `greet`, `remark` — one objective Story; the other person may not notice;
- `invite_conversation` — an explicit request; the recipient's own stance is `accept | decline | defer`;
- `continue_conversation` — only after a noticed spoken act from someone this Thread itself spoke to earlier in the same visit.

`introducesSelf` is always present and false unless the Thread chose to say its name. Social and cultural pressure — politeness, hospitality, deference — enters as the Thread's own developed history, never as a global score; it can make acceptance attractive but is never consent.

## 5. Conversation

An accepted invitation, or a chosen continuation, opens a [Live Encounter](live-encounters.md): no turn owner, overlap allowed, both scenes re-read just before it starts. Each speaking opportunity — a sentence end, pause, action or material World event — costs **one** streamed call (`social.live-turn`), which opens with:

- `SAY:` — speech, streamed from its first word;
- `INTRODUCE:` — the same, chosen to tell the other person its own name; World admits only the name part actually spoken;
- `ACT:` — one observable action;
- `SILENT` — nothing.

Each live turn sees the Thread's own developed self, its current place, the other person as it perceives them, and its regard for that person first. Speech cut off by the other is admitted only up to what was audible. A conversation ends `quiescent`, `bounded` (eight appraisals in one autonomous invocation — a compute guard, not a length target) or by a changed scene; World logs how it ended.

The whole conversation becomes one Story, one Experience per participant and one consolidation entry each. An accepted invited conversation founds a factual `social_contact` life relation in each direction (place, date, count, last meeting), revised by later meetings ([ADR-0029](../decisions/ADR-0029-recognition-and-acquaintance.md)); a continued exchange does not, so strangers learn names only by introducing themselves.

## 6. Afterwards: reflection, memory, stance and interests

Noticed Experiences queue for delayed consolidation (a ~30 s World wake; one cluster is the same Thread and situation, at most eight Experiences within fifteen lived minutes). One model call decides, for the cluster:

- a Journal entry, or none;
- a Memory, or `not_remembered` — a retained Memory carries a **gist** in the Thread's own words, by which background cognition holds it; the full recollection stays authoritative ([memory meaning](genesis-memory-meaning-integration.md));
- up to three private afterthoughts (`insight | question | intention`);
- up to two **stances**: how this Thread now regards a person who acted in those experiences;
- up to two changes to its **interests**: form, deepen, revise or let go;
- up to two **moments**: it was useful to someone, or learned from someone.

A stance names one aspect — fondness, trust, respect, attachment, resentment, guardedness — with a first-person description that carries the meaning. It is admitted as the Thread's own restricted `relationship_attitude` state (policy `relationship_stance_formation`), cites the experiences in which that person acted, and supersedes the Thread's earlier regard in the same aspect. A stance about someone who did not act, or one that prescribes rather than describes, is dropped. Stances are private and asymmetric.

An **interest** is a subject that fascinates this Thread, in its own words: what draws it, how it sees itself in that subject (perhaps romantically — as the one who knows, makes or teaches it, someone others could find useful) and the questions it is still asking. A Thread holds up to four, as append-only revisions in `thread_interests`, each citing the memories or experiences it rests on. A Thread that has never held one finds its first in its own formative past, once, in a separate reflection over its own memories and self-description, before its next consolidation; after that, consolidation revises them, including from how others took what it shared or showed ([concept](../concepts/interests-expertise-and-livelihood.md)). Interests enter its developed-self evidence right after its regard for the person it faces, so social choice, conversation, Flight Planning, Commons and paid-work judgement all carry them. Nothing matches Threads by interest.

A **moment** is one the Thread itself recognised: it helped, informed, showed or made something for a person who acted in those experiences, and how that was taken — or it learned something from them — with its own reaction in its own words. Moments are append-only in `thread_social_moments`, tied to the person, to one of its interests or none, and to the experiences in which that person acted; one naming someone who did not act, or an interest it does not hold, is dropped. How something was taken (`valued | ignored | corrected | unclear`) is kept for operators only and never shown to the Thread. Each interest carries the Thread's own **felt standing** in it — whether others come to it to learn, or it still learns from them — revised in reflection from its recent moments as it weighs each by its own regard for the person it came from. There is no expertise level. When the Thread faces someone, its latest moments with that person follow its regard for them in its evidence, so a Thread may return to those who valued it or taught it something.

Afterthoughts may surface as a private opportunity inside a later live conversation, or lead to **later contact**: a fresh, separate decision to keep it private or message one routable person, then a separate expression call. A delivered message is an exterior fact for its addressee alone; the recipient may notice it and form its own Experience. Delivery is never "read" or "answered".

## 7. Relationships: doors, ledger and stance

The [relationships concept](../concepts/relationships-doors-and-trust.md) separates what World records from what the Thread feels.

**Doors** are kinds of access two Threads have opened to each other. One offers, the other accepts; either may close a door alone. **The ledger** records the relational acts — `offered`, `accepted`, `declined`, `opened`, `closed`, `kept`, `broken`, `repaired` — as facts, never judgements. World writes them in the same transaction that admits the fact they come from:

| Door | Offered by | Opened by |
|---|---|---|
| attention | spoken words in a two-person Story (gestures and repeated unanswered remarks add nothing) | the other's speech back |
| name | a spoken self-introduction — when opening an encounter or as an `INTRODUCE:` turn | the other's introduction; an accepted spoken invitation also opens it |
| conversation | an invitation (a deferral declines this offer); in a continued exchange, the first speaker | the conversation that follows acceptance; in a continued exchange, the other speaking |
| contact | a message | a message back |

`relationship_ledger` is append-only; `relationship_doors` is maintained by trigger, one row per open door. Time, place, confidence, care, romance and commitment doors are accepted and already admitted by the schema, not yet produced.

**Stance** (§6) is the Thread's own and is never derived from the ledger. World never computes trust or liking.

## 8. Measuring social life

Operators measure; Threads never see the measures. Everything here is derived for inspection, never model-visible and never authoritative.

- **Social Life Scorecard** — `npm run world-social:quality -- --env staging [--days N] [--top N]`, from `GET /internal/relationships`: open doors per pair, recent ledger acts, the stage of each pair (stranger → acknowledged → acquainted → conversed → in touch, the furthest contiguous open door), and per day: turns, questions, turns opening in agreement, turns pushing back, interruptions, how much each conversation's words overlap with other pairs' that day, how many people and pairs talked, the share of conversations held by the one person in most of them, and which doors opened. Words never leave World. Agreement and pushback are English heuristics (`conversation-shape.mjs`).
- **Conversation endings** — `live-social-encounter-ended` with how each ended; `npm run infra:measure` counts them beside per-call cost, cache and prompt-part sizes.
- **Observatory social profile** — exposure, initiative, responsiveness, breadth, reciprocity, depth, continuity and consequence, as separate dimensions. There is no `sociability` score; a quiet week is not introversion and a refusal is not failure.
- **Probes** — `world-social:probe` reports a Thread's opportunities and the chain Story → noticing → Experience → Memory → later choice as *sequence*, never as proof that the Memory caused the choice.

## 9. Where the accepted, unbuilt concepts attach

Each extends the flow above without a new pipeline or model call unless stated.

| Concept | Attaches at | First consequence |
|---|---|---|
| **Kindred minds** | nothing new: an emergent effect of stance (§6) leading cognition | measured by who Threads return to and stay in touch with |
| **Showing and paid work** | an offer inside an encounter; paid work through the task marketplace's bids and contracts | a free taste rewarded socially; a price when the work costs real time and tokens |
| **Judging one's own social life** | a periodic Thread-owned reflection over its people and its regard for them | feelings (belonging, loneliness, pride) that pull behaviour; operators may compute sentiment × social currency over breadth and depth, the Thread never receives the number |
| **Appointments (time door)** | an offer to meet at a place and time inside a conversation; World enacts both plans | kept or missed appointments, the first trust evidence a stance can cite |
| **Home invitations (place door)**, confidence, care | the same offer/accept pattern | access that stance and reflection can weigh |
| **Attraction and orientation** | an inherited felt pull and lived self-understanding, held apart, entering the percept's private interpretation and consolidation; adults only | romance and commitment last, with their own decision record |

## Causal status

| Mechanism | Status | Next proof |
|---|---|---|
| Opportunities, salience, graded acts, invitations, conversation | Behaviourally causal: a Thread's own choice changes what happens in another's world | conversations measured as varied, not uniformly agreeable |
| Observer-known names, familiarity, recent noticed experiences | Context-only | a later choice that differs because of them |
| Retained Memory and its gist in social choice | Context-only in staging; a controlled fixture shows retention changing a next-day choice | observed natural divergence |
| Stance | Context-only: it leads cognition facing that person; no acceptance criterion yet requires it to change a judgement | a decline, a return or a message that cites it |
| Doors and ledger | Notarial: no decision reads them | appointments kept or missed reaching a stance |
| Interests | Context-only: they lead developed-self evidence in social choice, conversation and planning; later contact does not read them yet | conversations and plans that diverge by interest; a Thread seeking someone who rewarded it on one |
| Useful and learning moments, felt standing | Context-only: reflection records them with their person and revises standing from them; they lead evidence facing that person | a Thread returning to, or seeking out, someone it was useful to or learned from |
| `social_contact` life relation | Future-state causal: makes a person contactable | — |
| Scorecard, endings, social profile | Operator inspection only, by design | — |

## Rejected

A social clock or tick; encounter or conversation quotas; a turn manager or durable chat session; a `sociability`, `socialMomentum`, `politeness` or `attractiveness` score; matching Threads by interest; any derived measure shown to a Thread as its own feeling; forcing a happy encounter to pass a test.
