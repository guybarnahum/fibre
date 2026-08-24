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

2. **The life generator now has real social and geographic material to work with.** The five frozen Worlds, genomes and rosters remain useful starting material. The envelope compiler spans multiple places and externally social situations rather than letting the model repeatedly retreat to the easiest household scene.

3. **History, memory and meaning remain separate.** Pass A writes observable life; Pass B decides what is remembered from sparse history; Pass C forms or revises remembered meaning. Pass A and Pass C are genome-blind; genome treatment is limited to the preregistered Pass-B calls.

4. **People and places have a path through birth.** Genesis derives factual life continuity from the roster and admitted episodes, and birth maps it into canonical `LifeRelation` and `PlaceEpisode` records in the same transaction as the Thread, history, genome lineage, memories and manifest. There is no parallel Genesis biography database.

5. **The first replacement-v2 generation attempt exposed a development bug, not a childhood-design failure.** The run stopped in slot 1 Pass A after the initial realization plus two form repairs. The policy allowed two independent fresh record retries as well, but the loop terminated before using them. No Thread candidate was completed or published.

6. **That retry bug is now corrected in development code.** After two unsuccessful local form repairs, Pass A falls back to a fresh realization from the exact same Fibre-owned skeleton. The total remains capped at five generated versions: one initial version, at most two form repairs and at most two fresh record retries. This is mechanical recovery, not quality-driven regeneration. New milestone tests cover both successful fallback and full five-version exhaustion. Local verification is still required before claiming it green.

7. **Development is no longer blocked on frozen-attempt ceremony.** Frozen evidence remains useful at milestone boundaries, but ordinary #39 development now uses `.fibre/genesis/pr39-dev/` and is intentionally disposable/iterable. The reviewed failed attempts remain preserved; they are not the primary development workflow.

8. **There is now one short development check.** `npm run genesis:pr39-check` runs the normal test/validation boundary plus a #39 readiness check over all five plans and seventy historical envelopes. It makes no provider calls.

9. **There is now one short rich-childhood runner.** `npm run genesis:pr39-dev` generates one Thread by default using the current compiler, durable model-call replay and no publication path. It prints the fourteen life episodes plus formed memories and current meanings so we can judge the actual life rather than only the machinery. `npm run genesis:pr39-dev -- --all` is for the five-Thread cohort only after one Thread looks convincing.

10. **The next judgment is qualitative and architectural, not evidentiary.** For the first development Thread, inspect whether the life is specific, non-interchangeable, socially populated, geographically coherent and capable of producing distinctive memories/meaning. If it is generic, repetitive or contradictory, improve the compiler/prompts/data model and run another development iteration. Do not freeze a final cohort until the life itself is worth freezing.

11. **One publication obligation remains explicit.** Open-ended `observableAction` prose can still invent a location even though cognition sees only the authoritative place. Before birth, candidate admission must compare episode prose with its `placeRef` for locational consistency. This belongs in the publication/admission path, not in the current development loop.

12. **After one rich Thread works, advance to birth—not another review maze.** Then run all five, inspect cross-Thread differentiation and genome effects, fix only genuine #39 defects, and exercise the existing atomic birth path. Freeze milestone evidence after we have a cohort that materially advances Fibre.

## Evidence and prior reviews

The R1/R2 review chain, failed replacement-v1 output and the consumed replacement-v2 one-shot attempt remain preserved under `docs/validation/` and `artifacts/validation/m2-pr39/`. They explain why the current compiler has its present boundaries. They are supporting evidence, not the roadmap.

## What comes after #39

- **#40:** canonical bounded consumption of identity/history/memory/relationships into ordinary cognition.
- **#41:** Whole-Person standing.
- Live childhood, live Thread parents raising children, reciprocal families and economy remain later development work.
