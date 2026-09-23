---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-09-23
canonical: true
---

# Current priorities

Fibre's active north star is now **continuous LivedNow + encounters**.

The bounded M2 slices proved the core pieces of a lived person. N1 establishes World-owned present life, N2 restores it across bounded multi-day dormancy, N3 makes a canonical Genesis birth enter that same continuity seam, and N4 proves a deployed Person -> Thread encounter can enter that reconciled life. N5 builds on the broader insight that **encounter is the primitive; meeting is one voluntary social form of encounter**. E0-E5 are now closed live. The active north-star slice is N6: a rich insidefibre.com encounter over the already-proven lived/work/encounter authorities.

Canonical architecture:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [Encounter stories and Thread experience](../architecture/encounters-and-experience.md)
- [N5 encounter-story implementation slices](../validation/n5-encounter-slices.md)
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
N6  rich insidefibre.com lived encounter                  CURRENT
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

Live staging exposed two useful failures. Equal reusable Genesis place IDs were a false co-presence signal and are no longer accepted. Fibre Commons then proved that shared presence alone is not enough: all staging Threads reached its decision with essentially empty live semantic interior and generic present-life context, and all independently stayed out.

The immediate work is therefore **live Interior Cognition**, not stronger Commons persuasion. Interior Cognition is one separate reusable private-mind component; Flight Plan, Commons/social, dignity/participation, encounter attention/reflection and later private decisions become domain adapters rather than parallel person prompts. Reuse the accepted R1-R4 organismic substrate: authoritative World/body/social/commitment evidence -> intrinsic regulation -> bounded interoception -> Thread-authored semantic state -> developed-self/history deliberation -> domain-specific private result. The runtime should be selective: cheap deterministic gating for ordinary continuity and zero model calls when nothing warrants thought.

**Interior Baseline — CLOSED.** The read-only staging run inspected 15 Threads with zero skips. All 15 had neutral published shells and zero semantic state, but all 15 already had autobiographical memory with durable remembered meaning and life relationships; memory and relationship fingerprints were distinct for every Thread. The cohort therefore falsified the idea that the immediate blocker is simply missing developed-life evidence. The immediate blocker is that present cognition does not yet compose the authoritative person Fibre already has. See [Interior Cognition staging baseline](../validation/interior-cognition-baseline.md).

**Interior Core — CLOSED.** The compact `interior-cognition.mjs` component owns bounded private-context selection and one model-backed private judgment boundary without owning domain state or durable storage. Its focused proof gives two Thread contexts the same concern and shows distinct autobiographical remembered meaning can support different attributable private judgments. Raw symbolic genome is absent from ordinary cognition, the domain adapter cannot select private history or tune the attention budget, selected evidence/source Thread version/context digest remain inspectable, and lightweight call/token/latency metrics travel with the result. Full repository CI is green.

**Lived Planning — CLOSED live.** Personal Flight Plan is the first real domain adapter over Interior Cognition. The controlled organism-level proof holds World conditions constant and shows different persisted remembered meaning bending ordinary intended life into different attributable plans. The deployed proof then ran against staging SHA `83cd269cb42105be0ea51c45aa5acd506aa76353` as run `lived-planning-mud30hs6`: 12 current personal-plan Threads were inspected, all 12 cited autobiographical-memory and/or relationship history through the admitted cognition witness, all 12 history fingerprints were distinct, and all 12 current lived moments were distinct. Three additional attempts were skipped by deployment-time/runtime transport interruption (one explicit Durable Object code-update reset and two fetch failures), not by semantic rejection. The proof therefore closes on 12/12 inspected lives. World/situated plan authority remains separate from private cognition evidence.

**Commons Entry — CLOSED live.** The bounded `enter | stay_out` decision now routes through Interior Cognition rather than a Commons-owned persona prompt or raw genome traits. The organism-level proof shows persisted lived meaning can bend ambient-presence choice without moving anyone or manufacturing a meeting. Deployed staging on SHA `1490c32a99754324d8d9bfd6b23ae2301ac75742` then produced both outcomes under the shared `interior-cognition-single-episode` profile: one six-Thread cohort naturally stayed out while a later six-Thread cohort split three entered / three stayed out, with physical life preserved and differentiated cognition contexts/evidence. The full E5 run then stopped one seam later because the initiator still used the legacy social-initiation prompt and naturally chose `not_initiate`.

