---
id: validation-life-observatory-slices
status: accepted
last-reviewed: 2026-10-19
canonical: false
---

# Life & Causes — four implementation slices

[UX contract](../architecture/life-observatory.md) and
[ADR-0026](../decisions/ADR-0026-life-observatory.md) are binding.
Exactly four slices. Counterfactual influence experiments are deferred,
not a fifth execution slice. Changes go directly to main; Guy validates
locally and deploys staging by CLI. A source commit is not staging proof.

## Slice 1 — Navigation and current life (source, local validation pending)

Replace Activity's indented Causal Trail with a dedicated Life & Causes
workspace; preserve Raw Activity for real runtime troubleshooting.
Separate Explore (Overview, Threads, World Events, Life & Causes) from
Operate (Birth Center, Appearance, Activity, System status). Existing
Threads/Birth Center views initially reuse their Activity operator
routes. Do not expand the existing Thread detail.

One selected Thread opens /life?thread=THR_ID: a bounded read-only
current-life timeline of up to eight enacted World situations, with
a selected-moment Before / Decision / World / After inspector.
A Flight Plan purpose appears only if the plan reference and stop
actually match the enacted situation; no Body or Memory causation is
invented. Link from existing Thread details. No additional model work,
World mutations or full-history read on entry.

**Acceptance:** Select Amelia from Threads; open Life & Causes; inspect
real enacted public visits and a linked Flight Plan purpose where
admitted. A previous visit cannot inherit the newer plan's purpose.
Raw Activity remains usable; historical co-presence is not asserted.

## Slice 2 — Compact Thread detail and intentional deep history (source implemented; local/staging validation pending)

Keep Thread Overview, Identity & Body, and Maintenance small. FIN/FID,
appearance/age-portrait actions, and health/recovery remain there.
Move detailed lifetime Journal, Memory, World events, Encounter Episodes,
Social Analytics and Later Contact into Life & Causes, reusing existing
read components and source authorities. Extend the bounded timeline to
Recent / Lifetime / Origins using explicit operator-driven history
fetch, age-anchored chapters and evidence coverage. Remove deep-history
auto-fetch triggered by merely scrolling Thread details.

**Acceptance:** Opening a Thread's identity does not read or render an
entire life. Choosing Lifetime or a meaningful moment does; a Memory
is not merged into a World occurrence merely by nearby time.

## Slice 3 — Genesis formation versus birth execution (bounded source pass; local/staging validation pending)

Birth Center's candidate/request opens actual compiler milestones,
retries, blockers, recovery and publication status. A completed birth
links to the published person's *historical* formation: origin,
symbolic inheritance, historical childhood episodes, selective Memory
and developed meaning, separated by the World publication boundary.
An unadmitted candidate never appears as a live Thread; an execution
retry never becomes an event the historical child experienced.
Reuse Genesis and World source references instead of cloning histories.

**Source boundary:** The first pass exposes an existing Birth Center
request's latest observed state, optional model invocation count,
failure/disposition, and World-admission outcome. The current inspection
contract does **not** enumerate every Genesis historical-realization,
memory-selection or meaning-formation milestone; do not mark those
unobserved stages completed. For published Threads the explicit
Origins-only World read covers at most 64 Genesis episodes from the
first 128 indexed post-seed event sequences and 24 current Memories.
The original seed event provides the true World publication timestamp.
Childhood events use their own historical occurredAt timestamps.
A full lifetime cursor and per-stage Genesis development trail remain
deferred until an authoritative bounded source exists.

**Acceptance:** A failed birth cannot become a phantom World life;
the observed Birth Center stage remains distinct from unverified
historical compiler phases. A published Thread's admitted childhood,
selective Memories and atomic World publication remain different
sources and clocks.

## Slice 4 — Decision witness and consequence (source pass implemented; local/staging validation pending)

At existing Flight Plan and social cognition boundaries, preserve only
missing compact event-time evidence: supplied Body drives, offered
opportunities, selected personal context, salience and resulting choice
with source references. No parallel event log or retrospective model
narration. World Events can open the same investigation for an admitted
Encounter Story, with two independently owned Thread viewpoints,
choices, attention, Experience, selective Memory and demonstrated
later effects. Legitimate non-actions remain visible as non-actions.

**Implemented source contract:** A personal plan's existing cognition
provenance now retains the actual supplied interoception (or null), the
precise offered place refs, the subset offered by the City Guide and the
preceding situation ref. Selected personal-evidence refs and the
Thread-authored stop/purpose remain separate. A social opportunity
completes its existing one-shot row with a bounded decision witness:
actual salience anchors, initiator's Body projection and selected
Experience refs where supplied, initiation/non-initiation, recipient's
separate consent decision, concise self-reported reasons, and any
admitted Encounter Story ref. Incomplete/interrupted attempts are not
silently retried or given imaginary decisions. Two small
`decision_json` columns are added to the existing social-opportunity
frontier tables on schema installation; no parallel logging authority
is introduced.

Life & Causes uses the bounded World Observatory to show those
decisions alongside enacted World situations, each person's recorded
social request/recipient accept-decline-defer response, individual
Experience and retained Memory. World Events links admitted Encounter
Stories to each participant's own Life & Causes view. Only the
initiating Thread's one-shot opportunity currently owns the combined
initiation/response **reason** witness; the other person's history
independently exposes their recorded response and Experience/Memory.
The recipient's private reason is **not** independently indexed by
Encounter Story in their own timeline. That narrow
read-side linkage is deferred until a grounded user story requires it;
do not imply the witness is available in every perspective.

**Causal-status register:** Body/interoception exposure and City Guide
offers are **Context-only/Notarial evidence** in this Slice, not
additional behavioral capabilities. Salience's deterministic anchors
are a **mechanism**; separately established pressure-driven differential
planning remains the behavioral evidence and is not proved merely by
this UI. The social initiation and response outcomes are actual
Thread-authored decisions; the witness records their context but is
not a causal intervention. Enacted arrival/Story/Experience/Memory
are separate established World facts, while a Memory's impact on a
later decision is still **Unresolved** without an admitted downstream
consumer/effect. Who chooses context is unchanged: existing
Fibre/Thread cognition selects personal Memory/semantic evidence; this
operator display does not author that context or the decision.
A model-reported reason remains a reported perspective, not
unconscious truth.

**Acceptance:** An admitted conversation opens separate per-person
World views; mere co-presence never becomes a conversation. A
City Guide offer never becomes an intentional choice automatically.
A completed non-initiation retains actual Body/salience evidence without
inventing a Story. A plan's current Body value cannot be substituted
for the original event-time witness. Causal influence is reported
only when a named deterministic dependency or independent controlled
difference supports it; other influence remains unresolved.

**Source implementation is pending local validation and staging
acceptance; it is not a closed milestone or a new claim that Body or
Memory has achieved the ambitious behavioral differential gate.**
Existing bounded views cannot certify the absence of older histories.

## Execution discipline

No branches, generic tracing system, security drift, fabricated social
events, per-Thread population scans, background reasoning or new model
calls merely to explain choices. High-value semantic tests, not brittle
copy/CSS snapshots. Guy runs npm run slice:validate once after pulling
main, then uses existing documented Admin deploy scripts and validates
the actual browser against staging. No staging acceptance is claimed
from GitHub source alone.
