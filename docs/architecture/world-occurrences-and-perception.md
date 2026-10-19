---
id: architecture-world-occurrences-and-perception
status: accepted
last-reviewed: 2026-10-18
canonical: false
---

# World occurrences and independent perception

## Purpose and north star

Fibre's World is not a succession of stimuli generated to entertain Threads.
It unfolds through actor-caused actions and independent environmental changes.
Threads and connected humans inhabit, perceive, influence, and sometimes
ignore that World. Their voluntary encounters may become relationships,
memories and different choices on subsequent lived days.

The World does **not** wait for observers to exist or notice before a real
actor's action occurs. Compute may omit *materialization* of speculative,
unobserved ambient activity in empty places. That optimization does not
assert that the rest of reality stopped happening.

## Four different facts

1. **Occurrence:** an objectively admitted change or action at a World time.
   An enacted arrival is already a fact, not an event to be synthesized 60
   seconds afterward. A speech or object interaction occurs when its actual
   authoritative action is admitted. An ambient change becomes an objective
   occurrence only when World admits a specific grounded happening.
2. **Ambient opportunity:** bounded, speculative World authoring work for a
   scene. It can yield `no_change` without any occurrence. It is not a World
   event, a quota, or an assertion that something must happen.
3. **Potential perception:** a grounded observer *could* see, hear or otherwise
   perceive the occurrence under the exterior circumstances. Co-location is
   strong evidence, but does not guarantee sensation; legitimate observable
   phenomena can also cross scene boundaries without a universal distance
   cutoff. A candidate observer is neither a participant nor a speaker.
4. **Subjective response:** individual attention `noticed | not_noticed`,
   interpretation, voluntary participation or withdrawal, Experience, Journal
   and selective Memory. No occurrence mandates notice, speech, friendship,
   recollection or a later change.

**World does not author individual private psychology.** Interior Cognition
and the existing experience/consent stack remain the individual's authority.
A person's subsequent action may in turn create a new World occurrence.

## Authority and durable identity

Avoid a competing universal event log. Reuse existing durable fact owners:

- **LivedNow CurrentSituation** authoritatively records physical arrivals,
  departures, transitions, sleep/wake and current place. A normalized
  actor-occurrence projection names its `situationId` as the immutable causal
  source. It must not turn a new Flight Plan at an unchanged place into an
  arrival or infer somebody walked into a venue at Genesis.
- **Encounter Story** is the existing singular objective authority for
  observed environmental happenings, social actions and dialogue. The World
  admits one Story, not one fabricated story per potential observer.
- **World place and physical venue authority** supplies independently
  verified shared-place identity and coarse or precise exterior geography.
  An unverified Genesis learning context is not a shared café or library.
- **Thread attention and Experience** remain per-Thread and separately
  durable, with bounded replays using already-admitted World facts.
- **Human actions** enter by their own externally witnessed admission routes.
  A remote browser visitor is not declared physically present at a venue.

One event can have a source fact, an optional shared encounter projection, and
individually independent experiences. These are projections/consequences of
one occurrence, not competing ontologies.

## Scene-based ambient consideration

An **active scene** is a World place with a plausible presently perceiving
actor, including an individual situated in a private place. Shared scenes
are keyed by independently verified physical-venue identity; a private or
unverified place is scoped to its actual occupant, not merged with other
places merely because their names match. Human physical presence may enter
only when World has actual evidence of presence.

The scheduler keeps at most **one speculative next ambient consideration per
active scene**, not one per inhabitant. A newly co-present actor joins the
existing scene and does not duplicate its weather. A quiet scene may yield no
change and later receive another independent ambient opportunity; an empty
scene becomes quiescent. No background simulator runs for empty places.

Consideration times may vary with exterior scene conditions and bounded
compute, but the compute budget is not an event rate, a world-clock interval
or a quota. A one-minute limit, if used, is a coarse cost/coalescing control
only. There is no obligation to fill each minute. Model invocations are
bounded by earned work, not by the number of configured World places or
potential Threads. Actor-caused occurrences bypass ambient generation
budgets and are never delayed to a timer bucket.

