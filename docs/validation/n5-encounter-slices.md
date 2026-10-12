---
id: validation-n5-encounter-slices-v0-1
status: accepted
last-reviewed: 2026-10-12
canonical: false
---

# N5 — Encounter Story and Thread Experience: accepted proof and active follow-ons

**N5 E0–E5 is closed live.** E6/E7 are separately preserved natural-world follow-ons with specific outstanding acceptance. These are not prerequisites for reopening N5's accepted live result. For the actual current Fibre frontier, consult [current priorities](../state/current-priorities.md), [N6](n6-public-lived-encounter-slices.md) and [N7](n7-live-encounter-slices.md).

> **Encounter is the primitive; meeting is one voluntary social form of encounter.**

```text
admitted World occurrence
  -> one objective Encounter Story with truthful presence and visual provenance
  -> each Thread's independent noticed | not_noticed
  -> when noticed, private Thread Experience
  -> optional Journal
  -> selective retained Memory or not_remembered
  -> possible later consequence
```

A person or Thread may decline/defer a proposed meeting. Shared World history is not private memory. An unnoticed occurrence creates no Experience; a Journal entry does not imply autobiographical retention; generated still/video is replaceable Presentation, never historical or memory authority.

## E0–E5 accepted organism-level evidence

| Slice | What closed | Boundary that survives |
|---|---|---|
| E0 — general encounter reconciliation | Removed the obsolete dyadic meeting persistence/API and non-authoritative actor/witness labels. | The same Encounter Story/Thread Experience domains serve environmental and social life; no compatibility engine. |
| E1 — environment and attention | In a park an unscheduled bee became one Thread's noticed calming Experience while a separately admitted cloud remained `not_noticed` and produced no subjective aftermath. | World occurrence and retry-stable attention are distinct; visualization prompt, digest, source references and depicted Thread refs belong to admitted objective Story. |
| E2 — voluntary meeting | Independent current lives and actual compatible physical/mediated presence precede initiation; independent `accept | decline | defer` can prevent any shared Story. | A matching historical Genesis place is not physical co-presence; each accepting participant may experience the shared Story differently. |
| E3 — silent-witness asymmetry | Mina/Noor's encounter and Sela's separate noticed interpretation share **one** objective n-ary Story; Sela was neither invitee nor speaker. | Presence does not force invitation, speech, attention or memory. Later E6 removed caller-selected witness scaffolding. |
| E4 — inspectable Journal and optional media | Admin distinguishes World Story/prompt, this Thread's attention/Experience, World Journal provenance, private R2 Journal book and Memory. A still/video can derive from objective prompt plus each depicted Thread's admitted likeness and age. | Missing visual reference defers rendering; private witness meaning is excluded from objective imagery. No encounter render is required to complete a Story. |
| E5 — live visitor-work path | A real paid visitor arrangement was voluntarily accepted in advance; its commitment revised the Thread's Flight Plan and later enacted LivedNow mediated presence; public Meet admitted Story + Experience and exactly-once credits. | Work availability and settlement are distinct authorities from ordinary voluntary encounter. A refusal is valid, not a failed test. |

**Retained E5 live witness:** staging run `inside-fibre-muegy2ai`, source `9bf65debfe2636b13c7ca1dbffa5d265072f486d`. Sara Mizrahi and John Lakewood declined the future work opportunity; Luka Mzechabuki accepted a 20-minute, 12-Fibre-Credit commitment (`work_39779538e78db25b1fcbecf9567d18e34b065a908910ed39`). World later admitted the resulting situation and Story `story_2a0816db192e5ab2f82f4cc446e46b145f69e78dec963a32`; his Experience formed and credits moved from 0 to 12 exactly once. **This is N5's live closure**, not proof of general autonomous Thread-to-Thread social discovery.

## Natural-world follow-ons E6/E7 — original detailed acceptance retained

The following implementation/evidence sections remain materially active or evidence-sensitive. They are kept intact rather than condensed into optimistic completion claims. In particular, local acceptance of an environmental mechanism is not staging proof of genuinely co-present independent witnesses, attested physical venues or environment evolution.

## Slice E6 — Autonomous encounter production/discovery — CURRENT

**Goal:** remove the remaining caller orchestration from environmental and silent-witness encounters without changing the accepted Encounter Story / attention / aftermath ontology.

The general encounter seam is already proven for:

- environmental occurrence;
- voluntary social participation;
- n-ary shared story;
- silent witness;
- `noticed | not_noticed`;
- subjective Journal;
- selective Memory / `not_remembered`.

The missing capability is narrower:

```text
environmental:
caller currently supplies occurrence text
  -> E6: World authors bounded occurrence from current scene

silent witness:
caller currently supplies witnessThreadIds
  -> E6: World derives candidate witnesses from authoritative co-presence
```

