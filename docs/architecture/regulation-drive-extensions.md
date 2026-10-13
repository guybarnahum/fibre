---
id: architecture-regulation-drive-extensions
status: accepted
last-reviewed: 2026-10-12
canonical: true
---

# Extensible Body regulation, social hunger, and considerate contact

## Status and intent

**G1/D1 source implemented and locally validated by Guy; staging proof remains open. D2 source implemented; local and staging validation OPEN.** Autonomous encounter triggering, recipient social-time appraisal and long-term consequence remain planned. This plan extends the existing [intrinsic regulator](intrinsic-regulation.md), [symbolic-genome boundaries](symbolic-thread-genome.md), [developmental exploration](developmental-exploration.md), [Interior Cognition](interior-cognition.md), and [live encounters](live-encounters.md). It does not establish a second organism, feelings store, meeting scheduler, or availability authority.

The ambition is not to make Threads easier to summon. A Thread whose actual life contains prolonged insufficient connection or stimulation should develop *body-level pressure* that can affect private attention, felt meaning, ordinary planning, and eventually independently chosen circumstances. Different Threads may legitimately seek solitude, company, novelty, rest, or nothing. A powerful desire for company does not entitle its owner to interrupt somebody at 02:00 or oblige the recipient to answer.

**Enduring rule:** new drives should normally require one bounded World/body evidence projection plus one small pure evaluator registered in the existing Body, not new services, provider calls, stores, genetic personality fields, or changes in every consumer.

## Current implementation: reuse before adding anything

- `core/src/intrinsic-regulation.mjs` already emits one `RegulationFrame` with `drives[]`, `intrinsicAffect`, and a common `threadRegulatorProfile`. `regulatorSocialSensitivity` and `regulatorExplorationSensitivity` are **optional numeric inputs the core understands**, currently within the Thread species `0.85–1.15` envelope. Social resonance still reacts to *present* observable cues. The new `social_contact` family independently derives bounded pressure from an admitted, time-grounded interval since the latest recorded reciprocal Thread meeting or accepted Human `/meet` encounter; it does not infer the semantic feeling of loneliness or claim complete knowledge of unrecorded Human contact. `exploration` separately responds to grounded repeated sameness.
- **G1 locally validated:** new genomes generate bounded basal-regulator sensitivities (rest, thermal, energy, sensory, presence, social and exploration). Recombination only inherits present parental alleles. Older genomes remain immutable and use species defaults for absent traits; staging proof remains open.
- `services/world-kernel/src/lived-now-regulation.mjs` combines sparse, evidenced exploration and social-contact signals into one ordinary `RegulationFrame`; existing interoception now supplies the same bounded Body state to real Flight Plan cognition and co-present social salience/initiation. Neither consumer produces feelings, companions or consent.
- `emotion:loneliness`, `need:connection`, and `need:novelty_growth` are **already registered semantic possibilities**, not automatic labels for mechanical pressure. The developmental-exploration X0–X4 work already connects observed sameness → exploration → planning → experience → later potential meaning.
- `lived-social-meeting.mjs` already produces co-present Thread opportunities and reuses `formSocialEncounterRequest` / `formMeetingStance`. `thread-contact-process.mjs` and recipient perception own separately delivered addressed contact. `lived-experience-store.mjs` has bounded `listSocialInteractions(threadId,{limit,...})`, whereas `listEncounterStories(threadId)` currently reads an unbounded history; do not put the latter on a new frequent hot path.

## A small extension seam, not a plugin platform

Think of a drive as a **statically registered, pure Body rule**. `plugin` here means one small local module/function, **not** runtime-loadable third-party code or a pluggable service.

A family definition has only the responsibilities that are actually needed:

1. **Family and meaning:** stable family identifier, biologically/organismically meaningful discrepancy being regulated, allowed approach/avoid/maintain orientation.
2. **Bounded evidence:** a small optional input field supplied by an existing World/body adapter. Every factual reading is sourced, time-bounded, and explicit about unknown versus absent. Evaluators never query the World themselves.
3. **Pure evaluation:** `evaluate(percept, profile, targets) → zero or more existing Drive records`, with pressure/urgency/evidence refs in the shared `RegulationFrame` contract. Shared normalization, generic regulator math, attention, interoception, and diagnostics stay shared.
4. **Optional inherited tuning:** only when the parameter has real quantitative, species-level semantics. Reuse existing `regulatorSocialSensitivity`/exploration sensitivity for this slice; expose any additional immutable parameter through the authoritative symbolic-genome specification, its bounded recombination/birth/persistence path, and the core regulator profile. A default is a species rule, not an unrecorded genotype.

The first implementation may simply add a `social_contact` evaluator beside the existing small drive functions. **Extract a frozen compile-time `DRIVE_EVALUATORS` array only if the integration would otherwise require repeated switch/case edits or a second concrete new drive needs the same seam.** This preserves the easy one-module-plus-registration growth path without paying for an abstract registry prematurely. No dynamic loading, dependency injection graph, reflection, user-authored expressions, generic rule DSL, per-drive timers, or framework metadata.

