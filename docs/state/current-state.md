---
id: fibre-current-state
status: accepted
last-reviewed: 2026-10-05
canonical: true
---

# Current state of Fibre

Fibre is a persistent world for artificial persons called **Threads**. A Thread is durable world state with identity, history, private interior state, relationships, embodiment, permissions and a life trajectory spanning temporary model executions.

Models provide temporary cognition. Fibre owns continuity, authoritative state, validation, persistence, replay and consequence.

## Accepted foundation

- A Thread is a persistent life, not a model session.
- History, private contemporaneous journal, autobiographical memory and remembered meaning are distinct.
- Historical state is append-only or explicitly superseding.
- Meaning-bearing identity, memory, relationship, need, emotion and self-understanding are natural-language-first.
- Mechanical/private regulatory state may be numeric when it is control state rather than semantic meaning.
- Model output is candidate cognition; providers do not own Thread life state.
- Identity is authoritative. Presentation is projection. Publication is permission.
- Civil identity/FIN and Fibre Identity Card issuance have explicit authority boundaries.
- Visual identity uses one canonical root/reference chain across age and scene.
- Genesis keeps **Raised languages** as immutable Genesis upbringing evidence distinct from the Thread's eventual/current **Spoken languages**; school-acquired languages may enter Spoken without being rewritten as upbringing.
- Once an admitted canonical visual root reaches Thread Presentation, the existing FIA lifecycle is automatically reconciled: no active FIN Card triggers initial issuance, while a card whose admitted photo belongs to an older canonical root is replaced through the same FID authority.

## Human physical inheritance

The shared **Population & Family Ancestry** boundary is implemented: place/era family profiles keep naming, raised/eventual languages and maternal/paternal physical ancestry distinct; individual births use the shared physical-inheritance core rather than a per-person appearance model call; ancestry labels are not renderer instructions. Earlier London/Lagos/Mumbai work usefully exposed packed-language authoring, an improper second styling pass, ambiguous founder-region mapping and over-broad family profiles, but its visual conclusion is now superseded by the Li Jing failure.

The inherited-appearance calibration tranche now establishes `physical-genome-v0.3` with `human-appearance-v0.4` as the current **visually accepted** Human Appearance model. Repeated same-seed cohorts were used as falsification gates rather than accepted by inertia: broad-Oceania collapse, inherited-grooming leakage, ancestry-ratio morphology blending and one-pass surface-driven face substitution were each exposed and removed. `oceania.polynesia` is a complete independent morphology center using direct Tongan, Māori, Hawaiian and broader Polynesian anthropometric evidence for supported axes while keeping unsupported axes neutral; its compact variation profile slightly strengthens coherent family factors and reduces independent structural noise.

Acceptance evidence is deliberately bounded. A 12-person same-seed Polynesian geometry-first cohort using the production image model (`gpt-image-2-2026-04-21`) first passed human visual review as a believable cohort. The follow-up 48-person same-seed regression rendered 12 Han Chinese, 12 Korean, 12 Japanese and 12 Polynesian people with `physical-rendering-projection-v0.5` and `geometry-anchor+surface-edit`. It reported zero full-name collisions and zero objective warnings. Human review found plausible cohorts with substantial individual variation, normal neighboring-population overlap, no cohort-level White/Black/South-Asian template substitution, no return of universal male facial hair, and no uniform beauty/build collapse.

Canonical Human Appearance rendering is **geometry-first**. Structural morphology + reference geometry state generate a text-only monochrome geometry anchor; a second reference-conditioned generation applies only surface phenotype + reference surface state. The intermediate anchor has ordinary Asset Generator provenance but is never admitted as Embodiment or public identity. Only the final surface-applied image can become the canonical root, and admission requires verified provenance for both stages. Population Lab uses the same production OpenAI adapter and stores geometry anchors beside final portraits for diagnosis. This boundary is visually accepted for `human-appearance-v0.4` / `physical-genome-v0.3`. Polynesian calibration is frozen: reopen it only if new evidence materially contradicts the model, a reproducible cohort failure appears, or a renderer/model change invalidates the acceptance evidence.

