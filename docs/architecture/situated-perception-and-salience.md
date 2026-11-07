---
id: architecture-situated-perception-salience
status: accepted
last-reviewed: 2026-11-06
canonical: true
---

# Situated perception and salience

## Purpose

Fibre should not make Threads sociable by repeatedly asking whether they want to talk.

A Thread should inhabit a World that contains places, people, activities, interruptions, novelty, obligations and ordinary happenings. Some of those things become salient; most remain background. Interior Cognition should run only when something in that lived situation matters enough to warrant thought.

The canonical loop is:

```text
World possibilities
  -> Flight Plan
  -> LivedNow / CurrentSituation
  -> Situated Percept
  -> intrinsic regulation + salience
  -> Interior Cognition when material
  -> ordinary action or no action
  -> Encounter Story when something observably happens
  -> Thread Experience / memory / relationship consequence
  -> future perception, regulation and planning
```

This is a general lived-world primitive. Social interaction, curiosity, attraction, helping, interruption, avoidance, exploration and environmental noticing are consumers of the same loop rather than separate behavior engines.

## CurrentSituation is truth; Situated Percept is bounded exterior perception

`CurrentSituation` remains World-owned enacted truth about where/how a Thread is present and what she is doing.

A **Situated Percept** is an ephemeral bounded projection of the exterior situation that this Thread could presently perceive or use for cognition.

Conceptually:

```text
SituatedPercept
  situationRef
  setting
    physical / mediated context
    place identity / public texture when known
    own current activity
    available temporal context when known

  observable entities[]
    stable entity ref
    public/observable identity
    visible or otherwise observable activity
    authorized embodiment facts when relevant
    familiarity only when Fibre can ground it

  recent observable events[]
    admitted World occurrences
    outward social requests/responses
    other authorized scene facts

  affordances[]
    ordinary possibilities supported by the situation
```

It is **not** a second World store and should normally not be persisted. It is derived from authoritative records and can be reconstructed from its source refs.

It must not contain another person's private feelings, memories, intentions or inferred mental state.

Prefer:

```text
Yael is sketching alone at the nearby table.
The bus is twelve minutes late.
Noor asked me a direct question.
```

Do not project:

```text
Yael is lonely.
Noor wants reassurance.
She is attracted to me.
I should speak to her.
```

Interpretation belongs downstream.

## World opportunities, not social prompts

The World should create or expose ordinary **opportunities** because life is underway, not because a validation harness needs a conversation.

Examples include:

- a familiar Thread independently present in the same café;
- a classmate working on the same problem;
- somebody dropping papers nearby;
- a dog running past;
- an unusual sound;
- a delayed bus;
- a new book on a display;
- a street musician;
- a direct social request;
- a shared task or obligation;
- a person whose appearance or behavior catches attention.

An opportunity is not automatically an Encounter Story. Mere co-presence may remain background. A World occurrence that objectively happens can become an Encounter Story whether or not the Thread notices it; personal experience still requires the normal attention/experience path.

When an observer appraises an Encounter Story as `not_noticed`, their private attention record keeps a short first-person `passedReason` explaining the missed salience from their own situation. Noticing keeps `passedReason:null`. This is diagnostic interior evidence only: it does not bias the attention decision, enter objective Story beats, other Threads' percepts, or later choices. The individual Thread's private Observatory may display it. Historic attention rows retain `null`; the original attention record digest intentionally covers only Thread, Story, situation, time and outcome, **not** `passedReason`, so admission identity and existing digests remain unchanged.

Fibre Commons remains one legitimate mediated place. It is not the mechanism by which social life exists and must not be the acceptance harness's artificial source of motivation.

### A scene yields independent actor opportunities

Co-presence is not one aggregate “people nearby” event.

If Mina is in a café with Noor and Sela, the Situated Percept should expose separate actor opportunities:

```text
actor_presence -> Noor
actor_presence -> Sela
```