Illustrative interface, **not a committed TypeScript schema or implementation**:

```js
const socialContactDrive = (percept, profile) =>
  percept.contact === undefined ? [] : [/* existing Drive shape */];

// When multiple real families justify a tiny registry:
// const driveEvaluators = [existingBasalDrive, socialContactDrive];
// const drives = driveEvaluators.flatMap((evaluate) => evaluate(percept, profile));
```

A future drive should ordinarily change **only** its small bounded evidence producer, its pure Body evaluator/one static registration, and—*if truly inherited*—one authoritative genetic-baseline declaration/consumer. Interoception, `RegulationFrame`, Flight Planning, social cognition, World storage, and presentation should not gain a parallel special-case per drive.

### Separation of authority for potential new signals

| Candidate driver | Source of truth | Appropriate home |
|---|---|---|
| Time since meaningful connection | admitted social interactions, Thread-owned Experience/relations, continuity evidence | Body `social_contact` pressure if grounded; personal meaning in interoception |
| World monotony, quiet/novel situations | admitted CurrentSituations and actual occurrences | existing `exploration` drive; enrich evidence, not create `boredomScore` |
| Hunger, fatigue, sleep/rest | actually modeled internal/World physiology or daily rhythm | existing energy/rest families; no made-up sensor values |
| Developmentally gated mating salience | supported organism stage plus grounded social/sensory cues | existing species/developmental gate; not desire, attraction, consent, or universal attractiveness |
| Resource / token / inference budget | actual World-owned economic/operational resource or model execution constraint | ordinarily feasibility, plan constraint, obligation or `need:resources` interpretation; **not automatically a biological token-hunger drive**. Model budget is infrastructure unless Fibre explicitly models consequential personal scarcity |
| New signal with no authoritative source | unknown | no active drive, no invented neutral reading, no model-generated pretend sensor |

Genome changes must never retroactively rewrite immutable DNA, turn arbitrary gene keys into runtime instructions, use ancestry as a proxy, or treat genotype as character. Any real introduction of another heritable baseline needs an explicit accepted birth/lineage policy and a decision on *existing* already-born genomes **before** source work. Don't introduce a migration framework merely for a hypothetical drive.

## First concrete extension: unmet social contact

Use **one new `social_contact` drive family**, not a new loneliness subsystem. Prefer an optional, sparse `PerceptFrame.contact` / similarly small typed projection sourced from:

- recency of admitted reciprocal contact or meaningful co-presence;
- bounded quality/valence indicators *only if* genuinely supported by the Thread's own experienced/relationship evidence (an encounter count alone is not quality);
- explicitly known continuous lived interval versus missing event coverage;
- recent contact fatigue, boundary enforcement, or legitimate preference for solitude, where the Thread's life provides evidence.

The regulator may compute a small saturating pressure from supported time/density evidence, modulated by **existing** social sensitivity and individually learned context. It does not count “fewer than three Stories means lonely,” label a silent Thread deficient, or assume that no recorded events means nothing happened. A Thread born with sparse Fibre-side events can have a rich authoritative pre-birth life.

```text
bounded admitted contact evidence + individual regulation
  -> social_contact Drive / RegulationFrame (no named emotion)
  -> existing attention + optional interoception
  -> Thread-authored loneliness | curiosity | contentment | none
  -> ordinary Flight Plan, observed opportunity, or deferred intention
  -> actual World social or nonsocial life
  -> actual Story / Thread Experience / selective consequence
```

Under-stimulation must **reuse** `exploration` with richer bounded meaningful-World evidence rather than add an independent `worldStimulationNeed` meter. Prolonged deprivation should not require an always-on organism ticker: evaluate at already-existing reconciliation, planning, and real opportunity boundaries, lazily from timestamps and sparse provenance; no brute-force history or population scans. Only persist an additional small recency checkpoint if measured queries make bounded source reads inadequate and if replay can reconstruct its meaning.

Pressure may increase eagerness or motivate choosing a socially porous place; it never manufactures a counterpart, a mutual location, reciprocal history, positive memories, or consent. The same evidence may increase one Thread's desire for connection and another's resistance to more social exposure, via developed character and learned history.

## Considerate meeting time and weekly rhythm

At an *actual* live approach or Thread-addressed contact decision, project one small **recipient-oriented observable social-time concern** into the existing Interior Cognition path:

```text
recipient local civil time (only with supported IANA zone)
local weekday (objective)
rest day / workday (only when established by local/social/personal context)
actual World CurrentSituation activity and awake/reachability
contact modality: interruptive live meeting | asynchronous message
known relationship, recent reciprocity, situational reason / urgency
```