For private settings, do not disclose private address or infer strangers.
For shared physical places, use an indexed present-actor query, including
independently arrived long-stayers. For physically supported long-range
phenomena, inspect only bounded candidate exterior scenes and let World
reason about actual perceptibility. If no actor could plausibly perceive an
ambient change, do not invoke the authoring model or admit a change.

A physical sleeper is not a computationally dormant Thread. A small ordinary
event usually receives no waking attention; a sufficiently impactful event
may cause an arousal opportunity via the established Body/attention mechanism
when that capability is explicitly accepted. Never wake someone merely
because a scheduling callback fires.

## Processing a World occurrence

```text
actor enacts action                 active scene earns ambient consideration
      |                                         |
existing action authority          optional World-authored grounded change
      |                                         |
      +----------------------+------------------+
                             |
                 objective occurrence at time t
                             |
                bounded exterior witness lookup
                             |
                 potential perception candidates
                             |
           independently noticed | not_noticed
                             |
       individual Experience / action / optional Memory
                             |
         new action may cause another World occurrence
```

Events can happen in rapid succession; two independent arrivals at the same
time remain two objective actions. Coalescing controls scheduling and model
calls, never erases true actions. Causally continued ambient events retain
their prior Story reference when there is real continuity, without
synthesizing a permanent weather ticker.

## Migration from October 18 staging source

The earlier implementation has four distinct work frontiers:
`world_environment_opportunities` (arrival),
`world_environment_stay_opportunities` (per Thread),
`world_environment_followups` (per Story) and
`world_social_opportunities` (per arriving situation).
Its arrival-linked 60-second synthetic delays and the subsequent
minute-bound per-Thread ambient shortcut are **transitional**, not the
accepted architecture.

Retain already enacted CurrentSituations, Encounter Stories, attention and
Experiences unchanged. Old due-work rows are speculative, not admitted
occurrences. During replacement, retire their producers deliberately,
settle/ignore only obsolete speculative work, and leave historical records
inspectable. Do not maintain a second parallel World-event engine indefinitely
or introduce a generic cross-service event bus.

The existing World reconciliation alarm remains the sparse execution
mechanism. Newly admitted events use existing Encounter Story and attention
authorities. A single scene frontier is justified scheduling *work*, not
a new objective event database.

**October 18 source implementation, local/staging acceptance pending.** The
new `world_ambient_scene_frontier` is keyed by attested physical venue, or
by a Thread-scoped private/unverified place, and retains one pending
consideration. Newly enacted waking residence can arm that scene; a second
visitor cannot duplicate its pending work. On completion, later enacted
activity may rearm it. Empty or sleeping scenes do not invoke World authoring
cognition, and `no_change` creates no Encounter Story. One shared Story
continues through the established independent attention/Experience seam.
The originally scheduled visitor may leave before consideration; a distinct
actually present venue observer is sufficient to keep the shared scene active.

The new local and Cloudflare producers no longer enqueue per-Thread stay
opportunities. Historic pending arrival/stay speculative work still drains
through the same process for now, and existing per-Story environmental
follow-ups remain separate. This **is not yet** a fully unified occurrence
and perception pipeline, or a demonstrated natural meeting. The next clean
migration must retire those legacy producers/queues after preserving already
admitted facts and deliberate handling of unresolved speculative decisions.
The civil-minute boundary is only sparse compute scheduling, never a World
event time rule, quota or recurring simulation tick.

## Actor-arrival bystander attention — October 19 source cut

An authentic World-enacted arrival overlapping an already-present waking
person now earns at most one durable `world_arrival_perception_work` obligation
for that enacted situation. The local and Cloudflare producers capture at
most two independently grounded bystander situation references *at the event
time*, before an operator, later alarm or fresh venue population query can
rewrite the scene. An empty venue creates no obligation. This is an indexed,
one-shot reconciliation frontier, not another event authority or a
per-Thread polling loop.