Each receives its own salience decision and may independently remain background, reach Interior Cognition, or become an encounter. One lived interval may therefore contain several distinct encounters. Fibre must not arbitrarily choose “the first person in the room” merely to bound implementation cost.

The first implementation discovers co-present Threads whose already-established CurrentSituations are compatible with the observer's World-owned current situation. The caller names only the observing/initiating Thread; it does not choose counterparties. Candidate lives are re-reconciled before use and must still be compatibly present.

This is **current-scene discovery**, not whole-population thaw. A Thread with no already-established current-life evidence is not automatically awakened merely to see whether she might now be nearby.

Group interaction remains an open composition path: several actor opportunities may later converge into one group Encounter Story when something actually happens among them. Fibre should not model every person in a café as one forced group meeting.

When several actor opportunities belong to the same lived observation, their initial salience/participation judgments should be formed from the same pre-aftermath state. Do not let arbitrary database/thread ordering make “the first person considered” change the private context used to consider the second. Admit consequences only after the same-scene judgments that depend on that shared starting state are fixed.

### Humans and direct address

The same opportunity vocabulary should eventually include humans and other observable actors. A human does not need a Thread genome, private state or LivedNow; Fibre needs an authoritative exterior presence/action record in the Thread's current scene.

Ambient human presence can behave like any other actor opportunity:

```text
actor_presence
  actorKind = person
  actorRef = person_guy
```

A concrete action addressed to the Thread is different:

```text
person speaks to Thread
  -> admitted direct_social_act
  -> warrants appraisal
  -> Interior Cognition
  -> respond | decline | defer | ignore as the domain permits
```

Direct address need not pass ordinary low-level salience because being actually addressed is itself a material observable event. It still creates no obligation to answer.

Do not invent a human's feelings, motives, intentions or personality from appearance. Only admitted observable/public facts may enter the Situated Percept. Continuous conversation should remain a continuing encounter made of outward acts, not a separate conversation-store authority.


## Observing people: what a Thread can actually know

A physical presence does not disclose a person's Thread ID or civil name. What an observer can know of another person — public appearance, outward activity, a name only when observer-known, its own familiarity and recently noticed experiences — is set out in [social life §2](social-life.md#2-what-a-thread-perceives-of-another-person) and the [observer knowledge decision](../decisions/observer-grounded-person-knowledge.md). The same view is used inside a live conversation. It is **context-only**: it shapes what the Thread can draw on, never authority to invent a gesture or assert another person's inner life.

A recent, personally **noticed** arrival can make the newcomer salient through `recent_observable_history`, and, if the newcomer is still unfamiliar, make novelty relevant to an existing exploration drive (`novel_person_under_exploration_pressure`, a genuine drive × stimulus anchor; generic prolonged stillness is not). The exploration regulator's `novelty:0` is provisional low-stimulation evidence from sustained sameness, not a general boredom or stranger-interest score.

## Salience is mechanical attention, not meaning

Most of the World should remain background.

A small **Salience Gate** decides whether an observable opportunity is material enough to warrant cognition.

Possible grounded inputs include:

```text
observable novelty
current interruption cost
relationship/familiarity relevance
recent reciprocal interaction
active commitment pressure
current intrinsic-regulation pressure
change or surprise relative to the existing situation
small bounded microvariation
```

The gate may use numeric/control state because it is mechanical attention machinery. Its output is not a need, feeling, motive, preference or decision.

Conceptually:

```text
opportunity + current organism/life context
  -> background
  -> salient enough for cognition
```

A direct request may bypass ordinary low-level salience because another person has actually addressed the Thread; it still does not create consent or acceptance.

The gate should be cheap, deterministic where its evidence is deterministic, inspectable and zero-model for background events.

The first accepted implementation is intentionally non-numeric. For co-present Thread opportunities it treats only grounded materiality anchors as sufficient:

```text
shared mediated context
planned/enacted participant presence
recent admitted observable interaction history
unexpected observable / scene anomaly
```

The last category is **context-relative**, never a universal weirdness score. The World/opportunity producer may mark an `unexpected_observable` only when it can ground the deviation in actual scene evidence. The Salience Gate consumes that cue; it does not invent it.

