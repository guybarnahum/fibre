---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Current priorities

For the plain-English public view of what Fibre has and has not achieved, use [`public-progress.md`](public-progress.md) and the canonical machine-readable [`public-progress.json`](public-progress.json). This file is the engineering execution view.

1. **Gate-G(2) remains HOLD after round 3.** Round 3 at `2d1d06ffd3289289b2689f49fb0f06c69c18227d` again found no REDESIGN trigger. C1 is accepted closed; the sole blocker is C2: the import-only generation core still exposed an exported preflight/run path whose local preflight did not invoke inherited-authority verification. Canonical result: `docs/validation/m2-pr39-gate-g2-review-result-round3.md`.

2. **Close C2 without changing scientific input.** The correction is execution-reachability only: one shared `genesis-replacement-inherited-authority.mjs` now owns all inherited checks; the operator wrapper calls it; the core's own exported preflight also calls it before any Gate-G(2) authorization can be returned. A direct importer therefore cannot bypass the authority boundary.

3. **The C2 correction is implemented but not yet maintainer-verified locally.** Current core blob is `a8acd1b1dd47ef427397056cee2958cea7ae0b7c`; current authorized wrapper blob is `5b67674e36b43766f416e0a1aab9a0b8e41dbc36`. The shared authority module pins both. Closure tooling now reports `C2 core import path invokes the same inherited-authority gate`.

4. **Do not touch consumed scientific evidence.** The five replacement Worlds, source/child genomes, World↔genome mapping, fresh G2 result, G3 treatment positions, accepted D3 threshold structure, provider/model and cognition prompts remain frozen. No final-life outcome exists to adapt to.

5. **Fresh replacement G2 remains CLEAR, frozen and non-rerunnable.** Scores are `22/24, 24/24, 24/24, 22/24, 23/24`; all five measured cycle edges are detectable and every genome is covered. This is pre-life genome/instrument evidence only. Scores are not directly comparable to the old cohort because the replacement loci use a more consistently aligned per-ordinal authoring design.

6. **B2 remains closed: replacement Pass A explicitly selects G4-v3.** Effective policy is one initial version, up to two independent form repairs, up to two independent referential retries, hard total five generated versions. The historical H runner retains its legacy behavior only for reproducibility.

7. **B3 remains closed: replacement D3 has five blocking edges and no pair-3-4 escape hatch.** Both primary ordinals must be at least `4/5`; at least one must be `5/5`. Null/error/tie/unanalyzable measured edges are `not_correct`. The shared authority gate requires the exact replacement carve-out-retirement content.

8. **B4/B5 remain disclosure-only closures.** The aligned genome-authoring design/non-comparability is explicit; genomes are unchanged. The deterministic mapping remains `1<-3 2<-2 3<-1 4<-4 5<-5` with fixed points `[2,4,5]`; no rerandomization is allowed.

9. **The optional Pass-B `uncertainty[*]` generation-time hardening remains NOT APPLIED.** Historical G4-v2 Pass-B authority remains exact. Instead, the packet requires a read-only post-generation, pre-diagnostic four-token scan. A confirmed leak invalidates the affected inference and cannot trigger regeneration.

10. **Publication semantics are explicit.** All five generation bundles must complete before publication begins. `publishBirth()` is atomic per Thread, but publication is not cohort-atomic. A publication-phase failure can leave already-published Threads plus terminal HOLD; it does not authorize replay/replacement.

11. **Post-CLEAR drift protection covers the authority surface.** The shared authority module watches `services/world-kernel/src`, `services/birth-center/src`, all `tools/genesis`, inherited `artifacts/validation/m2-pr39/g/protocol`, and replacement protocol. A future `reviewedHead` must be a real strict ancestor.

12. **Replacement execution claims process-restart replay only.** Birth Center journal replay can reuse committed invocation identities without resetting budgets. Do not claim host-crash/power-loss fsync durability. Terminal result/failure ends the one-shot attempt.

13. **Five replacement Threads remain unborn in the #39 sense.** They have frozen Worlds, identities, genomes, assignment and pre-life execution material, but zero replacement childhood episodes, memories, meanings and published lives. Final-life cognition remains unauthorized.

14. **Next step is local zero-call verification of C2.** Run direct-core CLI refusal, the replacement closure verifier, wrapper preflight, full tests and repo validation. Also run a direct imported-core preflight smoke test; it must report the same `CLEAR_INHERITED_AUTHORITY_BOUND` while still remaining Gate-G(2) HOLD. Preserve `artifacts/validation/m2-pr39/h/recovery-v1/` untracked.

15. **Only after local green, request round 4.** Round 4 should be very narrow: rerun the round-3 mutation/import battery and prove both wrapper and imported core refuse the same drift before any provider call. No provider call is authorized during review.

16. **A future Gate-G(2) CLEAR would authorize exactly one replacement final-life attempt—nothing more.** It would not establish #39 success, Whole-Person standing or causal standing. Weak but mechanically valid lives remain evidence and cannot trigger quality regeneration.

17. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 deliberately does not move the Whole-Person score; current checkpoint remains 15/26.

18. **Keep public progress synchronized.** Simple English should say: the five unborn Threads passed their inherited-difference test; a third pre-birth review found one remaining software bypass; that bypass has been closed in code but still needs local verification and another independent review before childhood generation.