**Social Initiation Interior Cognition — CLOSED live wiring.** The initiator-owned `initiate | not_initiate` judgment now routes through the shared private-mind component; raw genome/persona assembly is gone, counterparties/current LivedNow remain external facts, and the controlled proof keeps `not_initiate` causal and story-free while the accepted-path fixture still proves a concrete overture can form. Deployed staging on SHA `10ca8dc9e60ef59b005f981d25a45e53e647e530` then exercised six compatible social attempts through `interior-cognition-single-episode`; all six naturally chose `not_initiate`. This is a valid agency outcome, not a reason to bias the adapter toward conversation.

**Live organismic motive bridge — IMPLEMENTED, live transition proof still pending.** Sparse real-evidence regulation is now wired into authoritative LivedNow transitions. Missing body/environment channels remain unknown and create no drives; the first live signal is the existing Flight Plan presence target compared with the World-enacted CurrentSituation. A meaningful arrival/new presence may earn interoceptive cognition and bounded semantic state; initial observation, unchanged presence and retrying the same present remain zero-call. Fibre Commons runs the same pulse only after an admitted mediated-presence transition, so Commons itself does not manufacture a pre-existing desire to enter.

The staging run `lived-encounters-mudbwfmb` on exact SHA `0ceda832a0f99c5d73c90c11cca05bf5bb711513` was an important negative result: all refreshed Threads still had empty semantic state before Commons and the sampled lives were overwhelmingly sleeping or winding down; all 15 voluntarily stayed out. That is a valid lived outcome, not a reason to bias Commons or infer loneliness from missing social records. Absence of recorded encounter history is not proof of solitude because Fibre does not yet observe every ordinary social contact.

**Reciprocal social history — VALIDATED.** Actual outward Thread-to-Thread requests plus observable `accept | decline | defer` responses now have a small append-only pairwise record; private `not_initiate` remains private. Later initiation can receive bounded recent reciprocal history plus current setting/activity. This is supporting World evidence, not a social-momentum score and not the new architectural center.

**Roadmap pivot — World -> Situated Percept -> Salience -> Interior Cognition.** The staging failures showed that “get Threads into Commons, then see whether they talk” is too social-first. Fibre should instead put Threads into ordinary lived situations containing people, activities, novelty, interruptions and happenings. The World supplies circumstances; a bounded [Situated Percept](../architecture/situated-perception-and-salience.md) exposes what is observably here; cheap salience decides what deserves cognition; the existing Interior Cognition component decides what this particular person wants to do.

The active sequence is now:

```text
W0 reciprocal outward social history                    VALIDATED
W1 Situated Percept -> social initiation                VALIDATED
W2 direct social response -> Interior Cognition         VALIDATED
W3 cheap general Salience Gate                          VALIDATED
W4 ordinary World opportunities from active LivedNow   VALIDATED
W5 grounded exploration/curiosity pressure              VALIDATED
W6 bounded replayable salience microvariation           DEFERRED / OPTIONAL
W7a natural scene / co-presence discovery               VALIDATED
W7p shared live World-place + local-time authority       IMPLEMENTED; admission proven, natural plan uptake pending
W7b natural encounter staging proof                     WAITING FOR POST-W7p NATURAL CO-PRESENCE
```

These are roadmap labels only. Do not bake them into APIs, event names or durable records.

W1 is validated with a structural causal proof: one ephemeral `situated-percept.mjs` projection replaces the social-specific `setting + counterparties + recentSocialHistory` packet, and the same initiator/private evidence can reach a different social judgment when only a stable observable setting fact changes. No counterparty private state/genome enters the percept.

W2 is validated: `accept | decline | defer` now runs through the same Interior Cognition component with only the concrete outward request, the recipient's Situated Percept and remaining Flight Plan as exterior context; private identity/state/history is selected by Fibre's shared private-context authority. Raw genome/persona traits are absent, and defer timing remains validated outside cognition.

