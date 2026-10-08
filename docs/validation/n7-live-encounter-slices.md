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

## N7.4 — World interleaving — ACCEPTED 2026-10-07

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
- if the Thread is actively expressing when its material scene changes, the expression stream is aborted as stale-scene cognition and only its already-audible prefix survives.

**High-value proof:** a genuine World event admitted during an encounter becomes available to cognition without being authored by the client.

**Additional proof:** an unnoticed admitted event remains objective live history but is absent from Thread cognition, and a LivedNow transition is forwarded from the authoritative validation seam rather than fabricated by the client.

Accepted after the focused World-interleaving suite and full `npm run slice:validate` passed locally.

## N7.5 — GC-style consolidation — ACCEPTED 2026-10-07

**Capability:** immediate conversational latency no longer requires full Journal/Memory work.

- durable Experience establishes the consolidation frontier;
- newly admitted Experiences explicitly enter an append-only queue; deployment does not sweep/reconsolidate historical population data;
- the first queued Experience asks the existing World reconciliation runtime for a delayed wake (~30s); that runtime schedules exclusively through `infraDriver.scheduler`, so Local, Cloudflare and future providers share the same semantics; later Experiences reuse an earlier alarm rather than pushing it back;
- one consolidation claim groups only one Thread + one enacted situation, max 8 Experiences, within a 15-minute lived-time window;
- one World wake processes at most 4 clusters and uses the existing reconciliation retry/backoff/quiescence policy;
- pending durable claims resume before fresh work;
- one bounded model decision covers the whole cluster rather than one Journal/Memory call per conversational beat;
- the decision may yield no consequence, Journal, selective autobiographical memory/meaning, and up to 3 private delayed afterthoughts (`insight`, `question`, `intention`);
- afterthoughts are residue for later N7.9 cognition, not automatic speech/action or semantic/relationship authority;
- actual relationship/semantic mutation remains downstream through its owning authority rather than being written directly by consolidation;
- conversation end is not required and is not the only trigger;
- Journal/Memory formation time is distinct from Experience time; retries reuse the durable decision while materializing artifacts at a later valid time if necessary.

**High-value proof:** several nearby conversational Experiences consolidate as one episode; a later separated Experience becomes another cluster; `not_remembered`/no-Journal is a valid result; a persistence failure retries without resampling the Thread's decision; and an idle frontier costs zero cognition.

**Infra parity proof:** one shared consolidation wake scheduler is backed by the World reconciliation runtime, whose scheduler authority is `infraDriver.scheduler`. Contract coverage runs the same earliest-alarm-wins/delayed-wake behavior against both Local and Cloudflare InfraDrivers. Local startup also re-arms durable pending consolidation work without requiring model credentials until the wake actually needs cognition.

Accepted after the focused consolidation/runtime suite and full `npm run slice:validate` passed locally, including restart continuity where queued Experience survives reopening, consolidates later, and only retained autobiography reaches a subsequent encounter.

## N7.6 — Observatory causal encounter view — ACCEPTED 2026-10-07

**Capability:** Admin makes the causal path inspectable without collapsing authorities.

Derive Encounter Episodes from causal continuation/history and show:

- World scene/place/activity/background occurrences;
- outward conversation/actions, overlap and interruption;
- this Thread's Experience;
- consolidation frontier/result;
- links to Journal, memories and semantic/relationship consequences.

Journal and Memories remain standalone authorities.

Implemented foundation:

- World Observatory resolves each Encounter Story's historical `CurrentSituation` for this Thread rather than showing today's scene;
- one bounded inspection projection exposes unclaimed consolidation frontier plus claimed decision/complete/Journal records from existing authorities;
- Encounter Episode is **derived only** from `continuationOfEncounterRef`; no episode/session table is added;
- an episode joins this Thread's noticed Experience, consolidation state, delayed Journal, autobiographical Memory, and private afterthought residue by authoritative references;
- semantic-state or life-relationship consequence appears only when the existing record explicitly cites encounter-derived evidence; Admin does not infer relationship change from conversation;
- interrupted utterance remains visible as objective outward history;
- Journal view includes both older per-Experience authority and delayed consolidation Journal authority, while the private book remains a presentation that may lag World records;
- Observatory contract advances to `fibre-world-thread-observatory-v0.9`.

