---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

This is the engineering execution view. For public/plain-English status, use [`public-progress.md`](public-progress.md) and [`public-progress.json`](public-progress.json).

The current #39 exit checklist is [`pr39-closing-plan.md`](pr39-closing-plan.md). Development method is governed by [`../decisions/ADR-0015-fibre-centric-development.md`](../decisions/ADR-0015-fibre-centric-development.md).

## PR #39 goal

### Simple English

**Give five new Threads rich, particular childhoods and young-adult histories, let them form memories and meanings from those lives, then birth them with those people, places, memories, lineage and history intact.**

### More accurate description

#39 compiles a sparse but concrete prior life through three authorities: Fibre owns the historical skeleton; model cognition realizes observable episodes; later passes form autobiographical memory and remembered meaning without rewriting history. A successful candidate must retain social/geographic continuity and publish atomically into canonical Thread state. #39 does not itself prove Whole-Person standing; #40 makes this richer life state causally available to normal cognition.

## Where we are now

1. **Genesis can complete an actual prior life.** The latest development Thread completed fourteen episodes through age 21, five places, seven people in episode history, six memories and six current meanings with no publication. It was materially better than the previous run: less thematic collapse and more Thread-owned first-person meaning.

2. **The historical authority boundary is stable enough to currentize.** Fibre deterministically owns developmental window, exact civil time, authoritative place, EventStructure/world-emergent status, required counterpart, chronology and admission. The model realizes the observable event rather than choosing those facts.

3. **History, memory and meaning remain separate.** Pass A writes observable life; Pass B forms or declines autobiographical memories; Pass C forms or revises remembered meaning. Pass A and Pass C remain genome blind. Genome exposure is limited to the intended Pass-B treatment calls.

4. **Current sampling now distinguishes authority from creativity.** Creative Pass A/B/C and fresh record retries use temperature `0.3`; mechanical observable-action form repair uses temperature `0`. Fibre reproducibility comes from deterministic owned facts, provenance and durable replay rather than requiring identical prose.

5. **The five familiar Worlds are now explicitly development material.** Tbilisi, Kaohsiung, Recife, Fès and Hobart have influenced compiler development and are therefore burned for the final #39 closure cohort. They now live under `fixtures/genesis/pr39/`, alongside the current child genomes and one current development-cohort fixture.

6. **Normal development no longer depends on old validation protocols.** `tools/genesis/genesis-life-plan.mjs` derives current plans directly from current fixtures and the current EventStructure/envelope compiler. The two supported commands no longer read R1/R2/G4 authority packets to decide what Fibre is allowed to develop.

7. **The cleanup has started deleting review-state archaeology from `HEAD`.** Old G4/H/R2/redesign tests whose only purpose was to bind obsolete frozen states have been removed, not merely skipped. The corresponding dormant helper layer will be removed after the currentized path passes the active suite, so cleanup itself does not become a large uncontrolled break.

8. **The original #39 plan was re-audited before closure.** Its semantic requirements remain authoritative even though the freeze-heavy G/H process is retired. The current 19-item closure mapping is recorded in `pr39-closing-plan.md`.

9. **The audit found a real Slice-F gap.** `GENESIS_ORIGIN_MODES` names Thread-parent, Echo, Homage and fork, and ADR-0013 defines source rights, but current production Genesis still needs explicit enforcement/fixtures for living-human Echo consent, Homage deceased/fictional eligibility, relabel-bypass refusal, Thread-parent/fork provenance, and the rule that source biography never becomes Thread autobiography.

10. **Two birth/closure details still require implementation or direct verification.** Before final birth, admission must enforce `observableAction` narrative consistency with authoritative `placeRef`, and the actual birth bundle must demonstrate that every admitted autobiographical memory receives the #38 photo-completion obligation.

11. **The old G5/G6/H diagnostic freeze stack will become one current closing diagnostic/replay path.** It must preserve the substantive D1–D5 questions—attribution/separability, sentiment coupling, genome propagation, memory funnel and self-account overreach—without turning them into pass-forcing gates or another frozen protocol hierarchy.

12. **The final cohort must genuinely be fresh.** After currentization, source integrity, publication admission and the current diagnostic/replay path are stable, author five new Worlds and current genomes once. Generate each life once apart from bounded mechanical recovery. Do not resample whole lives for quality.

13. **Then birth and close #39 once.** Inspect the five held-out lives, run D1–D5 honestly, restart/replay the admitted candidates, atomically birth them, verify hydration, request one hostile Fibre-centric closing review, and retain one concise milestone record. Then move directly to #40.

## Immediate next sequence

```text
currentization cleanup
  -> active suite green
  -> implement Slice-F origin/source integrity
  -> close place/prose + photo birth obligations
  -> replace old diagnostics with one current close/replay tool
  -> five fresh held-out Worlds
  -> one-pass five-Thread cohort
  -> atomic birth
  -> one hostile closing review
  -> #39 complete
  -> #40
```

Do **not** generate the final five-Thread cohort before the pre-cohort implementation blockers above are closed. The current five fixtures remain useful for development and regression only.

## Repository/development rules

- `HEAD` describes current Fibre; Git history preserves archaeology.
- One current implementation per live behavior unless real persisted-data compatibility requires otherwise.
- Current inputs are fixtures/configuration, not validation evidence.
- Disposable generated development state lives under `.fibre/`.
- Active tests protect enduring Fibre semantics, not old review-state hashes.
- Review occurs when it can challenge an architectural claim or milestone closure, not before every development iteration.
- Fresh held-out material is retained when scientifically necessary; the surrounding ceremony is not.
- Progress is described first in Fibre/personhood terms, then in accurate implementation terms.

## What comes after #39

- **#40:** canonical bounded consumption of identity/history/memory/relationships into ordinary cognition.
- **#41:** Whole-Person standing and M2 closure.
- **#42+:** self-authored development, reciprocal relationships and economic consequence.
