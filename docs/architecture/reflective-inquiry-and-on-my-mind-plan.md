---
id: architecture-reflective-inquiry-on-my-mind-plan
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Reflective inquiry and `onMyMind` plan

## Purpose

This plan turns the proposed [`../concepts/unsettled-experience-and-reflection.md`](../concepts/unsettled-experience-and-reflection.md) concept into an implementation direction without prematurely choosing a permanent schema.

The public phrase **on my mind** is a presentation projection. The underlying authority, if hostile review confirms that a new authority is warranted, should represent an experience or question that remains interpretively unfinished.

## Required semantics

```text
experience
  -> history
  -> maybe autobiographical memory
  -> maybe unsettled interpretation
       -> bounded reflective inquiry episodes
       -> still open / deferred / settled_for_now
       -> later relevant evidence
       -> reopened
```

There is no permanently `settled` interpretive status. `settled_for_now` means only that the Thread currently has no active interpretive question worth pursuing. Later experience may reopen the issue without invalidating the historical fact that it had previously felt settled.

## `onMyMind` projection

A live encounter snapshot may expose a disclosure-approved projection equivalent to:

```text
onMyMind[] {
    publicSummary
    since
    disclosureStatus
    relatedPublicRefs[]
}
```

The projection must not expose private internal wording, another person's private conduct, exact location, research queries, resentment, intimacy, fear, or self-judgment merely because those facts exist in Thread state.

For unborn visualization fixtures, any `onMyMind` content is synthetic fixture state unless it is directly projected from admitted Genesis material. It must be marked as such.

## Reflective inquiry episodes

Do not implement a continuous `while unresolved: think()` loop.

Reflection occurs in bounded cognition episodes triggered through ordinary Fibre lifecycle mechanisms. An episode may:

- reflect privately;
- retrieve related memories and history;
- compare a later experience with an older one;
- form an intention to talk with someone;
- initiate an authorized conversation;
- read a book or document;
- perform privacy-aware internet research;
- conclude that more evidence is needed;
- defer the question;
- become `settled_for_now`.

Any external action remains subject to normal authorization, resource, disclosure, and provenance rules.

## Research

Research is ordinary action, not an interpretation oracle.

The implementation must preserve:

```text
private unresolved question
   -> privacy-aware query/action proposal
   -> authorized external research
   -> sources + provenance
   -> new evidence available to later cognition
   -> possible interpretation change
```

Search results do not automatically become beliefs, memories, or remembered meanings. A factual question may be answered while personal meaning remains open.

## Conversation

Another Thread or human may influence interpretation without becoming authority over the subject Thread's memory or meaning.

A conversation about an experience is itself a new event. It may supply facts, disagreement, reassurance, criticism, or a conflicting recollection. Those contributions become evidence available to the subject Thread; they do not retroactively rewrite the original event.

## Reopening

Reopening requires new evidence or changed context that makes a prior experience interpretively active again.

Conceptually:

```text
settled_for_now record
  + new evidence refs
  + Thread notice/appraisal
  -> reopened question
```

Hostile review must decide whether the transition requires explicit Thread cognition noticing the new evidence or whether some Fibre-side eligibility mechanism may merely nominate the old experience for attention. In either case, hidden mechanical conditions may not become semantic evidence.

Fibre must not periodically reopen old experiences merely to produce apparent psychological depth.

## Relationship to memory

The architecture must not collapse:

```text
history
memory
remembered meaning
unsettled interpretation
emotion
need
relationship attitude
intention
obligation
task
```

A single encounter may legitimately affect several of these independently.

The hardest unresolved question remains whether an event initially recorded as `not_remembered` can later become autobiographically remembered. This plan must not choose that ontology accidentally. Resurfaced first-person memory, reconstruction from history, and second-hand account may require different provenance and perhaps different memory classes.

## Presentation consequence

`ThreadEncounterSnapshot` should eventually support a disclosure-approved `onMyMind` projection alongside current presence, daily plan, recent lived context, and next intentions.

The encounter UI should be able to show that a Thread is thinking about something without pretending the Thread has already reached a lesson or durable meaning.

## Validation targets before implementation

Before code lands, hostile review should establish:

1. whether `UnsettledExperience` deserves independent persistence or should be derived;
2. what admits something to active interpretive attention;
3. what bounds reflection frequency and resource use;
4. whether `settled_for_now` is sufficient closure semantics;
5. what evidence permits reopening;
6. whether reopening requires conscious Thread notice;
7. how research avoids leaking private interior state;
8. how conflicting shared-event recollections preserve separate autobiographical authorities;
9. how initially `not_remembered` events may or may not later surface;
10. what authorization is required before `onMyMind` becomes public.