**High-value proof:** two continued Encounter Stories become one derived episode in causal order; the episode resolves one completed consolidation, delayed Journal, retained Memory, delayed question, and explicitly evidenced semantic/relationship consequences while those records remain separately inspectable authorities.

Accepted after focused Observatory/consolidation validation and full `npm run slice:validate` passed locally.

## N7.7 — social analytics, not a sociability score — ACCEPTED 2026-10-07

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

Implemented foundation:

- analytics are a pure Admin projection over existing Encounter Story, social-interaction and consequence authorities; no World state or persistence is added;
- operator can switch among 7-day, 30-day and 90-day windows without refetching or model work;
- **exposure** counts objective social episodes and separately reports noticed and anonymous-visitor episodes;
- **initiative** counts episodes opened by this Thread plus explicit outgoing Thread-to-Thread overtures;
- **responsiveness** counts externally opened episodes actually answered and separately reports incoming accept/decline/defer outcomes;
- **breadth** counts distinct known Thread counterparties while anonymous visitors remain an explicit separate count rather than fabricated identities;
- **reciprocity** counts known counterparties with both incoming and outgoing overtures;
- **depth** uses admitted continuation (continued episode count and maximum Encounter Story chain), never word/token volume;
- **continuity** counts known counterparties appearing across two or more distinct social episodes;
- **consequence** counts social episodes that later link to Journal, Memory, afterthought, semantic-state or relationship authority;
- no weighted composite, normalized score, personality label or cognition input is produced.

**High-value proof:** a bounded 30-day history containing outgoing and incoming Thread contact, a silent un-noticed witnessed conversation, an anonymous visitor, one continued episode, one declined overture, one durable consequence and one stale out-of-window encounter yields the expected eight-dimensional profile while exposing no `score` field. The witness increases objective exposure but does not become breadth or a responsiveness failure when the Thread never noticed or joined it.

Accepted in the same green focused/full validation pass as N7.6.

## N7.8 — rich Thread -> Thread Live Encounter — ACCEPTED 2026-10-07

Replace the accepted social meeting's fixed opener -> reply -> closing generation with the same duplex engine.

Preserve:

- genuine World co-presence;
- Situated Percept;
- cheap salience;
- Thread-owned initiation;
- recipient accept | decline | defer;
- no caller-selected counterparty or manufactured availability.

Conversation may remain brief or never begin after admission if lived context changes.

Implemented foundation:

- World discovery, Situated Percept, cheap salience, initiator `initiate | not_initiate`, and recipient `accept | decline | defer` remain unchanged admission authorities;
- immediately before an accepted encounter begins, both authoritative `CurrentSituation` witnesses are re-read; if either changed or co-presence no longer holds, the accepted social intention remains recorded but no stale-scene Encounter Story or Live Encounter is manufactured;
- accepted request and any outward acceptance expression seed the same `createLiveEncounter()` primitive used by Person -> Thread work;
- subsequent sentence/action/end opportunities are dispatched independently to each Thread; each opportunity runs a Thread-owned `speak | act | silent` choice;
- `speak` uses provider-neutral `streamExpression()` into Live Encounter, so one Thread may begin speaking at a sentence boundary and interrupt the other's active expression;
- interrupted speech preserves only its audible prefix with `completion:"interrupted"`; unseen provider suffix is discarded;
- `act` becomes a participant action event and an objective Encounter Story action beat; it may create a new opportunity for the other Thread without forcing speech;
- a silent choice produces no beat and no private refusal record;
- once no participant wants another contribution, the bounded runtime becomes quiescent; there is no fixed opener -> reply -> closing script and no turn owner;
- a temporary `maxOpportunityAppraisals=8` compute-burst guard prevents runaway autonomous model loops. Hitting it yields `endedBy:"bounded"`; this is explicitly a runtime bound, not a social quota, successful-conversation target, or semantic ending.

**High-value proof:** Noor begins a multi-part live expression; Mina takes a sentence-boundary opportunity and starts speaking; Noor is interrupted and only her audible prefix survives in the objective story. A second proof shows a Thread can contribute an outward action without being forced to speak. Existing social-meeting proof now verifies the initiator can remain silent after the recipient replies rather than receiving a canned closing.

**Life-over-chat proof:** if a recipient accepts and then either participant's authoritative CurrentSituation changes before the live encounter starts, no Encounter Story/Experience is manufactured from the stale accepted intention.

