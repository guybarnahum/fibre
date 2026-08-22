---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Current priorities

1. **Treat Gate H as CLEAR only for replacement-cohort preregistration; replacement-cohort cognition remains unauthorized.** H-v2 stays frozen at `8ccbb7a7e5b85217327abb1cf0e70207b8782604` as an operational HOLD. The separately versioned H-v2 recovery path may continue prospective development for resilience/life-continuity purposes, but it is not the #39 replacement cohort and may not enter frozen G5/G6 or advance Whole-Person standing.

2. **R0 evidence-layer verification is CLEAR.** At maintainer head `954e2b5d4e77b45e6ef0f832814351247aa94f3a`: `648/648` tests passed, build passed, repository/world-seed validation passed, and H-v2 preflight correctly reported `ATTEMPT FROZEN — EXECUTION BLOCKED` with zero provider calls. Preserve the one-shot H-v2 evidence guard exactly.

3. **G4-v3 mechanical reliability is implemented, frozen, calibrated and CLEAR.** Canonical policy: `artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json`. Exact ladder: one initial version; up to 2 independent form repairs; up to 2 independent referential record retries; hard total 5 generated versions. Neither budget resets the other. The frozen off-cohort calibration at commit `3b401dfb93adc916ed7f3e5e46cade6f36fedbab` admitted `225/225`, had zero terminal mechanical failures, and had `225/225` initial drafts within the unchanged 1200-byte admission ceiling. Its predeclared Laplace estimate implies `0.8019164044061948` completion probability for 50 consecutive episodes.

4. **Keep the authoritative Pass-A content gate unchanged.** `observableAction <= 1200 UTF-8 bytes` remains the only byte admission ceiling. G4-v3 uses a generation target of `<=800 UTF-8 bytes and <=100 words` for initial and record-retry prompts; missing that target alone is never a rejection. Existing form-repair targets remain 600B/80w then 300B/40w. Do not change semantic admission, genome blindness, EventStructure gate classes, Pass-B/C authority, provider/model, G5 or G6 based on calibration output.

5. **Genesis durability is CLEAR and is now core architecture.** At head `f9725429129b4404b6b65c027b912546f7ec6dc4`, `670/670` tests passed and repository/world-seed validation passed. Successful model invocations are durably journaled; restart replays committed results locally, resumes at the first unfinished invocation, preserves request/provenance evidence, refuses witness drift/corruption, and does not reset G4-v3 repair/retry budgets. Canonical witness: `artifacts/validation/m2-pr39/g/protocol/g4-v3-durable-development-verification-v1.json`.

6. **Birth Center is the distinct runtime boundary for prospective development.** Canonical architecture: `docs/architecture/birth-center-runtime-v1.md`. Birth Center owns provisional Genesis workflow state, durable provider-call journals and resume/checkpoint behavior. It does not own authoritative Thread state or open the live World database merely because it shares repository code. The World Kernel remains authority for live validation and atomic `publishBirth()`.

7. **H-v2 recovery is allowed only as a separately versioned resilience continuation.** Canonical binding: `artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-binding-v1.json`. Preserve completed slots 1–3 byte-identically, preserve slot 4's two accepted episodes and all already-observed episode-3 attempts, and leave slot 5 as unstarted. Never overwrite or relabel H-v2 itself. The recovery continuation may use the verified G4-v3 mechanics and durable Birth Center execution, but its output is resilience/life-continuity evidence only.

8. **Recovery provider execution is not yet authorized.** `npm run genesis:h2-recovery -- --preflight` may account for frozen source evidence and verify the absent recovery output root with zero provider calls. Actual recovery execution requires a separately reviewed continuation implementation that imports/replays already-successful H-v2 model invocations and begins provider work only at the first unfinished developmental operation.

9. **Reset experimental material, not analysis authority, for the actual #39 replacement cohort.** The replacement cohort still requires new Thread/genesis identities, Worlds, genome material, World↔genome assignment, treatment instance under inherited `L L T L L T`, seeds and output root. Never use recovered H-v2 lives as replacement experimental material. Inherit G5/G6, provider/model, treatment rule, Pass-B genome-copy gate and publication semantics byte-identically where applicable.

10. **Complete fresh replacement material and request Gate-G(2).** Gate-G(2) must see the verified G4-v3 implementation, frozen calibration CLEAR, durability CLEAR, Birth Center execution boundary, fresh material with blind-authoring disclosures, inherited G5/G6 digests, absent replacement output root and zero replacement-cohort cognition. Only Gate-G(2) CLEAR may authorize replacement final-life generation.

11. **Do not run G5 on H-v2 or its recovery continuation.** D1/D3 are structurally unavailable on the incomplete original cohort, and the recovery uses post-H-v2 machinery. Neither source is eligible for the frozen final-cohort analysis.

12. **Keep H-v1 and H-v2 immutable and distinct from recovery.** H-v1 is the transport-schema HOLD at `448bd669f742a566da289cc4117907f2d37e32e3`; H-v2 is the record-repair-exhaustion HOLD at `8ccbb7a7e5b85217327abb1cf0e70207b8782604`. Neither frozen attempt may be overwritten, rerun as itself or retrospectively repaired. A separately labeled continuation may consume their preserved evidence without changing them.

13. **#40 architecture may proceed in parallel, but #41 remains blocked.** #40 may develop identity-context selection, capsule/provenance contracts, append-only consumption and counterfactual machinery against #38-era Threads and synthetic fixtures. It may not cite H-v2, its recovery continuation or future replacement material as validation evidence before their appropriate gates, claim #39 success or advance Whole-Person standing. #41 still requires #39's published individuals.

14. **Preserve provenance and negative evidence as first-class state.** Keep all Pre-G, G1/G2 corrections, G3/G4 amendments, G5 verifier failure, H preflight bug, H-v1/H-v2 HOLDs, schema probe, Gate-H review, R0 verification, calibration evidence and recovery evidence. Do not clean negative evidence into a smoother story.

15. **Keep Fibre's causal claims conservative.** Whole-Person remains 15/26. #39 now has strong implementation, calibration and durability evidence but still has no valid published replacement cohort or causal standing. #40 may build causal-consumption architecture; #41 owns the M2 standing gate.
