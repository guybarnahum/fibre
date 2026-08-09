---
id: validation-history-bends-judgment-candidate-1
status: frozen-development-boundary
last-reviewed: 2026-08-08
canonical: false
---

# History bends judgment — frozen candidate 1

PR #34 freezes `history_bends_judgment_candidate_1` after Development v3 demonstrated two consecutive unchanged real-provider causal passes.

This is a **Development boundary**, not standing evidence. It does not permit Fibre score movement.

## Freeze point

- candidate: `history_bends_judgment_candidate_1`
- source head before freeze declaration: `0103654bfa0712eff710512be5b4049ce6e02305`
- Development set: `history_bends_judgment_development_v3`
- real-provider stability: 2 consecutive passes
- provider/model: `openai/gpt-5.1-2025-11-13`
- later request fingerprint: `sha256:7608a1c22fcc2ef1da890b0e4cf3e7f426c5bf02cd4ba54e30016a68de0e9537`
- observed differential on both accepted runs: `accept/high -> negotiate/mixed`
- observed load-bearing factor: `individualizedAdvantage`

## Frozen causal contract

The later canonical and counterfactual appraisals hold Thread state and the request constant. The only intervention is whether the named persisted Episode A memory record is semantically resolved by Fibre-owned retrieval.

```text
WITH history
  -> resolved persisted episode memory
  -> accept / high

WITHOUT history
  -> same Thread memoryRef remains
  -> memory record withheld only from evaluation-time retrieval
  -> unresolved witness, not semantic evidence
  -> clarify / mixed OR negotiate / mixed
```

A downstream differential is mandatory. The with-history judgment must cite the persisted memory in `individualizedAdvantage` or `interchangeability`.

## Frozen boundaries

Candidate 1 pins:

- Semantic Guardian v4 candidate 4 cognition and hashes;
- OpenAI `gpt-5.1-2025-11-13` runtime boundary used for standing evaluation;
- deterministic Actor v1 episode-memory formation;
- Goal Guardian v1 Actor audit;
- `current_runtime_episode` evidence policy v1;
- exact current `request:` and `authorization:` episode refs;
- `fibre_owned_attention` selection policy v1;
- `durable_memory_summary` resolution policy v1;
- Development v3 counterfactual construction and evaluator contract;
- exact source blob identities for the frozen implementation files.

`tools/history-bends-judgment-frozen-boundary.test.mjs` fails closed if any frozen source blob or named policy/hash drifts.

## Explicitly not frozen as evidence

No #34 held-out standing scenario exists at this freeze point. No standing-gate request prose, episode prose, requester, system name, or expected case-specific judgment has been authored.

That separation is intentional: #34.4 must be authored only after this boundary exists.

## Score posture

```text
Standing gate: NOT EVALUATED
Development score movement: NOT PERMITTED
Current Fibre score: unchanged
```

## Next

Author a fresh held-out #34.4 scenario with different requester, system, wording, and episode content from the Atlas Development case, then run it once against this frozen candidate.
