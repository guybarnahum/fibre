---
id: adr-0029-recognition-and-acquaintance
status: proposed
last-reviewed: 2026-10-23
canonical: false
---

# ADR-0029 — Recognition and acquaintance through lived encounters

**Proposed owner decision:** A Thread can recognize someone from its own
noticed encounters, learn a name through an audible self-introduction,
and acquire a factual acquaintance after an actual consented conversation.
None of these facts creates friendship, affection, trust, or a duty to speak.

## Authority and consequences

**Recognition** is a bounded indexed read of the observing person's own
`noticed` Encounter Stories containing both people (up to 12 episodes,
count explicitly bounded). Up to two meaning-bearing first-person Experience
texts and attested past place names enter Situated Percept. Unnoticed
co-presence contributes nothing. `recognized_person` earns salience
(behaviourally causal for consideration), never forced speech. The
six-hour immediate-events window remains distinct.

**Introductions** require a voluntarily selected
`introducesSelf: true` on a spoken `greet`, `remark` or
`invite_conversation`. The actual expression must contain the speaker's
own canonical name. World admits `disclosesSpeakerName: true` only on
the corresponding utterance beat. Name knowledge requires an existing
life relation, an accepted spoken conversation or the observer's own
`noticed` attention to that admitted introduction. Neither unobserved
speech nor another participant's private awareness teaches names.
No prose parsing, global name revelation, or new model call.

**Acquaintance** is recorded by World only after a consented live
conversation has been admitted to an Encounter Story. Both directions
receive one stable `social_contact` relation via the existing
`recordLifeRelation`: `world_recorded` provenance, no genetic
contribution, factual place/date, conversation count and last met,
with participant-owned Story and accepted-interaction source refs.
Later conversations revise rather than duplicate it. Replay of the same
Story is idempotent. A nod, remark, decline, deferral or an unfinished
conversation does not create this relation. Subjective impressions remain
in each participant's own Experience, Memory and semantic life.

**Person-focused retrieval** is Fibre-owned. Social initiation and
response set `focusPartyId` from the actually perceived counterpart.
That person's existing relations come first within the six-relationship
budget. Within four Memories, those linked to that person's actual
Story via `Memory.eventRefs → own Experience ID → Story presence`
come first. An indexed read considers up to 64 shared Experience refs.
All other evidence follows existing default ordering. The caller and
model cannot author the private retrieval shortlist. This is context-only
until later autonomous behavior demonstrates a difference.

**Later contact** is now a possible consequence, not an automatic one:
`social_contact` already participates in
`CONTACTABLE_RELATION_KINDS`, but the existing contact process still
requires completed consolidation with afterthoughts, a contactable route
and the Thread's own later decision. Default batch bound is four, with
a configurable upper limit of sixteen. No social tick or new scheduler.

## Fidelity, ambition and open paths

This is a persistent World-history and individual-attention mechanism,
not a persona/workflow imitation. World records only exterior facts;
private interpretation and later behavior belong to each Thread.
Genuine friendship, trust, romantic interest, nickname introductions,
visual recognition without a noticed encounter, broader social needs,
and proven Memory-driven autonomous divergence remain **deferred**, not
rejected. Their extension paths remain the existing Story → Experience →
Memory → perception, social deliberation and situated-life revisions.
Existing consent, graded acts, Body drives, reconsideration caps and
human visitors stay unchanged. Bounds (12 noticed episodes, two
Experience texts, 64 linked Experience refs) are computational and
reversible, not limits on lifespan or personhood. No permanent
conceptual constraint is added.

**Causal status:** recognition is causally connected to salience;
introductions to name knowledge; acquaintance to persistent relation
retrieval and possible later contact. Person-focused Memory retrieval
changes cognition context only. Tests with fixture model outcomes can
verify the wiring and individual attribution but cannot prove
autonomous friendship, increased sociability or a changed chosen act.
Source-only until local validation and later staging acceptance; proposed
for owner review.