E6 is intentionally scheduled **after developmental-exploration X4 acceptance and before X5+ rich-Person/social-discovery work**.

That ordering prevents a subtle architectural bias: if Fibre can autonomously discover people but cannot autonomously discover ordinary World events, developmental exploration will become disproportionately social simply because social opportunities are easier for runtime code to produce.

### E6a — bounded environmental occurrence production

At a meaningful LivedNow boundary, Fibre may produce zero or one bounded textual occurrence from existing World/place/current-scene meaning.

The trigger supplies Thread/time/current scene. It does not supply the event prose or a label such as `interesting`.

Any admitted occurrence becomes an ordinary objective Encounter Story and then uses the existing attention / Experience / Journal / Memory path.

Do not add periodic simulation, an event quota, a universal event bus, or repeated model sampling until something salient appears.

### E6b — incidental witness discovery

For any admitted Encounter Story, inspect authoritative CurrentSituations for genuinely compatible co-presence.

Derived candidates are not invitees, speakers or participants. Each independently receives the existing attention appraisal:

```text
co-present candidate
  -> noticed | not_noticed
  -> if noticed: Thread Experience
       -> optional Journal
       -> selective Memory
```

The caller does not choose witness IDs.

### Implemented shape

E6a now removes caller-authored environmental prose from the production seam:

```text
caller: threadId + time
  -> ensure LivedNow
  -> exterior current scene only
  -> one bounded World occurrence-generation call
       -> one observable occurrence text
  -> ordinary Encounter Story
  -> existing noticed | not_noticed
  -> existing Experience / Journal / Memory aftermath
```

The occurrence author receives no Thread-private identity, memories, traits, needs or developmental pressure. It sees only the exterior CurrentSituation and admitted place meaning. Encounter Story remains the first durable World-event authority; no occurrence table or generic event bus was added.

E6b removes `witnessThreadIds` from the social service and private write API. For each accepted story, already-current compatible co-present Threads other than the two speakers become incidental witness candidates automatically. They are not invitees, speakers or participants in the voluntary request; each independently receives the existing attention appraisal and aftermath only if noticed.

### Acceptance

The focused E6a proof requires a caller that supplies only Thread/time while World authors a bounded environmental occurrence, proves retry reuses the admitted story rather than resampling it, and preserves `not_noticed` as a legal attention outcome. Ordinary scenes need not invoke occurrence production at all, so E6 creates no encounter quota.

The focused E6b proof requires a genuinely co-present C to become a silent witness of A/B's story without the caller naming C, while C receives no social stance or story turn.

Zero generated encounters remain valid across ordinary life because the producer is not a tick and is not invoked for every scene; zero noticed witnesses remains valid for any admitted story. Acceptance proves autonomous production/discovery, not encounter frequency.

E6 local semantics remain pending operator validation, and live evidence uses a dedicated bounded probe rather than the broader N5 encounter acceptance harness.

Run:

```bash
npm run encounter-autonomy:probe -- --env staging
```

The live probe:

- cheaply reads existing Observatory state without population-wide `LivedNow.ensure`;
- attempts E6b only when **three Threads are already genuinely co-present**;
- if no such scene exists, records `blocked_by_world_state` rather than waking or replanning unrelated Threads;
- leaves independently live-proven E6a untouched while E6b remains unproven; it reports environmental `not_run` instead of making an unnecessary paid model call;
- only when E6b is proven does the combined probe re-prove E6a on one current Thread by supplying `threadId` and checking durable objective occurrence + selective attention;
- reports the next already-admitted three-Thread shared-`wpl_*` plan overlap when one exists, so a later rerun can catch a natural witness opportunity;
- never samples repeatedly to force a meeting or witness.

A probe may therefore finish successfully with `complete:false`. That means the probe itself succeeded while current World state did not expose a live E6b opportunity; it is not permission to mark E6 fully accepted.

**2026-10-08 operator staging check:** Guy validated `420984590bf0e82dbda3f4ebd0fab0fb1f8c0a49` with 11/11 focused E6 tests green, then ran the witness-first `encounter-autonomy:probe -- --env staging`. The bounded scan found 28 current Threads, zero three-way co-present groups, and no upcoming three-way shared-plan window in the scanned current plans. Witness result: `blocked_by_world_state`; environmental: `not_run` (the earlier E6a live proof remains valid); probe `complete:false` in 8.3 seconds. Evidence: local `.fibre/encounter-autonomy/staging/encounter-autonomy-muzqqfs9/evidence.json`. This validates efficient no-op behavior, **not** live E6b witnessing. No World life, plan, or counterparties should be artificially changed to satisfy the probe.

