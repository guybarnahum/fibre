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

4. **Replacement-v2 R2 hostile review returned HOLD, not REDESIGN.** Reviewed execution candidate `2d58d4d21b11f0e506d86315728a314de5832a04`; reviewed head `c5f545fed02db16439d02b8edc19f643ecfda607`; reviewed binding digest `sha256:d16f6d4651ede59b442cb83939f7c3e13b3354432c0a1a4cb8a2fe1ba42c3149`. Canonical result: `docs/validation/m2-pr39-replacement-v2-r2-review-result.md`.

5. **The R2 HOLD is local and correctable without changing the experiment.** B1-B4 exposed working-tree source attestation, self-referential sparse-history authority, self-referential Pass-B schedule binding, and a missing load-bearing Pass-A place constraint. The correction also closes review items N2/N3 and promotes N6 because compiler-position leakage, retry-budget mischarging, and a deletable one-shot boundary can change the truth of the generated cohort.

6. **Corrected R2 execution candidate is `ad7044d57ef6360295d6e26bca4338684eb394d3`.** The correction changes execution machinery and milestone regressions only. Worlds, genomes, assignment, historical envelopes, coverage bounds, provider/model/runtime, and D3 threshold are unchanged.

7. **Corrected R2 binding is re-frozen but not yet locally verified.** Binding head `a0441bd3d56c789b0a50e9e3377229ab9165d7e0`; canonical binding digest `sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159`. R2 CLEAR witness remains absent. Re-binding is not cognition authority.

8. **No model/provider call before corrected hostile R2 CLEAR.** The runner verifies R2 authority with `requireClear:true` and now also checks the durable one-shot boundary before adapter construction. A future CLEAR witness must match the corrected reviewed candidate head and binding digest and may authorize only provider calls + one candidate-generation attempt; it must keep publication unauthorized.

9. **Pass A has one current compiler and one situated episode.** Development code remains flattened on EventStructurePool-v3. Protocol/compiler `ordinal` is absent from both the developmental-window projection and the frozen cognition envelope. Candidate construction now uses `constrainPassAContextToHistoricalEnvelope()` so the model sees exactly the frozen place and instant that Fibre will later stamp and publish. Pass A remains genome-blind.

10. **Historical skeleton remains Fibre-owned.** The model realizes only the four allowed realization fields; Fibre stamps episode identity, occurrence time, age, place, structure selection, required counterpart identity and introduction timing from the reviewed deterministic envelope.

11. **Pass-A reliability remains the preregistered independent budget.** One initial generated version, up to two form repairs, up to two record retries, maximum five generated versions. A malformed form-repair body remains on the form-repair budget rather than silently consuming a record retry; retry input digests still identify the actual request.

12. **Sparse-history Pass B is mechanically tied to the frozen protocol.** Horizons remain `[4,6,8,10,12,14]`; modes remain `L L T L L T`; treated ordinals remain 3 and 6. The executing notice aliases the canonical `GENESIS_SPARSE_HISTORY_NOTICE`, and R2 preflight compares the code horizons/modes against `redesign-v2.json` and diagnostic authority. Genome exposure remains legal only in treated Pass-B calls.

13. **Pass C remains memory-scoped and genome-blind.** Initial remembered meaning and scheduled reinterpretation may alter remembered meaning only; they may not rewrite admitted life history or Memory evidence.

14. **The D3 diagnostic threshold remains mechanically closed.** The reconciliation artifact binds primary ordinals 3/6, primary horizons 8/14, both treated ordinals at least 4/5 correct core edges and at least one 5/5. A 3/4 mutation or contradictory statement must fail closed.

15. **Canonical situated-life authority owns durable continuity.** The temporary `genesis_life_continuity` table remains removed. Genesis maps the neutral continuity derivation into canonical `life_relation_records` and `place_episode_records` inside the birth transaction. There is no second Genesis-owned biography/place/relation store.

16. **Situated social facts are factual, not meaning.** Ordinary non-kin/mentor/vendor/etc. continuity may use generic `social_contact` relations with `factualRoleRefs` plus frozen `relationshipFacts`; sibling and other stronger canonical relation kinds may be used when justified. Initial-roster facts cite the canonical seed event; introduced people and places cite admitted historical life-event witnesses.

17. **Atomic birth includes situated life.** Thread, seed/life events, canonical situated-life rows, symbolic-genome lineage relations, autobiographical memories and Genesis manifest commit or roll back together. Situated continuity itself does not increment Thread version.

18. **Candidate generation is separate from publication.** The R2 runner produces/fixes candidate evidence only and does not publish Threads. A completed candidate must still pass the replacement-effective G5/G6 diagnostics/admission boundary before any birth publication can occur.

19. **Durable invocation replay remains part of R2.** A process restart may replay a durably committed model response without another provider call; restart must never reset scientific retry budgets, create a second candidate attempt, overwrite committed output, or become quality-driven regeneration.

20. **The one-shot rule is now claimed outside the candidate output root.** One whole candidate attempt; no quality-driven regeneration; terminal generation failure closes the attempt; no provider/model substitution. The runner writes a durable attempt guard beside `final-cohort-v1/` before starting the attempt. Deleting the candidate root after that claim is refusal, not permission to create another first attempt.

21. **Starting-material reuse remains narrow.** The five byte-unchanged Worlds/genomes, assignment and fresh G2 results are reusable only as pre-life starting material. Replacement-v2 may not read/reuse replacement-v1 generated life, H-v2 generated life, failed recovery content, old candidate memories or meanings.

22. **Development code stays flattened.** Frozen artifacts may retain version labels because they identify evidence. Parallel executable versions require a real persisted-data/API/migration boundary; no deployed Fibre population currently creates such a legacy requirement.

23. **Residual R2 review findings remain disclosed.** Review items N1, N4, N5, N7, N8, N9, N10 and N11 remain visible in `docs/validation/m2-pr39-replacement-v2-r2-review-result.md`. They are not silently promoted to stronger guarantees and must be attacked again in the corrected R2 re-review.

24. **Next action: locally verify the re-frozen corrected boundary at `a0441bd3...`.** Run `npm test`, `npm run validate`, `npm run genesis:replacement-r2-preflight`, confirm the binding digest `sha256:2482f9a9...e6159`, confirm the CLEAR witness and one-shot guard are absent, and confirm no replacement-v2 life output exists. No provider calls.

25. **If local verification is green, request corrected hostile R2 re-review.** Re-review B1-B4 plus N2/N3/N6 closure and the residual assumptions with zero provider calls. Only a corrected `VERDICT: CLEAR` may authorize creation of a digest-bound CLEAR witness and then one fresh candidate-generation attempt. Publication remains a later, separate authority.

26. **Experience-presentation seeds remain a separate architecture item.** Preferred rule: derive domain-separated presentation seeds from the canonical Experience or Memory identity/digest; presentation may control how authoritative evidence is rendered but never what occurred or what the experience means.

27. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 itself earns no Whole-Person score movement.
