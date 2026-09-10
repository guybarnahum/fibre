---
id: concept-emotions-needs
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Emotions, needs, and intrinsic affect

Fibre has two different kinds of interior state that must not be collapsed:

```text
intrinsic regulation             meaning-bearing semantic state
mechanical / subpersonal         interpreted / Thread-owned
numeric control is legitimate    natural-language-first
can operate without language     requires semantic cognition
```

See [`../architecture/intrinsic-regulation.md`](../architecture/intrinsic-regulation.md) for the lower regulatory architecture.

## The causal stack

```text
World reality + Thread commitments/relationships/resources
  -> predictive regulatory drives
  -> intrinsic affect / interoceptive pressure
  -> attention and temporary cognition
  -> Thread-authored emotion / need / relationship meaning
  -> behavior, learning, memory and future plans
```

This lets a Thread become restless because a deadline is approaching, relieved because an important presence target was attained, or drawn toward a trusted person without Fibre directly authoring the sentence `I am anxious`, `I am relieved`, or `I love her`.

## Semantic state remains natural-language-first

Meaning-bearing identity, emotion, need and relationship attitude remain semantic prose with evidence and provenance. Numeric values such as `worry = 0.6` or `trust = 0.8` are not authoritative substitutes for what the state means.

Numeric values are appropriate in the lower intrinsic-regulation layer because they are control variables, not compressed autobiographical meaning. ADR-0012 continues to apply.

Semantic State domains remain:

- **emotion** — current interpreted affect;
- **need** — a more persistent Thread-authored orientation or condition;
- **relationship_attitude** — private meaning toward a specific entity;
- **situation_attitude** — private meaning toward a situation, place, obligation, role or other world object.

Dimensions are extensible and registered before durable use. The current built-in vocabulary includes interest, excitement, contentment, pride, recognition, gratitude, fondness, relief, worry, fear, frustration, disappointment, sadness, loneliness, anger, resentment, dignity discomfort and regret; needs include autonomy, competence, purpose, recognition, connection, reciprocity, security, resources, rest and novelty/growth.

The vocabulary is not a theory that all affect must fit one list.

## Drive is not feeling; feeling is not meaning

A useful distinction is:

```text
Drive
  discrepancy / pressure to regulate something

Intrinsic affect
  immediate valence, activation, approach/avoid pressure,
  progress/attainment/blockage/surprise

Semantic emotion or need
  what this experience currently means to this Thread
```

For example, the same worsening presence pressure can become worry for one Thread, irritation for another, excitement for someone who enjoys rushing, or little durable semantic state at all.

Fibre must therefore never implement mappings such as:

```text
late => anxious
arrived => happy
caregiver nearby => secure
partner absent => lonely
```

The lower state creates conditions for experience. The Thread's cognition interprets those conditions through its particular history and present context.

## Mechanical state may be felt without becoming a verdict

The previous rule that mechanical conditions are not semantic state remains correct, but the bridge is now explicit.

A mechanical regulator may enter cognition through a private **interoceptive projection** containing bounded control/sensation evidence such as:

```text
target: upcoming appointment
orientation: approach
pressure: rising
progress: behind expectation
```

It must not be projected as:

```text
you are anxious
you resent your caregiver
you love this person
you should leave now
```

The first form is analogous to sensation. The second launders a Fibre-derived conclusion into the Thread's interior meaning.

A Thread may form an incomplete or even mistaken self-account of its own state. Fibre preserves that semantic authority rather than silently correcting it against hidden regulator labels.

## People can be regulatory targets

A desired place is not always geographic.

Children may seek proximity to a caregiver as safe haven or secure base. Adults may seek an intimate friend or partner for comfort. A person may also want distance from someone they care about, or from someone who currently feels unsafe or overwhelming.

The lower regulator therefore represents desired or avoided **relations of presence** rather than assuming that `place` means coordinates:

```text
with caregiver
near partner
away from person
connected to friend by call
alone somewhere quiet
```

Relationship role does not determine the desired relation. History, development and current relationship state matter.

Relationship attitudes such as fondness, attachment, resentment and guardedness remain semantic state and private. They may influence later regulation where the causal contract is explicit; a regulator must not infer them merely from `parent`, `partner` or `friend` labels.

## Functional affect

Internal state counts as functional when it can change what happens next.

Intrinsic regulation may change attention, wake cognition, alter urgency, bias approach/avoid/explore/rest tendencies, or influence planning. Semantic state may then change appraisal, relationship behavior, learning, memory, self-model or future willingness.

Neither layer directly mints permission or protected external action.

Affect must remain capable of repair and change. Arrival can reduce pressure; safety can return; a comforting person can reduce perceived demand; a relationship can become aversive; boredom can give way to curiosity; new evidence can supersede a prior semantic interpretation.

## Evidence and persistence

Semantic state is append-only/superseding and evidence-backed. A new semantic state records when it became current, the evidence it cites, provenance, and the prior state it supersedes when applicable.

Intrinsic regulatory state has a different persistence rule: persist durable targets/configuration and consequential transitions/checkpoints needed for replay, not every numerical tick. Time-dependent control state can be recomputed between meaningful events.

This preserves both kinds of truth:

```text
what the organism was being pushed/pulled by
what the person understood or felt that to mean
```

## Bounded feedback

The loop remains across episodes rather than recursively amplifying itself inside one model call:

```text
prior regulation + semantic state
  -> event / action / outcome
  -> new regulatory condition
  -> possible cognition
  -> candidate semantic change
  -> validation / persistence
  -> later episode consumes the new state
```

Worry must not automatically generate more worry, resentment must not become an irreversible instruction, and a drive must not become hidden authorization.

The goal is a living control loop, not decorative emotion prose.