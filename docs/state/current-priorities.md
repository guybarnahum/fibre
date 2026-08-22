---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Current priorities

1. **Treat Gate H as CLEAR only for replacement-cohort preregistration; authorize zero cohort provider calls.** H-v2 remains frozen at `8ccbb7a7e5b85217327abb1cf0e70207b8782604` as an operational HOLD. No H-v2 rerun, replacement-cohort cognition, partial G5 diagnostic or H-v2 life reuse is authorized before Gate-G(2).

2. **R0 evidence-layer verification is CLEAR.** At maintainer head `954e2b5d4e77b45e6ef0f832814351247aa94f3a`: `648/648` tests passed, build passed, repository/world-seed validation passed, and H-v2 preflight correctly reported `ATTEMPT FROZEN — EXECUTION BLOCKED` with zero provider calls. Preserve the one-shot guard exactly.

3. **G4-v3 mechanical reliability policy is now frozen before implementation.** Canonical artifact: `artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json`. The exact ladder is: one initial version; up to 2 independent form repairs; up to 2 independent referential record retries; hard total 5 generated versions. Neither budget resets the other. Any different number requires another explicit pre-life version.

4. **Keep the authoritative Pass-A content gate unchanged while improving form control.** `observableAction <= 1200 UTF-8 bytes` remains the only byte admission ceiling. G4-v3 adds a generation target of `<=800 UTF-8 bytes and <=100 words` to initial and record-retry prompts; missing that target alone is never a rejection. Existing form-repair targets remain 600B/80w then 300B/40w. Do not change semantic admission, genome blindness, EventStructure gate classes, Pass-B/C authority, publication, provider/model, G5 or G6.

5. **Implement G4-v3 exactly, then locally verify before any calibration call.** Update the Pass-A runner/policy through an explicit versioned surface rather than mutating H-v2 history. Wire the rich future failure-evidence serializer into the replacement runner. Add state-machine tests covering alternating form/referential failures, independent budget exhaustion, total cap 5 and immutable H-v2 refusal. No provider call is needed for this step.

6. **The off-cohort calibration protocol is already frozen; do not tune it after implementation.** Canonical artifact: `artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-freeze-v1.json`. It requires exactly 225 predetermined non-cohort Pass-A trials, 225/225 mechanical admission, zero terminal mechanical exhaustions, and at least 203/225 initial drafts within the unchanged 1200-byte limit. Its predeclared Laplace survival estimate must imply at least `0.80` estimated completion for 50 consecutive episodes; 225/225 yields `0.8019164044061948`.

7. **Calibration inputs must be frozen and non-cohort before the first call.** Use 15 synthetic calibration Worlds × 15 deterministic variants, all constructed before execution. No H-v1/H-v2 World, genome, Thread/genesis identity, semantic life output, replacement World/genome or replacement identity may enter calibration. Calibration may inspect gate names, byte lengths, repair/retry counts and provenance only—never semantic quality, memory, meaning, genome propagation or reinterpretation.

8. **Reset experimental material, not analysis authority.** The replacement cohort requires new Thread/genesis identities, Worlds, genome material, World↔genome assignment, treatment instance under inherited `L L T L L T`, seeds and output root. Never reuse H-v2 generations or accepted episodes. Inherit G5/G6, provider/model, treatment rule, Pass-B genome-copy gate and publication semantics byte-identically where applicable.

9. **After G4-v3 implementation and calibration pass, complete fresh material and request Gate-G(2).** Gate-G(2) must see the verified implementation, calibration result, fresh material with blind-authoring disclosures, inherited G5/G6 digests, absent replacement output root and zero replacement-cohort cognition. Only Gate-G(2) CLEAR may authorize final-life generation.

10. **Do not run G5 on H-v2, even partially.** D1/D3 are structurally unavailable on the incomplete cohort, and selecting only convenient diagnostics after observing H output would itself violate frozen candidate scope. H-v2 characterization remains content-invariant integrity/provenance only.

11. **Keep H-v1 and H-v2 immutable and distinct.** H-v1 is the transport-schema HOLD at `448bd669f742a566da289cc4117907f2d37e32e3`; H-v2 is the record-repair-exhaustion HOLD at `8ccbb7a7e5b85217327abb1cf0e70207b8782604`. Neither may be overwritten, resumed or retrospectively repaired.

12. **#40 architecture may proceed in parallel, but #41 remains blocked.** #40 may develop identity-context selection, capsule/provenance contracts, append-only consumption and counterfactual machinery against #38-era Threads and synthetic fixtures. It may not cite H-v2 or replacement material as validation evidence, claim #39 success or advance Whole-Person standing. #41 still requires #39's published individuals.

13. **Preserve provenance and negative evidence as first-class state.** Keep all Pre-G, G1/G2 corrections, G3/G4 amendments, G5 verifier failure, H preflight bug, H-v1/H-v2 HOLDs, schema probe, Gate-H review, R0 verification and any future calibration failure. Do not clean negative evidence into a smoother story.

14. **Keep Fibre's causal claims conservative.** Whole-Person remains 15/26. #39 has implementation evidence but no valid published cohort or causal standing. #40 may build causal-consumption architecture; #41 owns the M2 standing gate.