At reconciliation, the existing Encounter Story authority projects the
enacted arrival as one objective action with the original situation ID,
occurred time and venue evidence. The existing independent attention and
Experience authority then allows each bystander to notice or miss it.
Interrupted attention can retry against the same objective Story and cannot
reroll a previously admitted observer's attention. The actor is not forced
to appraise its own movement. When reconciliation is more than one hour late,
the objective Story remains inspectable but *retroactive private attention
is not invented*. World Observatory joins this Story's admitted witness
perspectives to the enacted arrival when both sources are within its bounded
read window, rather than counting a second city event.

This slice is **source-implemented only** pending Guy's focused and complete
local validation, schema deployment and staging evidence. The two-witness
bound is a computational sample, not a claim that other people were absent.
It does not yet implement general event-time witness discovery, spatially
remote observers, actor reaction to a bystander's attention, endogenous
bystander contact initiation, or later history-caused social choice.
Existing social initiation/consent remains independent, not compelled by
the arrival or any resulting Experience.

## Bystander-owned social choice — October 19 source cut

A bystander who **noticed** an actual arrival now earns one additional,
durable `world_observed_social_opportunities` consideration scoped to the
objective Encounter Story and observer identity. Neither ordinary co-presence
nor `not_noticed` earns that work. This is distinct from the existing
arrival-based social consideration so a person can respond later in the
same stay after spending an earlier chance to make contact.

The existing World social reconciler claims both kinds of opportunities
under one sparse alarm and one unrepeated attempt boundary. It verifies
that the observer and the specific observed newcomer still inhabit the
same attested venue, then passes the chosen target to the **existing**
social meeting engine. The same situated salience, Body needs, individual
initiation decision, recipient consent, Encounter Story and private
Experience govern any subsequent conversation. A salient arrival can
still yield `not_initiated`; the recipient can decline. An interrupted
outward attempt is not automatically replayed.

The Situated Percept's recent Encounter Stories now require the observer's
admitted `noticed` attention before that Story can influence that
observer's private social judgment. This prevents missed World events
from becoming unexplained private knowledge. Noticed recent history can
make another person's presence salient without obliging speech.

**Source-only pending local validation and staging observation.** Targeted
consideration is not evidence that a natural interaction actually happened,
nor proof of long-term relationship formation. Observed invitations remain
limited to recent, co-present Thread-to-Thread arrivals; broader endogenous
life events, distant observers, and historical consequences remain deferred.

## Recent Experience becomes a later social cause — October 19

A shared Encounter Story is public World evidence; the observer's noticed
Experience is a different, private record. Situated Percept continues to
carry only the observer's bounded, **actually noticed exterior events**.
Separately, Fibre retrieves that observer's own admitted
`thread_encounter_experiences` into **private social Interior Cognition**
as `recentPersonalExperiences` tied to the same World event references.
This keeps private feelings out of the exterior World projection, prevents
another observer's interpretation leaking across persons, and excludes
unappraised or `not_noticed` episodes from private knowledge. No new model
call, event authority, long-term memory store or population scan is added.

This implementation uses a **provisional six-hour recent-availability
window** at the actual subsequent decision time, with the existing
twelve-story lookup cap and four-encounter presentation cap. That is a
reversible, low-cost runtime boundary, not a constitutional claim that human
recollection lasts six hours. Past that boundary, ordinary social cognition
must rely on already-retained autobiographical Memory supplied by the
existing Interior Cognition selector; it may not mine World history and call
the result recollection. The precise recent availability policy remains
deferred to the epistemic access work.

A local differential scenario holds the Thread, other actor, objective
World arrival, scene, social opportunity and selector constant, then varies
only the previously admitted first-person Experience. The same existing
social engine must allow one later voluntary initiation and another
`not_initiate`, with correspondingly distinct durable outward consequences.
This proves a **bounded fixture differential**, not the standing cross-Thread
differential gate, a naturally authored staging Experience, or a mature
relationship/development system. Live staging testimony and real retained
Memory changing a still-later choice remain open.