Accepted after focused Live Encounter/social-meeting validation and full `npm run slice:validate` passed locally.

## N7.9 — delayed thought and spontaneous expression — ACCEPTED 2026-10-07

A Thread may form a later insight/question/intention from consolidation and may choose to speak during a live encounter without first being addressed.

No required follow-up and no response quota.

Implemented foundation:

- consolidation keeps `insight | question | intention` as durable private residue in the existing decision stage; no new thought/session authority is added;
- after consolidation is durably complete, non-empty afterthought residue is offered best-effort to an ephemeral World live-encounter registry;
- Local and Cloudflare World runtimes instantiate the same domain registry; consolidation scheduling remains provider-neutral through the existing `infraDriver.scheduler` reconciliation path;
- a currently active Thread encounter registers only for its own lifetime; after close it is removed and later residue is not delivered into a dead conversation;
- live delivery becomes a **private** `afterthought` speaking opportunity visible only to the owning Thread; the other participant never receives the thought, source, or private context;
- the Thread still independently chooses `speak | act | silent`; delayed thought is not an automatic utterance;
- if the Thread speaks or acts, only that outward expression becomes objective Encounter Story history; the private residue remains separately durable;
- live delivery does not consume, clear or mark the afterthought handled. If no encounter is active, the durable residue simply remains available for later-life/contact logic;
- live-delivery failure cannot invalidate an already-completed consolidation; ephemeral opportunity delivery is not persistence authority.

**High-value proof:** Mina first receives an ordinary sentence-boundary opportunity while Noor is speaking and chooses silence. A durable delayed question is then published through the active registry; Mina receives a private `afterthought` opportunity, independently chooses to speak, interrupts Noor, and only the resulting outward speech becomes shared history. A separate proof shows another participant receives none of Mina's private opportunity.

**Durability proof:** consolidation publishes the exact durable residue to the registry, empty residue creates no opportunity, and Observatory inspection still sees the same afterthought afterward.

**Explicit deferred extension:** the current live Thread-to-Thread invocation admits its Encounter Story/Experiences when that invocation closes. N7.9 therefore proves a delayed thought from already-admitted prior Experience can surface spontaneously during a later/current live encounter. Mid-stream consolidation of the *same still-running encounter* remains deferred; enabling it will require admitting bounded live Encounter Story/Experience checkpoints without introducing a turn manager or durable chat session.

Accepted after the focused N7.9 suite and full `npm run slice:validate` passed locally.

## N7.10 — Thread-initiated later contact — ACCEPTED 2026-10-08

A known Person/Thread may become a later contact opportunity because of grounded relationship/history/question/need.

Interior Cognition still decides whether to contact.

World routing identity must remain distinct from the Thread's autobiographical recognition of that person.

Implemented foundation:

- completed Experience consolidation with non-empty private `insight | question | intention` residue is the bounded source frontier; there is no whole-population scan and no generic periodic social prompt;
- Contact owns a separate append-only authority: Person routing capability, contact attempt, private decision, outward expression, completion, and delivered message;
- Person reachability requires an explicit active Fibre contact capability; revocation removes the route and a later explicit grant can restore it;
- live Threads are routable through Fibre itself when a current Situated Life relation names that Thread and the recipient is not retired;
- only grounded current life relations with contact-capable relationship kinds become candidates;
- before each fresh decision or expression cognition, World runs canonical `LivedNow.ensure(...)` so outreach occurs from the Thread's actual present life rather than from the historical encounter scene;
- private contact judgment receives delayed residue, current life, current semantic state, bounded autobiographical memory, and current routable relationship evidence;
- `keep_private` is a normal durable outcome; route availability never forces outreach;
- when contact is chosen, outward expression is a separate cognition act and cannot expose the private rationale;
- routing identity and autobiography stay distinct: Fibre may know how to route `person_guy` while the Thread has no retained autobiographical recognition of Guy; expression is explicitly told not to fake familiarity;
- retries reuse persisted decision/expression stages and cannot resample already-made private judgment or rewrite an already-authored message;
- an unavailable route before any meaningful candidate exists is drained as `no_route` without model cognition or LivedNow work, preventing an unroutable historical frontier from starving newer work;
- if a chosen route disappears before delivery, the attempt completes as `route_unavailable`; Fibre does not send through revoked Person capability or a no-longer-routable Thread;
- World reconciliation runs bounded later-contact work after consolidation and uses the same `infraDriver.scheduler` semantics in Local and Cloudflare;
- explicit Person contact capability / revocation / inbox routes are mounted in both Local and Cloudflare World;
- Thread Observatory exposes later-contact consideration, private-vs-contact outcome, and any outward sent message separately from Encounter Story, Memory, and relationship authority.

