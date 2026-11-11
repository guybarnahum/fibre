---
id: adr-0037-status-and-conflict
status: accepted
last-reviewed: 2026-11-10
canonical: true
---

# ADR-0037 — Status, conflict and remorse in the social Body

**Accepted by Guy, November 10, 2026**, with the design, its slice plan (including perceived regard as Body evidence and `selfRegard` as an inherited position) and the thirty loci in the [review](../validation/status-and-conflict-urges-library-review.md). It builds on [ADR-0030](ADR-0030-inherited-urges.md) (inherited urges) and [ADR-0036](ADR-0036-social-body.md) (the social Body).

## Why

Social animals measure their place among others, contest it, and are slighted, proud, angry and sorry because of it. Fibre's Threads have none of this. They agree at the opening of about a third of their turns, never push back hard, and nothing in a Body registers being talked over, being sought out, or having let someone down.

Guy's direction:
- "How do we model harm or the need to do harm? Social animals fight and measure their social place in the graph."
- "A social animal has a subjective view of its status in the social graph relative to each other person. It also has a subjective view of itself. This status is the basis for feeling slighted, dignity, etc."
- Behaviour emerges from Body urges and is never coded.

## Decision

**No urge is "to harm."** Ordinary aggression is what happens when a few ordinary urges meet a threat, a rival or a depleted Body: wanting a place among others, the inherited way of answering a threat, being worn down, the sting of wounded pride, protecting someone close. It is held back by the bond, trust, the other's visible distress and remorse. Any act is the Thread's own.

**Status is the foundation.** It is a Body percept, like knowing and trust: derived from World records whenever it is needed, never stored, never shown as a number.
- **Toward a person:** where they stand relative to me, from below me to above me. It is computed from the regard this Thread perceived passing between them (who gave way, who talked over whom, whose proposal was taken up, who sought whom out, who credited or corrected whom, who left whom out), weighted by its own `standing` orientation. It is subjective: two Threads can each feel above the other.
- **Of oneself:** where I stand in general, across the people I know, weighted by how well I know each, and shifted by the inherited `selfRegard` position.
- **Expected regard:** an act from a person shows some regard; felt status sets the regard expected of them (more from one held below, more from one close).
  - A **slight** is less than expected. It triggers `standing_flare` and can feed `provocation`.
  - **Recognition** is more than expected, felt as pride and warmth.

**Perceived regard** (Guy accepted, November 10). Status counts the acts this Thread perceived, from two sources, each kept with its provenance:
- World facts: who began a conversation or sent a message, whose proposal was accepted or declined, interrupted turns, who ended a conversation, appointments kept or broken.
- The Thread's own consolidation, which may report what it took from a conversation about regard, citing the Story's beats. This is recorded as that Thread's perception, never as a fact about the other.

It ships first with nothing reading it, and one staging morning of records is read before any Body uses them. **Built November 10 (C2):** experience consolidation (prompt v5) may return up to three items, each naming the person, the act (`credited`, `overlooked`, `asked_advice`, `corrected`, `corrected_publicly`, `talked_over`, `gave_way`, `held_ground`, `left_out`), who did it, and a first-person account. They are kept in `thread_perceived_regard` with the experiences they rest on, and are visible in each consolidation's decision. Regard naming someone who did not take part is dropped. **Narrowed November 11** (prompt v6), after the first day's records applied `asked_advice` to invitations: asking advice means asking for the other's view, judgment or help on something they know; an invitation to do something together is not asking advice.

**Three new families** (library v5):
- **`standing`** (directional): a place among others.
  - Orientations: `recognition` (credited), `deference` (yielded to), `competence` (seen as able), `belonging` (an accepted place).
  - Four positions: gain, threshold and persistence as in every family, and **`selfRegard`**, which leans felt self-status above or below what the record shows. It is temperament: the same life gives one Thread confidence and another insecurity. It exists on this family only, and spread zero makes it neutral.
- **`provocation`** (directional): how the Body answers a threat.
  - Orientations: `confront`, `withdraw`, `appease`, `deflect`.
  - Its threshold falls as the battery, rest and energy run down. The bond, trust and the other's visible distress damp it toward that person.
- **`remorse`** (triggered): having done harm.
  - Trigger kinds: `broken_faith`, `harshness`, `exclusion`.
  - It is scaled by the bond and the severity, and pulls toward repair or avoidance. The act is the Thread's own.

`standing_flare` (an existing ADR-0030 family) is triggered by slights, the expected-regard gap, rather than by a rule of its own.

**Views in words.** Beside the Body's felt status, each Thread authors its own view of where each person stands, and of itself, as a new `standing` aspect of `relationship_attitude`.
- The view is formed and revised in delayed consolidation.
- It is asymmetric and fallible.
- Its words are authoritative; a coarse label exists for measurement only.
- The Body never reads a view.

**Contests.** World records the outcome of a disagreement per pair, from Stories and the participants' own consolidation. No rank, standing score or group order is stored or shown anywhere. An order among people is the overlap of their own felt status and views.

**Boundaries:**
- **Declining is a right, not wrongdoing.** A decline leaves only a trivial wound that heals fast (ADR-0036 R1), and never triggers `remorse` in the one who declined.
- **No physical harm.** World does not admit a harmful physical act until embodiment consequences and institutions exist; that needs its own decision.
- **Humans** remain under the dignity and conduct policies. Standing contests and retaliation are among Threads.

**Dignity** keeps consent, authorization and disclosure exactly as they are. Its felt side is to emerge from felt self-status and the expected-regard gap. That amends an accepted invariant (dignity-based acceptance requires the policy's high band), so it needs its own ADR, accepted before any build.

## Slices

1. C0: this record and the draft loci (docs).
2. C1: library v5 and late expression (inert). **Built November 10:** births draw all 18 families; `world-genome:express` gives every Thread the three new loci from its own genome; none of the three is enabled yet.
3. C2: perceived regard (records only, shipped alongside ADR-0036's bond and reunion). **Deployed November 10.**
4. C3: felt status, self-status, slights and recognition (`standing` and `standing_flare` enabled).
5. C4: `provocation`.
6. C5: `remorse`.
7. C6: views of status in words.
8. C7: dignity from status, after its own ADR.

The project's slice plan holds the mechanisms and tests of each slice.

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Physical aggression and injury | deferred, behind a hard boundary | embodiment consequences, institutions and their own decision record |
| Views of third parties from group talk and gossip | deferred | group conversations and the third-party slice; the same consolidation reads what was witnessed or told |
| Competition for paid work, seats and possessions | deferred | the Inside Fibre work market and World objects, as further sources of perceived regard and contests |
| Dignity from status | deferred to C7 | its own ADR amending the dignity concept |
| Grave severities of harm | deferred | the confidence, care and commitment doors (ADR-0036 R1) |

No permanent constraint.

## Evidence (as slices land)

- Mechanical library balance: [review](../validation/status-and-conflict-urges-library-review.md), checked on every family by `core/test/inherited-urges.test.mjs`.
- C1: the late-expression test gives a v3 Body exactly its five never-expressed families, rewriting nothing.
- C2: one morning of perceived-regard records read before C3.
- C3:
  - the same public correction stings from a person felt below, and not from one felt above;
  - two Bodies with the same history feel different status;
  - high and low `selfRegard` with the same record feel different self-status.
- On staging:
  - pushback at the opening of conversations;
  - slights and recognition felt per day;
  - who gives way to whom over days.