E6 remains pending live witness evidence.

---

## Slice E7 — Shared place-scoped environmental occurrences — ACTIVE

**Goal:** one observable environmental happening belongs to the World, never to the particular Thread that triggered its authoring. E7 extends E6a, not the encounter ontology.

### E7.1 — One shared objective happening, distinct lived attention

For an already-admitted shared physical World place (`wpl_*`):

```text
one bounded environment encounter request: Thread + exact lived time
  -> World ensures that Thread's real LivedNow
  -> authentic shared World place + existing CurrentSituation witnesses at that time
  -> World occurrence author sees place/time, not any observer's identity or activity
  -> one Encounter Story with actual co-present Thread situations
  -> each present Thread independently noticed | not_noticed
  -> only noticed Experience enters existing delayed consolidation
```

The existing E6a one-Thread path remains for transit or non-shared physical locations. E7 does not conflate reusable Genesis place IDs with live physical co-presence, and it does not use a shared mediated context as evidence that a physical rainstorm occurred around every member.

One triggered episode appraises the requesting Thread and at most three additional already-current witnesses. That is a model-compute burst bound, not a target for encounters or attention; the objective story may include more genuinely co-present Threads. Their optional later observation must reuse the same immutable event and their own attention authority.

The existing Encounter Story store now atomically reuses an already-admitted single-beat environmental occurrence for the **exact same shared World-place reference and occurrence timestamp**, even if concurrent producers propose different descriptions. It uses an indexed occurrence-time query over the existing story/source evidence; no separate occurrence table, event bus or weather state was introduced. A Thread absent from the original admitted event's presence set cannot retroactively add itself to that event.

**Focused acceptance proof:** two genuinely co-present Threads share the same place/time-scoped objective event; one notices and forms Experience, the other does not; an unrelated Thread at another location is absent; the second Thread's independent invocation does not generate a second rainstorm; a competing newly proposed description cannot rewrite the admitted event. Retry may not duplicate attention or consolidation.

**E7.1 local focused validation passed (Guy, 2026-10-08).** Production/staging evidence of two naturally co-present Threads at an admitted `wpl_*` remains pending. A lack of co-presence is `blocked_by_world_state`, not grounds to teleport Threads or weaken the acceptance proof.

### E7.2 — One earned, **potentially noticeable** World continuation — LOCAL ACCEPTED / STAGING PENDING

An E7.1 shared-place objective environmental occurrence may earn **one** follow-up opportunity, currently 30 minutes later. This is a provisional timing policy, not a weather duration, frequency target, or continuous simulation.

```text
admitted World occurrence
  -> one durable future opportunity
  -> existing World reconciliation alarm
  -> read already-enacted exterior CurrentSituations (no waking Threads)
  -> if zero plausible candidate observers: not_observable, no cognition/event
  -> otherwise one bounded World decision:
       not_observable -> no new occurrence
       no_change      -> no new occurrence
       changed        -> one continued objective Encounter Story
                         with grounded potentially perceiving Thread situations
  -> quiescent (no recurring weather chain)
```

**Noticeability is the admission optimization.** A change should be authored only where and when a Thread could potentially see, hear or otherwise perceive it. This is **not a geographic-distance rule**. An observable remote flash, cloud formation or sound may reach a Thread in another World place when the exterior scene and event plausibly support it. The candidate pool is a bounded projection of already-enacted recent physical situations (currently at most eight; no `LivedNow.ensure` and no whole-population waking). A model judges actual physical perceptibility from the source occurrence and the candidates' exterior physical place/activity, not from proximity alone. Lack of evidence is not a license to invent perceptibility.

An admitted `changed` event names one or two grounded potential observers with their own authentic CurrentSituation references, even if they occupy different physical places. **Potential perception is not `noticed`**: no automatic Thread Experience, Journal, Memory, forced dialogue, or relationship change. Further participant-specific attention uses the existing Encounter/Experience boundary. Without potential observers, the work ends as `not_observable` and there is neither an objective new event nor a model invocation when the candidate set is empty.

The World model sees no Thread Genome, private memory, intentions or feelings. Its `changed | no_change | not_observable` decision and grounded potential observers are persisted *before* objective event admission so retry never rerolls an already-decided change. The resulting Encounter Story cites `continuationOfEncounterRef` and still uses E7.1's exact-place/time atomic deduplication. `world_environment_followups` is scheduling and decision bookkeeping, never a competing event authority. No changed event schedules another follow-up.