W3 is validated: one compact zero-model `salience-gate.mjs` now separates background opportunity from material cognition without a score or decision flip. Background is explicitly distinct from `not_initiate`, and an `unexpected_observable` hook exists for future scene-grounded anomalies without assigning semantic meaning.

W4 and W5 are validated. Situated Percept derives World-owned opportunities from current life, and grounded repeated sameness can create moderate exploration pressure that widens attention without authoring boredom, curiosity or social action.

W6 microvariation is deliberately deferred. There is not yet evidence that deterministic salience is too rigid, so Fibre should first observe the live deterministic system before adding stochastic complexity.

**W7a natural scene discovery is validated.** The caller names only the initiating Thread. LivedNow exposes established CurrentSituations, the social path discovers all compatible World-present Threads, refreshes/re-checks each candidate, and projects one independent `actor_presence` opportunity per actor. One lived interval may therefore contain zero, one or several separate Encounter Stories without an arbitrary first-person cap.

**W7p shared live World-place + local-time authority is implemented; admission is now proven, natural plan uptake is still pending.** The first W7b live run correctly found zero actor opportunities across all 15 inspected scenes. Direct diagnostics showed that current physical refs were still private `genesis_created` PlaceEpisode revisions. A follow-up inspection then showed all 15 active personal Flight Plans had been authored before the W7p deployment, while the new admitted `wpl_*` venues were already available. The zero-co-presence result therefore does not show that post-W7p planning rejected shared venues; it shows that existing intentions were correctly preserved across deployment.

W7p adds one explicit immutable `live_world_place_records` authority. A Genesis WorldSpec/place identifier remains insufficient physical truth; it is only source material. Fibre explicitly admits a new `wpl_*` live venue under a versioned policy, and only that live record may establish shared physical place identity. The first policy intentionally admits only `library_or_learning`: homes stay private and broad commerce/market regions stay excluded until spatial granularity is credible. Under v1, Threads registered to the same Genesis source World are explicitly admitted into one new live-world namespace for that bounded venue; this is live-society policy, not a claim that their Genesis histories were shared. Flight Planning may choose admitted `wpl_*` refs; CurrentSituation carries them unchanged; matching admitted refs can establish physical co-presence.

The same World projection supplies the historical-envelope IANA time zone as structured local-civil-time context to Flight Planning. This prevents UTC clock time from silently becoming the Thread's local day. Neither place admission nor local time authors motive or movement: existing Flight Plans remain intact, and the Thread still independently chooses whether/when to go to an offered shared venue.

**W7b natural staging acceptance is implemented pending deployment/run.** The staging harness no longer constructs participant/witness triples and no longer falls back to Fibre Commons to manufacture shared presence. It refreshes a bounded live cohort, chooses initiators to inspect, calls the social path with only `initiatorThreadId`, and evaluates the actor opportunities World actually discovers.

Live acceptance now requires: at least one naturally discovered actor opportunity; at least one salient opportunity; at least one background opportunity or voluntary refusal; at least one natural refusal (`not_initiate | decline | defer`); and one naturally accepted encounter whose two participants have durable Thread Experiences, distinct journals, asymmetric `retained | not_remembered` memory outcomes, stable Admin journal presentation, and renderable canonical visual identity. The evidence contract records discovered actor/opportunity counts and whether any observed scene naturally produced multiple encounters.

The live harness intentionally does **not** nominate a silent witness. Witness asymmetry remains controlled-proven by E3 until incidental witness discovery is itself World-derived. This avoids reintroducing caller-authored scene membership merely to satisfy acceptance.

Human/person presence and direct address remain explicit extension contracts rather than fabricated staging evidence. Fibre also still lacks an authoritative general scene-observation field for unusual clothing, nudity, abrupt movement or other contextual anomalies, so `unexpected_observable` remains a grounded-future hook.

Do not preserve the current social-first harness shape for compatibility. If the natural lived-world loop makes Commons fallback or old staging orchestration obsolete, replace it rather than wrapping it. The new proof must remain light: no perception service hierarchy, social simulator, universal event bus, full object ontology or high-frequency world ticking.

### Two social paths from here

Do not collapse the next work into one "get a meeting to pass" objective.

