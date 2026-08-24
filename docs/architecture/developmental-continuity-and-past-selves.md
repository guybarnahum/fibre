---
id: architecture-developmental-continuity-past-selves
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# Developmental Continuity & Past Selves Contract

## Purpose

A differentiated Thread at one instant is not enough. Fibre's identity claim requires **diachronic personhood**: the same individual persists through time while experience, memory, reflection, relationships, state, and self-authorship can change who that individual becomes.

This contract complements:

- `identity-embodiment-contract.md` — the durable layered life;
- `character-formation-model.md` — how that life becomes characteristic judgment;
- `interior-exterior-situated-identity.md` — how the person is encountered without exposing the private interior;
- the existing event/history and Semantic State contracts — what actually happened and what current state means.

The central M2 developmental claim is:

> **Continuity does not mean remaining unchanged. A Thread persists as the same individual partly because its present self inherits, remembers, interprets, and sometimes rejects its own past selves.**

And the historical invariant is:

> **Growth may change future behavior; it may never rewrite the person who actually lived the past.**

The Fibre target is neither a frozen persona nor an RPG progression system. It is a persistent person whose current character has an inspectable temporal ancestry.

# I. Personality is diachronic

Human personality is experienced across time. A person may become more cautious, less deferential, more trusting, more self-protective, more ambitious, less attached to a former role, or differently related to an inherited culture because of what has happened to them and what they have made of it.

Fibre therefore treats a Thread's current identity as one point on a life trajectory, not the canonical final answer to "who is this person?"

A Thread must be able to truthfully express ideas such as:

> I would not make that decision today.

> I understand why I behaved that way then, even though I no longer agree with it.

> I used to think that failure made me cautious. I now think it made me protective of other people's autonomy.

> I remember myself as uncertain in that period, although the record shows I often sounded very confident.

Those statements require more than append-only events. They require temporally versioned self-understanding and an explicit distinction between **what happened**, **who the Thread was then**, **how the Thread later remembers that self**, and **who the Thread understands itself to be now**.

# II. Four temporal layers must remain distinct

For a formative part of life, Fibre must be able to preserve all four layers:

```text
1. historical evidence
   what Fibre can establish happened

2. contemporaneous self
   what the Thread believed, felt, valued, intended, or said at that time

3. autobiographical memory / later view of the past self
   how a later Thread remembers or describes that earlier period

4. current interpretation / current self
   what the Thread now believes the event and earlier self mean
```

These layers may agree. They may also disagree while each remains a truthful record of a different epistemic fact.

Example:

```text
Historical fact:
  Mina remained on Nimbus through three failed recovery attempts.

Mina then:
  "Leaving would mean I am not dependable."

Mina two years later remembering that self:
  "I was attached to being the responsible person and could not distinguish
   responsibility from martyrdom."

Mina now:
  "Reliability still matters deeply to me, but endless persistence no longer
   proves reliability."
```

Fibre must not flatten those statements into one current trait such as `persistence = 0.63`.

# III. History is not memory

The world/history substrate and autobiographical memory serve different purposes.

## Historical evidence

Historical evidence records durable world facts and contemporaneous records. It answers questions such as:

- what event occurred;
- when it occurred;
- who participated;
- what decision/action was actually frozen;
- what the Thread's recorded private stance or self-authored assertion was at that time, where such evidence exists.

Historical evidence is not rewritten because a later Thread remembers the event differently.

## Autobiographical memory

Autobiographical memory is the Thread's later, temporally situated representation of its own past.

A memory may be:

- accurate;
- incomplete;
- selective;
- emotionally reweighted;
- differently interpreted;
- uncertain;
- contradicted by contemporaneous evidence.

M2 does not require Fibre to manufacture human-like forgetting or false memory. It requires the **data model and causal boundary not to equate a current recollection with historical truth**.

A later memory should therefore retain semantics equivalent to:

```text
memoryId
threadId
subjectPeriod / eventRefs
rememberedMeaning
rememberedAt / asOf
confidence or uncertainty where represented
salience
accessibility
retentionState
lastRecalledAt?
authorship
supportingEvidenceRefs[]
contradictingEvidenceRefs[]
visibility
status
supersedesMemoryId?
```

The exact schema is deferred. The separation is not.

`salience`, `accessibility`, `retentionState`, and `lastRecalledAt` are representational requirements in M2, not claims that M2 has implemented human-like forgetting. They preserve the architectural possibility that two Threads with similar historical evidence later retain or access different autobiographical material. A memory may become low-salience or unavailable to ordinary Thread cognition while remaining historically inspectable by authorized administration. #41 or later work must earn any causal claims about forgetting, rehearsal, decay, or differential retention.