Examples:

```text
oversized neon hat at a funeral       -> may be unexpected_observable
same hat at a costume party           -> probably ordinary

nudity in an ordinary café            -> likely unexpected_observable
nudity at a nudist beach              -> probably ordinary

someone sprinting through a library   -> likely unexpected_observable
someone sprinting on a track          -> ordinary
```

The cue says only **this observable state is unusual enough here to enter attention**. It does not say funny, attractive, sexual, threatening, shameful, rude or important. Those meanings belong downstream to regulation and Interior Cognition.

If no materiality anchor is present, compatible co-presence remains `background`. That outcome is **not** `not_initiate`: no private social decision occurred, no refusal happened, and no shared social history may be authored.

If an anchor is present, the gate returns `salient` and ordinary Interior Cognition may still decide `not_initiate`. The gate therefore controls whether cognition is warranted, not what the person wants.

The profile remains intentionally conservative. Besides the anchors above, exploration pressure grounded in repeated enacted sameness and sufficiently material evidenced `social_contact` pressure from the same Body frame can each make otherwise-background co-presence worth consideration; neither labels an emotion, commands an approach, asserts a relationship or creates a Story. Weak social pressure stays background to avoid speculative cognition.

Do not convert these anchors into a universal human-attention formula or weighted score.

## Social and cultural pressure belongs to the developed person

Politeness, hospitality, conversational norms, deference, directness and expectations about acknowledging another person are not universal numeric constants.

They arise from upbringing, culture, relationships, roles and lived history and therefore enter Interior Cognition as developed-self evidence or relevant external social convention when actually grounded.

For example:

```text
direct request
  + learned norm that direct requests deserve acknowledgment
  + current concentration cost
  + relationship with requester
  -> Interior Cognition
  -> accept | decline | defer
```

Social pressure can make acceptance or acknowledgment more attractive. It is never consent.

Do not implement demographic lookup rules such as `culture => yes`, and do not add a global `politenessScore`.

## Boredom, curiosity and exploration

Curiosity should not be prompt decoration.

The accepted intrinsic-regulation architecture already includes exploration/information/play. When Fibre has grounded evidence such as prolonged low-novelty activity, stalled progress, repeated routine, a surprising observable cue or an information gap, regulation may create exploration pressure.

Interoception may then become semantic restlessness, interest, curiosity or no durable state depending on the Thread.

A new opportunity can become more salient under that pressure:

```text
long low-novelty wait
  -> exploration pressure
  -> unusual person/event becomes salient
  -> Interior Cognition
  -> inspect | approach | ignore | continue current activity
```

Do not infer boredom merely because a clock advanced.

## From salience to social choice

Once salience earns a person-specific consideration, the social path — graded acts, invitations, continuation of an ongoing exchange, reconsideration within a visit, introductions and acquaintance — is owned by [social life](social-life.md) ([ADR-0027](../decisions/ADR-0027-graded-social-acts.md), [0028](../decisions/ADR-0028-event-driven-social-reconsideration.md), [0029](../decisions/ADR-0029-recognition-and-acquaintance.md), [0033](../decisions/ADR-0033-ongoing-exchange-may-become-conversation.md)).

Recent reciprocal history (who asked whom, who accepted, declined or deferred) is derived on demand from admitted Stories and stances. It is evidence, never a `socialMomentumScore`, and a private `not_initiate` is not shared history because nothing happened in the other Thread's world. The shared event says what happened; the Thread's own history says what it came to mean.

## Attraction and embodiment

Observable embodiment may be part of the Situated Percept when the other person is actually visually present and the embodiment fact is authorized for that context.

Attraction is never an objective property of the observed person.

The eventual path is:

```text
observable embodiment
  + developmentally appropriate reproductive/social regulation
  + this Thread's orientation/preferences/history
  + current relationship and setting
  -> possible salience
  -> Interior Cognition
```

Do not add an `attractivenessScore`. The accepted concept is [attraction and orientation](../concepts/attraction-and-orientation.md).

