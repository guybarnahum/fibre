---
id: architecture-life-observatory
status: accepted
last-reviewed: 2026-10-19
canonical: true
---

# Life Observatory — person, world, formation, choice, consequence

## Decision and scope

**Accepted UX direction; a first read-only source slice is in progress,
with local validation and staging acceptance pending.** Replace
Admin's low-value **Causal Trail** of indented runtime operations with a
**Life & Causes** investigation experience. It is a readable way to examine
a particular person's lived and formative history, a shared World occurrence,
or a Genesis candidate. It asks **what happened, what was available when a
choice was made, and what the choice actually changed**. It does not claim
that every influence is understood. See
[ADR-0026](../decisions/ADR-0026-life-observatory.md).

**The default human workflow is Thread-first:** choose a person in **Threads**,
see their compact Thread Overview, then open the **dedicated Life & Causes
workspace** (not an expanding Thread Observatory) to inspect a time-ordered
Life Timeline and select meaningful moments. A World-event investigation begins from
**World Events** instead; an incomplete or failed birth begins from
**Birth Center**. All three open the **same Life Investigation detail
pattern** with context-preserving back-navigation. The operator should
not have to locate a request ID or read stage codes to understand a life.

**Not part of this decision:** a new semantic event authority, a universal
causal graph/database, a global always-on Thread scan, a model generating
post-hoc "why" narratives, automatic counterfactual calls, invented life
events, or changing live Thread behavior to make better dashboards.

## User stories and what acceptance must demonstrate

1. **Who is this person and how did they become themselves?** From a
   Threads row, reach one person's origin, World circumstances, inherited
   possibilities, actual historical childhood episodes, selective Memories,
   meanings, publication and continuing life. Distinguish evidence-backed
   formative links from mere temporal proximity and thematic resemblance.
2. **Why did they leave home?** Select an enacted public arrival; see the
   governing Thread-authored Flight Plan, its purpose, the preceding
   situation, actual planning-time Body signals and offered World places
   *if witnessed*, journey and consequences. Do not turn social pressure
   into a diagnosis of loneliness, nor City Guide exposure into an
   intentional act of browsing.
3. **Two Threads are talking: how did it happen?** From one objective
   social Story, inspect separately each participant's prior enacted
   presence, percept/attention, salience, initiation/response, private
   decision, outward speech and independently developed Experience.
   Meeting requires admitted interaction, not merely two plans or
   simultaneous presence.
4. **Did childhood history matter later?** Traverse from an admitted
   childhood episode to a personal Memory, meaning and a later decision
   *which actually consumed that evidence*. If only a sequence or selected
   prompt context is recorded, say causal influence is unresolved.
5. **Why is a birth stuck, or was it stillborn?** From Birth Center, show
   the last authoritative candidate/development milestone, last admitted
   candidate facts, recovery/retry status and World publication result.
   The absence of a live Thread must not be inferred from missing Activity.
6. **Why did two people react differently?** Compare two independently
   owned perspectives on one World occurrence or two explicitly selected
   decision witnesses. Preserve particular autobiographical content;
   difference in offered prompt context alone is not proof of a
   behaviorally consequential difference.

No acceptance test should require natural-language summaries with fixed
wording or manufacture an encounter simply to make a card appear.

## Information architecture — one investigation, three entrances

```text
THREADS  → select person → compact Thread detail → Life & Causes → moment ┐
                                                                       │
WORLD EVENTS → city/place → objective occurrence → select person ──────┼→ Life Investigation
                                                                       │    Conditions
BIRTH CENTER → pending/failed/completed birth → Origins/Formation ─────┘    Choice / event
                                                                            World outcome
                                                                            Aftermath
                                                                            Evidence & diagnosis
```

- **Threads** owns person selection. The existing /thread/:id detail
  remains a **compact person dashboard** for present identity/Body,
  FIN/FID, appearance, health and maintenance. Do **not** add a complete
  life timeline to this page. A contextual Life & Causes link opens
  the dedicated /life?thread=... investigation with a bounded current
  World view; deeper history is fetched only on explicit request.
- **Life Timeline** is *one person's* chronology. A compact **Origins**
  chapter precedes **Live Life**, divided by the **World publication
  boundary**. It is not an endless operation tree. A visible
  `Now | Recent | Life | Origins` range chooser zooms intentionally;
  this is a scope control, not four competing databases. Select
  type filters `Events | Choices | Encounters | Experiences | Memories`.
  Events and decisions may coexist, but remain distinct semantic types.
  Render sparse, time/age-labeled moments from authoritative records,
  with stable cursor paging; do not backfill empty hours with fiction.
