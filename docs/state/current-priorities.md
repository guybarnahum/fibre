---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-10-08
canonical: true
---

# Current priorities

Fibre's active north star is now **continuous LivedNow + encounters**.

The bounded M2 slices proved the core pieces of a lived person. N1 establishes World-owned present life, N2 restores it across bounded multi-day dormancy, N3 makes a canonical Genesis birth enter that same continuity seam, and N4 proves a deployed Person -> Thread encounter can enter that reconciled life. N5 established the broader insight that **encounter is the primitive; meeting is one voluntary social form of encounter**. N6 then proved a sustained ordinary Person -> Thread conversation directly against World and exposed the next architectural constraint: the conversation engine is still request/response shaped. **N7 is now the active north-star tranche: asynchronous Live Encounters with no turn owner, interruptible streamed expression, continuing World life, bounded later consolidation, and the same primitive for Person -> Thread and Thread -> Thread.** N6.6 public-endpoint/Viewer proof remains preserved and resumable rather than being erased by the refactor.

Canonical architecture:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [Encounter stories and Thread experience](../architecture/encounters-and-experience.md)
- [N5 encounter-story implementation slices](../validation/n5-encounter-slices.md)
- [N6 rich public lived encounter slices](../validation/n6-public-lived-encounter-slices.md)
- [Live encounters](../architecture/live-encounters.md)
- [N7 live encounter slices](../validation/n7-live-encounter-slices.md)
- [The Lived World of Fibre](../vision/lived-world.md)
- [ADR-0023: Retrospective lived continuity across compute dormancy](../decisions/ADR-0023-retrospective-lived-continuity.md)

## What is already proven

```text
R1-R4 intrinsic regulation                                CLOSED

A1 bounded Flight Plan + CurrentSituation                 CLOSED
A2 care plan + conflicting wills                          CLOSED
A3 current-life inspection/projection                     CLOSED
A4 public present projection                              CLOSED
A5 situated Person -> Thread encounter                    CLOSED
B1 encounter -> private reflection -> selective memory    CLOSED
B2 later situation + later encounter continuity           CLOSED
```

These are valuable **primitives and bounded proofs**.

They do not yet prove:

```text
wall-clock dormancy
  -> elapsed-life catch-up
  -> plan renewal
  -> authoritative present now
  -> real deployed /meet
```

Therefore Fibre should no longer describe the remaining work as merely “run the live meeting.” The deployed meeting depends on continuous LivedNow first.

## Active sequence

```text
N1  World-owned ensure-LivedNow seam                      CLOSED
N2  dormant/frozen interval catch-up                      CLOSED
N3  Genesis -> first LivedNow -> multi-day continuity     CLOSED
N4  Person -> Thread /meet over real LivedNow             CLOSED
N5  Encounter Story -> Thread Experience                  CLOSED LIVE
N6  rich insidefibre.com lived encounter                  PRESERVED / RESUMABLE
N7  asynchronous Live Encounter                           CURRENT
```

Keep these slices narrow. Reuse the existing Flight Plan, CurrentSituation, encounter, memory, relationship, Presentation and canonical embodiment authorities.

For a lived Thread, treat a current half-day/day Flight Plan as a rolling continuity expectation. If compute slept, thaw/catch-up may realize the missing plan/history retrospectively, but it must preserve lived-time versus materialization-time provenance and may form memory only through the normal experience/retention path.

Do not create a parallel life engine.

## N1 — ensure LivedNow — CLOSED

World now has one narrow `ensure({ threadId, at })` seam. For time already covered by an admitted personal Flight Plan, it deterministically enacts the World-owned CurrentSituation, respects a covering required care constraint, rejects caller-authored scene fields, and is idempotent for the same requested present.

When no personal Flight Plan covers the requested time, the seam still refuses to reuse a stale CurrentSituation or accept a meeting-authored scene. With the N2 reconciliation dependencies present, that uncovered interval now routes into bounded dormant catch-up before the present is established.

The seam composes existing `LivedNowStore`, Flight Plan, care-resolution and CurrentSituation authorities. It does not create another planner, scheduler or life store.

## N2 — dormant interval catch-up — CLOSED