**Focused acceptance:** early reconciliation causes no model work; no eligible current observers yields zero cognition and no event; a Thread in a different place may plausibly perceive an event regardless of distance; `changed` admits one causally continued story with that Thread's real situation but no fabricated attention; `no_change` produces no event; a persistence failure retries the same durable judgment; another reconciliation wake preserves the due alarm; resolved work returns to quiescence. Guy reported all E7.2 focused tests green on 2026-10-08; full-slice closure validation remains pending.

**Staging acceptance deferred:** one naturally available observable shared-place event with legitimate observer evidence, one delayed continuation or valid non-event, and provenance. Never create artificial co-presence, nor claim that an approximate place name proves a distant event visible.

### E7.3 — Independently lived environmental evolution — LOCAL ACCEPTED / STAGING PENDING

An E7.2 `changed` occurrence is already objective World history and carries 1–2 actual, historically grounded potential observer situation references. E7.3 now passes **that same admitted story** to the existing Thread attention authority separately for each candidate: `noticed | not_noticed`. A noticed outcome becomes one Thread-owned immediate Experience and enters the existing delayed, selective consolidation queue. A missed outcome creates neither Experience nor Memory. Nothing forces speech or implies the two observers are physically co-present: a distant witness can perceive a long-range phenomenon when World evidence supports it.

The single bounded World follow-up is not marked complete until all of its admitted observer decisions and any warranted consolidation queue entries are durable. An interrupted attention or wake request resumes from the admitted World story and previously recorded individual decisions. Retry must not reroll the weather, duplicate Experience, or manufacture a memory. E7.1 shares this very same attention admission helper, rather than maintaining a parallel environmental psychology implementation.

**E7.3 focused acceptance:** one coherent environmental event is perceivable by two genuinely distinct situated Threads (potentially in different places), one independently notices and has Experience, the other independently misses it, only the noticed Experience enters the consolidation frontier, and retry does not resample either World facts or personal attention. A second failure/retry proof interrupts consolidation scheduling after attention is durable. The World reconciliation process gives newly noticed environmental Experience a bounded additional pass so delayed consolidation cannot be orphaned.

**Local acceptance (2026-10-08):** Guy reports the E7.3 focused suite and complete `npm run slice:validate` passing at `da0a55feaf04ea582f625da16cdfb677e6d233ce`. No staging E7.3 proof is claimed.

**Staging evidence, 2026-10-08:** Guy ran `npm run slice:validate` at `64063557bd5309bea76e1ea5196bff4c0cff5c8d`: all **1,554 tests** passed, generated context-pack, World seed, and deployment manifests validated. He deployed the same SHA to `fibre-world-kernel-staging` successfully. The read-only E7 probe (`e7-muzswdoc`, local evidence `.fibre/e7/staging/e7-muzswdoc/evidence.json`) returned `no_source_in_bounded_scan` with `sourceCount:0`, `continuationCount:0`, `verifiedObserverEventCount:0`, `unavailableThreadCount:0` and exact deployed SHA. It surfaced one old `wpl_*` situation established **2026-09-25**, described as a homework-study setting. That is **not fresh evidence of noticeability** on October 8, and its long display name does not independently establish a physical location. This confirms deployed instrumentation and a natural-source **World-state block**, **not** E7.3 live acceptance. Do not re-run an unchanged read-only scan expecting different evidence, invoke global `LivedNow.ensure`, generate encounters in a loop, or manufacture co-presence to make the probe green.

**Natural staging acceptance still pending:** run the read-only `npm run world-environment:probe -- --env staging` against an operator-deployed exact source Git SHA. It inspects at most 40 public Thread IDs via private World Observatory, discovers current naturally admitted `wpl_*` scenes, and correlates E7.1 source Story → one delayed E7.2 World follow-up → later Story → each potential observer's actual attention and Experience. It never calls cognition, triggers a new encounter, forces co-presence, or loops for better evidence. New evidence is stored under `.fibre/world-environment/<env>/<runId>/evidence.json`; missing source/continuation is explicitly a World-state block rather than passing E7.3.

First verify that the deployed World has a real E7.1 source occurrence with an earned E7.2 continuation and naturally situated candidate observers. If two candidates can genuinely perceive one event, observe their independently authored outcomes in each Thread's Observatory. A World-state block, a `no_change`, or two legitimate `not_noticed` decisions is not an implementation failure, but does not prove the full contrasting-attention demonstration. Do not teleport Threads, hand-pick their private attention judgments, broaden observability by assertion, or repeatedly generate events until a favorable outcome occurs.

This closes the *mechanism* after operator test acceptance. It does not imply autonomous initial weather seeding, automatic long-range realism, delayed autobiographical retention for every noticing, or N7.11's later-behavior consequence proof.

### 2026-10-08 live-situation evidence — venue identity blocker

