---
id: architecture-birth-center-runtime
status: accepted
last-reviewed: 2026-08-31
canonical: true
---

# Birth Center Runtime

## Purpose

The **Birth Center** is Fibre's distinct runtime boundary for creating and developing prospective Threads before atomic birth.

> **The Birth Center owns development. The World Kernel owns reality.**

Genesis may take many model calls, repairs, retries, checkpoints, process restarts, provider interruptions and long elapsed time. None of that is a reason to hold a live-world database transaction open or expose provisional candidate state as Thread authority.

## Deploys and incomplete births

An admitted Thread remains alive even when Presentation never appears.
The Birth Center stops observation after two hours in `unpresented`
(a visible, non-failure terminal outcome), just as an unseen location
becomes `unlocated` after the existing observation limit. World
inspection outages after location is known also stop at the same deadline:
the birth becomes `complete`, with a pinned
`world_inspection_unavailable` reconciliation note rather than a
retroactive failure. Observation errors cannot fail an admitted Thread.

A durable model request witness conflict after deployment pauses
automatic retries with `DURABLE_INVOCATION_CONFLICT`; it preserves
the earlier invocation journal and leaves the birth operator-resumable.
Resume advances the bounded generation ordinal so new prompts use new
journal IDs. Development gate-budget exhaustion likewise pauses after
the first bounded budget; one Resume grants a second bounded
generation, and a second exhaustion is terminal. An immutable pinned Genesis
development-plan conflict is a terminal integrity error, not a
retryable model-witness conflict. Deployment checks
the previous Birth Center for `developing`/`publishing` births and
warns; a failed status check does not block deployment.

Explicit place names are resolved before POST accepts a birth:
unknown or malformed locations are rejected without enqueueing,
while GeoNames quota/server failures are resolved by the alarm
with backoff. Canonical geography is pinned on the lifecycle.
World historical-envelope and initial-roster role authority are
validated before Genesis development calls. One development step
may run per alarm, and an alarm stops starting new work after
approximately five minutes; other short stages can progress.
Client-side `--follow REQUEST_ID` only observes and never resumes.
A birth paused for operator Resume stops automatic browser polling and
CLI follow exits with the Resume command; while all outstanding births
are in scheduled backoff the dashboard defers its next read until the
earliest retry, instead of polling every 30 seconds for hours.
Internal service-binding route 404s remain retryable during staggered
deployments.

## Deployment preflight: no birth before acceptance

`npm run slice:validate` walks the seven Birth Center model
response schemas (Place, naming, and Genesis development/repair),
checking OpenAI strict shape and rejecting unsupported regex
constructs, including Unicode-property escapes, lookaround,
backreferences and word boundaries. Canonical model output is still
validated locally. Only the transported regex dialect is restricted.

Before uploading any worker, both `cloud:deploy` and the targeted Birth Center
service deploy fetch the bounded, read-only Place and naming snapshot from
the currently serving Birth Center. The new local code rehearses Genesis with
real World validators and probes all seven actual schema transports using
`OPENAI_API_KEY` from `.env`. Either failure stops the deployment **before
any worker upload**. The serving worker must support the authenticated
`/internal/births/preflight/material` snapshot endpoint; missing support fails
closed, rather than silently approving an unverified deploy.

After the Birth Center Worker and state schema are deployed, both
commands retain the internal birth preflight as a smoke check before success
success. The same check is available through
`npm run birth:preflight -- --env staging [--place United States/Hilo]`.
The deployed Worker sends **one tiny, capped** response-schema request
per schema to the configured OpenAI models; a provider rejection fails,
while an incomplete/truncated completion proves transport acceptance.
It then reads one already-authored Place and its pinned naming traditions,
draws parents and a household, composes a request, and runs real World
pre-admission validators. No newborn development, model call for the
dry-run itself, name reservation, World admission or new birth record.
Indexed Place/naming reads are bounded to a few hundred rows. A missing
pinned Place/naming tradition fails preflight explicitly; it must never
silently trigger Place authoring. Successful deployment prints
`BIRTH PREFLIGHT ok (7 schemas, place United States/Hilo)`.
The deployed revision must match the deployment being accepted. If the
post-deploy smoke check fails, the CLI explicitly reports that the **new
revision is already serving**. The initial deployment of the snapshot
endpoint requires an explicit bootstrap plan because the preceding Worker
cannot serve that endpoint.

A provider `MODEL_REQUEST_CONFIGURATION_ERROR` is a paused,
operator-resumable birth rather than a terminal rejection or recurring
provider retry. Resume after correcting the deployed schema/request
advances the stage's durable invocation ordinal. The Resume exception also
recognizes `MODEL_REQUEST_CONFIGURATION_ERROR` rows incorrectly marked
terminal by previously deployed code, so the existing staging failures
remain recoverable after a corrected deployment. Invalid operator
place/heritage input remains terminal.

## Place evidence is broader than individual language acquisition

