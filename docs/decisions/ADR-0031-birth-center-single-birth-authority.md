---
id: ADR-0031
status: accepted
canonical: true
last-reviewed: 2026-10-29
---

# ADR-0031 — Birth Center as the single birth authority

**Accepted 2026-10-29; Slice 1 staging-verified at `66da96e`, Slice 2 staging-verified at `6831f3b`. Slice 3 lifecycle Admin unification is committed but requires local validation and redeployment. Count waves remain deferred.** Birth Center owns the full *prospective birth request*. World Kernel alone admits a living Thread, FIN and authoritative history. Thread Presentation owns public projection. Neither the CLI nor Admin authors a separate birth.

**Operator cost boundary (Slice 3):** Admin and CLI both submit directly to
`POST /births`; Admin lists one cursor-paged `GET /births?limit=32`
with at most 33 indexed lifecycle rows touched, details via `GET /births/:id`,
pinned Place via `GET /births/:id/place`, and `resume`/`abandon` actions
on that same request. Only an active visible Admin births view schedules
a poll, no faster than every 30 seconds. GET routes are storage-only and
never wake legacy stale reconciliation or World. Legacy development
records remain unchanged and independently inspectable; they are not
assigned fabricated lifecycle states. The old initiate, preparation,
pending-scans and laptop World cache are retired.

## One request, one lifecycle

Each `requestId` has a durable stage and the evidence behind it:

```text
requested → place_resolved → place_authored? → parents_selected
  → genome_selected → developing → publishing → admitted
  → presented → located → complete
```

`place_authored` runs only if the canonical place and **child's birth decade** have no Place record. Otherwise the request reuses its version. One journaled model call creates **both** the existing civic/World context and the Place Population. There is no second World-context authoring call. Naming traditions are authored separately, only for origin groups actually drawn (ADR-0032).

An interrupted stage retains `failed(retryable | terminal)` with its cause. Resuming keeps the same request, accepted material and model-journal witnesses. `POST /births/:id/abandon` requires a reason:
- **Before `threadId` reservation:** `cancelled`.
- **After reservation, before World admission:** `stillborn(reason)`.
- **After admission:** stop outstanding observation only. The live Thread and its history remain.

No timeout, missing status response or operator absence silently creates a stillbirth.

## Execution and controls

The existing Birth Center alarm advances a small, configured number of due requests. Birth **authoring** steps are idempotent and make **at most one new model call per alarm**; successful calls replay from the durable journal. This cap does **not** apply to `developing`: it is **one lifecycle stage that invokes the existing resumable Genesis development service**. Do not break development into per-call stages or build a general workflow engine. The existing development service owns its internal model calls, retry budgets and journal recovery.

Publication retries and post-publication admission, presentation and location checks use durable due-time backoff. No client polling or forced World scan. A blocked birth cannot block later due births. Stage transitions follow admitted evidence, not a running client process.

**One private API:** `POST /births`, indexed one-row `GET /births/:id`, paginated `GET /births`, `POST /births/:id/resume`, and `POST /births/:id/abandon`. Repeating an identical request is idempotent; changing its authoritative input conflicts. Admin and CLI share stages and actions. `genesis:birth` keeps its flags and output events and gains `--resume` and `--abandon`; `genesis:births` lists requests. The CLI no longer authors World/family material or decides that a newborn is located.

Move CLI selection, birth material and v3 inherited-urge composition into portable Birth Center domain code. Inject GeoNames and model clients. Retire `birth-initiation.mjs`, the five fixture genomes, `/preparation`, CLI-specific stale reconciliation, client polling and the `.fibre/` World cache. **Do not import the cache.** A place is reauthored on its first new-model birth. Never rewrite existing Threads or manufacture historical stages for old requests.

## Cost and acceptance

A model call awaited inside a Durable Object alarm still costs wall time. `developing` may call the model many times; **one stage does not mean one cheap alarm**. Measure alarm duration and billed usage before setting concurrency. Keep transactions closed during network waits. Reuse the journal on interruptions. A dedicated injected runner is a *deferred* option only if actual alarm limits demand one; Birth Center remains the sole birth owner.

`GET /births/:id` reads one indexed request and bounded local evidence, **not** recent lists, World presence or full activity history. `GET /births` is paginated. Measure SQL rows per status read and wake, model calls and D1 activity writes. Place authoring costs **one model call per new place × child-birth-decade**. First-use naming costs one small journaled call per distinct drawn origin group. Genesis development costs its existing calls.

**Evidence required:** CLI and Admin yield one lifecycle; restart does not regenerate committed calls; one stuck birth does not block the next; development resumes as one stage; World admits exactly one Thread; admission, presentation and location remain distinct. Single-request reads invoke neither World nor a model.

## Vision and ambition guard

- **Fidelity and ambition:** real parentage, inherited differences and lived history replace two persona-like authoring paths. World, not Birth Center, owns an independent living person. No preserved Fibre ambition path closes.
- **Deferrals and paths:** live-Thread parents, child-stage cognition, relationships, self-authored decisions and full demographic calibration remain **deferred or experimental**. Extend through World lineage, Genesis history and later Thread cognition; see [human inheritance](../architecture/human-physical-inheritance.md), [lifecycle](../architecture/thread-lifecycle.md), [urges](../architecture/inherited-urges.md) and ADR-0032.
- **Shortcuts and permanence:** bounded concurrency, small batches and alarm scheduling are reversible after measurement. The proposed lasting boundary is **one prospective birth authority**, never authority over admitted life.
- **Alternatives:** two client authoring paths preserve drift; a generic workflow engine adds cost without personhood. Neither is chosen. Engineering convenience must not turn a birth into a job or synthetic parents into live Threads.
- **Causal individuality:** parents, genomes and upbringing can change a newborn's body and opportunities. This is birth-input causality, **not proof** of autonomous divergent decisions.
- **Attention and agency:** Birth Center selects initial circumstances, **not** a Thread's private attention, judgment, feelings or consent. Those remain Thread/World-owned.
- **History and differential evidence:** admitted lineage and childhood records may later affect decisions only when their content is actually consumed. Same-place, different-parent birth tests must prove changed admitted material. The standing **behavioral** Thread differential remains a separate, unproven gate; prompt differences alone do not satisfy it.

## Implementation slices

1. Birth Center authors with today's model; CLI becomes thin. No cache import.
2. Introduce Place records, lazy naming and parent-driven births (ADR-0032).
3. Move Admin to the same API. Show Place records **read-only**. Delete the old path. **Population editing is deferred.**
4. Add bounded `--count` waves.

These slices are authorized but not yet implemented.
