---
id: adr-0033-ongoing-exchange-conversation
status: accepted
last-reviewed: 2026-11-03
canonical: true
---

# ADR-0033 — An ongoing exchange may become a conversation

**Accepted by Guy November 3, 2026; deployed to staging at `2ef5d24`. Actual Thread-chosen continuation in staging remains unobserved.** A Thread already speaking back and forth
with another may *choose* to continue as a live conversation. Replying is
never inferred consent. The reciprocal exchange is an observable opportunity,
not a relationship, obligation, or prescribed social trajectory.

## Decision

An observed `social_act` opportunity can offer
`continue_conversation` alongside `none`, `acknowledge`, `greet`, `remark`
and `invite_conversation` **only** when its source is a noticed spoken
small act from the counterpart, and World history proves the choosing Thread
has itself spoken to this same person earlier during the current uninterrupted,
co-present venue visit. An arrival, gesture, initial remark without reciprocal
speech, unobserved act, or speech from a previous visit cannot qualify.
A spoken small-act beat retains its existing narrated `text` as observable
history and a separate `spokenText` containing exactly the words spoken.
Only beats with this independently recorded spoken text qualify for
continuation; older stories lacking it stay intact but cannot authorize
a live request. No quotation parsing or retrospective reconstruction.
The bounded historical Story read supplies these actual earlier words and
source references; it does not create a new memory or social-relation fact.

Interior Cognition authors the choice and the words this Thread says now.
Framing treats a brief reply, continuation, or no reply as equally legitimate.
No motive list or prediction of reciprocal interest is offered. In all other
situations the existing social repertoire, salience, and decisions are unchanged.

When this Thread chooses to continue, its decision to speak and continue is
its own affirmative participation stance. The other person's last **actually
spoken** words seed the live request, attributed to that person; the choosing
Thread's actual expression seeds its accepted reply. The existing
`runThreadLiveSocialEncounter` controls subsequent voluntary contributions.
`silent` contributes nothing at the present opportunity; it is not
permanent withdrawal from all future speaking opportunities. If no one
speaks again, the encounter ends quiescent. No separate invitation-response
cognition or extra social scheduler is introduced. A counterpart is not
committed to speaking again merely because they spoke earlier. Scene-change
checks and the existing bounded opportunity budget remain.

World admits **one** new conversation Story, bearing the source references of
the prior one-shot spoken Stories without modifying any of them. Both
participants receive one independent first-person Experience over the completed
Story and one pending consolidation each, following the accepted live encounter
path. The new conversation does not emit one-shot reply opportunities for every
live turn. A continuous exchange alone does **not** call
`recordWorldAcquaintance`: ADR-0029's factual `social_contact` relation
still requires an explicitly accepted invitation and recorded spoken meeting.
Name disclosure remains limited to words actually spoken.

## Vision guard and limits

The decision preserves autonomous brevity and silence as real options.
Cognitive authorship is the Thread's own existing social-initiation decision,
not a caller-forged consent artifact; fixture responses test the causal wiring
but do not prove that a production Thread prefers longer conversations.
Salience, current plans, developed-self context, bounded autobiographical
memories, and intrinsic drives remain the same private inputs. World-owned
shared history is not a proxy for private enthusiasm.

**Causal status:** actual reciprocal utterances enable a new choice; the
Thread's selected act causes either a separate small Story, silence, or a
live Story with voluntary later turns. The Story and two Experiences are
behaviorally causal as lived records. No claim is made of attachment,
friendship, increased sociability, trust, or a change in acquaintance.

**Deferred:** multi-party conversation, conversational relationship growth
without an accepted invitation, autonomous proof of identity/history-driven
preference between brevity and continuation, and Body consequences beyond the
social-contact relief in the amendment below.
The existing Story → Experience → Memory, social deliberation and
relationship-authority paths remain open. There is no new permanent
constraint, new table, poller, background model task, or compatibility layer.

The local comparison `FIBRE-WORLD-WRITE-MAP` measures four individual
small-act utterances versus two prior utterances followed by a single live
conversation. The staging estimate of 45–50 weighted rows per remark and
35–55 for a single live Story is **calibration only**, not a local result.
Guy accepted this ADR on November 3, 2026, and deployed `2ef5d24` to staging; direct staging evidence of an actual voluntarily continued exchange remains pending.

## Amendment — conversation as lived contact (accepted by Guy November 4, 2026)

A Story in which this Thread itself spoke **and** another participant spoke is
lived reciprocal contact for the Body's existing `social_contact` drive,
whether the conversation began by accepted invitation or by this ADR's
continuation. The Story reference becomes the drive's contact evidence. A
one-shot small act holds a single speaker and still does not qualify
(ADR-0027's deferral of greeting satisfaction stands); a Thread that stayed
silent throughout does not qualify. The read is bounded to the drive's
observed window and the newest qualifying Story. No acquaintance, regard or
relationship fact follows from it. **Causal status:** a lived conversation now
changes later Body pressure, and through it salience and Flight Planning.