Human appearance now has an explicit portable domain boundary rather than being treated as a loose collection of Genesis/rendering helpers. **Population Context** may consume canonical place, era and optional family/heritage evidence and selects one concrete family profile; its physical output is separate maternal/paternal physical lineage. **Human Appearance** consumes only those physical lineages or real biological-parent physical genomes plus a deterministic conception seed, and emits a private physical genome plus derived inherited anatomy. Geography, nationality, names, languages and culture do not cross into Human Appearance or the renderer. Real parent physical genomes are exclusive authority for that parent's contribution and cannot be combined with a population prior. The renderer receives concrete anatomy, never population labels. This is implemented as portable core domains (`core/src/population-context/` and `core/src/human-appearance/`), not a network service: the current computation is deterministic, stateless and cheap, and service extraction remains open if the atlas later needs an independent data/deployment lifecycle. A deterministic non-historical reference physical state is now implemented for ordinary-human portrait realism without changing population genetics. Persistent lived physical state driven by actual Thread life remains deferred. See [Human Appearance](../architecture/human-appearance.md).

The **Appearance / Population Lab calibration lifecycle** is accepted in staging and Tranche A is closed as of 2026-10-05. A1's bounded coverage projection remains the demand source: it reports durable physical-ancestry demand, ranked broad/fallback/missing calibration holes, reference-node dependency chains and the exact existing Threads requiring appearance migration without inferring ancestry from geography, names, languages or portraits. A2.1-A2.3 are accepted: experiment artifacts persist through generic InfraDriver object/catalog authority, Admin launches controlled deterministic cohorts, and geometry-first visual evidence runs through the existing Asset Generator without giving Admin provider credentials.

A3-A5 are also accepted end to end. Population Lab can evaluate an operator-proposed shadow refinement against a frozen admitted baseline, retain immutable human review and candidate evidence, obtain explicit human approval, then **Admit** the reviewed candidate into an append-only runtime calibration registry over `InfraDriver.objects` + `InfraDriver.catalog`. Admission is data authority, not a source/deploy event. The staging closure flight advanced `middle_east.egypt@1 -> @2` with `noseBreadth -0.04 -> 0.12`, retained the approved experiment as provenance, moved the admitted version into Calibration History, marked only the approval-scoped dependent Threads as affected, migrated that bounded set through ordinary World appearance authority, and converged them out of the stale workset. Retry of the same admission was idempotent. Historical versions are immutable and can seed a future shadow experiment but cannot roll authority backward. The final `npm run slice:validate` passed on the closure implementation. A6/new-node admission is optional follow-on work, not unfinished Tranche A scope.

Existing Thread appearance repair distinguishes **appearance-model migration** from **re-rendering**. Live staging has now proven the full v0.1 -> v0.2 authority upgrade on Li Jing using her previously recorded operator-confirmed maternal/paternal `Chinese family -> east_asia` evidence without silently refining it. The migration changed the canonical specification digest, admitted a new root, converged Presentation, and issued FID revision 4 superseding revision 3. Final `appearance:diagnose` reports `physical-genome-v0.2` healthy, canonical visual specification healthy with `authority:"embodiment"`, and canonical Embodiment healthy. Direct inspection of the resulting portrait passed: the migrated root now reads as a believable Chinese/East-Asian individual rather than the generic-white v0.1 regression.

Operators use `appearance:diagnose`, `appearance:migrate`, `appearance:rerender` and exceptional `appearance:correct`; the old FID-owned visual-maintenance CLI is removed. Thread Details now has a dedicated Appearance surface with the same migration/rerender semantics, shows durable parental-origin evidence, and never hides physical-authority changes inside generic Fix. When no durable parental physical-origin evidence exists, Admin should still open with a concrete editable proposal rather than an empty form. The global target is to rank the place/era family-profile distribution, preselect one plausible maternal/paternal family path when several are available, and let the operator override it before admission. Current coarse birthplace defaults are temporary migration assistance until that shared population-context path replaces them; defaults never become ancestry authority until the operator submits them. The coarse physical-reference vocabulary explicitly covers North, West, East and Southern Africa (`afr_north`, `afr_west`, `afr_east`, `afr_south`); North and Southern Africa currently use documented provisional calibration fallbacks rather than invented region-specific coefficients. The Admin browser submits one bounded authority action and never rerolls. **Refresh appearance** performs one explicit authoritative read. While canonical generation/publication is pending, the Appearance surface waits on the single Admin live invalidation socket with zero polling reads. Thread Presentation signals authoritative publication or terminal completion; Admin then performs one bounded reconciliation read and redraws the affected surface. Reconnection also causes one reconciliation because invalidations are hints rather than authority. Repair-semantics changes are versioned in the Thread Health Projection witness so stale cached diagnosis cannot masquerade as current behavior. Live-Thread parent inheritance remains deferred to a chronologically truthful newborn/reproduction boundary. See [Human physical inheritance and population realism](../architecture/human-physical-inheritance.md), [Canonical visual identity](../architecture/canonical-visual-identity.md), and [Physical appearance model calibration and migration plan](../validation/physical-appearance-calibration-plan.md).