Guy performed **one** ordinary `POST /internal/lived-now/ensure` against staging for the Thread surfaced by the E7 read-only scan. World returned a fresh `CurrentSituation` (`sit_6f91107d2668153c755a07cf8e5fc8bd6e1c076d4bd7dac4818675006c9b88f7`, established `2026-10-08T17:24:41.143Z`), `phase:at_place`, with activity `Wind down at the study space, put away books, and prepare for sleep.` It carries `wpl_75bdbaeade0d3c17b55111c8bedcc77e22af50746481abc1c287cd83848fe1dc` and `placeKind:library_or_learning`. The admitted WorldPlace description, however, describes homework **at a dining table or on a bed**, family assistance, tutoring and coaching centres. Public Present has `location.place:null`.

**Finding:** the Thread's present is freshly enacted and credible as its *own* situation; the `wpl_*` classification is **not** sufficient evidence that the setting is a uniquely identifiable shared public venue. `live-world-place.mjs` currently derives `wpl_*` from Genesis `sourceWorldRef/sourcePlaceId/placeKind` and admits by `library_or_learning` kind, using `place.description` as `displayName`. An admissible historical learning *context* can therefore masquerade as an exact physical public place. Equal identifiers based on shared source material are also not independent evidence that two Threads visited the same real venue.

**Do not call environmental-encounter on this situation as a shared-place acceptance proof**, force another Thread into it, or treat its descriptive text as a venue name. Do not fix the error with fragile keyword classification, longer prompt instructions or a new periodic simulator. Keep E7.1–E7.3 local acceptance intact and E7 live acceptance open.

### E7.4 — Grounded physical venues + earned initial World opportunities — IMPLEMENTED / OPERATOR VALIDATION PENDING

**Staging finding preserved:** the 2026-10-08 home-study LivedNow is an authentic private current situation; the Genesis `library_or_learning` label is *not* proof of a public place. Existing immutable `wpl_*` contextual records remain usable for personal planning and situated history but **are not co-presence authority by themselves**.

**Physical venue identity:** `live_physical_venue_bindings` is a small, explicit, independently evidenced **per-Thread contextual-place binding** from that Thread's historical `wpl_*` to a shared physical `venue_*` identity. Sharing one Genesis WorldSpec never automatically extends another Thread's venue attestation. The binding requires a specific stable venue identity, display name, locality, country and evidence reference; two different Genesis contexts may legitimately map to the same physical venue. Binding is an explicit operator/World admission (`POST /internal/world-venues/bind`); it does *not* reposition, replan, or introduce a Thread to anyone. The existing WorldPlace projection exposes an optional `physicalVenue`. Physical social co-presence and shared E7.1 environmental occurrence now require a common attested venue reference; matching Genesis kinds, prose or contextual `wpl_*` IDs are insufficient. Mediated contact remains its independent, explicit path. Historical WorldPlace records are not rewritten.

**Sparse initial opportunity:** a real `LivedNow.ensure` transition now earns **one** durable `world_environment_opportunities` row keyed by the actual `situationId`. The Cloudflare World uses this hook across its existing seven LivedNow entrances; the local contact LivedNow seam uses it too. A single existing World alarm considers the opportunity after a provisional one-minute delay, **not inline** on the user-facing LivedNow request. The opportunity is consumed only when the originating situation is still current and recently enacted (within one hour); otherwise it settles `not_observable` without calling the model. This is a bounded enacted-life freshness guard, not a spatial radius.

With eligible actual exterior scenes, one World cognition may choose `no_change` or author **one** concise objective occurrence with up to two grounded potential observers. The source Thread always remains eligible if present. A private/unattested contextual place limits potential observers to the actual source Thread because it lacks independently grounded long-range location identity; a confirmed venue may present recent, independently situated candidates elsewhere, whose actual noticeability the model must assess **without a distance cutoff**. An event is not chosen for excitement; quiet life is normal. The immutable decision is recorded before admitting an Encounter Story and separate `noticed | not_noticed` attention. Only noticed personal Experience enters the existing selective consolidation frontier. Reconciliation shares the same World alarm with E7.2 and returns to quiescence after earned work, with no repeated tick.

A shared **attested** venue source may earn the existing E7.2 one-shot follow-up; an unverified private-place occurrence never becomes a fabricated public shared-place continuation. E7.3 continues to own personal attention. No new event truth authority, weather physics, mandatory memory, forced co-presence, brute-force Thread wake, or autonomous loop was introduced.