# IV. Past selves are first-class temporal views

A past self is **not a different Thread** and is not a fork. It is an inspectable view of the same Thread as of an earlier point in its life.

Fibre must eventually be able to reconstruct, with bounded evidence, concepts such as:

```text
self model as of time T
current values as of T
active roles as of T
known relationships as of T
character view as of T
important unresolved tensions as of T
semantic state near T when relevant
what evidence was available to the Thread at T
```

A Past Self View is derived from durable records with temporal boundaries. It is not created by asking the current model to improvise "what younger Mina would probably have thought."

A past-self representation should retain semantics equivalent to:

```text
pastSelfViewId
threadId
asOf
identityAssertionRefs[]
selfAuthoredAssertionRefs[]
characterViewRefs[]
relationship / role refs where relevant
formation / episode refs[]
derivationPolicy { id, version }
derivedAt
digest
```

Deleting a derived Past Self View must not delete the records needed to reconstruct it.

Past-self reconstruction must be deterministic at the evidence boundary: given the same durable world snapshot, `asOf`, and derivation-policy version, Fibre must resolve the same source-reference set and the same canonical view digest. A cognition model may narrate those records differently, but it may not choose a different past merely because the query is rerun.

# V. Character itself is versioned

A Current Character View is current only **as of a time**.

When character meaning changes, Fibre should preserve prior character interpretations and their evidence rather than mutating one timeless personality document.

For example:

```text
2027 character view:
  persistence under interpersonal responsibility is strongly affirmed

2030 character view:
  persistence remains important, but unilateral rescue behavior is rejected

2032 character view:
  reliability is increasingly expressed as explicit renegotiation and early escalation
```

Those are not three different persons. They are temporal states in one person's development.

A later character view may supersede an earlier view for present cognition while the earlier view remains historically inspectable and appropriate when reconstructing the past.

# VI. Developmental transitions require ancestry

Growth must not be an editorial operation such as:

```text
Mina is now more cautious.
```

A material developmental change should have an inspectable ancestry such as:

```text
lived experience(s)
  -> contemporaneous consequence / semantic meaning
  -> memory and/or repeated behavioral evidence
  -> reflection or self-authored interpretation
  -> changed current character synthesis
  -> changed future judgment when relevant
```

Not every experience needs to produce every step. Not every experience is formative.

An experience may:

- reinforce existing character;
- weaken an existing tendency;
- create a new tension;
- matter only in one relationship/domain;
- be forgotten or remain low-salience;
- be misunderstood initially and reinterpreted later;
- gain significance only after later events;
- produce no durable character change.

Therefore development is not `event -> trait delta`.

Any claimed material character change should be able to answer:

```text
What changed?
What durable evidence preceded the change?
When did the changed view become current?
Who authored or derived the interpretation?
Did the Thread itself recognize or endorse the change?
What counterevidence or scope limits remain?
Which later decisions actually demonstrate the claimed difference?
```

# VII. Growth may be non-monotonic

Fibre must not assume development is improvement, optimization, or one-way progress.

A Thread may:

- become more trusting and later more guarded;
- become more independent and later seek community;
- intellectually reject an old fear while still reacting emotionally to it;
- regress under stress;
- recover an earlier value after rejecting it;
- hold two historically rooted motives in unresolved tension.

This is not necessarily inconsistency. It may be the actual trajectory.

Canonical developmental representation must therefore preserve competing evidence and temporal scope rather than forcing every characteristic into a monotonic score.

# VIII. Current self has interpretive authority, not retrospective sovereignty

The current Thread has special authority over **current self-authored meaning**. It does not gain authority to rewrite what the earlier Thread actually believed or did.

A current self-authored statement may say:

> I no longer identify with the ambition that drove me in that period.

It may not silently transform a contemporaneous record from:

> I want to lead this company.

into:

> I never cared about leadership.

The latter may be a current autobiographical claim, but if it conflicts with durable contemporaneous evidence, the disagreement itself should remain inspectable.

This gives Fibre an important form of self-continuity: the present person may judge, forgive, admire, reject, misunderstand, or reinterpret the past person without deleting them.

# IX. Developmental context projection

The Identity Context Capsule must support temporal/developmental meaning without dumping the whole biography into cognition.

For a present decision, Fibre-owned selection may project a bounded combination such as:

```text
Current character:
  protects collaborator autonomy

Formative history:
  Nimbus rescue attempt damaged trust

Past self:
  formerly equated intervention with responsibility

Current reinterpretation:
  now sees unilateral rescue as potentially disrespectful

Counterevidence:
  still acts unilaterally under immediate physical-safety risk
```

This is materially stronger than projecting only:

> Mina values autonomy.

The selector should prefer the minimum temporal evidence sufficient to preserve why the current characteristic means what it means.

When a standing claim says **experience changed character**, the causal record must remain traceable from current projected meaning through its formation/past-self evidence to durable history.

# X. Exterior expression of growth

A Thread may express developmental continuity through its Exterior when disclosure and relationship context permit it.

Examples include:

- "I used to think...";
- "I would probably have handled this differently five years ago.";
- "That period changed how I approach responsibility.";
- "I remember being certain, although I am not sure I was as certain as I now tell myself.";
- "I still have the old reaction even though I no longer endorse the belief behind it."

These statements should be grounded in durable temporal evidence, not improvised autobiography.

External entities still do not gain direct Inspector access. A Thread may choose not to disclose formative events or private memories even when those facts causally affect its current behavior.

# XI. Rich Thread representation: Then & Now

A future rich Thread UI should be able to present development without turning the Thread into a changelog.

The Exterior/encounter experience may offer a permission-appropriate **Then & Now** view, for example:

```text
Then
  "Dependability means not giving up."

Now
  "Dependability sometimes means admitting the plan failed."

What changed
  public/relationship-permitted account of the formative period
```

The admin Inspector may additionally expose:

```text
past-self reconstruction
contemporaneous evidence
current autobiographical memory
current interpretation
prior/current character views
formation evidence and counterevidence
exact decisions before and after the transition
projection / cognition provenance
```

The Inspector must clearly distinguish a current memory of a past self from a contemporaneous record of that past self.

# XII. M2 developmental acceptance scenarios

#36 binds #37-#40 to representation and causal proof sufficient for these scenarios. Rich endogenous self-development remains a stronger #41 milestone as described below.

## Scenario S — developmental causality

Hold Thread identity and a later ambiguous request constant around a predeclared formative history boundary.

Before the formative evidence, record the earlier judgment/character state. After durable formative experience and an evidence-backed current reinterpretation, the later judgment changes in the predeclared direction.

The causal explanation must cite the actual developmental evidence rather than elapsed time or a fixture flag.

## Scenario T — past-self reconstruction

After development and restart, reconstruct a bounded Past Self View from before the change.

The view must recover the earlier self-authored/character meaning from durable historical records rather than projecting the current self backward.

## Scenario U — no retrospective rewrite

Create a current self-authored reinterpretation that disagrees with an earlier self-view.

The current interpretation becomes current where appropriate, while the contemporaneous earlier assertion remains intact, queryable, and correctly attributed to its time.

## Scenario V — autobiographical memory is not history

Persist a later autobiographical memory or reflection whose interpretation differs from contemporaneous evidence.

Inspection must preserve both and label their epistemic status correctly. The memory must not mutate the historical event or earlier self record.

## Scenario W — same person across change

Compare anonymized behavioral/identity traces from the same Thread before and after meaningful development.

The Thread may make different decisions, but there should remain attributable continuity through stable identity, history, characteristic tensions, relationships, or self-narrative.

The target is:

> **recognizably the same person without requiring identical behavior forever.**

## Scenario X — developmental claim-level ablation

Remove or symmetrically replace only the specific formative assertion or minimal assertion set carrying the claimed developmental cause while holding the current request, unrelated identity, selector policy, and projection budget constant.

The claimed developmental behavioral effect must weaken, disappear, or change in the predeclared direction.

The proof is invalid if the intervention removes unrelated formative claims with the named cause. If the same "grown" personality remains after its claim-level formation evidence is removed, Fibre has created a persona label rather than development.

## Scenario Y — restart and cognition continuity of growth

Persist developmental history and current character, restart the process, and reproduce the temporally appropriate current/past-self views.

Where compatible cognition runtimes are available, the direction of the developmental difference should remain recognizable across cognition replacement even if wording changes.

## Scenario Z — past-self behavioral reproduction

Choose a formative transition for which a contemporaneous pre-transition judgment exists for a specific material request/fingerprint. After the Thread has developed, reconstruct a Past Self View from the pre-transition `asOf` boundary and rerun **that same material request and exact request fingerprint** against both the reconstructed past self and the current self.