## Current milestone posture

The current north star is **continuous LivedNow + encounters**.

Existing M2 work has already proven the bounded primitives needed for that goal:

```text
M1 + identity/history/birth/causal foundations            CLOSED
G/H public path + minimum recovery                        CLOSED
FID + Directory/Meet selection seam                       CLOSED
R1-R4 intrinsic regulation                                CLOSED

bounded Flight Plan / CurrentSituation                    PROVEN
bounded Person -> Thread situated encounter               PROVEN
encounter -> reflection -> selective memory               PROVEN
later situation + later encounter continuity              PROVEN
World-owned ensure-LivedNow over covered plan time         PROVEN
bounded multi-day LivedNow catch-up + plan renewal         PROVEN
Genesis -> same continuing LivedNow path                   PROVEN
wired /meet over continuous LivedNow                       PROVEN
live deployed /meet acceptance                             PROVEN
Encounter Story / Thread Experience E0 foundation         PROVEN
environmental noticing / Thread Experience E1              PROVEN
voluntary social meeting / Encounter Story E2               PROVEN
silent witness / n-ary encounter E3                         PROVEN
journal / rendering / Admin acceptance E4                  PROVEN
live deployed N5 acceptance E5                             PROVEN
```

The important correction is:

> **Fibre now has bounded continuous-LivedNow reconciliation from canonical Genesis birth through a multi-day dormant gap.**

N4 is closed in deployment. N5 is now closed live on the accepted insight that **encounter is the primitive; meeting is one voluntary social form of encounter**. E0-E5 are closed. E2 proves voluntary meeting, E3 proves silent-witness asymmetry, E4 makes the resulting authorities inspectable without collapsing them, and E5 proves the combined path against a real staging Thread through prior voluntary visitor-work commitment, enacted LivedNow presence, public Meet, Encounter Story, Thread Experience and exactly-once Fibre Credit consequence.

See:

- [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md)
- [N6 rich public lived encounter slices](../validation/n6-public-lived-encounter-slices.md)
- [Current priorities](current-priorities.md)
- [ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md)

## What exists now

Current Fibre can already represent and persist:

```text
developmental context + relationships
  -> intrinsic drives
  -> Thread-authored half-day/day Flight Plan
  -> optional caregiver-owned care plan
  -> World-enacted CurrentSituation
  -> authorized inspection + bounded public present
  -> situated human encounter
  -> objective encounter history
  -> private contemporaneous reflection
  -> selective autobiographical retention or not_remembered
  -> later World situation
  -> later encounter receiving only persisted autobiographical consequence
```

A Flight Plan is intended life, not World truth.

World observation may diverge without rewriting the plan. Care may constrain enacted life without overwriting the dependent Thread's own will.

The existing B2 proof demonstrates that the visitor can leave, World can move the Thread to a later stop, persistence can reopen, and a later encounter sees only what the Thread actually retained.

That is meaningful continuity evidence.

## What does not exist yet

For a canonical Genesis-born Thread, the World-owned seam can now create the first anchor/plan/current situation, cross an uncovered multi-day interval, preserve retrospective materialization provenance, renew forward Flight Plan coverage and establish a non-stale present.

Fibre still lacks:

- richer catch-up events when elapsed life warrants encounters or other consequences beyond the sparse quiet-gap proof;
- richer shared-world convergence beyond the bounded Fibre Commons mediated-presence proof;
- Thread-owned public visitor participation from an ordinary displayed scene;
- the later-revisit proof after an accepted public encounter.

Encounter Story is now visualizable by construction: its durable rich prompt is objective/evidence-bound and separate from any later subjective memory reconstruction. Actual image/video rendering remains optional and uses the existing generated-asset pipeline rather than becoming World authority.

