---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Current priorities

1. **Treat Gate H as CLEAR only for replacement-cohort preregistration; replacement-cohort cognition remains unauthorized.** H-v2 stays frozen at `8ccbb7a7e5b85217327abb1cf0e70207b8782604` as an operational HOLD. The separately versioned H-v2 recovery path has now also terminated in its own recovery-only HOLD; neither source may enter frozen G5/G6 or advance Whole-Person standing.

2. **R0 evidence-layer verification is CLEAR.** At maintainer head `954e2b5d4e77b45e6ef0f832814351247aa94f3a`: `648/648` tests passed, build passed, repository/world-seed validation passed, and H-v2 preflight correctly reported `ATTEMPT FROZEN — EXECUTION BLOCKED` with zero provider calls. Preserve the one-shot H-v2 evidence guard exactly.

3. **G4-v3 mechanical reliability remains frozen and unchanged.** Canonical policy: `artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json`. Exact ladder: one initial version; up to 2 independent form repairs; up to 2 independent referential record retries; hard total 5 generated versions. Neither budget resets the other. The frozen off-cohort calibration at commit `3b401dfb93adc916ed7f3e5e46cade6f36fedbab` admitted `225/225`, had zero terminal mechanical failures, and had `225/225` initial drafts within the unchanged 1200-byte admission ceiling. Its predeclared Laplace estimate implies `0.8019164044061948` completion probability for 50 consecutive episodes. The recovery HOLD does not authorize widening these budgets.

4. **Keep the authoritative Pass-A content and mechanical gate authority unchanged.** `observableAction <= 1200 UTF-8 bytes` remains the only byte admission ceiling. G4-v3 uses a generation target of `<=800 UTF-8 bytes and <=100 words` for initial and record-retry prompts; missing that target alone is never a rejection. Existing form-repair targets remain 600B/80w then 300B/40w. Do not change semantic admission, genome blindness, EventStructure gate classes, Pass-B/C authority, provider/model, G5 or G6 based on calibration or recovery output.

5. **Genesis durability is CLEAR and is now core architecture.** At head `f9725429129b4404b6b65c027b912546f7ec6dc4`, `670/670` tests passed and repository/world-seed validation passed. Successful model invocations are durably journaled; restart replays committed results locally, resumes at the first unfinished invocation, preserves request/provenance evidence, refuses witness drift/corruption, and does not reset G4-v3 repair/retry budgets. The recovery execution supplied a live confirmation: `pr39-h:slot-04:pass-a:episode-03:record-retry:2` was successfully returned by the provider and durably committed before its result failed the mechanical `pass_a_structure_participation` gate.

6. **Birth Center is the distinct runtime boundary for prospective development.** Canonical architecture: `docs/architecture/birth-center-runtime-v1.md`. Birth Center owns provisional Genesis workflow state, durable provider-call journals and resume/checkpoint behavior. It does not own authoritative Thread state or open the live World database merely because it shares repository code. The World Kernel remains authority for live validation and atomic `publishBirth()`.

7. **H-v2 recovery v1 is terminal HOLD and is closed to further execution.** Canonical outcome: `artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-execution-outcome-v1.json`. The reviewed continuation began exactly at record retry #2, durably preserved that successful provider response, then correctly stopped because the resulting episode still failed `pass_a_structure_participation` and G4-v3's independent record-retry budget was exhausted at 2. Budget state was generated versions `4/5`, form repairs `1/2`, record retries `2/2`; the unused fifth total-version slot is not a third record-retry entitlement. Slot 5 never started and no recovery world was published.

8. **Do not rerun or extend the H-v2 recovery execution.** The historical execution-authorization witness records what was permitted at the reviewed boundary; it is not continuing permission after the terminal outcome. The recovery outcome/current-priority commits are intentionally outside the authorization freeze's two allowed post-review witness paths, so the old reviewed execution boundary is no longer current. No retry #3, manual counterpart insertion, quality regeneration or outcome-driven G4-v3 widening is authorized.

9. **Reset experimental material, not analysis authority, for the actual #39 replacement cohort.** The replacement cohort requires new Thread/genesis identities, Worlds, genome material, World↔genome assignment, treatment instance under inherited `L L T L L T`, seeds and output root. Never use H-v2 or recovery lives as replacement experimental material. Inherit G5/G6, provider/model, treatment rule, Pass-B genome-copy gate and publication semantics byte-identically where applicable.

10. **The immediate #39 step is fresh replacement material plus blocking Gate-G(2).** Gate-G(2) must see the verified G4-v3 implementation, frozen calibration CLEAR, durability CLEAR, Birth Center execution boundary, the newly recorded recovery HOLD as non-replacement negative evidence, fresh material with blind-authoring disclosures, inherited G5/G6 digests, absent replacement output root and zero replacement-cohort cognition. Only Gate-G(2) CLEAR may authorize replacement final-life generation.

11. **Do not run G5 on H-v2 or its recovery continuation.** D1/D3 are structurally unavailable on the incomplete original cohort, and the recovery uses post-H-v2 machinery. Neither source is eligible for the frozen final-cohort analysis.

12. **Keep H-v1, H-v2 and recovery-v1 immutable and distinct.** H-v1 is the transport-schema HOLD at `448bd669f742a566da289cc4117907f2d37e32e3`; H-v2 is the record-repair-exhaustion HOLD at `8ccbb7a7e5b85217327abb1cf0e70207b8782604`; recovery-v1 is the resilience-continuation HOLD recorded in `h-v2-recovery-execution-outcome-v1.json`. None may be overwritten, relabeled or retrospectively repaired into replacement evidence.

13. **#40 architecture may proceed in parallel, but #41 remains blocked.** #40 may develop identity-context selection, capsule/provenance contracts, append-only consumption and counterfactual machinery against #38-era Threads and synthetic fixtures. It may not cite H-v2, its recovery continuation or future replacement material as validation evidence before their appropriate gates, claim #39 success or advance Whole-Person standing. #41 still requires #39's published individuals.

14. **Preserve provenance and negative evidence as first-class state.** Keep all Pre-G, G1/G2 corrections, G3/G4 amendments, G5 verifier failure, H preflight bug, H-v1/H-v2 HOLDs, schema probe, Gate-H review, R0 verification, calibration evidence, durable recovery invocation evidence and the recovery-v1 terminal HOLD. Do not clean negative evidence into a smoother story or tune the experiment merely because a bounded run failed.

15. **Keep Fibre's causal claims conservative.** Whole-Person remains 15/26. #39 has strong implementation, calibration, durability and now live recovery-failure evidence, but still has no valid published replacement cohort or causal standing. #40 may build causal-consumption architecture; #41 owns the M2 standing gate.
