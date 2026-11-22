# Fibre AI context index

Load only the context needed for your task. Generated packs (`npm run context-pack` → `artifacts/generated/`) are disposable build artifacts, never canonical truth.

## Agent quick start

1. **Read the rules:** [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md).
2. **Read current truth:** [`vision/ai-for-ai.md`](vision/ai-for-ai.md), [`state/current-state.md`](state/current-state.md), [`state/current-priorities.md`](state/current-priorities.md), and [`state/public-progress.json`](state/public-progress.json) (ceiling for all outward claims).
3. **Understand the flow:** [`architecture/how-fibre-works.md`](architecture/how-fibre-works.md).
4. **Validate once at slice completion:** run **only** `npm run slice:validate` (use `npm run test:focused -- <file>` while iterating). Never stack `check`, `test:all`, and `validate`.
5. **Never:** put live Thread data, `.fibre/` contents, or `.env` values in Git or public text; claim stored/prompted fields are behaviorally causal; turn Fibre into a generic workflow/chatbot framework; or include `#` comments in paste-ready `zsh` commands for Guy.

## Context profiles ([`ai-context-manifest.json`](ai-context-manifest.json))

| Profile | Use for |
|---|---|
| `core` | General Fibre work: doctrine, vision, current state, architecture overview, persistence, and anti-drift rules. |
| `request-processing` | Dignity appraisal, request-bound authorization, disclosure strategy, and structured obligations. |
| `social-life` | Encounters, live conversation, books, Body levels, urges, stances, interests, appointments, and livelihood. |
| `full` | Broad cross-domain reviews or onboarding. |

Profiles are curated working sets, not an index of every canonical doc.

## Task routing

- **Social life & Body:** [`architecture/social-life.md`](architecture/social-life.md), [`decisions/ADR-0036-social-body.md`](decisions/ADR-0036-social-body.md), [`decisions/ADR-0037-status-and-conflict.md`](decisions/ADR-0037-status-and-conflict.md), [`decisions/ADR-0038-body-levels.md`](decisions/ADR-0038-body-levels.md), [`concepts/interests-expertise-and-livelihood.md`](concepts/interests-expertise-and-livelihood.md).
- **Model efficiency & prompts:** `AGENTS.md` prompt rules, [`services/world-kernel/prompts/README.md`](../services/world-kernel/prompts/README.md), [`operations/world-write-diet.md`](operations/world-write-diet.md), [`validation/model-certifications.json`](validation/model-certifications.json).
- **Genesis, identity & embodiment:** [`architecture/genesis-compiler-contract.md`](architecture/genesis-compiler-contract.md), [`architecture/canonical-visual-identity.md`](architecture/canonical-visual-identity.md), [`architecture/fibre-identity-card.md`](architecture/fibre-identity-card.md), [`decisions/ADR-0013-source-identity-consent-boundary.md`](decisions/ADR-0013-source-identity-consent-boundary.md), [`decisions/ADR-0022-fid-native-proof.md`](decisions/ADR-0022-fid-native-proof.md).
- **Runtime, persistence & API:** [`architecture/production-persistence.md`](architecture/production-persistence.md), [`architecture/infrastructure-driver.md`](architecture/infrastructure-driver.md), [`architecture/world-reconciliation-scaling.md`](architecture/world-reconciliation-scaling.md), [`architecture/thread-presentation-contract.md`](architecture/thread-presentation-contract.md), [`architecture/operator-surfaces.md`](architecture/operator-surfaces.md).
- **Adversarial review:** Remember in Fibre, "adversarial" means **vision-effectiveness** (trying to falsify whether identity, history, and drives actually bend behavior), not generic security-only review. Start with [`foundations/invariants.md`](foundations/invariants.md), [`validation/drift-scorecard.md`](validation/drift-scorecard.md), and [`validation/thread-differential-gate.md`](validation/thread-differential-gate.md).
