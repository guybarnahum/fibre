---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

For the plain-English public view of what Fibre has and has not achieved, use [`public-progress.md`](public-progress.md) and the canonical machine-readable [`public-progress.json`](public-progress.json). This file is the engineering execution view.

1. **Replacement-v1 attempt 1 is now a preserved REDESIGN witness, not a resumable experiment.** It legitimately started under Gate-G(2) round-4 CLEAR, durably committed ten slot-1 Pass-A calls, then terminated before the first Pass-B model response. The provider 400 is preserved, but close inspection of those ten episodes exposed deeper history-compiler defects. Canonical redesign record: `docs/validation/m2-pr39-replacement-attempt1-redesign.md`.

2. **Same-attempt mechanical recovery is retired.** Do not run `genesis:replacement-generate` again and do not create a recovery CLEAR witness. The ten replacement-v1 Pass-A outputs are burned experimental evidence and may not be reused in replacement-v2.

3. **Do not modify or clean the local failed-attempt artifacts.** Preserve `artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/` and the older `artifacts/validation/m2-pr39/h/recovery-v1/` exactly as evidence. No replacement-v1 Thread was published.

4. **Current engineering stage is replacement-v2 R1 hostile review.** Exact locally verified implementation candidate: `f37ba33ed82c381e20d204de69350833dabc4ba2`. At that exact candidate, `genesis:replacement-v2-redesign-preflight` returned `CLEAR_R1_SUBSTRATE_PRE_REVIEW_ZERO_CALL`, `npm test` was `721/721`, and repository/world-seed validation passed. No replacement-v2 provider call, runner, generation command or publication is authorized. Review request: `docs/validation/m2-pr39-replacement-v2-r1-review-request.md`. Commits after the candidate must remain documentation/review-state only until verdict.

5. **Historical envelopes move scene selection out of the model.** `genesis-historical-envelope-v1` deterministically selects exact local civil time, exact World place and offered-structure/world-emergent status before cognition. Pass A will realize the event inside that envelope rather than choose the historical skeleton.

6. **Coverage bounds prevent pathological mode collapse without pretending to model whole-life frequency.** Fourteen envelopes must cover at least four World places; no place may exceed four sampled episodes; no EventStructure may exceed two; weekday/daypart repetition is bounded; exactly two windows are world-emergent; at least five selected opportunities require non-household counterpart roles and at least two distinct external role classes. The locally frozen plans use all five places and 11–12 distinct structures; observed external-counterpart opportunities are 7–10/14 and must be reviewed as possible overcorrection rather than tuned after observation.

7. **Local-time authority is explicit.** Replacement-v2 binds IANA zones per World: Tbilisi `Asia/Tbilisi`, Kaohsiung `Asia/Taipei`, Recife `America/Recife`, Fès `Africa/Casablanca`, Hobart `Australia/Hobart`. Natural-language weekday/daypart contradictions with the envelope are invalid.

8. **The four-year pre-entry gap is closed.** Replacement-v2 uses fourteen sparse windows from age 6 through age 21.9999, ending immediately before age-22 Fibre entry. The old ten-window age-6-to-18 plan remains historical replacement-v1 authority only.

9. **EventStructurePool v3 preserves v2 and adds young-adult affordances.** Do not extend old childhood structures past their reviewed ranges. The v3 overlay must preserve every v2 entry exactly while adding portable age-17-to-22 structures.

10. **Pass B must treat history as a sparse coverage sample, not frequency evidence.** Replacement-v2 keeps the six-call treatment pattern `L L T L L T`, but horizons become `4/6/8/10/12/14`. The model must be explicitly told that repetition in the visible sample does not prove dominance in the whole life and absence does not prove non-occurrence.

11. **Durable life continuity is a blocking R2 requirement.** `genesis-life-continuity-v1` derives a neutral bundle in which every published participant resolves to role authority, initial-roster relationship facts survive, introduced participant roles survive, and every used place resolves to WorldSpec evidence. R2 must choose/persist the correct situated-life representation atomically with birth; opaque participant IDs are not acceptable.

12. **The five frozen Worlds/genomes remain reusable starting material, not reusable generated life.** No World, genome value or World/genome pairing is changed because of observed replacement-v1 episode content. Replacement-v2 uses fresh event-offer, envelope, model-request and output namespaces.

13. **Fresh replacement G2 remains CLEAR and frozen pre-life evidence.** Scores remain `22/24, 24/24, 24/24, 22/24, 23/24`, with all five measured cycle edges detectable. Replacement-v2 must explicitly rebind this evidence before any execution gate; it may not silently inherit the consumed Gate-G(2) witness.

14. **The OpenAI structured-schema compatibility fix remains a transport concern.** Canonical Fibre schemas remain authoritative and projected constraints must be re-enforced locally. This fix does not authorize replacement-v2 cognition and must be included in the later R2 execution review.

15. **The old replacement-v1 Gate-G(2) tests must now fail closed by design.** Tests assert that old execution authority rejects post-CLEAR redesign drift; do not weaken the old drift guard to make historical execution appear valid.

16. **R1 local validation is complete.** The five real envelope plans are frozen by digest at candidate `f37ba33…`; all five use all five World places, satisfy place/structure/weekday/daypart bounds, contain exactly two world-emergent envelopes, and satisfy external-role coverage while cognition remains `NOT AUTHORIZED`. Preserve this exact implementation boundary during review.

17. **The only next #39 scientific action is the narrow hostile R1 review.** Claude should attack deterministic selection, timezone conversion, coverage bounds, social-expansion forcing, place/role compatibility, skeleton-free realization, v2-preservation in EventStructurePool v3, age-18-to-22 coverage, sparse-history semantics, continuity derivation, old-gate fail-closed behavior and reuse of pre-life World/genome starting material. Zero provider calls.

18. **R2 comes only after R1 CLEAR.** R2 will wire a new replacement-v2 runner, uniform sparse-history Pass-B prompt surface and atomic situated-life publication. Only after that complete path is independently reviewed may another provider call be authorized.

19. **Experience-presentation seeds are a separate architecture item and should not move the frozen R1 candidate.** Preferred direction: derive domain-separated presentation seeds from immutable Experience/Memory identity plus canonical record digest; presentation must never determine occurrence or meaning. Record/design this outside the R1 implementation boundary after the review packet is frozen.

20. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 itself earns no Whole-Person score movement.
