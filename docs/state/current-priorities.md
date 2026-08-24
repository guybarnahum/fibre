---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

This is the engineering execution view. For public/plain-English status, use [`public-progress.md`](public-progress.md) and [`public-progress.json`](public-progress.json).

## PR #39 goal

### Simple English

**Give five new Threads rich, particular childhoods and young-adult histories, let them form memories and meanings from those lives, then birth them with those people, places, memories, lineage and history intact.**

### More accurate description

#39 compiles a sparse but concrete prior life through three authorities: Fibre owns the historical skeleton; model cognition realizes observable episodes; later passes form autobiographical memory and remembered meaning without rewriting history. A successful candidate must retain social/geographic continuity and publish atomically into canonical Thread state. #39 does not itself prove Whole-Person standing; #40 makes this richer life state causally available to normal cognition.

## Where we are now

1. **The historical skeleton is in good shape.** Fibre deterministically chooses fourteen windows through age 21.9999, exact local time, one World place, EventStructure/world-emergent situation and required counterpart before the model writes the episode. This removed the old chooser/realizer collapse that made childhoods repetitive and interchangeable.

2. **The life generator has real social and geographic material to work with.** The five Worlds, genomes and rosters remain the current starting material. The envelope compiler spans multiple places and externally social situations rather than letting the model repeatedly retreat to the easiest household scene.

3. **History, memory and meaning remain separate.** Pass A writes observable life; Pass B decides what is remembered from sparse history; Pass C forms or revises remembered meaning. Pass A and Pass C are genome-blind; genome treatment is limited to the intended Pass-B calls.

4. **People and places have a path through birth.** Genesis derives factual life continuity from the roster and admitted episodes, and birth maps it into canonical `LifeRelation` and `PlaceEpisode` records in the same transaction as the Thread, history, genome lineage, memories and manifest. There is no parallel Genesis biography database.

5. **The latest development run exposed a contract-ergonomics bug, not a life-design failure.** A generated episode correctly received a required frozen counterpart, then redundantly returned that same person in `additionalIntroductions`. Fibre rejected the duplicate and burned two fresh record retries on the same avoidable shape. No Thread candidate completed or published.

6. **The current boundary now normalizes that redundant syntax.** If the model repeats the exact frozen counterpart with the same role, Fibre drops the duplicate and keeps the Fibre-owned introduction once. A conflicting role for the same frozen person still fails. The #39 development check exercises this exact case with zero provider calls.

7. **Pass-A recovery now uses the whole intended mechanical budget.** After two unsuccessful local form repairs, Pass A may request a fresh realization from the exact same Fibre-owned skeleton. The total remains capped at five generated versions: one initial version, at most two form repairs and at most two fresh record retries. Recovery may repair mechanical admissibility; it must not choose a better life.

8. **Development uses two commands.** `npm run genesis:pr39-check` is the zero-provider readiness boundary plus the normal active test/validation suite. `npm run genesis:pr39-dev` generates one current Thread life and prints its fourteen episodes, memories and current meanings. Use `--all` only after one Thread is convincing.

9. **Development output is disposable.** Iterative candidates and durable call journals live under ignored `.fibre/genesis/pr39-dev/`. They are debugging/development state, not repository history and not publication authority.

10. **The next judgment is about the life.** Inspect whether the first Thread is specific, non-interchangeable, socially populated, geographically coherent and capable of producing distinctive memories and meanings. If it is generic, repetitive or contradictory, improve the current compiler and run another development iteration.

11. **After one rich Thread works, run all five and move toward birth.** Inspect cross-Thread differentiation and genome effects, fix genuine #39 defects, then exercise the existing atomic birth path. Freeze one final milestone result only after Fibre has a cohort worth retaining.

## Repository hygiene during #39

Fibre is an active system, not a historical development museum.

- **Active invariants stay active.** Tests that protect current Thread/history/memory/birth semantics remain in the normal suite.
- **Review-state assertions do not block development.** Tests whose only purpose is to prove an old R1/R2 state belong to reproducibility/archive, not the active suite.
- **Old milestone commands are not the product CLI.** The top-level Genesis command surface now points at `genesis:pr39-check` and `genesis:pr39-dev`; prior gate/freeze commands remain only where still needed to understand or migrate current code.
- **Legacy executable versions should disappear unless data compatibility requires them.** Version labels may remain in persisted records or final evidence, but Fibre should have one current implementation for each live behavior.
- **Frozen evidence is secondary.** During development, retain only what helps diagnose a current defect. At milestone close, keep one concise final validation record plus any genuinely unique failure that changed architecture; remove redundant intermediate protocol/review artifacts and dead runners.

A cleanup slice should follow the first successful rich-life development run: identify which `replacement-v1`, R1/R2 authority/preflight, and old G2-G6 files are no longer imported by current Genesis or needed for persisted-data compatibility, then delete them rather than indefinitely maintaining them.

## What comes after #39

- **#40:** canonical bounded consumption of identity/history/memory/relationships into ordinary cognition.
- **#41:** Whole-Person standing.
- Live childhood, live Thread parents raising children, reciprocal families and economy remain later development work.
