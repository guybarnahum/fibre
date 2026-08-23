---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-23
canonical: true
---

# Current priorities

For the plain-English public view of what Fibre has and has not achieved, use [`public-progress.md`](public-progress.md) and the canonical machine-readable [`public-progress.json`](public-progress.json). This file is the engineering execution view.

1. **Replacement attempt 1 is a preserved terminal mechanical HOLD.** Gate-G(2) round 4 legitimately authorized exactly one attempt. That attempt started at `2026-08-23T07:14:24.267Z`, completed ten slot-1 Pass-A provider calls, and then stopped before the first Pass-B model response because OpenAI rejected the Pass-B JSON Schema: `episodeRefs.uniqueItems` is not permitted. Canonical record: `docs/validation/m2-pr39-replacement-attempt1-mechanical-failure.md`.

2. **Do not run `genesis:replacement-generate` again.** The original one-shot authorization has been consumed. Its terminal failure must remain visible and unchanged; do not delete/rename/edit it to make the old runner resume. No second attempt or quality regeneration is authorized.

3. **The exact recoverable mechanical state is frozen.** Local `final-cohort-v1/` contains exactly ten durable invocation records, the attempt-start witness, and the terminal failure. There is no completed Thread generation bundle, publication, database or final result. The recovery binding records exact SHA-256s for all twelve files: `artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-mechanical-recovery-v1.json`.

4. **Current engineering task: prove the same-attempt recovery boundary with zero calls.** Run `npm run genesis:replacement-recovery-preflight`. It must verify the exact failure/journal hashes, ten Pass-A commits, zero Pass-B commits, and identify `pr39-replacement-final-life-v1:slot-01:pass-b:call-01:initial` as the first uncommitted cognition request. Recovery cognition remains NOT AUTHORIZED.

5. **The OpenAI schema repair is transport compatibility, not a new Fibre schema.** Fibre's canonical Pass-B response schema and frozen hash `sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a` remain unchanged. The OpenAI adapter projects provider-unsupported `uniqueItems`, `minLength` and `maxLength` from the HTTP schema only, while re-enforcing those canonical constraints locally after parsing. Supported `maxItems` remains provider-visible.

6. **Durable request identity must remain compatible.** The OpenAI adapter `configuration` object is intentionally unchanged. The recovery preflight must prove its current canonical configuration digest still equals the digest stored by all ten committed Pass-A invocation records. The journal continues to witness the canonical Fibre response schema, not the provider projection.

7. **A future recovery may continue only the same attempt.** If independently cleared, recovery must keep `attemptStartedAt=2026-08-23T07:14:24.267Z`, replay the ten successful Pass-A calls from the journal with zero provider calls, and make the previously rejected slot-1 Pass-B call-01 the first new provider operation.

8. **Recovery is not authorized by the old Gate-G(2) CLEAR alone.** The old CLEAR witness is preserved as evidence that attempt 1 was legitimately started. A separate mechanical-recovery hostile review and bound recovery CLEAR witness are required before any further provider call.

9. **No scientific input changes are allowed in recovery.** Provider/model, Worlds, genomes, mapping, G3 assignment/treatment schedule, G4-v3 policy, G5/G6 thresholds and quality policy remain frozen. Semantic inspection of the ten Pass-A outputs may not justify a recovery change.

10. **Fresh replacement G2 remains CLEAR and frozen.** Scores are `22/24, 24/24, 24/24, 22/24, 23/24`; all five measured cycle edges are detectable. This is pre-life genome/instrument evidence only and is not directly comparable numerically to the old cohort because the replacement authoring template differs.

11. **G4-v3 remains the explicit Pass-A reliability policy.** One initial version, up to two independent form repairs, up to two independent referential retries, hard total five generated versions. Legacy shared-three behavior remains historical-only.

12. **Replacement D3 remains five-edge and blocking.** Both primary ordinals must be at least `4/5`; at least one must be `5/5`. Null/error/tie/unanalyzable measured edges are `not_correct`; the old pair-3-4 carve-out is retired.

13. **The optional Pass-B `uncertainty[*]` generation-time genome-copy hardening remains NOT APPLIED.** If a replacement cohort is eventually completed, run the bound read-only four-token scan before diagnostics. A confirmed leak invalidates the affected inference and cannot trigger regeneration.

14. **Publication remains atomic per Thread, not cohort-atomic.** No replacement publication occurred in attempt 1. A future publication-phase failure remains terminal HOLD and never authorizes replay merely to complete the cohort.

15. **Durability claim remains process-restart replay only.** The ten successful Pass-A records demonstrate process-restart replay material, not host-crash/power-loss fsync durability.

16. **The five replacement Threads are still unborn in #39.** Attempt 1 produced historical Pass-A evidence for slot 1 but no completed replacement generation bundle and no published Thread. Do not equate durable model responses with birth.

17. **After local recovery preflight/tests are green, prepare a narrow recovery review.** Claude should attack schema projection semantics, canonical-schema preservation, journal request identity, exact resume point, terminal-failure preservation and provider-call ordering. Only a new CLEAR may authorize same-attempt continuation.

18. **#40 may proceed architecturally in parallel; #41 remains blocked.** #40 owns canonical bounded consumption of rich identity/history into cognition. #41 owns Whole-Person standing. #39 itself earns no Whole-Person score movement.