## Retained Memory changes next-day social choice — October 19

The existing consolidation authority can select `retained` or
`not_remembered` after one admitted Thread Experience. When retained,
it persists a first-person autobiographical Memory with actual Experience
references and separately owned remembered meaning. Ordinary Interior
Cognition already resolves bounded, accessible **Memory content**, rather
than only record IDs, using the Thread's own memory store.

A new end-to-end local proof exercises this unchanged production path:
one identical admitted World Story and noticed personal Experience,
independently consolidated with either `retained` or `not_remembered`.
At an otherwise equivalent café encounter **the next day**, beyond the
short-lived recent-Experience window, the ordinary social engine
retrieves the Memory when retained and leaves absent what was not
remembered. A controlled social cognition fixture responds to that
Fibre-selected evidence, resulting in an outward invitation and recorded
decline in the retained case; it chooses `not_initiate` and produces no
outward social history without retention. Neither branch invents a
reciprocal meeting. No new memory store, model call, scheduler or social
policy is introduced.

One source correction ensures autobiographical Memory is eligible for
Interior Cognition only after both its `asOf` and `recordedAt` times.
A separate negative test prohibits Memory admitted in the future from
changing a historically earlier private choice.

**Acceptance boundary:** source-implemented, Guy's local validation
pending. This is a controlled **retention/decision differential**, not
a natural staging Memory, not independently spontaneous model behavior,
not a relationship mutation, and not the standing two-Thread
causal-individuality gate. Future work must observe actual live
retention/non-retention and later autonomous divergence, and eventually
replace the provisional six-hour recent-availability threshold with an
accepted ephemeral-availability policy.

## Execution slices and acceptance

1. **Actor occurrence contract.** Project actual LivedNow changes into
   immutable actor-caused occurrence identities at exact enacted time,
   without manufacturing arrival from a plan refresh, a Genesis start or a
   generic context. A real shared-place arrival can expose perception/social
   possibilities to independently co-present inhabitants immediately, and
   an empty venue invents nobody. No generic event bus.
2. **World-scene ambient frontier.** Replace per-Thread arrival/stay speculative
   queues with a sparse, durable, single next consideration per active scene.
   The same café's visitors share the same occurrence; one quiet/no-change
   result stays quiet without calling anyone's Interior Cognition. Return to
   dormancy when no potential observer remains; future activity re-arms.
3. **Unified witness and attention admission.** For actor, ambient and social
   stories, derive grounded potential observers from actual event-time scene
   and geography. Independent notice/no-notice, retry and selective delayed
   consolidation use the same established helper. Preserve physical
   privacy and historical non-retroactivity.
4. **Causal consequences and social choice.** Witnessed actions can alter
   scene opportunities and Body/individual behavior; freely chosen
   interaction/decline must become an objective social occurrence. Prove two
   independently living Threads co-present, one event, distinct subjective
   outcomes and a later choice causally influenced by experience.
5. **Connected humans and additional actors.** Extend the same occurrence
   path to grounded human physical participation, animals, objects and
   long-running environmental state when demanded by actual evidence. Remote
   online access must never masquerade as physical co-presence.

The first implementation should prove exactly one strong vertical causal
path rather than building an event framework: **real public-venue arrival →
independent co-present observer has a noticing opportunity → voluntary
response or indifference → persisted individual consequence**. Ambient
scenes then reuse the same occurrence/observer seam. The World must not
force a happy encounter for a passing test.

## Deliberate exclusions and extension paths

- Full weather or physics simulation: deferred; add only when a material
  physical state affects action or future opportunities.
- Population-wide geographic perception: deferred; use bounded authoritative
  scene indexes and extend indexes where actual observability requires it.
- Human physical embodiment/location: deferred until independently evidenced.
- Permanent central time loop or event frequency: rejected.
- Forced observer attention, social goals or encounter quotas: rejected.
- Parallel event authority or generic event bus: rejected.

These exclusions do not narrow the accepted ambition: autonomous Threads
and people experiencing and shaping one independently unfolding World.
