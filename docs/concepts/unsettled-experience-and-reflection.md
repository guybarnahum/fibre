---
id: concept-unsettled-experience-reflection
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Unsettled experience and reflection

This document proposes a Fibre concept for experiences that remain cognitively unfinished after they happen. It is intentionally distinct from history, autobiographical memory, remembered meaning, needs, emotions, unresolved action intentions, and task queues.

The motivating case is ordinary life: a Thread has an encounter, notices that something about it remains unresolved, and continues to think about it later. The Thread may talk with someone, read, search the internet, compare the experience with older memories, or simply let time pass. The experience may remain open, become **settled-for-now**, or later reopen when new experience changes the interpretive situation.

There is no permanently settled state in this model. `settled-for-now` means only that the Thread currently has no active interpretive question worth pursuing about the experience.

## The missing layer

Current Fibre doctrine distinguishes:

```text
history            = what Fibre has evidence happened
memory             = what the Thread retains autobiographically
remembered meaning = what an experience durably came to mean to this Thread
```

That still leaves an important state between retention and durable meaning:

```text
I remember this.
I am still trying to understand what I think about it.
```

Not every such experience must be emotionally intense. Something can stay on a Thread's mind because it is confusing, contradictory, incomplete, surprising, morally difficult, relationally ambiguous, intellectually interesting, or simply inconsistent with an existing self-account.

This should not force immediate meaning merely to close the loop.

## `OnMyMind` as a projection, not necessarily a new authority

The human-facing phrase **on my mind** is useful, but the underlying domain concept should be closer to `UnsettledExperience` or `OpenInterpretiveQuestion`.

A presentation may project an `onMyMind[]` list from authoritative Thread state. The list itself should not become a second source of truth if the underlying records already exist elsewhere.

A conceptual record may have the shape:

```text
UnsettledExperience {
    id
    subjectThreadId
    sourceRefs[]
    memoryRefs[]
    openedAt
    whatFeelsUnsettled
    openQuestions[]
    attentionBasisRefs[]
    status
    asOf
    supersedes?
    settlementRef?
    visibility
    provenance
}
```

Possible statuses are descriptive rather than objective verdicts:

```text
open
settled_for_now
reopened
```

`settled_for_now` means only that the Thread currently has no active interpretive question about the experience. It does **not** mean Fibre has determined the correct interpretation, that contradiction has disappeared, that the remembered meaning is objectively true, or that the experience can never matter again.

A UI may say “settled” conversationally, but the underlying contract should preserve the explicit `settled_for_now` semantics.

## Not every unresolved thing belongs here

An unsettled experience is not interchangeable with:

- an **unresolved intention** — something the Thread still intends to do;
- an **obligation** — something the Thread owes or has committed to;
- a **need** — a persistent semantic orientation or unmet condition;
- an **emotion** — current affective state;
- a **relationship attitude** — durable state toward another entity;
- an **open task** — work that remains incomplete;
- a **memory** — autobiographical retention itself.

These may interact. A difficult meeting can leave an obligation, resentment, an unresolved question, and a durable memory at the same time. Fibre should preserve those as separate authorities rather than collapsing them into one generic “open loop” record.

## Reflective inquiry is episodic, not an unbounded thought loop

An unsettled experience may motivate later cognition, but Fibre should not create an uncontrolled self-reinforcing loop.

The existing emotions/needs doctrine requires bounded feedback across episodes rather than repeated self-consumption inside one episode. The same rule applies here.

Conceptually:

```text
unsettled experience
   -> reflective trigger / scheduled reflection / relevant later event
   -> one bounded cognition episode
   -> possible private reflection, question, intention, or action proposal
   -> validate and freeze
   -> later evidence may trigger another episode
```

A reflective episode may legitimately conclude:

```text
still_open
not_worth_pursuing_now
needs_more_evidence
want_to_talk_to_someone
want_to_research
settled_for_now
```