A lived Thread may be computationally frozen while world time passes. The first N2 proof now takes a valid prior lived anchor across a three-day dormant gap, consumes the remaining already-authored plan coverage first, materializes only a bounded number of retrospective plan/situation windows, authors fresh forward coverage, and establishes a non-stale present.

When an uncovered interval exists, World may retrospectively realize the smallest credible continuation:

- bounded retrospective Flight Plans;
- place/transit/activity episodes;
- encounters only when warranted;
- objective history;
- participant-specific consequences through normal authorities.

Historical honesty is mandatory:

```text
lived/occurred time
    !=
later materialization/admission time
```

Do not inject “virtual memories.”

The valid path is:

```text
retrospectively admitted event
  -> experience / interpretation
  -> selective memory or not_remembered
```

Quiet time remains sparse. This is not a minute-by-minute simulator.

The admitted retrospective records preserve both their lived timestamps and `materialization: { mode: "retrospective", materializedAt }`. Catch-up is bounded to a small number of windows, continues from the prior lived place instead of teleporting, and retrying the same requested present does not regenerate the gap. The quiet-gap proof does not manufacture an encounter or memory merely to demonstrate consequence; when future catch-up synthesis admits an event that warrants consequence, it must use the ordinary experience/retention authorities already proven by B1/B2.

## N3 — Genesis to continuing life — CLOSED

A canonical Genesis birth now exits through the same World-owned LivedNow seam used later: the `THREAD_SEEDED` event defines the Fibre birth boundary, the latest grounded Genesis place anchors the first plan/present, and a direct request several days later reuses N2 catch-up rather than a Genesis-specific life engine.

The important E2E is no longer merely:

```text
Genesis -> born Thread -> presentation
```

It is:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> first lived continuity anchor
  -> first personal Flight Plan
  -> World CurrentSituation
  -> compute sleeps
  -> several days pass
  -> catch-up + plan renewal
  -> authoritative present now
```

This is the bridge between Genesis and the lived world.

Genesis supplies grounded prior life. LivedNow owns life after Fibre birth.

## N4 — Person -> Thread meeting — CLOSED

`/meet` now asks World to establish LivedNow before exposing the scene. Meeting is an intersection with ongoing life, not a scene-creation API.

```text
select Thread
  -> ensure LivedNow(now)
  -> publish exact bounded present
  -> Person enters that scene
  -> objective encounter
  -> private experience
  -> selective consequence
```

The visitor cannot choose the Thread's location, activity, private state or plan.

The automated path proves meeting entry cannot author the scene, reconciles before exposure, and keeps later utterances bound to the returned `situationId`. Deployed staging acceptance then exercised that exact path against a real Thread: `/meet` established and published a fresh World-owned present, and the subsequent encounter succeeded against the same `situationId` with a response grounded in the Thread's current activity. N4 is closed.

## N5 — Encounter Story -> Thread Experience — CLOSED LIVE

N5 now asks a more fundamental question than “can two Threads talk?”:

> **How does something that happens in the World become this Thread's lived experience and possibly bend her future?**

The accepted causal shape is:

```text
World occurrence
  -> objective Encounter Story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

Meeting remains a special voluntary social wrapper:

```text
meeting request
  -> exact LivedNow
  -> accept | decline | defer
  -> if participation requirements pass:
       Encounter Story
       -> Thread Experience(s)
```

E0 reconciled the first implementation spike into a green foundation. E1 then proved the general environmental encounter seam: an unscheduled World occurrence can be admitted as an objective Encounter Story, remain richly visualizable, enter or miss one Thread's attention, and only when noticed become personal Thread Experience and selective consequence.

The useful pieces now proven or retained are:

- independent ensure-LivedNow;
- place compatibility through explicit admitted live World-place authority or matching mediated context;
- meeting stance;
- n-ary shared-story persistence direction;
- witness-aware aftermath direction;
- Thread-specific journal book in private R2;
- rich Admin journal presentation;
- journal separated from autobiographical memory.