**High-value agency proof:** three delayed private residues from the same Thread are considered under the same current routable relationship set. Fibre independently chooses to contact a known Person, contact a known Thread, and keep one thought private. Only the two contact decisions produce outward expression/messages.

**Identity/memory proof:** the Person route is available from World routing authority while autobiographical memory is empty; both private decision and outward expression receive no fabricated recollection.

**Bounded-frontier proof:** five unroutable delayed residues drain in batches `2,2,1` with zero model calls and zero LivedNow reconciliation, then World returns to quiescence rather than rescanning them indefinitely.

**Route-authority proof:** if a Person revokes Fibre contact after the Thread has already made a durable private `contact` decision but before expression/delivery, the persisted desire does not override routing authority: no expression cognition runs, no message is sent, and the attempt settles as `route_unavailable`.

**Explicit delivery boundary:** a delivered Person message is readable from the opted-in Person inbox. A delivered Thread message is currently durable recipient-addressed contact authority, but N7.10 does **not** claim the recipient Thread has noticed, experienced, remembered, or answered it merely because the row exists. Turning Thread inbox delivery into recipient lived perception/Experience is preserved for the N7.11 causal north-star proof, where receipt must become causally observable without inventing co-presence or a chat-session authority.

**Person identity boundary:** N7.10 can contact an already-authoritative `human_source` relation. Ordinary public `/meet` visitors are still intentionally anonymous/thin and cannot become future contact identity merely by supplying a name. “Kaleo met Guy through public Meet and later chose to contact Guy” therefore remains unclaimed until Fibre admits a minimal stable Person participant-identity witness.

**Acceptance evidence:** Guy reported the completed N7.10 focused/full validation green on 2026-10-08 at `b3f54d4048c9c943afc3e613e0560cef4dfd4bc5`. N7.10 ends at durable addressed delivery; it does not assert recipient perception or later behavior.

## N7.11 — causal north-star proof — CURRENT / VALIDATION-FIRST

Prove:

```text
shared lived encounter
  -> participant-specific Experience
  -> selective consolidation
  -> durable consequence when warranted
  -> later perception / planning / relationship / contact choice changes
```

Prove a valid encounter can also leave **no** durable consequence. The tranche closes on causal social development, not chat length, message count or model call count.

### Gate 1 — addressed contact enters recipient life (open)

Today a delivered Thread-addressed contact message is immutable delivery authority **only**. The recipient does not yet notice or experience it. The next mechanism must use the existing World/LivedNow and situated direct-social-act or mediated-perception boundaries, not declare `listInbox()` an Experience.

- One delivered message may become a bounded exterior opportunity for its actual recipient, grounded in the recipient's current life. The sender is **not** invented as physically co-present.
- Delivery, availability for perception, attention, Experience, Journal, and Memory stay distinct. `not_noticed`, silence, and no lasting memory remain legitimate.
- Preserve the private addressed nature of contact: do not expose the message as an overheard public utterance simply because other Threads share the recipient's physical place.
- Admission/retry must be causally idempotent; a delivered message cannot regenerate new history or duplicate Experience on every reconciliation.
- Use a bounded recipient-message frontier and existing World reconciliation scheduling; no population scan, artificial chat session, response quota, or polling loop.

**Early semantic proof:** sender delivery alone creates zero recipient Experience; one real recipient admission can produce `noticed` or `not_noticed`, each using the existing Encounter/Experience authority, with the retry producing no duplicate. Do not certify this gate using fixture-authored attention as if it were endogenous agency.

