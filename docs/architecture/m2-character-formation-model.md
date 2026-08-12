---
id: architecture-m2-character-formation-model
status: proposed
last-reviewed: 2026-08-12
canonical: true
---

# M2 Character Formation Model

## Purpose

The Identity & Embodiment Contract defines what makes up a Thread's life. This companion contract defines how that life becomes **character** without collapsing biography into a static persona prompt.

The core claim is:

> **Character is the current, evidence-backed pattern of how a Thread tends to interpret and decide across situations because of its particular life.**

Character is not an instruction list, a personality-test vector, a stereotype, or a single autobiographical fact. It is an inspectable synthesis over durable identity and history that remains subordinate to the underlying evidence.

The Fibre target is not merely:

```text
this Thread has different facts
```

It is:

```text
this Thread has lived a different life
  -> that life formed characteristic tensions, standards, loyalties, aversions and habits of judgment
  -> those characteristics are selected when relevant
  -> the same ambiguous situation is interpreted differently
  -> a different private decision can follow
  -> the pattern remains recognizable across repeated decisions
```

# I. Character is derived, not source-of-truth identity

A **Current Character View** is a Fibre-derived, evidence-backed synthesis. It accelerates bounded cognition and human inspection; it does not replace the identity assertions, episodes, relationships, self-authored interpretations, or current semantic state from which it was derived.

Deleting a Current Character View must not erase the life beneath it. Fibre must be able to reconstruct or re-derive it from authoritative records.

A character item should be able to answer:

```text
What is the tendency or tension?
In what kinds of situations does it apply?
Which durable records support it?
Which durable records contradict or limit it?
What part was inherited, learned, relational, cultural or self-authored?
Does the Thread currently identify with it, resist it, or remain ambivalent about it?
When was this view formed or last reconsidered?
Which policy produced the synthesis?
```

# II. Character has multiple evidence layers

A characteristic may draw from several distinct kinds of evidence that must not be silently conflated:

```text
inherited tendency
  != observed behavior pattern
  != externally attributed reputation
  != self-authored identification
  != current emotional/need state
  != binding commitment or authority
```

A useful Current Character View keeps those layers visible.

Example:

```text
Characteristic:
  She tends to protect collaborator autonomy even when that slows delivery.

Inherited tendency:
  conflict style favors negotiated ownership over unilateral control.

Experienced pattern:
  three prior projects show her asking collaborators to choose recovery plans
  rather than simply taking over.

Formative history:
  an early project failure taught her that rescuing work without consent damaged trust.

Self-authored meaning:
  she now describes autonomy-preserving collaboration as part of the kind of leader
  she wants to be.

Counterevidence / limit:
  under immediate physical-safety risk she has acted unilaterally first and explained later.
```

The last line matters. Character is stronger when Fibre preserves the conditions under which a tendency does **not** hold.

# III. Character is contextual, not globally ranked

Fibre must not flatten character to universal scalar traits such as:

```text
persistence = 0.82
trust = 0.41
creativity = 0.93
```

Numeric controls may be derived for runtime use, but canonical meaning remains contextual natural language plus evidence.

A Thread may simultaneously be:

- stubborn about promises and quick to abandon low-value bureaucracy;
- trusting toward a long-time collaborator and skeptical toward institutions;
- highly experimental in product design and conservative in safety engineering;
- generous with family and demanding in professional review;
- comfortable with technical uncertainty and uncomfortable with social ambiguity.

Those tensions are character, not data-quality defects.

# IV. Tension is first-class

Real personality often appears in conflict between motives rather than in a dominant trait.

A Current Character View may therefore represent tensions such as:

```text
loyalty <-> independence
rigor <-> speed
caregiving <-> self-protection
curiosity <-> caution
persistence <-> resource discipline
tradition <-> chosen identity
ambition <-> relationship preservation
```

Fibre should not silently resolve a tension while compiling identity context. The relevant sides and evidence should reach cognition when both materially matter.

The decision belongs to the current Thread cognition operating over its durable life, not to a precomputed persona rule.

# V. Self-authorship has interpretive authority, not factual supremacy

Current self-authored identity is especially important to character because a person can reject or reinterpret inheritance and external attribution.

However:

```text
self-authored meaning
  may supersede prior self-interpretation
  may reject an externally attributed identity
  may say an inherited tendency no longer expresses current values

but it may not
  delete an objective historical event
  falsify a role or authority record
  erase contrary behavioral evidence
  convert a wish about the self into proof that a capability exists
```

A Thread can truthfully say:

> I grew up treating relentless persistence as a virtue, but after several damaging rescue attempts I no longer want that to define how I work with others.

Fibre should project the **current chosen meaning** while retaining enough historical and counterevidence context to understand the tension.