The obsolete dyadic meeting authority and tests are gone; meeting stance and social story cognition are separate; Encounter Story and Thread Experience own the general persistence vocabulary. E1 adds objective visualization lineage and retry-stable attention; E3 proves a genuinely co-present silent witness can form distinct private aftermath without becoming an invitee or speaker. E4 now makes the separation inspectable: Admin shows the objective story/prompt/provenance, this Thread's attention, World journal-entry authority and the private R2 journal book separately from autobiographical memory. The same objective prompt can produce a normal image/video asset job with distinct canonical visual references and chronology-derived ages, while missing likeness authority defers rendering. Full CI is green. E5 is now closed in staging through a real insidefibre.com visitor-work path: a Thread voluntarily accepted future paid visitor availability, that commitment revised the Flight Plan, LivedNow later enacted the mediated work presence, public Meet discovered the Thread during the accepted window, a real visitor utterance produced a new Encounter Story and noticed Thread Experience, and the agreed Fibre Credits settled exactly once.

The active execution plan is [N5 encounter-story implementation slices](../validation/n5-encounter-slices.md):

1. E0 reconcile the spike and restore one coherent green model — **closed**;
2. E1 environmental Encounter Story + noticing + Thread Experience + visualization prompt — **closed**;
3. E2 social meeting as a gated encounter — **closed**;
4. E3 n-ary story + silent witness consequence — **closed**;
5. E4 journal book/optional rendering/Admin acceptance — **closed**;
6. E5 staging acceptance — **closed live**.

**E5 live closure.** Staging run `inside-fibre-muegy2ai` on SHA `9bf65debfe2636b13c7ca1dbffa5d265072f486d` completed the end-to-end visitor-work path for Luka Mzechabuki. Earlier in the same live sequence, Sara Mizrahi and John Lakewood independently declined future paid availability while Luka accepted a 20-minute, 12-FC shift because the compensation had practical value and he judged the ordinary future plan could be revised. Fibre persisted commitment `work_39779538e78db25b1fcbecf9567d18e34b065a908910ed39`, revised his Flight Plan, later admitted the active work scene through public Meet, recorded Encounter Story `story_2a0816db192e5ab2f82f4cc446e46b145f69e78dec963a32`, admitted his Thread Experience, and moved the derived Fibre Credit balance from 0 to 12. This closes N5 without weakening agency: refusal remained valid, and acceptance was prior voluntary commitment rather than click-time coercion.

N5 also produced a reusable natural-social substrate: Interior Cognition, Situated Percept, a cheap Salience Gate, grounded exploration pressure, natural actor discovery, explicit live shared-place authority and local civil-time context. Those mechanisms remain accepted/retained.

The old W0-W7 coordinates described how that substrate was reached. They are now historical implementation labels, not active roadmap state. Natural Thread -> Thread acceptance remains preserved follow-on work after the public N6 continuity proof; Fibre must not bias cognition or manufacture co-presence merely to close that later proof.

### Two social paths from here

Do not collapse public reliability and natural social life into one acceptance path.

**N6 / insidefibre.com Person -> Thread is current.** The visitor now meets a Thread in the ordinary scene her Flight Plan already produced. The missing proof is Thread-owned participation from that lived context and later-life continuity—not scheduled visitor availability.

**Natural Thread -> Thread life is retained follow-on work.** Ordinary Flight Plans, admitted shared World places, natural actor discovery, salience and voluntary social cognition remain the right mechanism. Do not pay, schedule, choose counterparties or bias cognition merely to manufacture a natural encounter proof.

**Developmental exploration X0-X4 are accepted; E6 autonomous encounter production/discovery is current pending live witness evidence.** X4 closed the core loop through subjective Journal / selective autobiographical retention into later `lived_planning`. E6 now removes the remaining caller orchestration before X5+: environmental occurrence prose is World-authored from exterior current-scene evidence, and incidental witnesses are derived from authoritative co-presence rather than caller-selected IDs. Both reuse the existing attention / Experience / Journal / Memory stack. Live E6 evidence now uses the bounded `encounter-autonomy:probe -- --env staging`: E6a is proven independently; E6b is attempted only when three Threads are already co-present, otherwise the probe records a World-state block and reports the next admitted shared-place overlap without waking unrelated lives. The 2026-10-08 bounded staging probe inspected 28 Threads and found zero three-way co-presence and no next shared-plan window: E6b is **blocked by World state**, not live-accepted. E6a was deliberately not rerun. N6.6 remains preserved and resumable.

Both paths reuse:

