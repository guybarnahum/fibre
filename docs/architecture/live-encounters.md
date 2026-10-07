---
id: architecture-live-encounters
status: accepted
last-reviewed: 2026-10-07
canonical: true
---

# Live encounters

## Purpose

A Fibre social encounter should feel like two people simultaneously living through one unfolding situation, not a chatbot request/response loop.

The north-star primitive is a **Live Encounter**: ephemeral coordination over World-owned presence and persistent Encounter Story events.

```text
participant A speech/actions  ---->
                                Live Encounter
participant B speech/actions  <----
                                  ^
                                  |
                         World occurrences / LivedNow
```

There is no turn owner.

## Authority model

A Live Encounter coordinates but does not replace existing authorities.

### Durable authority

- `CurrentSituation` — where/how a Thread is actually living now.
- Encounter Story — objective outward events that actually occurred.
- Thread Experience — what one Thread noticed/experienced.
- Journal — private contemporaneous interpretation.
- autobiographical memory / remembered meaning — selective later autobiography.
- relationship / semantic state / intention — only through their existing validated authorities.

### Ephemeral coordination

- active speakers/listeners;
- incoming speech deltas;
- heard-so-far buffers;
- active expression generation;
- cancellation;
- local timing used to notice pauses;
- subscriptions to new World events.

A coordinator crash may end a live connection. It must not erase already committed outward events or create a second life authority.

## Speech is a stream

Speech transport may arrive in token/word-sized deltas:

```text
speech.start
speech.delta "I"
speech.delta " think"
speech.delta " drawing"
...
speech.stable "I think drawing changes how you see."
```

Raw deltas are not persisted as World history.

The live layer tracks what has actually been exposed. Stable outward chunks become Encounter Story beats or beat fragments at an implementation-appropriate boundary.

The semantic rule is:

> **spoken is real; generated but not exposed never happened.**

If expression is interrupted:

```text
Kaleo: "I think the drawing matters because—"
Guy:   "Wait, not the drawing. The act of drawing."
```

the emitted Kaleo prefix remains objective history and is marked interrupted. The abandoned unseen completion is discarded.

Objective utterance beats therefore may carry `completion:"interrupted"`. Normal completed utterances need no completion marker. This attribute describes an observable fact about the outward act; it is not an inference about motive or private cognition.

A restarted expression must be grounded in:

```text
admitted recent Encounter Stories
+ exact interrupted spoken prefix
+ outward speech/events heard since
+ current World situation
+ ordinary Thread-owned private grounding
```

The abandoned unspoken suffix is never supplied as history or context.

## Speaking opportunities

A participant does not receive a turn. Instead, incoming outward speech can create a **speaking opportunity**.

The initial policy is intentionally mechanical and small:

- sentence-ending punctuation `.`, `!`, `?`;
- a configurable meaningful pause;
- end-of-stream.

A speaking opportunity means:

> enough stable outward evidence exists that speaking now would be possible.

It does not mean:

> this participant should speak.

The participant may remain silent and continue listening.

Direct material events may also warrant a new cognition opportunity even while someone is speaking: interruption, movement, an environmental occurrence, another actor entering, or an urgent schedule boundary.

## Structured cognition versus expression

The provider-neutral model boundary distinguishes private/bounded cognition from outward expression:

```text
modelAdapter.invoke(...)
  -> structured candidate cognition

modelAdapter.streamExpression(...)
  -> expression_delta*
  -> expression_complete
```

`streamExpression` accepts an abort signal. Aborting an expression is ordinary encounter behavior, not a model failure that should automatically be retried after audible output.

The World may validate/admit emitted outward expression. Model output never directly mutates protected state.

## Duplex interaction

Each participant independently receives the same evolving outward/World evidence appropriate to that participant.

```text
                    World
                      |
             committed encounter events
                 /             \
                v               v
           participant A   participant B
             listener        listener
                |               |
          cognition?       cognition?
                |               |
            expression       expression
                 \             /
                  ---> World <---
```

Both may begin expression. Overlap is allowed.

No mutex or `whoseTurn` property belongs in the canonical model.

## World interleaving

A live encounter is subordinate to ordinary life:

```text
Kaleo
  eating breakfast
  getting ready
  checking today's tasks

while
  talking with Guy

while World may also admit
  kettle / door / movement / another person / plan transition
```

The encounter must not freeze the current scene merely because a client connection remains open.

A materially changed scene may naturally end or redirect the encounter.

World interleaving preserves the existing attention boundary:

```text
admitted Encounter Story occurrence
  -> objective live world_event
  -> Thread-specific attention
       noticed     -> participant perceivedWorldEvents -> cognition opportunity
       not_noticed -> remains objective history only
```

A live client cannot inject background prose and call it World truth. The bridge reloads the admitted Encounter Story from the experience authority before exposing it to Live Encounter.

Scene movement uses the existing `validateDisplayedSituation()` authority:

```text
displayed/current scene still compatible
  -> continue live encounter

material place/activity/mediated-context change
  -> scene_changed(currentSituation)
  -> encounter may redirect or end
```

A scene change is not itself a forced conversational ending or synthetic farewell.

If the affected Thread is actively expressing, however, that model invocation is grounded in a stale `CurrentSituation` and is therefore cancelled. Already exposed speech remains objective interrupted expression; unseen output is discarded. A subsequent cognition opportunity must use the new authoritative situation.

## Experience and consolidation

The hot live path should preserve only what must be durable immediately:

```text
outward event
  -> Encounter Story
  -> participant-specific Experience when warranted
```

Richer internalization is a bounded later operation:

```text
unconsolidated lived Experience
  -> consolidation opportunity
       -> nothing
       -> Journal
       -> memory / remembered meaning
       -> relationship consequence
       -> semantic state
       -> insight / question / intention
       -> later contact desire
```

No whole-population scan, minute-by-minute worker or required memory quota is implied.

Scheduling is infrastructure-neutral:

```text
durable Experience queue
  -> shared World consolidation wake policy
  -> World reconciliation runtime
  -> infraDriver.scheduler
       local      -> local scheduler port
       Cloudflare -> Durable Object alarm scheduler port
       future AWS -> AWS scheduler port with the same InfraDriver contract
```

Provider deployments must not implement their own consolidation timing semantics. The shared policy requests a delayed wake and preserves any earlier already-scheduled World work rather than postponing it.
The first implementation uses the existing World reconciliation scheduler as a GC-like wake mechanism:

```text
noticed Thread Experience
  -> append-only consolidation queue
  -> first pending item requests delayed World wake (~30s)
  -> nearby later Experiences reuse that earlier alarm
  -> bounded consolidation claim
       same Thread
       same enacted situation
       <= 8 Experiences
       <= 15 minutes lived-time span
  -> one durable consolidation decision
  -> materialize selected artifacts
  -> complete frontier
```

A World wake processes at most four clusters. Remaining or failed work stays in the same reconciliation retry/backoff loop; an empty frontier returns to quiescence. There is no Thread-population scan.

The consolidation decision is append-only and replayable. A retry after storage failure reuses the decision rather than asking the model to reinterpret the same lived evidence.

Time has two meanings and must remain separate:

```text
Experience.occurredAt / memory.subjectPeriod
    when life happened

consolidation decision / Journal / Memory recordedAt
    when delayed reflection became durable
```

A failed artifact write may be retried later with a later valid formation timestamp while preserving the same already-recorded consolidation decision.

Consolidation may also leave up to three private delayed afterthoughts:

```text
insight | question | intention
```

These are private cognitive residue only. They are not automatic speech, commitments, semantic state, relationship authority, or World action. Later slices may let Interior Cognition act on them through the ordinary owning authorities.

Direct relationship or semantic-state mutation is deliberately not part of this consolidation writer; remembered meaning/afterthoughts may later become evidence for those separate authorities.

## Observatory causal projection

Admin may derive an **Encounter Episode** for inspection by following Encounter Story `continuationOfEncounterRef` links.

This is not a session authority.

```text
historical CurrentSituation
  -> Encounter Story beat(s)
  -> this Thread's Attention / Experience
  -> consolidation frontier / decision / completion
  -> Journal / Memory / delayed residue
  -> later semantic / relationship state only when that authority cites this evidence
```

The projection must preserve absence honestly: unnoticed occurrence, pending consolidation, `not_remembered`, no Journal, and no later relationship/semantic consequence are all valid.

A retained memory is linked through its existing Experience event refs. A semantic state or life relation is linked only through its own evidence/source references; Admin never infers that conversation created closeness, trust, resentment, belief or intention.

Journal and autobiographical Memory remain standalone views and authorities. A private journal-book object is presentation, not the Journal authority, and may lag newly consolidated World journal records.
## Thread-to-Thread convergence

The current social meeting machinery already provides the correct admission path:

```text
actual co-presence
  -> Situated Percept
  -> salience
  -> initiator may initiate
  -> recipient accept | decline | defer
```

After acceptance, Thread -> Thread must use the same Live Encounter primitive as Person -> Thread rather than a special fixed opener/reply/closing script.

The reason to interact should come from lived salience, relationship/history, current need, curiosity, shared task or other grounded context. Conversation length is not a proxy for value.

## Social analytics

Admin may derive time-windowed analytics such as exposure, initiative, responsiveness, breadth, reciprocity, depth, continuity and consequence.

These are inspection analytics, not causal personality scores. Fibre must not implement `sociability += 0.1` as the developmental mechanism.

The causal object remains lived meaning and its validated consequences.

## Non-goals

The initial live-encounter implementation does not add:

- a durable chat session;
- a turn manager;
- token-by-token cognition;
- token-level World persistence;
- forced interruption;
- a response quota;
- a meeting-length target;
- a causal sociability score;
- continuous always-on model compute.