# VI. Current state modulates character; it does not rewrite it

Semantic State v0 can temporarily alter how character expresses itself.

A normally collaborative Thread may negotiate more sharply when exhausted or resentful. A cautious Thread may accept unusual risk when a deeply valued relationship is threatened. A confident Thread may hesitate after a recent failure.

This is not inconsistency if the state interaction is attributable.

The distinction is:

```text
character = durable pattern / interpretation
state     = current condition
request   = current situation
```

Decision behavior emerges from their interaction.

A transient state update must not silently rewrite the Current Character View as though a temporary mood became a stable personality change.

# VII. Commitments and dignity remain independent boundaries

Character may affect what a Thread wants to do. It does not create execution authority.

A Thread may characteristically avoid bureaucratic work and privately refuse it while a valid Structured Obligation still compels participation. The resulting episode remains compelled; character does not rewrite commitment, and commitment does not rewrite character or consent.

Likewise, a high identity match may make a request high-dignity, but request-bound authorization still governs execution.

# VIII. Character formation and change

A durable character synthesis may evolve because of:

- repeated behavioral patterns;
- genuinely formative episodes;
- successes and failures;
- relationship change;
- intellectual or professional formation;
- cultural/geographic experience;
- changed roles and responsibilities;
- self-authored reflection;
- accumulating counterevidence;
- explicit rejection of an inherited or earlier self-concept.

But no requester sentence, single model completion, or isolated external attribution may directly rewrite character.

Character change is **temporal**. A current view is current only as of a time; prior character views remain part of the same Thread's inspectable life. Growth must not project the current self backward as though earlier selves never existed.

The companion `m2-developmental-continuity-past-selves.md` contract is therefore load-bearing for this model. It requires Fibre to keep separate:

```text
what happened
what the Thread believed / felt / valued then
how the later Thread remembers or describes that earlier self
what the Thread currently believes the earlier period means
```

A material character transition must have durable ancestry in lived evidence, memory/reflection and/or repeated behavior, with current self-authored meaning and counterevidence preserved where applicable. Development may be non-monotonic, domain-specific, ambivalent, or later reinterpreted.

For M2, #37-#39 may implement the **representation, provenance, temporal reconstruction and projection** needed for current and past character. Rich endogenous formation — where Fibre determines from repeated lived evidence that the Thread itself has developed — remains the stronger #41 Self-authored Development milestone unless its full rubric requirements are independently satisfied earlier.

# IX. Character synthesis contract

A future implementation should use a versioned Fibre-owned synthesis policy. The exact schema is deferred, but a current characteristic should carry semantics equivalent to:

```text
characteristicId
threadId
meaning
situationalScope
supportingEvidenceRefs[]
counterEvidenceRefs[]
formationClasses[]
selfAuthoredRelationship
formedAt
asOf
synthesisPolicy { id, version }
visibility
status
supersedesCharacteristicId?
```

## Supporting evidence

Supporting evidence must be durable and specific enough to inspect. A life chapter may be used as bounded context only if it remains drillable to its underlying records.

## Counterevidence

A current characteristic with no facility for counterevidence risks becoming a self-confirming persona label. Fibre must preserve meaningful contradictory episodes, rejected attributions, and scope limits.

## Situational scope

A characteristic should name where it tends to matter. "Persistent" is weaker than:

> She makes several materially different recovery attempts when she believes another person is relying on her, but she abandons low-value solo work quickly once its expected value collapses.

## Self-authored relationship

Useful values may express concepts such as:

```text
affirms
aspires_to
ambivalent
rejects
unexamined
```

These are not scores. They describe the Thread's current relationship to the characteristic.

# X. Character projection

The Identity Context Capsule should not always inject every current characteristic.

Fibre-owned selection may project a characteristic when:

- its situational scope is materially relevant;
- supporting evidence is current enough or formative enough;
- privacy permits use;
- it is not superseded;
- counterevidence or a live tension is also included when omission would materially distort the meaning.

For a developmental characteristic, bounded context may additionally include the relevant earlier self-view and current reinterpretation when those are necessary to preserve why the characteristic has its current meaning.

A causal decision record must retain the exact characteristic/evidence items actually projected.

A synthesized character statement is **not sufficient causal evidence by itself** if the standing claim is that lived history created the behavior. The proof must remain able to trace through the synthesis to the durable underlying history.

# XI. Behavioral signature: personality across decisions

A single differential request can establish a causal mechanism, but it is weak evidence of a **personality**. M2 should additionally establish a small **Behavioral Signature** over multiple held-out ambiguous decision families.

The signature is not a fixed answer key. It is an empirical pattern such as:

```text
Thread A
  collaborator conflict     -> protects autonomy / negotiates
  uncertain technical plan  -> experiments early
  formal commitment         -> persists longer before exiting
  generic low-fit request   -> refuses readily

Thread B
  collaborator conflict     -> takes ownership / resolves directly
  uncertain technical plan  -> demands stronger proof first
  formal commitment         -> renegotiates sooner when expected value falls
  generic low-fit request   -> also refuses, for different identity-grounded reasons
```

The goal is not maximal disagreement. It is **cross-situation coherence**: decisions should make sense as expressions of each Thread's particular life.

## M2 decision-portfolio requirement

Before #40 closes M2, predeclare a held-out portfolio with **at least four materially different ambiguous decision families spanning at least three decision/life domains**. At least one family must be explicitly non-professional. The portfolio must be frozen before held-out outputs are collected.

The portfolio must not reuse one magic causal fact everywhere. At least three decision families must cite materially different primary causal claim sets, and no single assertion or life episode may serve as the primary causal explanation for more than half of the portfolio.

Before execution, #40 must predeclare a **cross-situation coherence metric and threshold** computed from frozen outputs. The metric must compare within-Thread coherence across situations against cross-Thread similarity; a purely narrative reviewer judgment after seeing the answers is insufficient. Exact prose need not match.

At least one held-out family must demonstrate an identity-causal difference in **response strategy or content beyond the private action/dignity band** — for example, the clarification question asked, negotiation terms proposed, disclosure choice, sequencing/delegation strategy, or standard-of-proof explanation. That response-level differential must survive the applicable swap, paraphrase, contradiction, and claim-level ablation controls.

At minimum, the evidence must show:

1. each Thread is reasonably stable within repeated trials of each material request;
2. at least one predeclared identity-grounded differential is robust under the symmetric swap and semantic controls;
3. multiple portfolio decisions cite different relevant parts of the same persistent life rather than one repeated magic biography sentence;
4. the predeclared coherence metric meets its frozen threshold, showing stronger within-Thread cross-situation coherence than cross-Thread similarity;
5. removing the named claim-level character/history evidence degrades the predicted pattern;
6. the portfolio survives restart;
7. where compatible model runtimes exist, identity-grounded direction remains recognizably continuous across cognition replacement;
8. after a predeclared formative transition, the signature may evolve while retaining inspectable same-person continuity rather than requiring behavior to remain frozen forever;
9. the portfolio includes at least one non-professional causal family and at least one response-level causal differential beyond action/band.

This portfolio complements, rather than replaces, the standing Thread differential gate's exact controlled causal scenario.

# XII. Character anti-cheats

Character evidence fails if any of the following is the easiest explanation:

- one generic persona summary is copied into every request;
- the Current Character View contains executable instructions;
- every tendency is globally positive and has no counterevidence;
- a single event is generalized into a universal personality without an explicit formative/self-authored basis;
- a temporary semantic state is persisted as permanent character;
- an external requester's characterization becomes self-identity;
- ancestry, nationality, gender, appearance, accent, or other demographic labels generate character traits;
- self-authorship is treated as proof of factual capability;
- a character summary is causal only because the implementation branches on its ID;
- the decision portfolio repeats the same semantic task under different wording;
- every scenario is authored around one known fixture tendency;
- the system produces different prose but the same decisions and consequences;
- all personality evidence collapses to the same action/dignity-band vocabulary while clarification, negotiation, disclosure, sequencing, and other response strategies remain generic;
- deleting the underlying lived evidence leaves the same claimed character effect;
- a current character view is projected backward and overwrites an earlier self;
- a later autobiographical memory is treated as authoritative history;
- growth is represented as direct scalar increments or fixture-authored trait edits with no causal ancestry.

# XIII. Human-readable character inspection

A human-facing Thread view should eventually be able to show:

```text
Current character
  characteristic / tension
  where it tends to matter
  supporting life evidence
  important counterevidence
  current self-authored relationship
  when this interpretation became current

Behavioral evidence
  recent decisions where it mattered
  decisions where it did not matter
  decision-portfolio stability

Development
  earlier/past-self character view
  formative evidence
  current autobiographical memory where relevant
  current reinterpretation
  what changed and what remained continuous

History
  prior/superseded character interpretations
  formative episodes
  rejected external attributions
```

Readable synthesis must never become the sole authority. Exact technical records remain beneath it.

# XIV. Vision test

The test for this model is not whether a Thread can recite its biography.

It is:

> **Does the Thread's accumulated life produce a recognizable way of weighing ambiguous situations, while still allowing surprise, growth, tension, current state, commitment, and self-authored change?**

And across time:

> **Can the Thread become meaningfully different while remaining recognizably the same individual, because its present character has an inspectable ancestry in its own past?**

If yes, Fibre is forming character.

If no, Fibre has built a biography database around a generic assistant.