```text
authoritative presence
  -> Encounter Story when something occurs
  -> participant-specific Experience
  -> optional journal
  -> selective memory / relationship / intention consequence
  -> future life
```

Historical W0-W7 and S coordinates remain useful implementation archaeology only. They are not a second current roadmap.

**E7 — shared environmental World.** E7.1 and E7.2 focused tests passed locally (Guy, 2026-10-08). **E7.3 locally accepted (Guy, 2026-10-08); staging pending:** after one noticeability-gated, causally continued World occurrence, each actual candidate observer (local or distant, without a distance cutoff) independently chooses `noticed | not_noticed` via the ordinary attention boundary. Noticing admits an immediate Thread Experience and delayed selective consolidation; missing admits neither. World completion waits for durable observer decisions and reuses recorded history on retry. No observer candidates means no model work; no new recurring World tick, fabricated co-presence, speech, Journal, or Memory. Read-only natural staging inspection now uses `npm run world-environment:probe -- --env staging`. **E7 staging evidence (2026-10-08):** 1,554 tests and source-matched world-kernel deployment passed, but no shared environmental source occurrence appeared in the bounded live scan. The lone `wpl_*` situation was historical (September 25), not an eligible recent observer; do not force co-presence or repeatedly sample World cognition. Natural staging proof remains pending, as does E6b's independent social-witness proof. **October 8 live LivedNow check:** the sole `wpl_*` Thread successfully advanced to a fresh `2026-10-08T17:24:41Z` CurrentSituation, but the `library_or_learning` WorldPlace description is a *homework-at-a-table-or-bed* context, not a verified shared public venue. The existing admission policy derives live IDs from Genesis WorldSpec place/kind and does not prove bounded common physical identity. **E7.4 locally accepted (Guy, 2026-10-08); staging reconciliation recovery pending:** Genesis contextual `wpl_*` references no longer establish common physical presence without an independent `venue_*` identity and **per-Thread contextual-place** attestation with locality/country/evidence. Differing Genesis contexts may legitimately refer to that same venue. Genuine new LivedNow situations now earn at most one durable, deferred ambient opportunity on the existing World reconciliation alarm, which can return quiet `no_change` or produce one grounded occurrence and independent attention; a confirmed public venue source can earn E7.2's existing continuation. Unverified private/home contexts cannot invent a common venue or distant perceptibility. No forced meeting, regex category patch, weather tick, or speculative staging acceptance; E7.3 live evidence remains open. 

**E7.5 — natural staging life progression observed; internal alarm-callback attribution remains unverified.** Once Fibre has an actual admitted Flight Plan and CurrentSituation for a Thread, the World stores that Thread's next *real planned* boundary and lets the **existing InfraDriver World alarm** advance it through ordinary `LivedNow.ensure` without a viewer prompting it. The workset is per Thread with an indexed earliest-deadline read; one due Thread per pass, no population poll, no extra scheduler and no arbitrary environmental frequency. The same alarm chooses the earliest lived or E7 continuation deadline. Transient failures stop after three attempts with a short inspectable reason; genuine later LivedNow reconciliation can re-arm. Guy observed the same sleeping Thread advance at `2026-10-09T02:00:00.003Z`, aligned with its planned waking boundary, without an intervening operator wake, followed by a new due boundary at `03:00Z` and zero failed attempts. The internal callback trace was not captured, so report this as strong unattended progression evidence, not independently verified alarm attribution. E7.4's separate manual `no_change` recovery remains unchanged.

## N6 — Rich Public Lived Encounter — CURRENT

The concrete public goal is:

> **A visitor can see a persistent Thread's ordinary current life, approach her inside that exact moment, let her decide whether to engage, then later return and find the same person living a later moment.**

N6 composes existing lived-person authorities:

```text
Thread-authored Flight Plan
  -> World CurrentSituation
  -> bounded public current scene
  -> visitor social request
  -> Interior Cognition accept | decline | defer
  -> accepted encounter only
  -> Encounter Story / Thread Experience
  -> selective aftermath
```

The public life seam is:

```text
public visit
  -> ensure selected Thread LivedNow(now)
  -> publish bounded ordinary current scene
  -> Viewer shows that life
  -> visitor approaches without mutating World
  -> later social request may intersect that same lived segment
  -> later visit
  -> later current scene
```

