---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Current priorities

For the plain-English public view of what Fibre has and has not achieved, use [`public-progress.md`](public-progress.md) and the canonical machine-readable [`public-progress.json`](public-progress.json). This file is the engineering execution view.

1. **Gate-G(2) remains HOLD after round 3.** Round 3 at `2d1d06ffd3289289b2689f49fb0f06c69c18227d` again found no REDESIGN trigger. C1 is accepted closed; the sole blocker was C2: the import-only generation core still exposed an exported preflight/run path whose local preflight did not invoke inherited-authority verification. Canonical result: `docs/validation/m2-pr39-gate-g2-review-result-round3.md`.

2. **C2 is now locally closed at exact candidate `a8815064d5c8ac292d4cce41d41f94042c22b653`.** One shared `genesis-replacement-inherited-authority.mjs` owns all inherited checks; both the operator wrapper and the core's exported preflight call it. Direct core CLI remains refused. The shared gate pins wrapper blob `5b67674e36b43766f416e0a1aab9a0b8e41dbc36` and core blob `a8acd1b1dd47ef427397056cee2958cea7ae0b7c`.

3. **Local verification is green.** `npm run genesis:replacement-gate-g2-closure` reports `CLEAR B1-B5+C1+C2 — ZERO CALL`; wrapper preflight reports `CLEAR_PACKET_GATE_G2_HOLD` with inherited authority clear and output root absent; `npm test` is `705/705`; repository/world validation pass; only `artifacts/validation/m2-pr39/h/recovery-v1/` remains untracked. Final-life cognition remains unauthorized.

4. **The failed `node --input-type=module -e` smoke probe is not a C2 failure.** It dies in inherited `genesis-g3-treatment-freeze.mjs` because that CLI guard assumes `process.argv[1]` exists, which is false under `node -e`. The repository test suite directly imports the replacement core from a normal module and its imported-core preflight test passed. Do not modify the frozen G3 verifier for this harness quirk; round 4 must use a real scratch `.mjs` importer.

5. **Do not touch consumed scientific evidence.** The five replacement Worlds, source/child genomes, World↔genome mapping, fresh G2 result, G3 treatment positions, accepted D3 threshold structure, provider/model and cognition prompts remain frozen. No final-life outcome exists to adapt to.

6. **Fresh replacement G2 remains CLEAR, frozen and non-rerunnable.** Scores are `22/24, 24/24, 24/24, 22/24, 23/24`; all five measured cycle edges are detectable and every genome is covered. This is pre-life genome/instrument evidence only. Scores are not directly comparable to the old cohort because the replacement loci use a more consistently aligned per-ordinal authoring design.

7. **B2 remains closed: replacement Pass A explicitly selects G4-v3.** Effective policy is one initial version, up to two independent form repairs, up to two independent referential retries, hard total five generated versions. The historical H runner retains its legacy behavior only for reproducibility.

8. **B3 remains closed: replacement D3 has five blocking edges and no pair-3-4 escape hatch.** Both primary ordinals must be at least `4/5`; at least one must be `5/5`. Null/error/tie/unanalyzable measured edges are `not_correct`. The shared authority gate requires the exact replacement carve-out-retirement content.

9. **B4/B5 remain disclosure-only closures.** The aligned genome-authoring design/non-comparability is explicit; genomes are unchanged. The deterministic mapping remains `1<-3 2<-2 3<-1 4<-4 5<-5` with fixed points `[2,4,5]`; no rerandomization is allowed.

10. **The optional Pass-B `uncertainty[*]` generation-time hardening remains NOT APPLIED.** Historical G4-v2 Pass-B authority remains exact. Instead, the packet requires a read-only post-generation, pre-diagnostic four-token scan. A confirmed leak invalidates the affected inference and cannot trigger regeneration.

11. **Publication semantics are explicit.** All five generation bundles must complete before publication begins. `publishBirth()` is atomic per Thread, but publication is not cohort-atomic. A publication-phase failure can leave already-published Threads plus terminal HOLD; it does not authorize replay/replacement.

12. **Post-CLEAR drift protection covers the authority surface.** The shared authority module watches `services/world-kernel/src`, `services/birth-center/src`, all `tools/genesis`, inherited `artifacts/validation/m2-pr39/g/protocol`, and replacement protocol. A future `reviewedHead` must be a real strict ancestor.

13. **Replacement execution claims process-restart replay only.** Birth Center journal replay can reuse committed invocation identities without resetting budgets. Do not claim host-crash/power-loss fsync durability. Terminal result/failure ends the one-shot attempt.

14. **Five replacement Threads remain unborn in the #39 sense.** They have frozen Worlds, identities, genomes, assignment and pre-life execution material, but zero replacement childhood episodes, memories, meanings and published lives. Final-life cognition remains unauthorized.

15. **The only next action is round 4.** Use `docs/validation/m2-pr39-gate-g2-review-request-round4.md`. The reviewer must reproduce round 3 with a real scratch `.mjs`, fabricated CLEAR witness and mutated inherited authority, and prove both wrapper and imported core preflight/run refuse before any provider call.

16. **A future Gate-G(2) CLEAR would authorize exactly one replacement final-life attempt—nothing more.** It would not establish #39 success, Whole-Person standing or causal standing. Weak but mechanically valid lives remain evidence and cannot trigger quality regeneration.

17. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 deliberately does not move the Whole-Person score; current checkpoint remains 15/26.

18. **Keep public progress synchronized.** Simple English should now say: the five unborn Threads passed their inherited-difference test; the third pre-birth review found an import-path bypass; that bypass is now locally fixed and tested; a fourth independent review still blocks childhood generation.
