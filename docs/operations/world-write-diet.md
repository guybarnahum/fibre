---
id: operations-world-write-diet
status: proposed
last-reviewed: 2026-11-01
canonical: false
---

# World write-diet measurement

The World write-diet test exercises seven fixture Threads in a Tucson reading room over one local waking day, with admitted Flight Plans, lived boundaries, a social act, noticed experiences, social opportunities, a shared ambient consideration, and stubbed consolidation that creates autobiographical memories. Fixture cognition is deterministic; no remote model is called.

Local-only audit triggers observe INSERT, UPDATE and DELETE operations on each ordinary table after installation. This includes existing SQL trigger side effects. The estimate per table is `writes * (1 + PRAGMA index_list count)`. Event-kind and store subtotals are available as `FIBRE-WORLD-WRITE-BUDGET` evidence; the activity map includes per-table operation counts and weights. Audit tables and audit-trigger overhead are excluded. This is **not** Cloudflare's reported bill; it is the approved deterministic attribution model.

The first locally measured fixture baseline is **352 weighted rows across seven Thread-days**, or **50.285714 rows per Thread-day** (November 1, 2026). The harness now enforces that upper bound by default; `FIBRE_WORLD_WRITE_BUDGET` can impose a stricter temporary budget, and the checked-in baseline should ratchet downward after validated storage-only improvements. Baseline by store: LivedNow 189, LivedExperience 123, Memory 16, Other 24. This is not an estimate of staging account totals, which include other Durable Objects and different workloads. Existing behavioral/semantic tests remain independent release gates.

The audit must precede index drops, derived-table de-maintenance or stage-row changes. An index is eligible for removal only after `EXPLAIN QUERY PLAN` for every prepared statement in each relevant hot store demonstrates that it is unused, including exceptional and historical-reader paths. Keep `current_situation_frontier` until an equally indexed venue co-presence lookup is demonstrated. Historical records must not be rewritten merely to save quota.

## Staging boundary calibration (November 2)

Staging evidence from 01:09–03:03 UTC: 155 lived-boundary advances incurred about 1,848 LivedNow rows and 879 SemanticState rows, or **17.6 rows per boundary** (11.9 lived + 5.7 semantic). The first isolated harness counted 168 rows for 14 direct situation enactments (**12.0 per boundary**) because it bypassed the LivedNow service's semantic regulation.

The additional `FIBRE-WORLD-BOUNDARY-UNIT` fixture now measures actual transit-to-arrival enactment via `createLivedBoundaryProcess`, `createLivedNowService`, and `openSemanticStateStore`. It includes the durable due frontier's re-arm and settlement, semantic-record and current-head triggers, checks independent state per person, and proves retry produces no further writes. It uses stubbed deterministic cognition and no remote calls. The arrival-unit total is expected to be near the staging 17.6; **its first measured value is pending operator execution**. Horizon-renewal costs are separate from arrival-boundary costs and must not be silently pooled into the 17.6 comparison.

`FIBRE-WORLD-BOUNDARY-QUERY-PLANS` reports installed indexes and nine `EXPLAIN QUERY PLAN` checks for historical, present, venue-presence, due-queue, and semantic-state lookups. This is **targeted evidence only**, not yet an exhaustive audit of every prepared statement or a license to drop an index. The historical thread-time index, global-recent index, and indexed current frontier protect distinct reads.

No indexes or triggers may be dropped until the remaining read paths and their plans have been audited and the before/after rows-per-boundary have actually been measured.

## Reconciliation write map (staging calibration, November 2)

Staging: **184 reconciliation alarms, 01:09–05:30 UTC**. The World Durable Object accounted for **96% of account writes**, attributed to those alarms. Per-alarm stage-count fitting against `world-state-cost` had **R² = 0.94**. These are **external observations**, not local write-audit results or exact per-statement Cloudflare bills.

| Activity | Fitted weighted rows per unit | Share of World writes |
| --- | ---: | ---: |
| Lived boundary | ~14 | 36% |
| Contact outreach (afterthought → attempt → message → complete) | ~49 | Included in contact total |
| Contact reception | ~10 | Included in contact total |
| Recipient noticing | ~32 | Contact stages together: 24% |
| Social opportunity decision | ~35 | 21% |
| Experience consolidation | ~27 | 10% |
| Fixed work per alarm | ~3 | 7% |
| Environmental change noticed | ~19 | 1% |