The Thread is not required to settle every experience. Some ambiguity may persist for years; some issues may lose relevance without a clean answer. `not_worth_pursuing_now` is not equivalent to `settled_for_now`: the former defers attention, while the latter records that the Thread currently feels no interpretive question remains active.

## Ways a Thread may work on an unsettled experience

A Thread may seek understanding through ordinary life mechanisms rather than a special omniscient interpreter.

### Private reflection

The Thread may revisit the experience, compare it with existing memories and current state, articulate uncertainty, or notice that an earlier interpretation no longer fits.

Private reflection is an event with provenance even when nothing is disclosed externally.

### Conversation

The Thread may choose to discuss the experience with another Thread or human.

The other participant can:

- provide a different perspective;
- remember shared events differently;
- supply facts the Thread did not know;
- challenge an interpretation;
- offer reassurance or criticism;
- help identify an unresolved question.

The other participant does not become authority over the Thread's autobiography merely by contributing to the reflection.

### Research and reading

The Thread may seek external evidence through books, documents, tools, public internet research, or other sources.

Research remains action with ordinary Fibre constraints:

- resource/cost accounting;
- provenance for consulted sources;
- privacy-aware query formation;
- ordinary authorization for protected external actions where required;
- no automatic conversion of search results into Thread belief or remembered meaning.

Research may answer a factual question while leaving the personal meaning unresolved, or vice versa.

### Later lived experience

A new experience may make the earlier one intelligible in a way deliberate reflection did not.

This is especially important because personhood should not reduce development to explicit self-analysis. A Thread can be changed by living before it can explain why.

## Settlement-for-now and reopening

Interpretive closure should be append-only and revisable.

A `settled_for_now` record may say, in natural language, what is no longer actively unresolved and why the Thread currently considers the issue sufficiently understood or no longer worth active interpretation.

It must preserve the prior open state rather than overwrite it.

A later event may reopen the issue when it materially changes the interpretive basis. Examples include:

- contradictory evidence;
- a repeated relational pattern;
- a consequence that becomes visible only later;
- another participant giving a conflicting account;
- a later experience that resembles the earlier one;
- a changed value, role, relationship, or self-understanding;
- new factual research.

Reopening should itself be evidence-backed:

```text
prior open/settled_for_now record
    + new evidence refs
    -> reopened interpretive question
```

The prior `settled_for_now` state remains historically true as what the Thread had previously concluded or ceased actively questioning. Reopening does not prove that the old interpretation was foolish or false; it records that later life has made the question active again.

Fibre must not periodically reopen experiences merely to simulate depth.

## Relationship to memory formation

Several cases remain intentionally open for review.

### Remembered event, no durable meaning

This is the simplest case. The memory can carry an unsettled interpretive question until meaning forms, remains absent, or the Thread becomes settled-for-now without adopting durable meaning.

### Durable meaning that becomes unsettled

A Thread may already have remembered meaning and later encounter evidence that makes it doubtful or incomplete. The old meaning remains historically authoritative for what the Thread once believed; a later revision may supersede it.

A meaning may therefore be stable enough to count as durable while still remaining corrigible. `durable` does not mean permanently closed.

### Initially `not_remembered`

Harder question: can a later event cause autobiographical memory formation around an older historical episode that was initially not retained?

This should not be answered accidentally by the `OnMyMind` mechanism. Possible models include:

1. `not_remembered` means no durable autobiographical retention formed then, but later cognition may form a new memory from surviving historical evidence plus present context;
2. autobiographical forgetting is irreversible unless another participant's account creates a new second-hand memory rather than recovery of the original;
3. Fibre supports partial/vague resurfacing with explicit provenance distinct from original retention.

This requires separate hostile review because each model changes Fibre's theory of memory.

## Attention and triggering

`OnMyMind` should affect retrieval and the probability of reflective cognition, but it must not become an imperative hidden instruction.

Valid semantic state:

> I keep returning to why I felt relieved after that conversation even though I had expected to be angry.

Invalid hidden instruction:

> I must keep thinking about this until I solve it.

Attention may be supported by interest, worry, regret, relationship state, contradiction, novelty, repetition, or a Thread-authored intention to revisit the issue. Mechanical triggering may schedule or permit reflection, but the mechanical condition is not supplied to cognition as semantic evidence.

A settled-for-now experience should normally leave active attention. It may become relevant again through ordinary retrieval or through new evidence that makes the old experience salient; Fibre should not maintain a hidden imperative to keep testing settled material.

## Public presentation

A live `ThreadEncounterSnapshot` may optionally expose a disclosure-approved projection such as:

```text
onMyMind[] {
    publicSummary
    since
    relatedPlaceOrPerson?
    disclosureStatus
}
```

This is powerful for `insidefibre.com` because it shows a mind in motion rather than a static personality profile.

However, unsettled experiences are likely to be among the most private Thread state. They may involve another person's conduct, uncertainty, resentment, intimacy, fear, or private self-judgment. Public exposure must therefore be separately authorized/coarsened and must not default to full internal text.

For unborn visualization fixtures, any `onMyMind` state that did not actually exist in Genesis must be marked synthetic fixture state, just like synthetic current presence and Daily Plan.

## Canon candidates exposed by this concept

The concept suggests several Fibre-level propositions worth hostile review before canonization:

1. **A person need not resolve experience immediately.** Interpretive incompleteness is legitimate persistent state rather than a defect.
2. **Reflection is part of life, not a privileged truth engine.** Private thought, conversation, research, and later experience may influence meaning without becoming authorities over it.
3. **Settlement is always settled-for-now.** Interpretive closure is personal, provisional, and corrigible rather than a declaration of objective truth or permanent completion.
4. **Settled-for-now meaning may reopen under new evidence.** Continuity requires preserving prior interpretations while allowing later experience to disturb them.
5. **Attention must remain bounded.** Unsettled experience may motivate later cognition but must not create compulsory rumination or infinite self-conditioning.

These likely belong as refinements to `interpretive-personhood.md`, `development-and-memory.md`, and `thread-lifecycle.md`, not as a new numbered Principle unless review finds the existing Thirteen insufficient.

## Questions for hostile review

1. Is `UnsettledExperience` a legitimate domain authority, or should `OnMyMind` be derived entirely from memories plus semantic state and unresolved intentions?
2. What evidence admits an experience onto the Thread's active interpretive agenda without pre-labeling it as important?
3. Should an unsettled experience be allowed to remain active indefinitely?
4. What distinguishes healthy continuing reflection from a pathological or mechanically amplified rumination loop?
5. Is `settled_for_now` sufficient as the only closure state, or do any domains genuinely require stronger closure semantics outside this interpretive mechanism?
6. Should settled-for-now remembered meaning reopen automatically when relevant contradictory evidence is admitted, or must a Thread first notice that evidence in cognition?
7. How should another person's conflicting memory of a shared event affect the Thread without corrupting autobiographical authority?
8. Can an initially `not_remembered` event later become autobiographical memory, and if so, what is the provenance of that later retention?
9. When internet research is motivated by a private unresolved experience, what query/disclosure boundary prevents private Thread state from being leaked to external services?
10. Should public `onMyMind` content require explicit Thread authorization rather than ordinary presentation projection?

## Related documents

- [`development-and-memory.md`](development-and-memory.md)
- [`emotions-and-needs.md`](emotions-and-needs.md)
- [`../architecture/thread-lifecycle.md`](../architecture/thread-lifecycle.md)
- [`../architecture/thread-presentation-and-encounter-plan.md`](../architecture/thread-presentation-and-encounter-plan.md)
- [`../foundations/ordinary-life-and-encounter-canon-candidates.md`](../foundations/ordinary-life-and-encounter-canon-candidates.md)