- **World Events** owns geographic/scene discovery. The existing
  World → City → Place → Event navigation remains. Opening an event
  shows the shared objective account and separate participant viewpoints;
  choosing a person pivots to that person's Life Investigation at the
  same event and time.
- **Birth Center** owns *provisional* Genesis progress and recovery.
  A completed birth opens the person's **Origins** chapter. A pending
  or failed birth opens a **Formation** detail with no phantom admitted
  Thread. Stillborn diagnosis has an honest terminal publication state.
- **Raw Activity** remains the exact engineering evidence for providers,
  retries, exceptions and operation correlation. The existing Activity
  `Causal Trail` nesting is retired from primary navigation; it is not
  renamed into a more impressive-looking tree.

### Dedicated Life & Causes — proposed desktop layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Portrait   Amelia Shah        London · actual current place         │
│            Current Life · World activity · identity/health actions  │
├─────────────────────────────────────────────────────────────────────┤
│ Now                                      Recent meaningful moments  │
│ Southbank Centre (World-attested)        Arrived at Southbank        │
│ Awake · next life boundary               Visited British Library    │
│                                         Prior opportunity: no peer  │
├─────────────────────────────────────────────────────────────────────┤
│ ORIGINS           LIFE TIMELINE             INFLUENCES              │
│ Origin/formation  24 h / 7 d / Lifetime     Investigate selected    │
│ evidence          by civil date/age          moment, not a score     │
└─────────────────────────────────────────────────────────────────────┘
```

This example uses observed October 19 facts; any other wording or motive
would require its own evidence. A concise current-life header and
most-recent moments should be legible without expanding Genesis history
or performing expensive full-Thread Observatory reads. On narrow screens,
stack overview, timeline and selected-moment detail vertically.

### Timeline card hierarchy

**Chapters** organize *time*, not operation nesting: Origin, Childhood,
Adolescence/other applicable formative intervals, World publication,
Continuing life. Do not invent an age phase absent from the Thread's
actual entry stage. Within each chapter, show **semantic moments**, each
with an exact timestamp or grounded age and one source-grounded title:

- `World fact`: arrived, departed, heard an admitted occurrence, actual
  dialogue; each says whether physical locality is verified, coarse,
  unknown or mediated.
- `Choice`: a Flight Plan, invitation, response, refusal or non-action
  admitted by its owning authority. A planned venue is **not** a visit.
- `Personal response`: noticed/not noticed; Experience, selective
  Journal entry, autobiographical Memory, meaning/reinterpretation.
- `Developmental evidence`: Genesis historical event, remembered or
  not remembered, its meaning when actually formed, and lineage/
  inheritance sources kept distinct from a later learned characteristic.
- `Operational milestone`: birth completion/blocker/publication
  in **Birth execution**, never masquerading as an event experienced
  during the Thread's historical childhood.

Group a single continued Encounter Story once, with separate per-person
perspectives underneath. Related cross-time moments may display a small
"linked later consequence" affordance **only where a genuine reference
exists**; do not build a decorative graph of inferred life themes.

### One reusable Life Investigation detail

Selecting a moment opens an adjacent inspector on desktop or a stacked
drill-down on mobile. Preserve the selected person's name, time/age,
original view and filters. Stable direct links should be designed around
existing authoritative identifiers (Thread, World event/Story, plan,
situation, Experience/Memory, Genesis request); never make an Activity
operation ID the semantic identity.

```text
What happened?
  Actual World action / admitted childhood episode / accepted birth milestone
Before — conditions
  Enacted situation, Body interoception, offered places/people,
  developed-self, relationship and admitted Memory evidence *at the time*
Decision / formation
  What was selected and the Thread's stated purpose or private reason;
  who owned the choice, what was only offered, and what wasn't considered
World outcome
  What actually occurred, by whose authority; interrupted and no-action
  outcomes are legitimate
After — consequences
  Independent attention, Experience, Memory/meaning, relations and later
  choices, linked only by real evidence, with temporal-only paths marked
  "Later; influence not established"
Evidence & technical diagnosis [collapsed by default]
  Authoritative refs, source coverage, decision witness, provider/retries,
  event-time assumptions, capped windows, optional link to Raw Activity
