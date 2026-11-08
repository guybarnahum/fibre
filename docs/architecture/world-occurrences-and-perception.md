---
id: architecture-world-occurrences-and-perception
status: accepted
last-reviewed: 2026-11-06
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

## Readable arrival Stories

One objectively admitted arrival into an occupied public venue gives one
short sentence for the arriving Thread and one for each real witness.
Public observable appearance uses a bounded human-readable description;
witness presence can add only World-enacted `outwardActivity`. An arrival
beat names the admitted physical venue, for example: "A man in his twenties
arrives at Riverside Park." A witness might be "A woman in her thirties is
reading." Old situations without outward activity
describe presence only. Private planning intent or expectation never
appears. Each person sees the same objective Story, but attention
cognition marks the person's own beat `self:true` and may render
"You are reading nearby." for legibility. This does not require
attention, reciprocity, or a meeting.

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

## Social opportunities come from events, never a clock

LivedNow's `onSituationEnacted` callback is the only producer of in-venue activity-change reconsideration, and the same enactment may schedule the next predicted `social_contact` band crossing on the existing World alarm. There is no social tick, polling process or venue scan. What earns a social opportunity, its bounds and its honest non-decisions are owned by [social life §1](social-life.md#1-opportunities).

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

## Arrivals: one objective Story, independent noticing

An enacted arrival at a venue where someone is already awake earns at most one durable `world_arrival_perception_work` obligation. Up to two witnesses are captured **at the event time**, before any later query can rewrite the scene; an empty venue creates nothing. The two-witness bound is a computational sample, not a claim that others were absent.

World admits **one** objective Encounter Story: the arrival beat and a presence beat per captured witness, built only from public appearance and enacted `outwardActivity` — never a civil name a stranger has not learned (an appearance brief that happens to contain the name is redacted). Each witness appraises attention independently, then the arriver may notice the same Story; a noticed result earns that person an Experience, a miss earns nothing. Inside each person's own attention request only, their own beat carries `self:true`. In the same way, a beat by someone this observer already knows carries `knownAs`, the name it knows them by under the [observer knowledge](../decisions/observer-grounded-person-knowledge.md) rules; the objective Story itself stays unnamed, and a stranger stays a description. Without it, a Thread could only guess an acquaintance from their appearance. Interrupted attention retries against the same Story without rerolling an admitted result, and attention more than an hour late is not invented retroactively.

A bystander who noticed the arrival earns one observed social opportunity to respond; the arriver, having noticed its witnesses, considers them first. Both go through the ordinary social path in [social life](social-life.md) — salience, a free choice, the recipient's consent — and an interrupted outward attempt is never replayed.

## World-time correctness of life and social opportunities

A social opportunity must **read** an enacted scene, never advance it. The
automatic venue-bounded social engine now reads both parties' current
situations without `LivedNow.ensure`; an unresolved personal boundary due at
or before the decision makes that party ineligible until World independently
enacts life. The explicit visitor-facing `/meet` path still currentizes
participants as before. Decision-time intrinsic Body pressure is evaluated
with an explicit `asOf` timestamp and bounded existing history, not by
appending a fresh CurrentSituation. A subsequent accepted encounter rechecks
both participants' already-enacted situation IDs and due-life obligations.

World enacts up to **four** due lives per bounded reconciliation pass in
plan-time order, and an equal-time occupant **departure precedes an arrival**,
regardless of Thread-ID order. The precedence applies in SQL **before the
batch limit**, so an overflow batch cannot accidentally treat a departing
occupant as present. When a planned wake is overdue, enact at its stored plan
instant, unless the Thread already has an authoritative later CurrentSituation;
never travel backwards. An overdue backlog can retain paced World wakeups,
and `hasDue` names the actual durable backlog. **Backlog is not a
World-wide pause**: environmental perception and social choice run for other
independent venues, even while unrelated personal boundaries or Genesis
first-life obligations remain due. An arrival-perception obligation is skipped
without completion only if its actor or a stored witness has an unprocessed
boundary due at the event time, or unresolved failed life. A social opportunity
is examined without a claim until its initiator, observed counterpart, or
currently discovered venue company is eligible; one deferred chance does not
block later unrelated due work. A claimed chance is never silently replayed.
In the unusual case of a newly unresolved candidate after the claim, a distinct
`life_unresolved` outcome is recorded rather than false `no_co_presence`.
Skipped work is resumed on its existing life wake, not by a polling timer.

A failed life still retains its original *Flight Plan enactment time*: the
backoff deadline schedules the retry but is not substituted for the historical
event timestamp whenever the admitted Plan still covers the boundary. **If
no admitted plan covers the retry, the current implementation falls back to
the retry time**; this is a known evidence limit, not a historically attested
plan transition. Enactment clamps to an already later authoritative present,
comparing parsed instants rather than timestamp strings. A boundary equal to
the present instant must re-arm independent life instead of losing the next
wake. Candidate-scoped social uncertainty checks scan at most sixteen oldest
due opportunities, with a single cached decision per opportunity per pass;
starvation beyond that bound remains a deferred, measurable queue concern. Failed life does not
establish a departure or confirmed company, and each Thread's existing retry
backoff remains intact. This avoids unbounded plan-renewal bursts and prevents
one stalled person from freezing a city of independent people.

Historical arrival witnesses are verified against the **latest** enacted
situation as of the arrival instant. A departure at exactly T closes presence
at T: arriving at T creates no positive overlap, objective shared Story,
personal noticing, or implied social obligation from that departing person.
A situation refreshed while a person remains awake at the same physical
venue does not itself revoke their social chance. The arrival must have
continuous bounded venue evidence since its due instant; missing history
cannot be substituted with an assumption.

`missed_window` now requires evidence of actual event-time company and a
subsequently **recorded departure** from the venue. A bounded history read
that runs out without departure evidence is unknown, not a missed chance. For `observed`, noticing alone
is not evidence that anyone later departed; for `arrival`, an unrelated
situation ID change is not a lost window. A zero-length tie is
`no_co_presence`; an uninterrupted but older-than-one-hour opportunity
remains `expired`. An empty ordinary social result uses the same
classification rather than silently defaulting to `no_co_presence`.
No historical scene licenses retrospective conversation or alters the
one-shot claim and no-replay-on-interruption rules.

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
