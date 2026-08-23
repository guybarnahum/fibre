---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

For the plain-English public view of what Fibre has and has not achieved, use [`public-progress.md`](public-progress.md) and the canonical machine-readable [`public-progress.json`](public-progress.json). This file is the engineering execution view.

1. **Replacement-v1 attempt 1 is a preserved REDESIGN witness, not a resumable experiment.** It legitimately started under Gate-G(2) round-4 CLEAR, durably committed ten slot-1 Pass-A calls, then terminated before the first Pass-B model response. The ten generated Pass-A outputs are burned experimental evidence and may not be reused in replacement-v2.

2. **Same-attempt mechanical recovery and undeployed legacy execution stacks are retired.** Preserve the local failed-attempt evidence under `artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/` and the older `artifacts/validation/m2-pr39/h/recovery-v1/` exactly as evidence. Do not restore retired H2/replacement-v1 runtimes merely for byte-level backward compatibility.

3. **Replacement-v2 R1 is CLOSED/CLEAR.** Corrected implementation candidate `ef9a1bf399280dc3f33a73490f91d3e63c3198d0`; reviewed head `6fd360b7290e1256b2e63248c872a67ffafda190`; canonical result `docs/validation/m2-pr39-replacement-v2-r1-rereview-result.md`. The hostile re-review found B1-B8 closed without retuning coverage bounds or changing Worlds/genomes/assignment.

4. **Current engineering stage is R2 hostile execution review.** Bound R2 execution candidate: `2d58d4d21b11f0e506d86315728a314de5832a04`. Locally verified head before review docs: `73ce064acdafc08b9c72c40e82190bc904768beb`. Review request: `docs/validation/m2-pr39-replacement-v2-r2-review-request.md`.

5. **The locally verified R2 boundary is green and zero-call.** `genesis:replacement-r2-preflight` returned `CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL`; tests were `714/714`; repository/world validation passed; five R1 envelope digests were unchanged; only the two preserved evidence directories were untracked; zero provider calls were made and no replacement-v2 life artifacts were written.

6. **R2 execution binding is cognition-closed.** Binding digest: `sha256:d16f6d4651ede59b442cb83939f7c3e13b3354432c0a1a4cb8a2fe1ba42c3149`. R2 CLEAR witness is absent. Provider calls, candidate generation, diagnostics and publication remain unauthorized.

7. **No model/provider call before hostile R2 CLEAR.** The runner verifies R2 authority with `requireClear:true` before adapter construction. A future CLEAR witness must match the reviewed candidate head and binding digest and may authorize only provider calls + one candidate-generation attempt; it must keep publication unauthorized.

8. **Pass A has one current compiler.** Development code is flattened: the current rich-life compiler consumes EventStructurePool-v3 directly. Protocol-only window metadata such as `ordinal` is projected away before the Pass-A boundary. Pass A remains genome-blind.

9. **Historical skeleton remains Fibre-owned.** The model realizes only the four allowed realization fields; Fibre stamps episode identity, occurrence time, age, place, structure selection, required counterpart identity and introduction timing from the reviewed deterministic envelope.

10. **Pass-A reliability remains the preregistered independent budget.** One initial generated version, up to two form repairs, up to two record retries, maximum five generated versions. Local malformed output must consume the correct budget; retry input digests must identify the actual request.

11. **Sparse-history Pass B is current R2 authority.** Horizons are `[4,6,8,10,12,14]`; modes are `L L T L L T`; treated ordinals remain 3 and 6. Every Pass-B generation path, including mechanical genome-copy retry, must carry the sparse-history notice. Genome exposure is allowed only on treated Pass-B calls.

12. **Pass C remains memory-scoped and genome-blind.** Initial remembered meaning and scheduled reinterpretation may alter remembered meaning only; they may not rewrite admitted life history or Memory evidence.

13. **N1 is mechanically closed at R2 diagnostic authority.** The reconciliation artifact must bind primary ordinals 3/6, primary horizons 8/14, both treated ordinals at least 4/5 correct core edges and at least one 5/5. A 3/4 mutation or contradictory statement must fail closed.

14. **Canonical situated-life authority owns durable continuity.** The temporary `genesis_life_continuity` table was removed after the permanent no-parallel-biography invariant caught it. Genesis now maps the neutral continuity derivation into canonical `life_relation_records` and `place_episode_records` inside the birth transaction. There is no second Genesis-owned biography/place/relation store.

15. **Situated social facts are factual, not meaning.** Ordinary non-kin/mentor/vendor/etc. continuity may use generic `social_contact` relations with `factualRoleRefs` plus frozen `relationshipFacts`; sibling and other stronger canonical relation kinds may be used when justified. Initial-roster facts cite the canonical seed event; introduced people and places cite admitted historical life-event witnesses.

16. **Atomic birth includes situated life.** Thread, seed/life events, canonical situated-life rows, symbolic-genome lineage relations, autobiographical memories and Genesis manifest commit or roll back together. Situated continuity itself does not increment Thread version.

17. **Candidate generation is separate from publication.** The R2 runner produces/fixes candidate evidence only and does not publish Threads. A completed candidate must still pass the replacement-effective G5/G6 diagnostics/admission boundary before any birth publication can occur.

18. **Durable invocation replay is part of R2 review.** A process restart may replay a durably committed model response without another provider call; restart must never reset scientific retry budgets, create a second candidate attempt, overwrite committed output, or become quality-driven regeneration.

19. **The one-shot rule remains unchanged.** One whole candidate attempt; no quality-driven regeneration; terminal generation failure closes the attempt; no provider/model substitution. Do not tune Worlds, genomes, assignment, envelope bounds or D3 threshold from generated outcomes.

20. **Starting-material reuse remains narrow.** The five byte-unchanged Worlds/genomes, assignment and fresh G2 results are reusable only as pre-life starting material. Replacement-v2 may not read/reuse replacement-v1 generated life, H-v2 generated life, failed recovery content, old candidate memories or meanings.

21. **Development code stays flattened.** Frozen artifacts may retain version labels because they identify evidence. Parallel executable versions require a real persisted-data/API/migration boundary; no deployed Fibre population currently creates such a legacy requirement.

22. **Test lifecycle best-practice is active.** Keep permanent invariants and meaningful exploit regressions; milestone-scoped tests stay active while their milestone is open but carry explicit delete/consolidate/promotion disposition at milestone close.

23. **Next action: Claude hostile R2 execution review.** Review the exact request in `docs/validation/m2-pr39-replacement-v2-r2-review-request.md`, with zero provider calls. Attack authority/witness forgery, transitive source binding, runtime overrides, restart/retry semantics, sparse-history/genome boundaries, N1, canonical situated-life publication/rollback, candidate completeness and every publication/regeneration shortcut.

24. **If R2 returns HOLD/REDESIGN, correct narrowly and rerun the complete local zero-call boundary. If R2 returns CLEAR, record a digest-bound CLEAR witness before exposing any generation command.** The CLEAR may authorize one fresh candidate-generation attempt only; publication remains closed.

25. **Experience-presentation seeds remain a separate architecture item.** Preferred rule: derive domain-separated presentation seeds from the canonical Experience or Memory identity/digest; presentation may control how authoritative evidence is rendered but never what occurred or what the experience means.

26. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 itself earns no Whole-Person score movement.