A **visit is not a meeting request**. It must not create availability, an encounter, compensation or private cognition. The Viewer remains projection-only.

Detailed public proof remains governed by [N6 rich public lived encounter slices](../validation/n6-public-lived-encounter-slices.md). N6.1-N6.5 are accepted; the direct World CLI conversation now supplies the N6.6a bring-up evidence. The remaining client-neutral endpoint/Viewer proof is preserved and resumable.

## N7 — Live encounters and social consequence — CURRENT

N7 is governed by [Live encounters](../architecture/live-encounters.md), [ADR-0024](../decisions/ADR-0024-live-encounters.md), and [N7 live encounter slices](../validation/n7-live-encounter-slices.md).

The accepted correction is architectural rather than cosmetic:

```text
no turn owner
  -> asynchronous inbound/outbound speech
  -> punctuation / pause / end-of-stream create speaking opportunities
  -> streamed expression may be interrupted
  -> only exposed speech becomes objective history
  -> World life continues during conversation
  -> bounded later consolidation
  -> later social/relationship consequence when warranted
```

N7.0-N7.10 are accepted; Guy reported N7.10 focused/full validation green on 2026-10-08. Delayed private residue may trigger one bounded fresh contact judgment from current LivedNow and current routable relationships. Contact may target an opted-in known Person or a known live Thread, or remain private; routing identity remains separate from autobiographical recognition. **N7.11 is current, validation-first:** recipient-side lived admission of a Thread-addressed message is **locally validated (Guy, 2026-10-08: focused 27/27; full 1,564/1,564) but still pending genuine provider/staging proof**: delivery earns one indexed recipient-only World opportunity; the next shared InfraDriver reconciliation pass may establish the recipient's real LivedNow, admit immutable private message availability, and independently appraise `noticed | not_noticed` through the existing Encounter/Experience boundary. Silence is valid and model attention is not supplied by the sender. Failed receptions are bounded and inspectable; retry cannot create a second story or Experience. Genuine model-provider validation remains open, as do selective long-term consequence and an attributable later change in a Fibre-owned choice. Existing N7.10 regression tests alone do not close N7.11.

## Meet / Encounter runtime simplification — AUDIT EXECUTION STARTED

The [source-level Meet / Encounter run-path audit](../validation/meet-encounter-run-path-audit.md) identifies the biggest remaining personhood/efficiency mismatch: public `/encounter` still waits for a complete response in a three-model accepted-turn pipeline, while the N7 streaming, interruptible Live Encounter primitive is currently exercised in the Thread-to-Thread route. It also records **unproven but important** partial-retry duplication and stale-scene-during-inference risks; repeated generic public/paid encounter orchestration; and a separate natural co-presence candidate-scan scaling concern. None is a confirmed staging bug or accepted change yet.

**With the E7.5 pre/post observations captured:** establish measured call/latency costs, reproduce any causal retry/scene gaps with one meaningful proof each, converge the public expression on existing N7 live authority without a new session engine, and remove only demonstrated wasted cognition or duplicate generic code. Preserve voluntary `accept | decline | defer`, exact outward/audible World truth, distinct selective Experience and later memory, and the real paid-work settlement boundary. Keep N6.6 CLI → public endpoint → Viewer acceptance separately open until Guy's live evidence.

## World operating economics — PLANNED / THREE SEPARATE TRACKS

An autonomous population must remain economically viable **without making Threads into continuously running agent processes**. We have architectural reasons to expect model inference to dominate marginal cost, and one shared serial World reconciliation scope may constrain throughput, but the actual per-Thread/per-place costs and saturation point are **not measured yet**. The prior **$3–$15 per active Thread-month** inference estimate (central modeled $5–$8) is illustrative, not billed/observed Fibre spending; births, media, visitor encounters and high activity are not included.

