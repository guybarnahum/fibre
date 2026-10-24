---
id: architecture-situated-perception-salience
status: accepted
last-reviewed: 2026-10-22
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


## Observing people: what a Thread can actually know (October 22)

A physical presence does not disclose a person's internal Thread ID or
globally registered name. The World-owned `observablePerson` projection
gives an observer bounded public portrayal from an **available public
portrait Embodiment** (the same family-prior-stripped subject description
authorized for presentation), plus currently enacted activity. If that
authority is absent the description is merely "a person" with the enacted
activity; there is no inference of nationality, religion, ancestry,
temperament, intention or worth. This description is **context-only**,
not a new World fact, private judgment, or authority to invent a gesture.

A name is observer-known only if the two Threads have a current lived
relation or a prior accepted-and-spoken Encounter Story. Otherwise
`observed.name` is `null`, even when World itself knows the civil name.
Introductions, speaker-claimed names, remembering introductions and
recognizing faces across time are **deferred**, not silently guessed from
a portrait. See [observer knowledge owner decision](../decisions/observer-grounded-person-knowledge.md).

**Deferred — observable activity authority.** The current
`Currently: <activity>` phrase in `observablePerson` reuses the
plan-authored `CurrentSituation.activity` prose. That prose can reveal
private purpose or intent even when it is not visible in the World.
A later, World-owned activity category or observed affordance should
provide the public description instead. Until then this field is
**context-only and not authoritative observable evidence**; it must
not justify claims of witnessed motivation or private knowledge.

A recent, personally **noticed** arrival Story can make the newcomer
salient to a witness through `recent_observable_history` and, if the
newcomer is still unfamiliar, make the person's novelty relevant to an
existing exploration drive. `novel_person_under_exploration_pressure`
is a genuine drive×stimulus anchor; generic prolonged stillness is not.
For an arriver, actually noticing already-present witnesses similarly
makes their established presence recent observable history. Body
regulation still records both `exploration` and `social_contact` even
when no social gate opens. The exploration regulator's
`exploration:{novelty:0}` is provisional low-stimulation evidence from
sustained sameness, **not** a general boredom or stranger-interest score;
real novelty and engagement refinement remain deferred to Body-needs work.

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

The profile remains intentionally conservative. W4 added World-derived opportunities, W5 grounded exploration pressure in repeated enacted sameness, and D2 adds sufficiently material evidenced `social_contact` pressure from the same Body frame. Either can make otherwise-background co-presence worth consideration; neither labels an emotion, commands an approach, asserts a relationship or creates a Story. Weak social pressure stays background to avoid speculative cognition.

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

## Graded social acts and reciprocal attention (October 23 source)

Once the existing salience gate earns a person-specific consideration,
Interior Cognition asks neutrally how, if at all, that Thread engages:
`none | acknowledge | greet | remark | invite_conversation`.
Neither suppress nor manufacture interest. The situated setting includes
bounded, World-admitted public-place affordances as **context**, not a
behavioral command. Affordances remain context-only until live differential
choice is shown.

A chosen nod, greeting or remark creates one objective Encounter Story
(`action` for acknowledgment, `utterance` for speech), with the initiator's
immediate, observer-owned Experience and independently appraised recipient
attention. The other person may not notice. Only a noticed act earns a
single observed social opportunity to choose an act of their own. The
recipient can ignore, gesture, speak, invite a conversation, or do nothing;
no reply is prescribed. An invitation alone retains the existing
accept/decline/defer and Live Encounter path. `none` remains
`not_initiated`; a small outward act completes as `acted`, not `met`.

Reciprocity reuses the claimed, one-shot World observed-opportunity record.
For each pair and independently continuous shared venue visit, at most
four act-triggered opportunities are admitted across **both directions**.
The visit's start is derived conservatively from bounded, World-enacted
situation history; without a provable start, no further opportunity is
created. This cap prevents unbounded cognition, not long conversation or
social agency. There is no added timer, global scan, forced contact or
new meeting state machine. A recipient's possible response requires one
attention appraisal; a noticed response opportunity later spends the
ordinary social decision model call.

