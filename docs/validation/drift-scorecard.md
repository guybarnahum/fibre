---
id: validation-drift-scorecard
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# Vision-integrity scorecard

Score each release from 0 to 2 on each dimension.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Persistence | Runtime persona only | Partial persistence | Complete freeze/thaw continuity |
| Non-interchangeability | Cosmetic | Some behavioral effect | Stable identity-grounded divergence |
| Natural-language identity | Mostly numeric labels | Mixed | Prompt-native canonical meaning |
| Economic consequence | None | Logged cost | Constrained budgets and settlement |
| Social/family function | Decorative | Limited | Changes choices and support |
| Development | No durable change | Manual updates | Evidence-based persistent learning |
| Model supervision | Direct output | Basic retry | Separate goal and impact audits |
| Human inspectability | Logs only | Partial dashboard | Complete touchable artifacts |

A release scoring below 12/16 requires an explicit drift review before further feature work.