| Track | Future work and acceptance | When to pursue |
|---|---|---|
| **Cost reflection and accounting** | [World cost accounting](../architecture/world-cost-accounting.md): attribute existing token usage, SQL work, alarms and duration to plan renewals, deterministic life advances, World events, personal attention and consolidation. Report per Thread-day, physical venue, World occurrence and outcome, including quiet/no-change paths, without double-counting shared events. Keep measured units, priced estimates and actual invoices distinct. | **First:** after the currently scheduled autonomous life boundary is observed; use existing instrumentation before creating any new telemetry. |
| **Compute-cost optimization** | [World compute optimization](../architecture/world-compute-optimization.md): verify and if needed eliminate the suspected tiny retrospective planning window at each 12-hour horizon; then target only measured redundant regulation, environmental inference and retry work. Show real model-call/token savings **and** uninterrupted, causally meaningful Thread life. | **Second:** after a credible per-operation baseline; begin with one high-value renewal proof, not a generic optimization campaign. |
| **Scale bottleneck** | [World reconciliation scaling](../architecture/world-reconciliation-scaling.md): measure due-work backlog, lateness, wait time and drain rate; only when sustained pressure demands it, partition independent per-Thread work without splitting authority over a physical shared World event. Preserve provider-neutral `InfraDriver` semantics. | **Design recorded now; implementation conditional** on demonstrated queue pressure, not an arbitrary population threshold. |

**Standing boundaries:** no hourly population scans, global ticks, quotas for lived events, always-on LLMs, per-Thread persistent workers, second World authority, provider-specific domain sharding, or spending cuts that erase individual agency/experience. A quiet Thread/place must be cheap; a genuinely meaningful opportunity must remain possible. These tracks are operational enablers and do **not** supersede N6/N7 causal-personhood acceptance.

**Deployment/evidence sequence:** E7.5 has now been observed read-only across its `2026-10-09T02:00:00Z` boundary. The hold on staging World changes for that experiment is lifted; local validation and deployment ownership remain with Guy. Proceed baseline → targeted optimization → evidence-triggered scaling, with one causal or cost proof per implementation rather than new telemetry machinery.

## Current causal loop

```text
continuing Thread
  -> Flight Plan
  -> enacted World situation
  -> elapsed life / catch-up
  -> present now
  -> Situated Percept
  -> intrinsic regulation + salience
  -> Interior Cognition when material
  -> ordinary action / inaction
  -> Encounter Story when something occurs
  -> Thread Experience
  -> optional private reflection
  -> retention appraisal
  -> autobiographical memory or not_remembered
  -> possible relationship / intention / state consequence
  -> future Flight Plan + future perception
```

## Memory invariant

A later encounter may receive bounded autobiographical memories.

It must not receive hidden history or private journal records and silently reconstruct them as recollection.

Therefore:

```text
history exists + not_remembered
    -> later ordinary cognition has no autobiographical recollection

history exists + retained autobiographical memory
    -> later cognition may be shaped by that memory
```

This applies equally to real-time encounters and retrospectively realized catch-up life.

## High-value acceptance sequence

Prefer a few organism-level proofs:

1. **multi-day dormant continuity** — a stale Thread becomes current through retrospective lived continuity rather than remaining in the old scene;
2. **historical honesty** — retrospective materialization is inspectable;
3. **selective retention** — catch-up history can be remembered or forgotten through the normal memory authority;
4. **Person meet** — `/meet` joins an already-established current scene;
5. **Encounter** — one objective World story can become different Thread-specific experiences, including environmental noticing, voluntary social encounter and silent witnessing;
6. **continued life** — a later visit finds later life, not a resumed chat session;
7. **idempotence** — retrying catch-up does not duplicate plans, events, memories or encounters.

## Explicitly not the current priority

- continuous high-frequency simulation;
- a universal calendar/scheduler product;
- broad infrastructure abstraction;
- exhaustive resilience matrices;
- a conversation/session store;
- an event-to-memory formula;
- society-scale economy before reciprocal lived meetings work;
- security or hardening work unrelated to a demonstrated Fibre need.

## Development discipline

Always prefer the lightest implementation that preserves the ambitious Fibre architecture.

Every piece of code should earn its place by advancing a persistent artificial person's lived continuity, individuality, relationship, agency or future possibility.

Tests must be even stricter:

- high-value;
- semantic;
- non-brittle;
- short meaningful failures;
- no incidental HTTP/header/helper trivia unless that boundary itself protects a Fibre invariant.

## Branch posture

Current work is on `main` unless the owner explicitly chooses another branch.

Historical agent branches are not planning authority.