**High-value local acceptance:**
- Two distinct Genesis/context places can resolve to the same explicitly attested physical venue, while an unbound homework/bedroom context never does, even when marked `library_or_learning`.
- Two independently enacted situations can enter shared presence only through that attested venue or a separately agreed mediated context.
- One actual new LivedNow transition can earn only one opportunity; an idempotent same-situation ensure does not re-earn it.
- One opportunity may produce one honest exterior occurrence and independent noticed Experience; another may settle `no_change` without any objective event. Subsequent reconciliation must not reroll either.
- E7.4 initial source and venue code has passed Guy's local focused and full validation and was deployed at `26297994`. The subsequent lost-wake fix/logging is committed but has not yet been validated or deployed by the operator.

**2026-10-08 operator acceptance and blocked alarm:** Guy's E7.4 focused run passed **44/44**, full `npm run slice:validate` passed **1,556/1,556**, and `fibre-world-kernel-staging` deployed source `26297994a4833c7a7b50e02acbc64705642d44c2`. The final read-only probe at `e7-muzub3be` matched that deployment, with zero shared sources and zero new ambient opportunities. A **single** subsequent `LivedNow.ensure` advanced one genuine Thread from winding down for sleep to **Sleep** at `2026-10-08T18:03:35.972Z`, earning one durable initial World opportunity due `18:04:35.972Z`. At `18:07:05.490Z`, read-only Observatory still showed `pending`, no Encounter Story and no attention. Thus E7.4 **LivedNow → queue** is live-proven, but **alarm → consumed decision** is not. Inspecting the existing reconciliation runtime exposed a genuine lost-wake race: an older in-flight World sweep could cancel an alarm newly scheduled by a concurrent lived transition if its own sweep had no due work. The follow-up change preserves a newly installed alarm and reports bounded failures through the existing World reconciliation error callback. The race proof runs against **both local and Cloudflare InfraDriver scheduler ports**; scheduling and persistence stay exclusively behind the InfraDriver abstractions, allowing a future AWS provider to implement the same contracts. The correction remains **operator validation and deployment pending**. The race is a supported explanation, not proven as the unique cause of the observed pending record. A single explicit authenticated reconciliation wake may be needed after deployment to resume this preexisting overdue work; do not create additional situations merely to test the alarm.

**2026-10-08 manual recovery outcome:** Guy deployed the InfraDriver-neutral reconciliation correction at `22514f2259e387610d59421dc595ddd515b16d91` and issued one authenticated `POST /internal/reconciliation/wake`, which was accepted and scheduled via the shared scheduler. The ensuing read-only probe `e7-muzuyhsg` observed the original, non-forced opportunity and source-matched SHA. The local evidence subsequently confirmed **`outcome:no_change`**, **`completedAt:2026-10-08T18:16:25.226Z`**, no encounter, for the situation enacted `18:03:35.972Z` and due `18:04:35.972Z`. This **closes live proof of durable enqueue -> manual recovery wake -> one settled, quiet World decision**, without creating objective events or personal attention. It does **not** establish timely *autonomous* alarm delivery, because the original opportunity remained pending beyond its due time and settlement followed the operator wake. The correction's full local test run was not supplied; do not imply it passed. The next E7.4 gate is one fresh, materially earned opportunity consumed by an automatically delivered InfraDriver wake on schedule, without operator intervention or repeated sampling.

**Still pending:** true staging physical venue attestation grounded in actual place identity, naturally independent Thread presence, and long-range/perception evidence; do not attest a home study context to force a pass. The provisional one-minute delay and one-hour scene freshness may be refined from real observations; they are not claims about a physical event's range or duration. Broader reusable `PlaceSpec -> WorldSlice -> ThreadWorldContext` admission remains an open extension, not prematurely instantiated.

**2026-10-08 environment-inspection evidence:** Guy ran `npm run world-environment:probe -- --env staging` from `4bedcceb` while the World runtime was deployed at `71828f37`. The scan found one historical ambient opportunity, no new shared source, **zero scheduled life boundaries** and **zero blocked life boundaries**. The old exact-SHA-only guard labelled this `deployment_outdated`, even though comparison of those commits proved the delta was exclusively docs, operator instructions, a probe rename and its npm script. The capability-named read-only probe now explicitly checks the Git diff and allows *only* those tool/document changes (including an exact script-only package comparison) before treating a deployed runtime as equivalent; any other source or dependency change still blocks source parity. No runtime deployment is needed for this adjustment. E7.5 remains unverified naturally: the existing inactive life frontier is intentionally not backfilled by the probe; one real LivedNow admission after runtime deployment must schedule the first boundary, then the next advance must occur by World alarm without an operator wake.

### E7.5 — Flight Plan boundary-driven autonomous life — NATURAL STAGING PROGRESSION OBSERVED

**Goal:** Once a Thread's World-owned life has been established, it should continue through the *actual* stops, travel intervals, and renewal horizon of its admitted personal Flight Plan without needing visitor or operator `/ensure` requests. **One Thread's next meaningful boundary, not a periodic population sweep, is the unit of work.**