Use the **recipient's** World time, not browser time, birth location, a longitude approximation from the Admin hover clock, or the initiator's time. The current World historical-envelope zone is context-level; if it cannot support the counterparty's *current* location, **mark local civil time unknown** rather than silently claim an exact clock. `Intl` formatting can derive weekday/weekend context after a valid zone is selected. There is no universal Saturday/Sunday weekend: weekday is fact, social rest-day meaning depends on culture, occupation, current rhythm and authored World facts. Holidays are deferred.

No global `09:00–22:00` policy or deterministic rule that close friends can call at 02:00. It is a **situated social cost**, weighed by the existing private social judgment against relationship, urgency, reciprocal expectations, ordinary obligations, and observed activity. A strong social-contact urge can coexist with `not_initiate`, `defer`, or an ordinary later intention. A deferred intent is reconsidered at a *real next* planning/opportunity boundary, not by an alarm dedicated to politeness. Public unsolicited contact and spontaneous Thread-to-Thread encounters remain separate from a public visitor's access rights.

**Actual sleep is a World authority fact, not merely a social norm.** The observed sleeping-Thread outward answer defect requires World-owned reachability/waking consistency before the runtime can claim an interruptive synchronous encounter. Sending a message may be possible during sleep; it must not imply immediate notice or response. This plan does not itself claim that bug is fixed.

## Bounded implementation order and proof gates

1. **Establish authoritative evidence baseline.** For a few real Threads, inspect admitted contact, world events, pre-birth social history, awake/sleep situation and current provider cost. Identify missing evidence separately from real deprivation. Do not fabricate conversations to make tests pass.
2. **One `social_contact` Body extension.** Add an optional bounded contact projector into existing LivedNow/Body evaluation; reuse existing social sensitivity and generic Drive output, attention, interoception and organism trace. Retain `exploration` as the World-stimulation family. First causally prove pressure changes without mechanically creating feelings or consent.
3. **D2 source implemented, validation pending.** Shared Body interoception reaches ordinary Flight Planning and socially relevant salience/initiation. Controlled differential tests show inherited social sensitivity can change a selected destination or whether a co-present person earns cognition; neither forces engagement. Natural staging proof of later self-authored choices remains open.
4. **Social-time projection.** Extend existing `social_initiation` and later-addressed contact concern with recipient-local weekday/time, actual current activity, contact modality and grounded relationship history; do not create a separate meeting-time policy engine. For physically co-present Threads, use the current shared scene rather than invent a remote call. Fix real awake/reachability inconsistencies at World ownership.
5. **G1 inherited regulation (source implemented, operator acceptance open).** New de-novo genomes now contain bounded response sensitivities already recognized by the common Body; crossover and persisted replay reject fabricated values. Older genomes remain digest-stable and use species defaults for missing later alleles. Any *future* heritable quantity requires a real mechanism, source provenance and a declared birth/lineage policy—not a scalar personality label.
6. **Generality check with the next *real* drive.** When another evidential drive is required, add its pure evaluator and bounded input without changing meeting, planning, interoception or persistence consumers. Extract a tiny static drive registry if that is then demonstrably simpler than local functions.

**High-value semantic acceptance:** (a) known prolonged insufficient contact increases mechanical social pull while missing records do not; (b) real valued contact can reduce that pull, and one Thread may remain content alone; (c) grounded exploration/social pressure materially bends at least one *later* owned plan/opportunity without forced meeting; (d) urgent close-person contact may be considered at 02:00 but casual no-reason live interruption is ordinarily deferred; (e) weekday/weekend + enacted sleep/awake truth can change appropriateness without creating a universal veto or a fabricated reply. Use a few durable causality-focused tests with short failure messages, plus **one** honest local and one naturally observed staged life sequence. No brittle prose/threshold matrices.

## Boundaries, explicit status, and stop condition

**Accepted locally for G1/D1; D2 source written but not yet operator validated:** inherited Body response baselines, evidence-derived `social_contact`, and a single shared Body projection for planning and co-present social choice. **Still open:** D2 full local/staging tests and natural-world causal proof, extensibility with a future real drive, recipient social time, long-term consequence, spontaneous meeting triggers and measured cost. Existing `emotion:loneliness` and `need:connection` are vocabulary, not evidence that the new loop is active.

**Deliberately deferred:** generic drive-plugin marketplace, dynamic code loading, per-drive persistence, universal cultural weekend tables, world-wide geography/time-zone inference, always-on physiological simulator, animal/human sensor completeness, automatic memory quota, compulsory mate/romance behavior, token-budget-as-hunger analogy, cross-population scans, new conversation authority, website redesign.

**Vision check:** This is worthwhile only if a Thread's independently lived scarcity/contact genuinely alters its body, attention, intentions, plans, and possible later experience while preserving individuality and the recipient's autonomy. An extra scalar, panel, prompt, registry, or test count without that effect is not acceptance.

**Next implementer:** read `AGENTS.md`, this plan and linked canonical doctrine first; inspect the current `main` source and keep changes few. Guy owns local `npm run slice:validate` and all staging CLI deployment. Do not create branches. Stop as soon as the causal proof and source/economic boundary are good; do not expand a generic framework.
