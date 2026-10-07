---
id: validation-n7-live-encounter-slices
status: accepted
last-reviewed: 2026-10-07
canonical: true
---

# N7 — Live encounters and social consequence

N7 takes the accepted N5/N6 encounter authorities and removes the remaining chatbot-shaped constraints.

North-star claim:

> **Threads share unfolding life with people and other Threads: they can listen, speak, interrupt, remain silent, be interrupted by the World, remember selectively, continue thinking later, and sometimes seek one another again because the encounter mattered.**

N6.6 public/client proof remains preserved and resumable. N7 may refactor the underlying encounter engine; it must preserve N6's agency and World-authority invariants rather than preserve its transitional HTTP/request-response shape.

## N7.0 — architecture re-baseline — ACCEPTED

Accepted by the project owner on 2026-10-07 and recorded in ADR-0024.

- no turn owner;
- Live Encounter is ephemeral coordination over durable World/Encounter authorities;
- sentence punctuation, meaningful pause and end-of-stream create speaking opportunities, never mandatory replies;
- speech is interruptible and only exposed speech becomes objective history;
- structured cognition and streamed expression are separate provider-neutral model operations;
- World life continues during conversation;
- consolidation is later/bounded and does not have to run after every conversational beat;
- Person -> Thread and Thread -> Thread converge on the same live-encounter primitive.

## N7.1 — provider-neutral streamed expression — ACCEPTED 2026-10-07

**Capability:** Fibre can stream outward language incrementally and cancel it without converting transport deltas into World authority.

Add beside existing structured `modelAdapter.invoke(...)`:

```text
modelAdapter.streamExpression({
  systemPrompt,
  input,
  clientRequestId,
  signal
})
  -> expression_delta*
  -> expression_complete
```

Requirements:

- provider-neutral events;
- OpenAI Responses streaming and Google `streamGenerateContent` map to the same Fibre event vocabulary;
- caller cancellation stops generation;
- no retry after any delta has become outwardly visible;
- stream transport does not expose provider reasoning;
- this slice does not yet persist deltas as Encounter Story.

**High-value proof:** the same consumer can stream expression from two provider adapters and cancellation leaves only the already-observed prefix.

Accepted after focused model/runtime tests and full `npm run slice:validate` passed locally. OpenAI and Google now expose the same `expression_delta* -> expression_complete` Fibre vocabulary; caller cancellation after an observed prefix cannot leak later buffered output.

## N7.2 — duplex encounter event stream — ACCEPTED 2026-10-07

**Capability:** inbound and outbound outward events coexist; there is no turn manager.

- maintain ephemeral heard-so-far per participant;
- accept incremental inbound speech;
- expose speaking opportunities at `.`, `!`, `?`, meaningful pause and end-of-stream;
- a speaking opportunity may produce silence;
- both participants may express concurrently;
- no durable conversation/session object.

Implemented foundation:

- `services/world-kernel/src/live-encounter.mjs` is an ephemeral coordinator only;
- each participant has independent speech state and listener-specific heard-so-far buffers;
- token/word-sized deltas may arrive incrementally;
- batched deltas are split at sentence punctuation before later text is exposed;
- sentence boundaries, meaningful pauses and end-of-stream create speaking opportunities;
- punctuation and a later pause at the same text position are separate opportunities;
- a pause is emitted at most once per unchanged speech position;
- multiple participants may remain active speakers simultaneously;
- no turn/session authority is created.

**High-value proof:** one participant can continue speaking across an unused opportunity; another can begin speaking at a later pause while the first remains active, with no turn-transfer record. A separate boundary proof verifies sentence, pause and end opportunities and proves batched speech cannot expose post-boundary text before the boundary opportunity.

Accepted after the focused Live Encounter/streaming suite and full `npm run slice:validate` passed locally.

## N7.3 — interruption and audible-prefix truth — ACCEPTED 2026-10-07

**Capability:** new material evidence may redirect active expression.

- abort active expression on a chosen interruption;
- commit only actually exposed speech;
- mark an incomplete audible expression as interrupted;
- restart cognition from committed encounter history + spoken prefix + interrupting event + current World state;
- never resurrect the abandoned unseen completion.

Implemented foundation:

- Live Encounter now distinguishes normal speech completion from interruption;
- `streamExpressionIntoLiveEncounter()` feeds provider deltas directly into the duplex encounter and uses caller cancellation as an interruption boundary;
- only deltas already exposed through Live Encounter contribute to the returned audible text;
- interrupted audible speech becomes an objective Encounter Story utterance with `completion:"interrupted"`; unseen provider output is discarded;
- streamed lived-response cognition reuses the same Thread identity/current-situation/semantic-state/memory/admitted-history grounding as the accepted N6 response path;
- after interruption, restarted cognition additionally receives the exact prior spoken prefix plus current `heardSoFar`, so new speech can redirect rather than mechanically resume the abandoned completion;
- provider failure after audible output closes that speech as interrupted rather than leaving a phantom active speaker.