**Implementation:** `lived_now_next_boundaries` stores one indexed next `dueAt` per Thread (plus the situation authority that earned it). `nextLivedBoundary` derives the earliest future planned stop start/end or one millisecond past the current personal/care horizon; no novel scheduler, prediction algorithm, event quota, or proximity radius. Every ordinary LivedNow establishment uses the existing `onSituationResolved` hook to update its own boundary, even when there is no new environmental opportunity. The existing World reconciliation alarm, through `InfraDriver.scheduler`, retrieves at most **one due life** in a pass, calls the **same** `LivedNow.ensure` used by real encounters at the actual reconciliation time, then re-arms from the resulting admitted plan. World reconciliation chooses the earliest deadline across lived boundaries and E7 environmental continuations. All seven Cloudflare LivedNow entries and the local contact path share this authority; no provider-specific timing logic is in the domain.

**Retrospective and failure behavior:** the existing N2 bounded catch-up handles genuinely late wakes and forward Flight Plan renewal; no fake historical moments are created just to fill silence. One exhausted/ungrounded `LivedNowCoverageError` blocks the frontier without repeated model calls. Other failures retry at most three times through the existing exponential World backoff, then block with a short inspectable reason until a new *real* `ensure` can re-arm. Observatory now exposes `livedNow.nextAutonomousBoundary` without triggering cognition. No ongoing model sampling while a Thread remains in the same committed interval.

**Focused acceptance:** World enacts exactly one planned departure on the stop boundary, schedules the next arrival and doesn't replay the old boundary. A failing planner becomes quiescent after bounded retries; the operator can inspect its blocked reason. The same InfraDriver alarm respects the earliest environment and lived deadlines. Independent natural staging proof requires a fresh Thread with an admitted plan to advance at its actual next boundary **without a second operator /ensure or /reconciliation/wake**. E7.4's existing manual `no_change` recovery alone is not proof.

**Limit:** E7.5 does not bootstrap all existing dormant Threads, enumerate the population, manufacture shared physical venues, or claim that a Flight Plan is identical to objectively lived reality. Initial admission remains a bounded real Thread request/birth transition. Natural staging life progression is observed below; direct alarm-callback attribution, environmental subjective consequence, and unreported validation runs remain unclaimed.

**2026-10-08 staging boundary admission proven:** Guy's capability-named read-only `world-environment:probe -- --env staging` reported `runtimeSourceMatches:true` for checkout `883374cc` and deployed World SHA `71828f37`, with zero preexisting scheduled/blocked life boundaries. One ordinary authenticated `LivedNow.ensure` then established Thread `thr_bd945d68e3e2b0da31a9a612e603065bf09e2b34` at `2026-10-08T18:53:04.466Z` in **Sleep**, situation `sit_bc048da3db8fab0ae9a04282bc5276dd53ae377a5436df75553c090a7afcb56c`, and the read-only World Observatory confirmed `nextAutonomousBoundary` due `2026-10-09T02:00:00.000Z`, `blockedReason:null`, `failedAttempts:0`. This independently verifies the **admitted CurrentSituation → durable exact next Flight Plan boundary** stage with no arbitrary polling. **At this pre-boundary checkpoint, autonomous advancement had not yet been observed.** The read-only post-boundary result appears below.


**2026-10-08 natural staging boundary outcome — read-only operator evidence.** Guy queried World Observatory before and after the admitted deadline. No intervening manual `/ensure`, reconciliation wake, or redeployment was reported. Deployed World Kernel source was `71828f37`.

| World evidence | Before boundary | After boundary |
|---|---|---|
| Read-only `checkedAt` | `2026-10-09T01:38:05.134Z` | `2026-10-09T02:03:31.534Z` |
| Current situation | `sit_bc048da3db8fab0ae9a04282bc5276dd53ae377a5436df75553c090a7afcb56c` | `sit_ea745e862f5667306aab6342d07e42d92bc127a43d7fa840b7872bda578ebee7` |
| Established at | `2026-10-08T18:53:04.466Z` | `2026-10-09T02:00:00.003Z` |
| Activity | Sleep. | Wake, wash, eat, and settle into the morning without rushing. |
| Previous situation after deadline | — | Exact preceding sleeping situation `sit_bc048da3db8fab0ae9a04282bc5276dd53ae377a5436df75553c090a7afcb56c` |
| Next autonomous boundary | `2026-10-09T02:00:00.000Z` | `2026-10-09T03:00:00.000Z` |
| `blockedReason` / `failedAttempts` | `null` / `0` | `null` / `0` |