The enhanced day harness measures these paths with real World stores and processes. It reports `FIBRE-WORLD-WRITE-MAP` with **weighted rows per activity**, `INSERT`/`UPDATE`/`DELETE` counts, per-table index weights and comparisons with staging. Recipient reception claim and the recipient's independently formed noticing are separately measured (**10** and **32** staging rows per unit). The real reception process completes and settles the previously claimed addressed message. Local values differing by more than **30%** are listed in its `deviations` field. **No local post-change measurement has been supplied yet**, so the list of confirmed deviations remains pending operator validation, not implicitly empty.

The companion `FIBRE-WORLD-INDEX-READERS` inventory reports each installed World secondary index, the *statically plannable* readers observed to use it, and indexes with no reader found. It covers all World tables (therefore every map-written table), but dynamic SQL and queries that cannot be planned are explicitly reported. **“None in audited SQL” is not evidence an index is unused**; no index removal is authorized in this slice.

## Storage-only reductions pending staging validation

- The original local **arrival boundary is 19 weighted writes**, versus staging's **17.6**; the difference is expected from fixture/regulation mix, not a storage saving.
- **Index audit:** 26 named query-plan probes cover the historical, current, public-venue, Genesis, observatory, integrity, reconciliation and semantic readers. `idx_current_situations_place` has no consumer among them and is dropped during schema installation. `idx_current_frontier_recent` is required by recent-current-situation queries; `idx_semantic_state_thread_current` serves semantic history and indexed current-state reads. These two remain. The SQL audit also lists source files referring to the hot tables so changes outside World are not silently ignored.
- **Small hot frontiers:** `current_situation_frontier` and `lived_now_next_boundaries` convert to `WITHOUT ROWID` only during schema installation. Their copy count is measured and bounded by the existing number of Threads (at most one row per Thread per table). Each table migration is atomic; existing historical situation and semantic-state records are never copied or rewritten. Schema confirmation reports the copy counts; a subsequent unchanged schema installation copies zero rows.
- **Semantic current-state:** The live reader uses the compact `semantic_state_current_heads` projection, keyed by `(thread_id,state_id)` as `STRICT, WITHOUT ROWID`. An insert trigger replaces superseded heads while retaining immutable records and their witnesses. Explicit schema installation repairs missing or legacy heads from lineage once and reports the number copied. Semantic history, staleness, state IDs and cognition remain unchanged.
- **Deferred conversion:** `current_situation_records` and `semantic_state_records` remain ordinary rowid tables. Their conversion would copy **all historical rows**, plus rebuild their indexes; no such migration is justified by the available quota evidence. Determine the one-time cost from a live count and index inventory before reconsidering them.

Each commit changes the accounting model, not the Thread event stream. The first post-change local `FIBRE-WORLD-BOUNDARY-UNIT` and `FIBRE-WORLD-WRITE-BUDGET` reports are still required before assigning any actual after-value or lowering the enforced budgets.

World schema migrations follow the InfraDriver.state portable-schema rule (create/copy/drop).

## Bounded current-state reads

A write saving must never introduce a hot-path read whose cost grows with a Thread's lived history. Current semantic-state queries are bounded by the number of current states, not the number of historical state records; immutable lineage scans belong only in explicit history reads or one-time operator migrations. This keeps the account-wide read quota viable as Threads age.

## Enforced post-change cost ceilings

The provisional storage-only cost ceilings are **15 weighted rows per arrival boundary** and **310/7 rows per Thread-day** for the original fixture. The compact current-head trigger restores one primary-key write per new semantic record, replacing the former multi-index projection. These ceilings are *not* post-change measurements. Tests enforce the ceilings on every run. To print actual cost breakdowns and query-plan evidence, run with `FIBRE_TEST_EVIDENCE=1`; ratchet to Guy's measured values after local validation. Preserve 17.6 as independent pre-change staging evidence.