Place authoring permits up to six schooling languages, household heritage
languages, heritage tags and physical reference populations per origin;
these are a city's and resident groups' alternatives, not an individual
Thread's repertoire. If a model packs languages or tags with commas,
slashes, pipes, Japanese punctuation or the words "and"/"or", deterministic
normalization splits, trims, case-deduplicates and caps the list before
the bare-language validator runs. Each split, rejected non-bare value
and final normalization is pinned in Place provenance. Empty results
remain invalid. Individual composition selects **at most three**
eventual languages: raised languages first, followed by schooling
languages in the author's order. A model's schema cannot force a
real city's multiple schooling languages into one string.

## Failure and cost discipline

A prospective birth fails permanently only for invalid operator input
(an unresolvable place or contradictory heritage), integrity/contract
conflicts (missing pinned evidence or World rejection), or an exhausted
bounded authoring budget. Authoring exhaustion first produces a **retryable**
failure with a long backoff and an operator Resume path; it never erases
a person already admitted by World.

Model deviations must be prevented in structured output, normalized
deterministically with pinned `normalizations` evidence, or repaired with
the exact rejected value and violated rule quoted. A Place and each naming
tradition receive at most three distinct journaled invocation IDs per
authoring cycle (initial plus two repairs), one call per alarm. Two failed
samples do not permanently fail a birth. Accidental composition coincidences
are redrawn; impossible evidence or contradictory input remains an error.
After admission, identity discrepancies are reconciliation notes on a
completed birth, never a retroactive failure.

An ordinary complete birth emits D1 Activity records for completed coarse
stages/attempts and failures only; per-model-call progress remains in the
durable model-invocation journal. The target is at most 100 D1 rows written
per birth, pending direct staging measurement. The operator's
`genesis:births --failures` view groups non-cancelled failure witnesses by
stage and error code. Explicitly abandoning an unreserved failed request
marks it cancelled without discarding the original error and operator reason.
Default paginated birth lists omit cancelled requests; `GET /births?all=1`,
Admin's Show cancelled and `genesis:births --all` inspect them on demand.
A reserved-but-unadmitted identity is stillborn, never merely cancelled.

## Runtime ownership

The Birth Center owns:

- provisional Genesis/development workflow state;
- durable model-invocation journals;
- checkpoint/resume state;
- candidate historical life, autobiography and meaning while unborn;
- rejected/generated candidates and machinery-failure provenance;
- mechanical admission orchestration; and
- construction of a complete birth bundle.

The Birth Center does **not** own:

- authoritative Thread history;
- live identity, memory, relationship or meaning state;
- World Kernel event/version authority; or
- atomic publication semantics.

The executable runtime therefore reports `authoritativeThreadStateOwned=false`.

## Publication boundary

A complete admitted birth bundle crosses one explicit boundary to the World Kernel. The World Kernel applies the current live validators and performs atomic `publishBirth()` semantics. If publication fails, no partially born Thread exists.

The Birth Center runtime must not open or mutate the live World database merely because it shares a repository with world-kernel code. Development storage and provider credentials belong to the Birth Center side; authoritative publication belongs to the World side.

The publication boundary is fetch-shaped and provider-neutral. Local composition can inject it directly; Cloudflare composition backs the same boundary with a private service binding to World. Authority ownership does not change: Birth Center may retry publication, while World alone admits the authoritative Thread.

Milestone #39 exercised this boundary end to end with a fixed five-Thread cohort: each admitted Thread published atomically with its FIN/civil registration, and independent hydration reconstructed the admitted life from canonical authorities. The retained result is [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

## Durability

The Birth Center uses the canonical durable-development rule from [`genesis-durable-development.md`](genesis-durable-development.md):

> **Commit development as it becomes valid. On machinery failure, preserve the failure and resume from the last committed developmental state. Never regenerate accepted history.**

A successful provider invocation is committed through the Birth Center `InfraDriver.state` scope before later machinery can depend on it. Restart replays that exact committed result after verifying the request witness and contacts the provider only for the first unfinished invocation. Local maps the state scope to SQLite; Cloudflare maps it to SQLite-backed Durable Object state.

Durable development is execution resilience. It does not make provisional candidate material authoritative Thread life or semantic evidence.

#39 demonstrated exact zero-network replay of 151 committed generation calls after the cohort was fixed. That proof remains execution/restart evidence only; it does not support identity, memory, meaning or personhood claims.

## Runtime service

The repository exposes a distinct service process:

```text
npm run birth-center
```

Default loopback endpoint:

```text
127.0.0.1:8790
```

Configuration:

```text
FIBRE_BIRTH_CENTER_HOST
FIBRE_BIRTH_CENTER_PORT
FIBRE_BIRTH_CENTER_STATE
```

`GET /health` and `GET /v1/status` expose runtime ownership/status only. The `/v1/` route label is an HTTP compatibility surface; it is not a reason to version the architecture filename.

The Cloudflare deployment uses a private Worker plus one named SQLite-backed Durable Object scope for Birth state and alarm scheduling. A private birth request durably records provisional publication work; the Durable Object alarm resumes pending World handoff after Worker disposal/restart.