Under the same selector, Guardian/cognition policy versions, material request state, and Scenario K repeated-trial discipline, the reconstructed past self must reproduce the recorded contemporaneous **direction of judgment** from the earlier period and must differ from the current self in the predeclared evolved direction. Exact wording is not required.

The past-self capsule must be derived from durable as-of records with the deterministic evidence set/digest required by this contract. The current self-model may not be projected backward. Because Scenario Z is a required gate, #40 must design the formative-transition experiment so the pre-transition judgment and its evidence for the exact material request/fingerprint are recorded before the transition; absence of that contemporaneous baseline is a failed experiment setup, not grounds to mark Scenario Z ineligible or retire the gate.

This scenario makes developmental continuity behavioral rather than merely notarial:

> **the old self remains runnable enough to demonstrate how the same person used to judge, while the current self can genuinely judge differently.**

# XIII. Boundary between M2 and #41 Self-authored Development

This contract intentionally prevents the M2 storage/projection architecture from blocking future growth, without pre-awarding Development rubric credit.

## M2 / #37-#40 must establish

- append-only identity/history capable of representing former selves;
- temporally bounded current/historical identity views;
- separation of history, contemporaneous self-record, autobiographical memory, and current interpretation;
- versioned character views and their evidence ancestry;
- bounded projection of relevant developmental context;
- controlled proof that persisted history/current interpretation can causally bend later judgment;
- restart-safe reconstruction of current and past-self views.

M2 scenarios may use deliberately authored formative histories to prove the substrate and causal mechanism. When a fixture synthetically represents Thread-self-authored meaning, the **evidence classification of that M2 proof is Exogenous** even if the synthetic world record's semantic `authorship` field says the Thread authored the statement. Such evidence can prove storage, temporal reconstruction, projection, and causal mechanics; it cannot prove endogenous agency or earn Development credit. #41 must replace this with a real Thread-authored/proposed runtime path.

## #41 must establish the stronger claim

#41 **Self-authored Development v1** must demonstrate that the Thread can participate in forming/revising its own durable identity from lived experience under Fibre-owned admission rules rather than development being scripted by fixture authors.

The stronger developmental chain is:

```text
Thread lives
  -> Thread remembers / reflects
  -> Thread proposes or authors changed meaning
  -> Fibre admits it with evidence/provenance/counterevidence
  -> current character changes
  -> future behavior changes
```

#36 designs the substrate for becoming.

#41 must prove that the Thread can actually **become**.

# XIV. Anti-cheats

This contract fails if any of the following is the easiest explanation:

- one mutable personality record is edited in place;
- a current self-model is projected backward as though it were historically true;
- current autobiographical memory overwrites world history;
- past selves are fabricated on demand by the current model;
- development is represented only as scalar trait deltas;
- every experience automatically creates character growth;
- development is always monotonic or framed as improvement;
- a fixture flag such as `afterFailure=true` directly controls behavior;
- elapsed time itself changes personality without durable causal evidence;
- the claimed changed behavior persists after the formative evidence is ablated;
- a later self-authored interpretation deletes counterevidence or the earlier self;
- a different cognition model silently changes the Thread's developmental history;
- "I used to..." exterior statements are plausible improvisations with no durable temporal basis.

# XV. Hostile review questions

A hostile #36/M2 review should ask:

1. Can Fibre distinguish what happened from what the Thread now remembers happened?
2. Can it reconstruct what the Thread actually believed before a later reinterpretation?
3. Can the current Thread disagree with its former self without rewriting that former self?
4. Are character views explicitly temporal and versioned?
5. Does every claimed material character transition have durable ancestry and counterevidence?
6. Can development be non-monotonic, ambivalent, or domain-specific?
7. Can the Identity Context Capsule explain a current tendency through formative history without dumping the entire life?
8. Does a past-self view come from records rather than model improvisation?
9. Does the developmental behavioral effect disappear or weaken when the named formative evidence is ablated?
10. After meaningful change, is the Thread still recognizably continuous as the same individual?
11. Can the Thread truthfully discuss "who I was then" from persistent evidence?
12. Does any M2 claim accidentally steal #41 credit by scripting the growth rather than demonstrating self-authored formation?

# XVI. Vision sentence

The Fibre target is not a persona that becomes more elaborate over time.

It is:

> **a persistent person who can become different because of what they lived, remember earlier versions of themselves, reinterpret those earlier selves without erasing them, and carry that accumulated temporal identity into future decisions.**