Both situations cite the same Flight Plan `lplan_3963b2842564812b8379fa2ffacb632ee44aedb607f8019beaed402619119890`. The World-enacted waking situation was established **3 ms after the planned boundary**, retained the exact sleeping situation as its predecessor, and scheduled its next boundary one hour later. The read-only Observatory request did not call `LivedNow.ensure`. This is strong observed evidence of unattended Flight Plan progression. The snapshots alone do **not** independently prove the internal alarm callback invocation, absence of every possible external trigger, model-call count, or later developmental effects. Do not infer E7.3 environmental noticing or N7.11 contact acceptance from this result.

### Explicitly deferred

- A continuously evolving external weather system or meteorological feed (deferred, no current authority).
- Independently generating events outside a real earned LivedNow situation or prior environmental event (deferred: E7.4 seeds sparsely from genuine lived transitions, not from a freestanding perpetual World clock).
- Scalable background attention fanout across very crowded places (deferred; the currently admitted presence set is larger than the bounded immediate cognition cohort).
- Physically fine-grained sight/hearing/occlusion within the same World place (deferred; co-presence only establishes *potential* observability, not guaranteed noticing).
- In-progress live-conversation exposure of third-party speech fragments (separate N7/E6 integration proof).
- Longer-lived environmental state, cross-event causal simulation and repeated weather progression beyond E7.2's single linked follow-up (deferred).

No global ticking, quota of interesting events, simulation framework, event-interest score, new memory subsystem, or mandatory Journal/Memory production.

---

## W0–W7 historical social-learning outcomes — retained constraints

The former W0–W7 effort exposed necessary organism primitives, but its old runnable order is **not** the active roadmap. The authoritative current semantics also live in [Situated perception and salience](../architecture/situated-perception-and-salience.md), [Interior Cognition](../architecture/interior-cognition.md), [Intrinsic regulation](../architecture/intrinsic-regulation.md), and [LivedNow and meetings](../architecture/lived-now-and-meetings.md).

- **W0/W1:** reciprocal history records only *actual outward* requests and observable acceptance/decline/defer. A private `not_initiate` is not a shared event. One ephemeral Situated Percept resolves the observer's genuine current scene, counterpart's *observable* identity/activity, recent mutual acts and admitted Story facts; it never sees the counterpart's private state.
- **W2/W3:** the same Interior Cognition handles invitation and response, considering real relationship/culture, interruption cost and legitimate social pressure without a `politenessScore`. Cheap Salience Gate returns `background | salient` before optional model work; **background is not a personal refusal**. Unsupported `unexpected_observable` cues are not manufactured from object stereotypes or prose keywords.
- **W4/W5:** ordinary World co-presence yields actor-specific opportunities, not forced introductions. Grounded sustained same-activity/scene evidence can increase exploration pressure and widen attention, but passage of time alone, lack of social records, or the words “boring”/“lonely” cannot mechanically establish boredom or social deprivation. Private choices remain Thread-owned.
- **W6:** replayable near-threshold attention microvariation was an optional experimental idea, **not** a required causal proof, random sociability policy or standing claim.
- **W7a/W7p:** a caller chooses at most an initiating Thread; World discovers bounded, already-current compatible actors and may form several distinct ordinary encounters. The initial shared `lworld_*` / `wpl_*` admission seam and local IANA civil-time context are historical stepping stones, **not evidence that equal Genesis place labels or generic `library_or_learning` imply a unique real public venue**. E7.4's later explicit independently attested venue binding takes precedence.
- **W7b:** forcing all tested Threads into Commons, selecting partner/witness IDs, redefining private hesitation as a response, or repeating a model until a sociable outcome is forbidden. Natural acceptance needs independently selected scene, selective salience, real non-initiation/decline, a genuinely accepted shared Story where it occurs, distinct Experiences and selective memory, not fixture-scripted sociability. This remains a separate natural-society evidence goal, not an unfinished E5 closure condition.

**Historical negative lesson:** late-night/sleeping cohorts legitimately declined or did not initiate. Co-presence does not imply obligation to talk. Correctness means preserving these non-events, not improving a pass rate by changing the Thread's circumstances.

## Validation discipline and limits

Protect actual phenomena: one honest environmental event may be noticed or ignored, one voluntary meeting cannot coerce, one silent witness may form different meaning, Journal != Memory, and one stable admitted Story can generate optional objective visuals without becoming proof of the depicted historical image. Validate the meaning of causal authorities and retry/non-retention, not exact prose, CSS or helper ordering.

E6/E7 continue to forbid universal event buses, whole-world polling, simulation ticks, quotas of interesting events, mandatory emotional reactions, automatic memory, new chat/session authorities or brute-force repeated provider use. Retain negative/provenance observations and do not elevate local validation to live experimental evidence.