```

A selected objective World Story can have **two or more person tabs**,
each with independent private context, decisions, attention and Experience.
Never merge their private histories into one invented shared "motive".

## Genesis: Birth execution and lived formation are different clocks

A Genesis selection has two explicit facets:

**Formation — the person's historical life.** Show WorldSpec factual
circumstances, lineage and immutable symbolic inheritance as *possible
influences*; chronological historical episodes as *admitted facts*; and
separate autobiographical Memory/meaning as personal developments.
Provide event → Memory → meaning → later consumption when the evidence
exists. Genesis cannot retroactively assert a childhood event's
significance simply because a later adult interest sounds similar.
Genome-blind historical cognition must never appear as having seen
genome text. Origin/sex/culture/ancestry are not personality verdicts.

**Birth execution — the compiler's actual work.** Show the candidate's
verified meaningful checkpoints: origin material established; historical
realization; selective memory/meaning formation; admission validation;
World publication and civil registration. State `pending | admitted
candidate | blocked | published | unrecoverable` *only according to
existing Birth Center/World authority*. Those are conceptual display
distinctions, not permission to invent new lifecycle statuses.
Failure detail expands into exact failed gate, attempt/retry and
source references, then Raw Activity. Candidate pre-publication facts
are never presented as live World history; publication is the boundary.

Birth Center opens Birth execution first for pending/failed work, and
Formation/Origins first for completed published Threads. From either
view the operator may switch facets without losing the Genesis reference.

## Decision-time Causal Witness — only the missing evidence

**Agreed design, implementation pending.** Do not create a new universal
event log or collect private reasoning. Capture a **small immutable
decision-time witness alongside existing domain authority** at a
consequential boundary, reusing the input already assembled for the
normal decision (no extra model call).

For a Flight Plan: `planId`, authoring time/subject, preceding
CurrentSituation, actual supplied Body-drive family/pressure and evidence
refs (when present), actual offered City Guide place refs, source context
digest and selected personal evidence, and selected stops with the
Thread-authored `purpose`/`activity`. Distinguish
`not supplied`, `supplied`, `selected`, and `chosen`.
An input hash alone proves integrity, not that its content entered
cognition: resolve and verify actual bounded content on inspection.

For social appraisal: existing situated opportunity, independently
observed candidate, deterministic salience anchors (including
`background`), actual Body values and refs when supplied, recent noticed
Experience, selected Memory/relationship evidence, initiation or
non-initiation, recipient's independent response, and admitted
interaction/Story only when it actually happened. Preserve meaningful
non-actions without manufacturing a World event. Reason supplied by
a cognition adapter is **reported reason**, not a diagnostic verdict.

For Genesis, reuse the existing manifest, historical-envelope/attempt,
memory/meaning admission, and publication witnesses. Do not multiply
per-episode event logs or expose genome to a historically genome-blind
model merely to fill an inspector. Add a narrow missing evidence edge
only when an actual user story proves it is necessary.

The ownership boundary is: **World/Genesis/Memory/decision authorities
store truth; Life Observatory joins their references read-only.**
The witness is not a new Thread belief, feeling, or self-explanation.
Capture it atomically or durably with the owning choice; never
reconstruct historical Body pressure from its *current* value.

### Evidence vocabulary in the UI

| Label | Allowed claim |
| --- | --- |
| **Occurred** | Independently admitted event, action or State change |
| **Supplied** | Exact event-time context was made available to the decision |
| **Selected / cited** | Evidence was actually selected/cited by admitted decision provenance; does not establish decisive weight |
| **Stated purpose** | The Thread's own explanation; not an objective cause |
| **Mechanism** | A concrete deterministic dependency, such as salience changing under a known input |
| **Influence tested** | Named controlled intervention/replicates with original conditions held fixed, result and uncertainty |
| **Unresolved** | Missing witness, later-only correlation, capped sample or unobserved effect |

Never infer loneliness from `social_contact` or boredom from
`exploration`. Never assign synthetic percentage contributions to
model decisions or treat a private rationale as hidden chain-of-thought.

### Optional counterfactual inspection (deferred)

An explicit operator-initiated experiment may vary one observed input
while holding a digest-verified context constant in an isolated read-only
decision harness. Deterministic salience can support exact dependence;
stochastic model-mediated decisions need controlled paired samples
and report sensitivity, not a single magical "true reason".
A counterfactual must never publish live choice, Memory, relationship
or World action. If historical input cannot be reconstructed faithfully,
the UI says the experiment is unavailable. Ordinary runtime does not
replay decisions or execute auxiliary "why" cognition.

## How meaningful moments are found

No new poller. Reuse authoritative milestones, World occurrence/Story,
enacted situation, Flight Plan, notice/Experience and Memory references.
World Events filters by actual event category and location with the
existing read-side index/projection. Thread Timeline resolves a **bounded
per-person** slice. Birth Center resolves **one candidate/request**.

Searching for **two Threads talking** must find an admitted interaction
and shared Story with real participants, *not* two Threads co-located
or two future plans. Silent attention and a declined request are also
interesting, but are labeled accordingly; an ignored opportunity is
not a fictitious conversation.

Use sparse type-specific titles and short human-readable descriptions
from authority; no on-demand LLM-generated explanation of causality.

## Performance and rollout

- Default Thread view: current-only + a small recent moment window.
  Deferred history is fetched on selection, never across the whole
  population. The existing full Observatory has been measured as costly;
  preserve that boundary.
- Global World map: bounded city/place occurrence index with stable
  time/category cursor; private/unknown location is not pinned by
  guessing a witness's location.
- Selected moment: one bounded referential join through owning stores.
  Optional deep records requested individually; each response exposes
  coverage and truncation. One shared read projection, not replicated
  "why" semantics in browser widgets.
- No new background timers, no per-Thread population scanning, no
  runtime reason-model calls, no brute-force memory search, no
  cross-Service copy of private narratives into Activity Log.

**Four implementation slices** are owned by
[Life Observatory slices](../validation/life-observatory-slices.md):

1. **Navigation & Recent Life (source implementation, validation pending):**
   dedicated Life & Causes route, bounded current-only enacted timeline
   and selected-moment inspector. Remove Causal Trail as an indented
   Activity mode; retain Raw Activity. Do not grow Thread details.
2. **Compact Thread detail & Deep History (source implemented; validation pending):**
   Thread detail uses Overview / Identity & Body / Maintenance tabs,
   with a three-moment current-life preview; no scroll-triggered full
   history read. Life & Causes uses a dated vertical timeline of
   enacted World situations, admitted Encounter Stories and retained
   Memories. Original Journal, Encounter and Memory views are reused
   on an explicit historical disclosure, never in the initial read.
   The historical view is bounded by currently exposed World records;
   age-spanning Genesis formation and a true lifetime cursor remain
   subject to later source work.
3. **Genesis:** split compiler Birth execution from the published
   person's historically realized Formation, with truthful
   failed/unadmitted candidate handling.
4. **Witness & Consequence:** capture missing event-time Body/World
   context at existing decision seams; join admitted shared World
   encounters to each person's independent consequences.

**Optional counterfactual experiments are deferred**, not a fifth
near-term slice; any future experiment is an explicit operator choice
and must be separated from a live person's decisions.

### Standing UX acceptance examples

- A Thread's London public visit is shown as an **enacted arrival**
  linked to an authored plan; unknown Body motive remains "not captured".
- Two actual co-present Threads with no conversation are not displayed
  as a meeting. An admitted dialogue opens separate participant views.
- A Genesis compilation retry does not become a child's lived event;
  an unpublished candidate never appears as a live person.
- A not-remembered childhood episode does not become an adult Memory;
  an event retained by one observer never leaks into another's self.
- A pressure snapshot or offered venue can be inspected as input,
  but cannot be called a proven cause until a mechanism or controlled
  difference warrants the statement.
- An empty bounded window says **no recorded match in this window**,
  not "nothing happened", "no Memory" or "no influence".

## Relation to other accepted documents

- [World Observatory](world-observatory.md): the place/event-first
  entrance to the same Life Investigation.
- [Genesis Compiler](genesis-compiler-contract.md) and
  [Thread Genesis](thread-genesis-childhood-birth.md): candidate/live
  truth, genome-blind history, selective Memory and publication.
- [Interior Cognition](interior-cognition.md) and
  [Body regulation](regulation-drive-extensions.md): selected
  personal context versus physiological pressure versus reported reason.
- [Runtime Activity Log](runtime-activity-log.md): operational
  diagnosis remains non-authoritative and raw, not a life timeline.
- [Operator surfaces](operator-surfaces.md): concrete Admin navigation
  and the existing Thread / Birth Center / World Events boundaries.