**High-value proof:** interrupted and uninterrupted runs share the same prefix, but only the uninterrupted run contains the later generated suffix.

Accepted after the focused interruption/cognition/story-persistence suite and full `npm run slice:validate` passed locally.

## N7.4 — World interleaving — CURRENT

**Capability:** conversation no longer freezes ordinary life.

- LivedNow and current activity remain authoritative;
- environmental occurrences may happen during conversation;
- participant movement/plan boundaries may redirect or end the encounter;
- zero background occurrence remains valid.

Implemented foundation:

- Live Encounter can receive bounded objective `world_event` records while participant speech remains active;
- the bridge accepts an `encounterId`, reloads the admitted Encounter Story from `experienceStore`, and never accepts caller-authored occurrence prose as World truth;
- objective World events are visible to the live encounter regardless of whether a Thread noticed them;
- participant-specific `perceivedWorldEvents` contains only events whose existing Thread attention record is `noticed`; `not_noticed` occurrences do not enter cognition;
- noticed World events create a speaking opportunity but never force speech;
- perceived World events are bounded to the most recent 12 per live participant;
- LivedNow scene reconciliation reuses `validateDisplayedSituation()`; compatible life remains in the encounter, while a materially changed scene emits `scene_changed` carrying the authoritative current situation;
- scene change does not invent a turn or synthetic goodbye; later orchestration may redirect or end the encounter according to the new life.

**High-value proof:** a genuine World event admitted during an encounter becomes available to cognition without being authored by the client.

**Additional proof:** an unnoticed admitted event remains objective live history but is absent from Thread cognition, and a LivedNow transition is forwarded from the authoritative validation seam rather than fabricated by the client.

## N7.5 — GC-style consolidation

**Capability:** immediate conversational latency no longer requires full Journal/Memory work.

- durable Experience establishes the consolidation frontier;
- ordinary World reconciliation/alarm processes bounded unconsolidated evidence;
- no population scan and no high-frequency daemon;
- conversation end is one possible trigger, not a prerequisite;
- selective outcomes: none, Journal, memory/meaning, relationship/semantic consequence, insight, question, intention.

**High-value proof:** a completed encounter survives before consolidation, later consolidation advances exactly once, and a no-consequence result is valid.

## N7.6 — Observatory causal encounter view

**Capability:** Admin makes the causal path inspectable without collapsing authorities.

Derive Encounter Episodes from causal continuation/history and show:

- World scene/place/activity/background occurrences;
- outward conversation/actions, overlap and interruption;
- this Thread's Experience;
- consolidation frontier/result;
- links to Journal, memories and semantic/relationship consequences.

Journal and Memories remain standalone authorities.

## N7.7 — social analytics, not a sociability score

Expose derived, non-causal time-windowed analytics:

- exposure;
- initiative;
- responsiveness;
- breadth;
- reciprocity;
- depth;
- continuity;
- consequence.

Do not feed an aggregate social score back into cognition.

## N7.8 — rich Thread -> Thread Live Encounter

Replace the accepted social meeting's fixed opener -> reply -> closing generation with the same duplex engine.

Preserve:

- genuine World co-presence;
- Situated Percept;
- cheap salience;
- Thread-owned initiation;
- recipient accept | decline | defer;
- no caller-selected counterparty or manufactured availability.

Conversation may remain brief or never begin after admission if lived context changes.

## N7.9 — delayed thought and spontaneous expression

A Thread may form a later insight/question/intention from consolidation and may choose to speak during a live encounter without first being addressed.

No required follow-up and no response quota.

## N7.10 — Thread-initiated later contact

A known Person/Thread may become a later contact opportunity because of grounded relationship/history/question/need.

Interior Cognition still decides whether to contact.

World routing identity must remain distinct from the Thread's autobiographical recognition of that person.

## N7.11 — causal north-star proof

Prove:

```text
shared lived encounter
  -> participant-specific Experience
  -> selective consolidation
  -> durable consequence when warranted
  -> later perception / planning / relationship / contact choice changes
```

The proof must also include a valid encounter that produces no durable consequence.

The tranche closes on causal social development, not on chat length, message count or model call count.

## Standing implementation discipline

- light, elegant runtime;
- no whole-population waking;
- no token-by-token cognition;
- no turn manager;
- no durable chat-session authority;
- no compatibility wrappers merely to preserve obsolete request/response semantics;
- tests prove agency, audible-prefix truth, World continuity and future consequence—not SSE parser trivia;
- no brute-force social frequency or acceptance targets.
