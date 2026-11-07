---
id: adr-0028-event-driven-social-reconsideration
status: accepted
last-reviewed: 2026-11-07
canonical: true
---

# ADR-0028 — Reconsideration within a shared visit

**Accepted by Guy November 6, 2026, as built and live in staging since late October 2026.** A person may freely reconsider another person
sharing their lived space, after *their own* life changes materially.
An earlier refusal, silence or acknowledgment remains history, not a
permanent prohibition or an obligation to reciprocate. World should
not generate meetings to satisfy a quota, schedule repeated social
judgments just because a clock advanced, or create a fabricated social
need.

## Admission

A previously enacted and continuously evidenced shared public-venue visit
can earn one of two new one-shot social opportunities:

1. The person's enacted activity changes within the same physical venue.
   New plans and timestamps alone are not changes of activity.
2. The current evidence-grounded Body social-contact pressure is predicted
   to cross 0.4 or 0.6 before the next lived boundary. The predictor
   analytically inverts the existing linear social-contact drive and
   honors inherited sensitivity. It only predicts where actual World
   history already grounds the signal, and must reevaluate the signal
   at the predicted instant.

A trigger is **behaviourally causal** for opportunity creation, but not
for any Thread response. World rechecks co-presence, the exact Body
signal, consent and freshness without advancing anyone's life or
retroactively inventing a visit. Salience still decides whether to
spend an initiation cognition call. The Thread still chooses among
`none`, `acknowledge`, `greet`, `remark` and
`invite_conversation`; an invitation retains independent consent.

Completed prior choices of the same Thread toward the same person
during the continuous shared visit become a bounded private input to
cognition. `priorSocialChoicesThisVisit` includes the earlier act or
silence, outward expression, time and the person's own reported reason.
This is **context-only** until a differential live decision establishes
a change in behavior; it does not mechanically alter a drive or infer a
relationship.

## Amendment — the Thread chooses whom (November 7, 2026)

**Chosen by Guy November 7, 2026, from staging evidence.** With eight Threads in one library, World picked the single person each Thread could consider — whoever arrived first or appeared in a recent Story — so every choice was "Kadir or nothing" or "Hassan or nothing", and thirteen pairs of strangers spent hours together without one being considered. That made attention **Exogenous** and contradicted [situated perception](../architecture/situated-perception-and-salience.md#a-scene-yields-independent-actor-opportunities) ("Fibre must not arbitrarily choose the first person in the room").

- An arrival, activity change or social-need band now offers the **people present** (up to five, each salient on its own) to one ordinary initiation decision. The Thread names whom it engages (`towardThreadId`), or no one. One model call, as before.
- The decision keeps everyone it had in view (`consideredThreadIds`), so a choice to engage no one is recalled later toward each of them, and the per-pair bound counts it.
- A reply to a specific person's act stays a choice about that person.
- **A person is in one conversation at a time.** Someone who spoke in a conversation within the last ten minutes of World time is not offered as company to approach, and while either party is in one, invitations and continuations are not among the acts offered. Conversations do not yet record their span; ten minutes is a provisional bound, reversible when they do.

Context-only until staging shows Threads choosing differently among the same company.

## Execution bounds

- Three event-triggered reconsiderations per person per continuous
  evidenced shared venue visit.
- Two completed event-triggered reconsiderations toward the same other
  person in that visit.
- At most sixteen authoritative earlier situations to establish visit
  continuity. Unknown history is not positive proof.
- One ordinary bounded venue/company read at the event and one at
  the claimed opportunity; Body evidence is read only to predict and
  verify a specific crossing.
- No recurring social timer, polling, pairwise population scan,
  conversation-rate target or new social engine. The observed
  small-act reciprocity cap is separate.

These are **computation bounds**, not temperament, etiquette or
relationship rules. They are reversible upon measured runtime evidence;
none narrows the constitutional possibility of continuous, self-authored
social life.

## Vision and remaining paths

The mechanism enables independent Thread life to change what kinds of
encounters become possible after earlier voluntary non-contact.
Thread-owned perception and developed-self evidence still author the
choice, and objective social acts remain separate from personal
Experience and later selective autobiographical Memory.

Unchanged and **deferred** are: richer Body signals and reliable
social-contact satisfaction after a gesture, subjective loneliness,
name learning and introductions, reconsideration after additional
observed World events, broader natural place-driven social behavior,
self-authored durable relationships and human-visitor participation.
These remain extendable through the existing regulation, salience,
Story, Experience, Memory and live-encounter authorities; they are not
rejected and no new permanent limitation is imposed.

The alternative of a per-person repeated social-interest wake was
rejected because it would convert mere time into artificial motivation
and spend unnecessary model calls. The proposal keeps the real
regulatory evidence window instead of assuming elapsed time is proof
of deprivation. Existing social salience thresholds are unchanged,
and the provisional exploration proxy never directly triggers social
reconsideration.

**Evidence status:** Source implementation is proposed and needs Guy's
local validation, then natural staging acceptance. Fixture cognition and
semantic store tests can establish accurate opportunity production,
decision-time authority and bounds; they cannot establish autonomous
increased sociability, private motivation, acquired acquaintances, or
Memory-driven relationship growth.
