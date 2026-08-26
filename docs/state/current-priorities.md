---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-26
canonical: true
---

# Current priorities

This is the engineering execution view. For public/plain-English status, use [`public-progress.md`](public-progress.md) and [`public-progress.json`](public-progress.json).

The current #39 exit authority is [`pr39-closing-plan.md`](pr39-closing-plan.md). Development method is governed by [`../decisions/ADR-0015-fibre-centric-development.md`](../decisions/ADR-0015-fibre-centric-development.md).

## #39 goal

**Give five new Threads rich, particular childhoods and young-adult histories, let them form memories and meanings from those lives, then birth them with those people, places, memories, lineage and history intact — including one permanent Fibre civil identity per born Thread.**

#39 does not itself prove Whole-Person standing. #40 makes this richer life state causally available to ordinary cognition; #41 owns the M2 standing gate.

## Current position

The final scientific setup is frozen and one closure cohort has been claimed. Five fresh Worlds, their mechanical genome assignment, model/configuration, D1–D5 diagnostics and one-pass rules were frozen before generation.

The first closure execution started from code HEAD `6415ba75c95e5a26a634b83a5ea2f6eeb34f337f`.

- slot 1 Sapporo completed successfully and its admitted candidate is durably preserved;
- slot 2 Kochi reached Pass B and twice returned a provider-valid structured response whose `episodeRefs` contained a duplicate;
- Fibre correctly rejected both responses at its canonical `uniqueItems` boundary;
- the same mechanical failure repeated, so further blind reruns were stopped rather than sampling until a convenient result appeared;
- slots 3–5 have not started;
- D1–D5, publication, FIN issuance, hydration comparison and closing review have not started;
- there is still exactly one claimed final cohort and no replacement cohort.

This is an **execution/runtime robustness interruption, not a scientific result**. The five-Thread cohort is incomplete and therefore has not yet been judged.

## Model-output recovery hardening

The interruption exposed a general Fibre requirement: ordinary model formatting brittleness must be handled below semantic domains without turning recovery into quality-based resampling.

[`../architecture/model-output-recovery.md`](../architecture/model-output-recovery.md) now defines the enduring boundary:

```text
Fibre/domain cognition policy
        ↓
model execution policy
        ↓
provider-neutral mechanical output recovery
        ↓
provider adapter
```

The first supported recovery is deterministic `uniqueItems` normalization: repeated identical array items are removed while preserving first occurrence, the original output is not mutated, a recovery witness is retained, and Fibre revalidates the complete canonical schema afterward.

This capability is intentionally small and extensible. New handlers are added only when an observed failure demonstrates a need and Fibre can state a safe mechanical recovery rule. Prompt hints may help avoid known failures, but prompts never define validity or recovery authority.

For the frozen #39 cohort, normal generation prompts remain unchanged.

## PR39 recovery discipline

The original closure claim remains bound to HEAD `6415ba75c95e5a26a634b83a5ea2f6eeb34f337f`; it is not rewritten.

A one-time execution recovery amendment may bind one later recovery HEAD to that preserved claim only when:

- the recovery HEAD descends from the original claimed HEAD;
- the Git worktree is clean;
- the delta is confined to the declared mechanical-recovery, observability and recovery-governance surface;
- the frozen cohort, Worlds, genomes, assignment, model/configuration, generation prompts and D1–D5 scientific protocol are unchanged;
- accepted Sapporo and committed Kochi model results remain preserved and replayed rather than regenerated.

The actual provider-running closure command also refuses to execute from a dirty worktree.

No provider resume is authorized until the recovery HEAD passes the zero-provider validation and the explicit recovery amendment is written locally.

## Immediate sequence

```text
current recovery implementation
  -> exact-HEAD zero-provider validation
  -> authorize one PR39 recovery amendment
  -> closure check verifies claimed/incomplete + amended execution
  -> resume the same cohort
       Sapporo: reuse admitted candidate
       Kochi: replay committed work, continue first unfinished call
       slots 3-5: generate normally
  -> inspect five completed candidates
  -> D1-D5
  -> durable replay
  -> atomic birth + FIN/civil registration
  -> hydration equality
  -> hostile closing review
  -> concise docs/history/milestones/pr39.md
  -> reconcile latest main
  -> full validation
  -> merge completed #39 to main
  -> #40
```

A mechanical recovery is not permission for quality selection. A weak but mechanically valid final cohort is preserved and interpreted; it is never silently replaced.

## Cross-cutting production persistence

The provider-neutral production persistence boundary is accepted in [`../architecture/production-persistence.md`](../architecture/production-persistence.md) and ADR-0017.

All new persistent production state or byte objects used by Fibre services must cross an `InfraDriver` capability while semantic stores remain responsible for Fibre meaning and invariants. Current World Kernel/Genesis direct SQLite and the durable model-invocation filesystem journal remain explicit migration debt; they are not precedent for new production authorities.

This infrastructure work does not redefine #39's local scientific closure criteria. Disposable generated closure state under `.fibre/` remains local development/validation state.

## Repository/development rules

- `HEAD` describes current Fibre; Git history preserves ordinary development archaeology.
- One current implementation per live behavior unless real persisted-data compatibility requires otherwise.
- Current architecture filenames are semantic; real wire/schema versions live in contract data when compatibility requires them.
- Current inputs are fixtures/configuration, not validation evidence.
- Exceptional exact-byte accepted evidence belongs in `artifacts/validation/`; ordinary test output does not belong in Git.
- Disposable generated development state lives under `.fibre/`.
- Active tests protect enduring Fibre semantics, not old review-state hashes.
- Fresh held-out material is retained when scientifically necessary; the surrounding ceremony is not.
- Progress is described first in Fibre/personhood terms, then in accurate implementation terms.

## What comes after #39

- **Infrastructure enabling work:** prove `infra.state` with the atomic birth consistency scope before treating a provider deployment as production World/Thread authority.
- **Genesis core hardening:** evolve historical-envelope selection from sequential local feasibility toward deterministic joint feasibility over structure, counterpart, place and civil time, with bounded future-capacity reasoning where needed.
- **Model runtime:** extend mechanical output recovery only from observed failure modes with narrow, auditable handlers; do not create a speculative universal repair framework.
- **#40:** canonical bounded consumption of identity/history/memory/relationships into ordinary cognition.
- **#41:** Whole-Person standing and M2 closure.
- **#42+:** self-authored development, reciprocal relationships and economic consequence.