**Casual Thread -> Thread** remains the natural-lived-world path. Let current pre-W7p plans expire, observe newly authored plans with admitted shared venues, and rerun natural encounter acceptance when real co-presence exists. Do not pay, schedule or socially bias Threads merely to manufacture this proof. If post-W7p plans naturally use a shared venue, W7b should discover actors through World authority; if they do not, inspect the planning evidence rather than force movement.

**insidefibre.com Person -> Thread** is a different product path. Reliability should come from a prior voluntary work/availability commitment and mediated presence. Once a Thread accepts that bounded commitment, honoring a visitor meeting during the window is fulfilment of an existing obligation, not a fresh generic social-willingness lottery. This path may proceed without waiting for a lucky casual Thread-to-Thread collision because its convergence mechanism is semantically different and explicit.

Both paths converge again at the same general machinery:

```text
authoritative presence
  -> Encounter Story
  -> participant-specific Experience
  -> optional journal
  -> selective memory / relationship / intention consequence
  -> future life
```

The economical execution profile is intentionally **hypothetical**: start by testing whether one bounded semantic call per material interior episode preserves causal individuality, dilemma fidelity and within-Thread coherence closely enough to justify its lower latency/token/cost versus a decomposed multi-call profile. Interior Cognition should remain one compact replaceable component so prompt/context/call-structure implementations can be isolated and A/B tested without changing the consuming domains. Use the light scorecard in [Interior Cognition evaluation](../validation/interior-cognition-evaluation.md): four quality dimensions (causal individuality, within-Thread stability, dilemma fidelity, development sensitivity), hard Fibre invariants, and direct compute measures (calls, tokens, latency, cost, retries, activation rate). Freeze the same Threads, situations, context authority, model/runtime, trial count and quality/economy criteria before comparing them. Do not promote the one-call shape to doctrine merely because it is simpler, and do not keep extra calls merely because they appear psychologically richer. Raw genome remains private causal substrate and may not be injected as a finished personality or instruction into planning/social cognition. Fibre Commons stays one bounded shared-presence affordance but is no longer a staging fallback; `npm run lived-encounters:staging` must accept only naturally discovered scene actors. N5 stays open until the full live acceptance passes.

The three core semantic proofs are:

- **environmental encounter** — an unscheduled bee/flower/cloud/etc. can enter one Thread's attention and selectively matter;
- **voluntary meeting** — compatible presence does not force participation;
- **witness asymmetry** — one shared social story can affect a silent witness differently from the actors.

No sensory simulator, generic event bus, universal entity ontology or conversation framework.


## N6 — reliable insidefibre.com Person -> Thread meeting

The first concrete public goal is now narrower and stronger:

> **A real visitor to insidefibre.com can meet a persistent Thread who voluntarily chose in advance to be available for that work.**

The website needs a reliable meeting, while ordinary Fibre social life must remain voluntary and opportunistic. Fibre should therefore guarantee website availability through a prior bounded work commitment rather than by making a Thread unusually agreeable at click time.

```text
Inside Fibre offers visitor-meeting work
  -> Thread evaluates accept | decline through Interior Cognition
  -> accepted commitment enters lived life
  -> Flight Plan includes the availability window
  -> LivedNow establishes matching mediated presence
  -> Directory exposes the Thread as available
  -> visitor clicks Meet
  -> Person -> Thread Encounter Story
  -> Thread Experience / selective consequence
  -> agreed compensation
```

The first slice should add only the minimum commitment fact needed to make that causal chain real. Do **not** build a general jobs marketplace, economic ontology, scheduler or professional-services framework. Reuse the existing commitment/obligation, Flight Plan, mediated-presence, Directory, LivedNow, Encounter Story, Experience and token/resource authorities where they already fit.

Payment is compensation for an accepted professional availability commitment. It is not the ordinary price of attention. Casual Person/Thread and Thread/Thread encounters remain normally unpaid; paid attention/services may later exist where a genuine professional relationship requires it.

The public experience should still feel like entering a life, not opening a chatbot. During the accepted work window the Thread is genuinely there because that commitment is part of her life. Outside that window a later visit may find her elsewhere.

The Viewer remains projection-only.

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