**Deferred:** a greeting satisfying Body social need, explicit learning
of names through speech, event-driven reconsideration during continuous
co-presence beyond these acts, and proof that Memory changes a subsequent
unforced social choice.

Social initiation uses strict structured output: `introducesSelf` is always
present as a boolean, false when no introduction is chosen.

## Familiarity, introductions, and person-owned social history (October 23 source)

When a Thread sees a real co-present person, Situated Percept may include
`familiarity` from **this observer's own** noticed Encounter Stories
containing that person, but never the current encounter or the current
continuous shared visit. The query's strict upper bound is the earlier of
six hours before consideration and the proven start of this shared visit.
Immediate noticed episodes remain in `recentPersonalExperiences`, not
duplicated as established familiarity. A single indexed query reads at most
twelve relevant records,
including a bounded noticed count, last time, available World-attested
place names and up to two of the observer's own Experience texts. The
count is bounded inspection evidence, not a lifetime encounter total.
Merely sharing a venue or another observer's `noticed` attention cannot
create familiarity. The deterministic `recognized_person` salience
anchor earns voluntary consideration, not contact.

An explicitly selected `introducesSelf: true` on a spoken act may disclose
the speaker's full name **or a name token actually spoken**. The World Story
beat records `disclosesSpeakerName` and the specific `disclosedName`
(e.g. "Surafel", not an unheard surname). Only observers whose own
attention `noticed` the admitted Story can learn that disclosed fragment.
A claimed introduction without any spoken name token is simply an ordinary
act; it does not interrupt the meeting. Existing life-relation and
accepted-spoken-encounter full-name knowledge remain separate rules, as
before this correction. Unknown name parts stay redacted in an
introduction-only projection. This is observer-relative knowledge, never a
global rename, inferred introduction from unmarked prose, or grant of
the speaker's complete civil identity.

An actually admitted, consented conversation establishes one factual
`social_contact` relation in **each** direction; another meeting adds
a revision. Private liking and relationship meaning stay in Experience,
Memory and semantic life, not the World-fact relationship record.
`social_contact` makes a person a possible later-contact candidate;
the existing contact engine still waits for a completed private
consolidation with afterthoughts and makes a separate autonomous
decision. No new contact scheduling or model invocation is added.

Social initiation and social response supply a Fibre-owned
`focusPartyId` from the counterpart in the Situated Percept. Existing
Interior Cognition selection first prefers that party's own relations,
then Memories whose event refs resolve through the observer's own
Experience → Encounter Story → that party's actual attributed action.
Mere co-presence does not make a bystander's Memory person-specific.
The same six relations / four Memories budgets and default tie-breakers remain.
One indexed, bounded retrieval of up to 64 shared Experience IDs
supports person-keyed Memory selection. A stranger uses default
ranking. This is context-only until a later voluntary choice shows
an attributable difference; neither counting a person as familiar
nor retrieving their Memory proves friendship or changed behavior.

**Status:** source-only; Guy has not locally validated this slice and
will not deploy until natural staging evidence for earlier social
slices has been reviewed. The limitations above are computational
bounds, not permanent personhood restrictions. Owner decision is
[proposed ADR-0029](../decisions/ADR-0029-recognition-and-acquaintance.md).

## Reconsideration after an enacted change (October 23 source)

A prior voluntary `none` does not become a permanent stance toward
someone sharing the same venue. World may earn another *opportunity*
without prescribing a changed answer, but only for two real changes:

- **Activity change:** a new World-enacted situation has a different
  activity but the same physical venue, with another awake person present.
  A refreshed plan with unchanged activity is not an event.
