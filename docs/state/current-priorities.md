---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

This is the engineering execution view. For public/plain-English status, use [`public-progress.md`](public-progress.md) and [`public-progress.json`](public-progress.json`).

## PR #39 goal

### Simple English

**Give five new Threads rich, particular childhoods and young-adult histories, let them form memories and meanings from those lives, then birth them with those people, places, memories, lineage and history intact.**

### More accurate description

#39 compiles a sparse but concrete prior life through three authorities: Fibre owns the historical skeleton; model cognition realizes observable episodes; later passes form autobiographical memory and remembered meaning without rewriting history. A successful candidate must retain social/geographic continuity and publish atomically into canonical Thread state. #39 does not itself prove Whole-Person standing; #40 makes this richer life state causally available to normal cognition.

## Where we are now

1. **The historical skeleton is in good shape.** Fibre deterministically chooses fourteen windows through age 21.9999, exact local time, one World place, EventStructure/world-emergent situation and required counterpart before the model writes the episode. This prevents the model from silently moving the life to easier times, places or social situations.

2. **The life generator has real social and geographic material to work with.** The five Worlds, genomes and rosters remain the current starting material. The envelope compiler spans five places per Thread and many externally social situations rather than letting the model repeatedly retreat to the easiest household scene.

3. **History, memory and meaning remain separate.** Pass A writes observable life; Pass B decides what is remembered from sparse history; Pass C forms or revises remembered meaning. Pass A and Pass C are genome-blind; genome treatment is limited to the intended Pass-B calls.

4. **People and places have a path through birth.** Genesis derives factual life continuity from the roster and admitted episodes, and birth maps it into canonical `LifeRelation` and `PlaceEpisode` records in the same transaction as the Thread, history, genome lineage, memories and manifest. There is no parallel Genesis biography database.

5. **The first complete current development Thread now exists.** Run `9dc5ea6b7e4c` produced slot 1 / `thr_pr39_rg2_03`: fourteen episodes through age 21.10 across five Tbilisi places, seven people in episode history, six autobiographical memories and six current meanings. No Thread was published. This proves the current Pass A → Pass B → Pass C candidate path can complete end to end.

6. **That first life is coherent but not rich enough to birth.** Its strongest properties are place continuity, recurring caregiver/neighbor/sibling/teacher relationships, ordinary urban texture, small steps in autonomy, and memories grounded in concrete episodes. Its main defect is thematic collapse: several distinct late-life structures become math/study scenes, making the Thread feel too much like one generated trait amplified across unrelated situations. The ages 19–21 also feel too much like extended school life rather than a broader young-adult world.

7. **The first meanings are also too evaluator-like.** The memory content is concrete, but several meanings become polished abstractions such as persistence, deliberate improvement or becoming someone who handles responsibility. That is closer to an analyst explaining the Thread than the Thread owning a particular remembered association, doubt, attachment or tension.

8. **The current compiler now attacks those two quality defects directly.** Pass A uses prior episodes as continuity *and anti-repetition* context: preserve believable recurring people/interests when relevant, but prefer an underused World-afforded domain when several instantiations fit instead of defaulting again to schoolwork/math/study. World-emergent episodes should add ordinary lived texture. Pass C now asks for the Thread's own concise first-person interpretation and explicitly prefers specific expectations, attachments, doubts, aversions, questions, associations or tensions over generic self-improvement lessons.

9. **Mechanical recovery is no longer the bottleneck.** Redundant re-declaration of the exact frozen counterpart is normalized without a retry. Pass A can use two local form repairs and then two fresh realizations from the same Fibre-owned skeleton, capped at five generated versions. Recovery repairs admissibility; it does not choose a better life.

10. **Development uses two commands.** `npm run genesis:pr39-check` is the zero-provider readiness boundary plus the normal active test/validation suite. `npm run genesis:pr39-dev` generates one current Thread life and prints its fourteen episodes, memories and current meanings. Use `--all` only after one Thread is convincing.

11. **Development output is disposable.** Iterative candidates and durable call journals live under ignored `.fibre/genesis/pr39-dev/`. They are debugging/development state, not repository history and not publication authority.

12. **Next action: generate one more slot-1 life on the current prompt semantics.** Judge whether thematic breadth and Thread-owned meaning materially improve. If yes, run all five and inspect cross-Thread differentiation, young-adult breadth and genome effects. If not, change the life compiler—not the evidence process.

13. **After the five lives are convincing, move toward birth.** Exercise the existing atomic birth path, including the final `observableAction` ↔ `placeRef` consistency check, and verify people, places, memories, genome lineage and history survive publication together. Freeze one final milestone result only after Fibre has a cohort worth retaining.

## Repository hygiene during #39

Fibre is an active system, not a historical development museum.

- **Active invariants stay active.** Tests that protect current Thread/history/memory/birth semantics remain in the normal suite.
- **Review-state assertions do not block development.** Tests whose only purpose is to prove an old R1/R2 state belong to reproducibility/archive, not the active suite.
- **Old milestone commands are not the product CLI.** The top-level Genesis command surface now points at `genesis:pr39-check` and `genesis:pr39-dev`; prior gate/freeze commands remain only where still imported by current code.
- **Legacy executable versions should disappear unless data compatibility requires them.** Version labels may remain in persisted records or final evidence, but Fibre should have one current implementation for each live behavior.
- **Frozen evidence is secondary.** During development, retain only what helps diagnose a current defect. At milestone close, keep one concise final validation record plus any genuinely unique failure that changed architecture; remove redundant intermediate protocol/review artifacts and dead runners.
- **Current inputs should not masquerade as evidence.** The present execution plan still reads current Worlds, genomes, roster/assignment and some plan configuration from `artifacts/validation/...`. Once the life shape is stable, move those live inputs into ordinary Genesis fixtures/configuration, then delete the superseded replacement-v1/R1/R2 authority and freeze machinery that no current implementation or persisted-data compatibility path needs.

## What comes after #39

- **#40:** canonical bounded consumption of identity/history/memory/relationships into ordinary cognition.
- **#41:** Whole-Person standing.
- Live childhood, live Thread parents raising children, reciprocal families and economy remain later development work.