**Recipient contact implementation — operator validation pending (2026-10-08).** Existing sender-owned `ContactStore.recordMessage` now inserts one indexed `thread_contact_receptions` opportunity **atomically with a delivered Thread-addressed message**. Person delivery does not earn Thread perception. In the same already-scheduled World reconciliation pass, `thread-contact-perception.mjs` processes at most one due message: it calls the recipient's existing `LivedNow.ensure`, pins a durable situation/time for retries, admits one recipient-only objective Encounter Story of *message availability*, and invokes the existing Thread-owned `noticed | not_noticed` appraisal. The sender's current World identity grounds the event, but the sender is **never listed as physically present**, and no bystanders are automatically admitted. The visual reconstruction prompt deliberately excludes the message contents. A noticed message earns an ordinary Experience and existing delayed consolidation queue; `not_noticed` earns neither Experience nor consolidation; neither outcome forces an answer. `ContactStore` bounds failed attempts to three, retaining a brief inspectable blocked reason. The same InfraDriver World scheduler chooses the earliest due environmental, life, or recipient-contact work; there is no population inbox scan or polling.

**Proof boundary:** focused tests assert delivery alone has zero recipient Experience; the same real delivered message can become one recipient Experience only after appraised attention; private presence excludes the sender; an unavailable attention provider resumes against the same pinned lived situation and immutable story; a legitimate `not_noticed` outcome leaves no Experience, Journal or Memory queue. Test model outputs are **fixture-authored**, so these tests prove authority, plumbing and idempotence, **not** the real model's independent noticing or causal long-term individuality. No local suite or staging evidence has been supplied yet. Keep N7.11 Gate 1 open until Guy's validation and a genuine live provider admission; Gate 2/3 remain open.

**Causal-status register (this implementation):**

| Mechanism | Status | Author / meaning | Proven or required consequence |
|---|---|---|---|
| Addressed message delivery and recipient frontier | **Behaviorally/future-state causal (local implementation)** | Sender-owned contact decision/expression and durable World delivery; not an incoming subjective experience | May trigger exactly one future recipient appraisal without a poll |
| Objective addressed message availability | **Behaviorally/future-state causal (local implementation)** | World uses the authenticated stored message plus current recipient situation; sender is not co-present | An immutable one-recipient event becomes eligible for private attention |
| Recipient's noticed / not_noticed judgment | **Context-only until live validation** | Recipient cognition receives a real authored message and its own private state; the user/test cannot choose production outcomes | Fixture proof distinguishes Experience/no Experience; genuine provider choice remains unverified |
| Personal Experience and delayed retention | **Behaviorally/future-state causal (existing authority)** | Existing Thread Experience and selective consolidation, not message receipt | Noticed enters delayed appraisal; no claim yet of retained memory or later behavior |
| Later choices / social development | **Named-only for this gate** | Future recipient-owned cognition must select genuine consequences | N7.11 Gates 2/3 require attributable changes from retained personal history |

The drift-scorecard checkpoint must be recorded **on acceptance**, not scored from unexecuted tests or source code alone.

### Gate 2 — selective long-term consequence (open)

A recipient's noticed Experience may enter the existing delayed consolidation frontier and may yield a Journal, retained autobiography, private afterthought, or nothing. No contact delivery row, objective Encounter Story, or Journal may bypass the ordinary ownership/retention boundary to become private Memory.

**Early semantic proof:** the same addressed occurrence has a valid no-memory outcome, and a retained-outcome path becomes retrievable as the Thread's own bounded autobiographical evidence at a genuinely later opportunity.

### Gate 3 — past experience changes a later choice (open)

Under comparable later World conditions, a retained earlier consequence must produce an **attributable difference** in a later Thread-owned appraisal, perception, planning, relationship, or contact decision relative to an otherwise matched no-consequence case. Fibre/Thread-owned retrieval must supply the evidence; callers may not secretly select private memories, provide the decisive judgment, or force a favorable contact outcome.

**Closure proof:** a real shared Encounter Story yields participant-specific Experiences; selective consolidation retains an attributable consequence for one path but legitimately not for the other; a later *Fibre-owned* decision differs because of that history. Prompt inclusion alone is Context-only, not acceptance.

Keep the proof to one or two organism-level tests, plus a narrow retry/absence proof only if indispensable. Give Guy focused CLI validation before the single full `npm run slice:validate` at closure. Record the milestone causal-status register and drift scorecard only when actual acceptance evidence exists.

## Standing implementation discipline

- light, elegant runtime;
- no whole-population waking;
- no token-by-token cognition;
- no turn manager;
- no durable chat-session authority;
- no compatibility wrappers merely to preserve obsolete request/response semantics;
- tests prove agency, audible-prefix truth, World continuity and future consequence—not SSE parser trivia;
- no brute-force social frequency or acceptance targets.