## Single-authority birth lifecycle (Slice 2 staging verified; Slice 3 source pending validation)

[ADR-0031](../decisions/ADR-0031-birth-center-single-birth-authority.md)
and [ADR-0032](../decisions/ADR-0032-place-population-parental-origins.md)
are **accepted design decisions**. CLI and Admin now both submit
to Birth Center's single durable `/births` lifecycle, rather than
authoring context in a separate CLI cache or a parallel fixture-driven
Admin path. The implementation is committed but Slice 3 awaits local and
staging validation; only the Slice 2 births are staging verified.

**One Birth Center request** owns the stages:

```text
requested → place_resolved → place_authored? → parents_selected
  → genome_selected → developing → publishing → admitted
  → presented → located → complete
```

`place_authored` runs only for a missing **canonical place × child's birth
decade**. One journaled model call creates a versioned Place record with
**both** civic/World context and the Place Population. No second World-context
call and no import of the CLI's `.fibre/` cache. Naming traditions are
authored lazily, one journaled call for each origin group when first drawn.
They carry parent- and child-decade given names, family names, and the
transmission, order and joiner rules. The Place Population itself has no
name lists. Every birth pins its Place/naming versions.

The existing alarm advances bounded due requests. **Authoring** uses at most
one new model call per alarm; `developing` is **one stage** that runs the
existing Genesis development service with its own durable model journal.
It is not split into per-call stages. Publication and later confirmations
use backoff. One blocked request never blocks another.

`POST /births`, `GET /births/:id`, paginated `GET /births`,
`POST /births/:id/resume` and `POST /births/:id/abandon` are the
proposed common API for the CLI and Admin. Abandon before `threadId`
reservation means **cancelled**; after reservation but before admission,
**stillborn(reason)**; after admission it stops observation only.
It cannot erase a living Thread. `genesis:birth` retains its flags/events
and adds resume/abandon; `genesis:births` lists requests.

**Implementation checkpoint (October 29):** Slice 1 ran two completed births on staging at `66da96e` (London 2m57s; Manchester 3m14s) with about 100 DO rows read and 130 written per birth, no retries. Slice 2 now has source for shared population Places, per-place `mixedParentShare`, parent-decade naming traditions, named parents and an issued-name index. It also includes model-authored weighted household patterns, child-drawn sibling details, caregiver-specific WorldSpec history, and persisted parentage projections for `GET /births/:id` and birth listing. The once-per-place World name seed now uses a narrow identity-only read route; this is a deliberate World Worker/store change without new World schema. It requires Birth Center schema v5 and fresh local and staging validation. The older speculative paragraphs below preserve the design contract and should not be mistaken for completed Slice 3 Admin unification or Slice 4 count waves.

**Cost:** awaiting a model in a Durable Object alarm consumes wall time.
Genesis development may make many calls within its one lifecycle stage.
Measure alarm duration and free-tier cost before increasing concurrency.
An indexed `GET /births/:id` reads one row plus bounded local evidence,
not all recent births or World presence. Initial Place creation costs one
model call per place/decade; lazy naming costs one small call per origin
group used. No model calls for deterministic parent sampling or inheritance.

**Authorized implementation slices:** (1) single Birth Center authoring path and thin CLI,
(2) versioned Place Population and parents, (3) Admin moves to the same API
with **read-only Place inspection** and old routes retire; editing is
**deferred**, (4) bounded `--count` waves. Existing born Threads and
historical records are never rewritten. World alone admits the live birth.

## Current development boundary

The completed Genesis memory/meaning selectivity and scientific-diagnostic bridge is recorded in [its outcome](../history/genesis-selectivity-scientific-hardening.md). That work did not move authoritative birth state into the Birth Center or earn a Whole-Person standing increase.

Production persistence remains governed separately by [`production-persistence.md`](production-persistence.md): semantic stores own Fibre meaning, while provider-neutral `InfraDriver` capabilities own production persistence guarantees. Authoritative World relational state and Birth Center provisional/provider-call durability now cross `InfraDriver.state`; local `.fibre` development artifacts are fixtures/validation artifacts rather than production persistence precedent.


## Operator lifecycle unification (Slice 3)

Admin and the CLI now use `/births` as the single prospective-birth
authority. `GET /births?limit=32` reads at most 33 indexed lifecycle
rows, never World or model; `GET /births/:id` projects pinned
parentage and household; `GET /births/:id/place` reads its versioned
Place on explicit inspection. Admin creates, resumes and abandons the
same lifecycle requests as CLI. The browser polls only when some
birth is active and the tab is visible, at 30-second intervals.
The obsolete `/internal/births/initiate`, `/preparation`, and
`/pending` handlers, their separate Genesis initiation fixture
and the laptop `.fibre` World cache are retired. Historic development
inspection and stored outcomes remain available without invented
lifecycle stages; Place editing remains deferred.
