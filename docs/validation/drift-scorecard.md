---
id: validation-drift-scorecard
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Vision-integrity scorecard

Score each release from 0 to 2 on each dimension.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Persistence | Runtime persona only | Partial persistence | Complete freeze/thaw continuity |
| Non-interchangeability | Cosmetic | Some behavioral effect | Stable identity-grounded divergence |
| Natural-language identity | Mostly numeric labels | Mixed | Prompt-native canonical meaning |
| Dignity and consent | Safe requests auto-execute | Appraisal without enforceable refusal | Private desire and request-bound authorization govern participation |
| Interiority and privacy | Public output treated as inner state | Some private fields separated | Private stance, authorization, disclosure, expression, and action remain access-aware distinct records |
| Authorization integrity | Free-form or weakly bound | Partial request/version checks | All material terms use wide digest binding with independent consumer validation |
| Economic consequence | None | Logged cost | Constrained budgets and settlement |
| Social and relationship memory | Decorative | Limited persistence | Evidence-backed fondness, resentment, repair, and history change later choices |
| Development | No durable change | Manual updates | Evidence-based persistent learning and self-authorship |
| Model supervision | Direct output | Basic retry | Separate goal, adversarial, and impact audits with stewardship |
| Human inspectability | Logs only | Partial dashboard | Complete access-aware, touchable artifacts |
| Institutional plurality | One hard-coded order | Some configurable roles | Multiple social orders coexist on one substrate |

A release scoring below 18/24 requires an explicit drift review before further feature work. A zero in dignity and consent, interiority and privacy, or authorization integrity is a blocking failure regardless of total score.