E1-E4 are green in full CI. The park proof admits an unscheduled bee/flower occurrence that enters attention and can become memory, while a separate cloud occurrence remains `not_noticed`; E3 adds a genuinely co-present silent witness; E4 exposes the objective story/visualization lineage and separate private journal authority in Admin and proves the same objective prompt can feed the existing generated-asset demand path for image or video without becoming evidence. N5 is deployed and accepted in staging. Run `inside-fibre-muegy2ai` on SHA `9bf65debfe2636b13c7ca1dbffa5d265072f486d` closed the live path for Luka Mzechabuki: prior voluntary acceptance -> revised Flight Plan -> active mediated work presence -> public Meet -> Encounter Story `story_2a0816db192e5ab2f82f4cc446e46b145f69e78dec963a32` -> noticed Thread Experience -> Fibre Credit balance 0 -> 12.

## Continuous LivedNow

Continuous LivedNow answers:

> **Where is this Thread now, what are they doing, and how did their continuing life reach this moment?**

The intended causal path is:

```text
last authoritative lived anchor
  -> determine elapsed uncovered interval
  -> retrospectively realize bounded missing life if necessary
  -> admit World history with honest retrospective provenance
  -> run ordinary participant-specific consequences where warranted
  -> author/refresh current Flight Plan
  -> enact CurrentSituation at the requested time
  -> publish bounded present
```

This is on-demand continuity, not continuous high-frequency simulation.

## Freeze and lived time

A Thread may be computationally frozen while world time passes.

For a lived Thread, compute dormancy is not automatically treated as a literal pause in the person's Fibre-world life.

When Fibre next needs the present, World may retrospectively realize a bounded continuation across the gap. Thaw therefore means restoring lived continuity—not reopening the stale last CurrentSituation as though no time passed.

The system must preserve both:

```text
when the event belongs in lived chronology
    !=
when Fibre actually materialized/admitted it
```

Retrospective history may become authoritative Fibre-world history after admission. It is not evidence of continuous runtime execution or external-world observation.

## Experience and memory

The authority distinctions remain load-bearing:

```text
History             what Fibre has evidence happened in its World
Journal             what it was like for me then
Memory              what I still retain autobiographically
Remembered meaning  what retained experience durably came to mean
```

Retrospective catch-up does not bypass this model.

Do not generate “virtual memories” directly.

The correct path remains:

```text
retrospectively admitted event
  -> private experience / interpretation
  -> retention appraisal
  -> autobiographical memory or not_remembered
```

A Thread may have catch-up history it does not remember.

## Meeting a Person

A lived Thread always has physical presence in World: either at a physical place or in transit between physical places. A mediated interaction may coexist with that physical presence; it never replaces it.

The accepted N4 path proves that a visitor can enter an already-established scene. The next refinement is Thread-owned meeting participation:

```text
insidefibre.com /meet
  -> select eligible Thread
  -> World ensures LivedNow(now)
  -> Thread appraises whether to meet now
      -> decline / defer (+ optional expression or later suggestion)
      -> accept
          -> Thread Presentation publishes exact bounded scene
          -> visitor enters that scene
          -> World verifies same authoritative CurrentSituation
          -> temporary Thread cognition
          -> public response
          -> objective encounter history
          -> private experience / selective consequence
```

The appraisal should use the current activity/Flight Plan plus bounded Thread-owned relationship, memory, needs, feelings and intentions. A requester cannot force interruption, and relationship context may make a Thread more or less accommodating without mechanically deciding the outcome.

For an ordinary uncommitted meeting, the visitor may cause the request to meet and the Thread decides whether the encounter happens now. The visitor does not create the life that preceded it.

**Accepted Inside Fibre direction:** the public website needs one stronger guarantee without weakening that ordinary rule. A Thread may voluntarily accept a bounded paid visitor-availability commitment in advance. That commitment becomes part of the Thread's lived obligations, can shape the Flight Plan, and can establish mediated Inside Fibre presence during the agreed window. A visitor meeting inside that window is then fulfilment of an existing accepted commitment rather than a new generic willingness decision. Payment compensates that professional availability commitment; casual Thread-to-Thread and ordinary Person/Thread social encounters remain normally unpaid. Exact marketplace/economic machinery is deferred.

## Encounters, meetings and lived attention

The accepted N5 abstraction is:

```text
World occurrence
  -> objective Encounter Story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

A **meeting** is one voluntary social encounter. It adds `accept | decline | defer` before the encounter occurs. An environmental or witnessed occurrence does not require consent to exist; what matters is whether the Thread actually notices/experiences it.

This means the same mechanism must support:

- a Thread noticing a bee on a flower while following an ordinary Flight Plan;
- several Threads sharing one social story;
- a silent witness being affected by how one Thread treats another;
- different private journals and memory outcomes from the same objective story.

Co-presence is not automatically experience. A nearby Thread may fail to notice an occurrence and should not receive fabricated private aftermath.

Journal remains contemporaneous private interpretation, not objective history and not autobiographical memory. The Admin Observatory journal artifact remains useful and lives at `journals/<threadId>/journal.md`; existing presentation R2 assets remain untouched and require no migration.

See [Encounter stories and Thread experience](../architecture/encounters-and-experience.md) and [N5 encounter-story implementation slices](../validation/n5-encounter-slices.md).

## Genesis to lived continuity

The important end-to-end target is now:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> first lived continuity anchor
  -> first personal Flight Plan
  -> World CurrentSituation
  -> compute sleeps
  -> elapsed days are reconciled
  -> current Flight Plan
  -> present now
  -> Person or Thread meeting
  -> experience
  -> continued life
```

Genesis remains the authority for prior life before Fibre birth.

Modern de-novo Genesis visual identity now derives **one concrete inherited phenotype from the Thread's physical genome before rendering**. World authoring supplies separate maternal and paternal physical-ancestry provenance for otherwise-missing biological parents; the shared inheritance core samples transient founder genomes, recombines them into the child's durable private physical genome, and projects the sex-conditioned phenotype used by canonical visual identity. Ancestry labels are not renderer instructions and the image model does not choose the phenotype. The mechanism is intentionally genotype-like rather than a molecular-genetics simulator; its compact population coefficients remain experimental and replaceable.

Continuous LivedNow owns the continuing world-time life after Fibre birth.

## Immediate next action

N5/E0-E5 are closed live. The immediate target is **N6 — Rich Public Lived Encounter**.

The relevant lived-person machinery is already accepted:

```text
Thread-authored Flight Plan
  -> World-enacted CurrentSituation
  -> bounded public present
  -> Interior Cognition for voluntary social stance
  -> Encounter Story / Thread Experience when an encounter actually occurs
  -> selective aftermath
```

N6 must prove the public continuity loop without rearranging life for the visitor:

```text
public visit
  -> ensure selected Thread LivedNow(now)
  -> bounded ordinary current scene
  -> Viewer displays the life already underway
  -> visitor approaches and speaks
  -> Thread accept | decline | defer from that lived context
  -> accepted encounter only
  -> visitor leaves
  -> time passes / life reconciles
  -> later public visit
  -> later current scene for the same Thread
```

A public visit is not a meeting request. It must not create availability, Encounter Story, compensation, private cognition or Viewer-authored scene facts.

The Viewer remains a separate projection surface. World owns LivedNow; Presentation owns the bounded public projection; the Viewer owns display and interaction only.

Natural Thread -> Thread social life remains a preserved follow-on. The accepted Situated Percept / Salience / Interior Cognition / natural actor-discovery machinery should eventually prove that independently lived Threads can become co-present and sometimes choose to interact without caller-selected counterparties, Commons fallback, paid scheduling or sociability bias. Historical W0-W7 labels are implementation evidence, not the current execution roadmap.

Developmental-exploration X0-X1 are accepted. X2 is implemented pending local validation: Flight Planning callers now supply only place refs, and the existing planning authority resolves each place's meaning from Situated Life or admitted live-World authority before the same `lived_planning` cognition call. This prevents caller-authored "interesting" place decoration without adding a recommendation subsystem. X3-X4 remain future slices.

Detailed execution is governed by [N6 rich public lived encounter slices](../validation/n6-public-lived-encounter-slices.md). N6.0 is closed. N6.1 and N6.2 are accepted in staging. N6.3 is current: a visitor approaches the Thread in the ordinary scene already produced by Flight Plan/LivedNow, and the Thread will decide whether to engage from that context. N6.3a-N6.5 are accepted. N6.6 is current and closes in capability order: first demonstrate meet/encounter directly from Fibre's World CLI, then prove the client-neutral public endpoints, then demonstrate insidefibre.com as one client of that endpoint.

## Development discipline

Build the smallest organism-level capability with a concrete beneficiary and stop condition.

No generic emotion simulator, no giant drive ontology, no high-frequency world ticking, no conversation store, no universal scheduler, and no second current-life authority.

Tests should prove lived continuity, authority, selective consequence and reciprocal individuality—not incidental HTTP or helper mechanics.

> **Someone was here yesterday. Something happened. It mattered — or it didn't. And today, their life continues.**
