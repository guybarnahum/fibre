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

**Acceptance:** An admitted conversation has separate personal
perspectives; mere co-presence never becomes a conversation. An offered
place never becomes an intentional choice automatically. Cause is
reported only when a concrete mechanism or controlled difference
supports it; other influence stays unresolved.

## Execution discipline

No branches, generic tracing system, security drift, fabricated social
events, per-Thread population scans, background reasoning or new model
calls merely to explain choices. High-value semantic tests, not brittle
copy/CSS snapshots. Guy runs npm run slice:validate once after pulling
main, then uses existing documented Admin deploy scripts and validates
the actual browser against staging. No staging acceptance is claimed
from GitHub source alone.
