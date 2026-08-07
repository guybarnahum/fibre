---
id: validation-drift-scorecard
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Vision-integrity scorecard

**Current rubric version: 2.**

Score each release from 0 to 2 on each dimension.

A score of **2** means the accepted Fibre concept represented by that dimension is substantially realized, not merely that the milestone's chosen subset is implemented completely. A narrow milestone may still earn a 2 where it genuinely closes the named concept, but it may not self-scope a dimension until completeness becomes trivial.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Persistence | Runtime persona only | Partial persistence | Complete freeze/thaw continuity |
| Non-interchangeability | Cosmetic or context-only differences | Some attributable behavioral effect | Stable identity/history-grounded divergence under controlled conditions |
| Natural-language identity | Mostly numeric labels | Meaning-bearing natural language exists but semantic structure or behavioral use is incomplete | Prompt-native canonical meaning with inspectable named structure |
| Dignity and consent | Safe requests auto-execute | Private stance/refusal is enforceable, but consequential appraisal is externally authored or not identity-causal | Thread-owned appraisal and request-bound authorization govern participation |
| Interiority and privacy | Public output treated as inner state | Some private fields separated | Private stance, authorization, disclosure, expression, and action remain access-aware distinct records |
| Authorization integrity | Free-form or weakly bound | Partial request/version checks | All material terms use wide digest binding with independent consumer validation |
| Economic consequence | None or context-carried only | Cost, spend, reservation, or commitment is durably recorded against the Thread | Constrained budgets and settlement change future capability or opportunity |
| Social and relationship memory | Decorative or reference-only | Durable relationship consequence exists but changes later behavior only narrowly or not yet at all | Evidence-backed fondness, resentment, repair, and history change later choices |
| Development | No prior experience changes later Thread appraisal, disposition, or behavior | Durable experience changes a later appraisal, self-model, expectation, or choice in a limited attributable way | Evidence-based persistent learning and self-authorship change later behavior across episodes |
| Model supervision | Direct output | Separate goal/consistency audit without full stewardship | Separate goal, adversarial, and impact audits with stewardship |
| Human inspectability | Logs only or opaque records | Access-aware inspectability exists for a meaningful subset of personhood mechanisms | Accepted personhood mechanisms are broadly inspectable through readable artifacts with exact technical authority beneath them |
| Institutional plurality | No implemented social order | Some configurable roles or one implemented order | Multiple social orders coexist on one substrate |
| Cognition replaceability | Cognition is fused to Thread identity/state | Replaceable worker/model/runtime seam exists and is exercised | The same persistent Thread demonstrably preserves continuity across a genuine cognition/model/runtime replacement |

For non-deterministic cognition, **Non-interchangeability** evidence includes both between-Thread divergence and within-Thread stability under repeated identical conditions. Inter-Thread separation must exceed intra-Thread variation; one-off stochastic divergence does not establish persistent character. This clarifies the existing v2 meaning of “stable identity/history-grounded divergence” and does not add a new score dimension.

A release scoring below **75% of the rubric's maximum** requires an explicit drift review before further feature work. A zero in dignity and consent, interiority and privacy, or authorization integrity is a blocking failure regardless of total score.

The numerical score is a diagnostic, not a percentage-complete estimate. A foundational milestone can score low while proving indispensable infrastructure; the purpose of the score is to prevent infrastructure evidence from being silently reinterpreted as evidence of causal personhood.

Natural-language identity is intentionally the one dimension where representation itself can earn partial credit: Article III makes prompt-native meaning a first-class architectural claim. That does **not** create precedent for awarding causal dimensions credit merely because their values are stored or carried into context.

## Rubric versioning

Recorded scores must name the rubric version used. When a dimension is added, removed, or materially changes meaning, increment the rubric version and re-score all closed milestones that remain part of the comparison series. Do not compare raw totals across different rubric versions as though the denominator or band meanings were unchanged.

## Recorded scores

Every closed milestone is scored here. An unscored release is an unmeasured release.

### M1 — Persistent Thread Round Trip (closed 2026-08-06)

**Rubric v2: 11 / 26.** Below the 75% threshold, intentionally and visibly. M1 proves persistence, authority, interiority/privacy, and lifecycle boundaries strongly; it does not yet prove causal individuality, endogenous Thread judgment, development, or full-world inspectability. The explicit post-M1 drift review is recorded by PR #29 and the standing [`thread-differential-gate.md`](thread-differential-gate.md), which blocks M2 closure until the causal gap is crossed.

No blocking zero occurs: dignity and consent scores 1 rather than 0 because refusal is enforceable and execution is request-bound; interiority/privacy and authorization integrity both score 2.

| Dimension | Score | Basis |
|---|---:|---|
| Persistence | 2 | Freeze/thaw continuity survives repeated process restart and replay to an identical state hash. |
| Non-interchangeability | 0 | No implemented mechanism can make two materially different Threads choose differently under the same request from attributable Thread-owned causes. |
| Natural-language identity | 1 | Meaning-bearing identity is stored as natural language, but `textualTraits` reach appraisal as unnamed values and the semantic field structure is not yet preserved into consequential cognition. Representation earns partial credit here because prompt-native meaning is itself part of the accepted identity concept. |
| Dignity and consent | 1 | Private refusal and request-bound authorization are load-bearing, but the consequential assessment — score, proposed action, factors, feelings, motives, uncertainties, relationship impact — is still supplied by the caller. |
| Interiority and privacy | 2 | Private stance, authorization, disclosure strategy, audience response, performed action status, and durable life change remain distinct, access-aware records. |
| Authorization integrity | 2 | Material request terms use SHA-256 binding, authorization is revalidated at consumers, and obligation discharge permanently prevents exact-reference reuse. |
| Economic consequence | 0 | Accounts are validated and carried into cognition as budgets, but nothing spends, settles, reserves, commits, or changes future capability from them. Context carriage alone earns no economic credit. |
| Social and relationship memory | 0 | Relationship refs have no backing relationship aggregate; fondness/resentment deltas are recorded but applied to no durable relationship state. |
| Development | 0 | Freeze persists memory records, but memory content is not resolved into later cognition; obligation discharge changes authority history rather than the Thread's learned disposition, self-model, expectation, or behavior. |
| Model supervision | 1 | Goal Guardian is a separate declaration/consistency auditor; there is no implemented Self Examiner/Steward or broader adversarial/impact audit loop. |
| Human inspectability | 1 | Credentialed Thread Editor, readable explanations with exact JSON authority, and independent database inspection expose the M1 lifecycle well, but Fibre's accepted world includes many personhood artifacts and domains not yet inspectable because they are not yet implemented. |
| Institutional plurality | 0 | Fibre preserves the architecture for multiple social orders, but M1 implements no institutional order, configurable role system, or coexistence proof. |
| Cognition replaceability | 1 | Actor/worker cognition is separated behind an injectable seam and alternate workers are exercised in tests, but continuity of the same Thread across a genuine model/runtime replacement has not been demonstrated. |

The important shape is not the total alone. M1's strongest evidence is concentrated in **persistence, boundaries, and authority**. Its partial evidence is concentrated in **identity representation, dignity enforcement, supervision, inspectability, and cognition separation**. Its weakest evidence is exactly where the Fibre vision demands the next step: **distinctive Thread-owned state and history causing different judgment, development, relationship consequence, economic consequence, or future opportunity**.