- **Predicted social-contact band:** where earlier enacted history already
  grounds the Body's `social_contact` drive, Fibre analytically predicts
  when its existing pressure would cross 0.4 or 0.6, using the inherited
  social sensitivity and the current observed-contact evidence. The
  prediction must precede the Thread's next lived boundary. One band is
  recorded **once per continuous venue visit**, keyed by Thread, visit
  start and threshold rather than by the situation at the moment of
  prediction. Repeated activity changes cannot re-arm it, even after
  completion. The next higher band is considered after the earlier
  obligation fires. At the instant due, the existing regulator checks
  the signal again; intervening accepted contact may invalidate it.
  Missing evidence never becomes clock-derived loneliness or a wake.

A genuine arrival also offers this prediction to at most two already
present, eligible witnesses. A solitary occupant gains no social timer,
but when another person really arrives, previously grounded Body
pressure can earn a future band crossing without forcing the occupant
to refresh their own life. Departure before the crossing cancels the
social possibility; no lost event is retrospectively replayed.

Both events reuse the durable social-opportunity claim and existing
freshness, company-continuity and life-debt rules. During consideration,
one person is selected from the actual company present at the event.
A recently noticed Story with that person gives a bounded preference;
neither that preference nor a previous social decision grants a right
to contact. Interior Cognition sees up to three of the Thread's *own*
previous choices toward the same counterpart in this shared visit
(`priorSocialChoicesThisVisit`), including silence and its explanation.
This is also available to a person who independently notices and
considers replying to a witnessed arrival or small social act.
This is **context-only**, not automatic reversal or persistence of a
stance. The normal salience gate and five-act choice remain decisive.

At most three triggered reconsiderations per person per continuous
venue visit, and at most two per ordered pair, are computation limits.
Continuous presence is established through at most sixteen prior
World-enacted situations; missing history is not assumed company.
No general social tick, repeated pair scan, model call on background
salience or exploration-band timer was added. Exploration remains a
provisional organismic proxy, not an automatic interest in strangers.
This source implementation still requires local validation and natural
staging observation; it does not establish additional meetings or
Memory-driven relationship formation.

## Reciprocal social momentum

Actual outward interaction is part of the exterior world and may influence later salience and cognition.

Persisted pairwise evidence may include:

```text
A asked B -> B accepted
B asked A -> A accepted
A asked B -> B deferred
A asked B -> B declined
```

Later Situated Percepts may project a bounded perspective-aware recent history.

This remains evidence, not a `socialMomentumScore`.

A private `not_initiate` thought is not shared history because nothing happened in the other Thread's world.

Prior Encounter Stories and the perceiving Thread's own memories/relationship state remain separate authorities: the shared event says what happened; the Thread's private history says what it came to mean.

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

Do not add an `attractivenessScore`.

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

**One-shot social decision evidence (October 20 source):** the ordinary
completed World social-opportunity row now retains `salience.bodyAtGate`
with the regulation frame's `asOf` and the actual `social_contact` and
`exploration` drive orientations, pressures and evidence refs presented
to the gate. `null` means no regulation frame was available; a present
frame with no relevant drive means no such supported reading, not zero
pressure. This is deliberately limited to already-admitted, one-shot
social opportunities, including `background`: there is no new polling,
event, store, private decision, model call, or retroactive reconstruction.
The operator probe shows the Body reading for a background outcome, and
older rows lacking the witness remain explicitly `not recorded`.
This is **Notarial/mechanical diagnostic evidence**, not proof that the
organism felt lonely, a social opportunity should become a conversation,
or that a reported motive caused the decision. The existing materiality
threshold and individual initiation/consent remain unchanged.

**Live diagnostic motivating this witness:** on October 20 in staging,
Giorgi's 11:35 UTC co-presence yielded `background` with no anchors and
no stored Body reading; Ioseb's separate 07:45 UTC consideration was
`salient` through noticed history and reached his independently
authored `not_initiate` decision despite a modest measured
`social_contact` pressure of `0.375197`. A missing Giorgi reading must
not be interpreted as `0`, and Ioseb's autonomous restraint is not a
salience failure. The new witness will only illuminate **future**
one-shot opportunities after deployment.

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