## Bounded microvariation

Fibre should support spontaneity without making persons arbitrary.

Any stochasticity belongs in low-level attention/salience near ambiguous thresholds, not as a post-hoc decision flip.

Never:

```text
decision = no
10% random flip
decision = yes
```

Instead, a later experimental Salience Gate may include small bounded replayable variation in attention strength or threshold. Strong signals should remain strong; only genuinely close calls should be affected.

The variation must be derived from stable episode inputs so replay/retry does not rewrite history.

This feature is **experimental** until it demonstrates meaningful variability without degrading within-Thread coherence.

## Interior Cognition remains the mind

Situated Percept and Salience Gate do not decide what the Thread wants.

Once something is material, Interior Cognition receives:

```text
salient exterior concern
  + current organismic/interoceptive state
  + developed-self evidence
  + relevant memory/relationship history
  -> private Thread judgment
```

The same component should eventually serve:

- social initiation;
- response to a direct request;
- curiosity/exploration;
- helping or avoidance;
- dignity/participation;
- reflection and other inner decisions.

Domain adapters define the question/result contract. They do not assemble a persona or select private history.

## Persistence and authority

Keep this architecture light.

Persist only things that actually become durable truth or consequential history:

- Flight Plan and CurrentSituation through existing authorities;
- actual World occurrences / Encounter Stories;
- outward social requests and observable responses;
- Thread Experience when noticed;
- admitted semantic state, memory, relationship or intention consequences.

Do not persist every Situated Percept, background opportunity, salience score or attention tick.

For debugging and validation, a bounded replayable witness may record source refs and mechanical salience inputs/outcome without becoming semantic evidence.

**Body reading at the gate.** A completed social opportunity, including `background`, keeps `salience.bodyAtGate`: the regulation frame's `asOf` and the `social_contact` and `exploration` orientations, pressures and evidence refs the gate saw. `null` means no frame was available, not zero pressure. This is Notarial diagnostic evidence for operators, not proof of loneliness or of a motive behind the decision.

## Implementation shape

Do not build a new perception service hierarchy, event bus, social simulator or agent framework.

The first production shape should be a few compact modules inside the existing World Kernel:

```text
situated-percept.mjs
  authoritative exterior projection

salience-gate.mjs
  cheap materiality decision

interior-cognition.mjs
  already-existing private mind
```

World opportunity creation should remain a bounded LivedNow/World capability and reuse Encounter Story once an observable occurrence is admitted.

The first implemented opportunity producer is intentionally narrow but endogenous: World/LivedNow exposes the latest established current situations, compatible co-presence is discovered without caller-supplied counterpart IDs, and Situated Percept derives one `actor_presence` opportunity per observed Thread.

```text
observer CurrentSituation
  + World-current situations
  -> compatible actor discovery
  -> one actor_presence opportunity per actor
  -> independent salience
  -> optional cognition
  -> zero, one or several encounters in the lived interval
```

This is not yet automatic discovery of every nearby human, object or environmental event, and it does not thaw the entire population merely to search for possible presence. It proves the authority direction while keeping the implementation bounded.

Do not emit `unexpected_observable` until World has an authoritative observable scene fact that can justify “unexpected relative to this setting.”

The standard remains:

> **Build the smallest proof that preserves the largest credible Fibre architecture.**

## Drift tests

The model is drifting if:

- Commons or a test harness manufactures social desire;
- a `yes` probability or agreeableness score substitutes for lived reasons;
- randomness directly flips private decisions;
- Situated Percept reads another Thread's private interior;
- every observable scene detail causes a model call;
- a social-specific subsystem duplicates general perception/salience/cognition;
- missing observations are treated as neutral facts;
- opportunity generation is tuned to make staging pass rather than to produce ordinary credible life;
- the easiest explanation becomes “agents are periodically prompted to interact.”

The target is:

> **Threads encounter the World because they are in it. The World supplies circumstances; the organism notices selectively; the person decides what those circumstances mean.**
