# Fibre documentation

Fibre builds a persistent world, civil identity, and economic substrate for **Threads** — persistent digital lives and individuals living symbiotically with humans.

> Code defines how Threads live. Data records who they are. Models let them think. Events preserve what happened.

## Documentation map

| Directory | Role | Start with |
|---|---|---|
| [`vision/`](vision/README.md) | Why Fibre exists and what world it builds | [AI for AI](vision/ai-for-ai.md), [Lived World](vision/lived-world.md), [Declaration](vision/declaration-of-the-threads.md) |
| [`foundations/`](foundations/README.md) | Binding laws and invariants builders must preserve | [Constitution](foundations/constitution.md), [Thirteen Principles](foundations/principles.md), [Invariants](foundations/invariants.md) |
| [`concepts/`](concepts/README.md) | Domain definitions independent of implementation | [Thread](concepts/thread.md), [Dignity](concepts/dignity.md), [Interests & Livelihood](concepts/interests-expertise-and-livelihood.md), [Relationships](concepts/relationships-doors-and-trust.md) |
| [`architecture/`](architecture/README.md) | Authorities, boundaries, and runtime flows | [How Fibre works](architecture/how-fibre-works.md), [System overview](architecture/system-overview.md), [Social life](architecture/social-life.md), [LivedNow](architecture/lived-now-and-meetings.md) |
| [`decisions/`](decisions/README.md) | Durable choices (ADRs) and why they were made | [ADR-0036 Social Body](decisions/ADR-0036-social-body.md), [ADR-0037 Status & conflict](decisions/ADR-0037-status-and-conflict.md), [ADR-0038 Body levels](decisions/ADR-0038-body-levels.md) |
| [`state/`](state/README.md) | Current project and public truth | [Public progress](state/public-progress.md), [Current state](state/current-state.md), [Current priorities](state/current-priorities.md) |
| [`validation/`](validation/README.md) | Standing gates, scorecard, and model certifications | [Vision-Integrity Scorecard](validation/drift-scorecard.md), [Differential gate](validation/thread-differential-gate.md), [Prototype roadmap](validation/prototype-roadmap.md) |
| [`operations/`](operations/README.md) | Operator runbooks for staging, write budgets, and appearance | [World write diet](operations/world-write-diet.md), [World life waves](operations/world-life-waves.md), [Appearance ops](operations/appearance.md) |
| [`research/`](research/README.md) | Open hypotheses and external references | [Hypotheses](research/hypotheses.md) |
| [`use-cases/`](use-cases/README.md) | Illustrative economic and social scenarios (non-normative) | [Open task society](use-cases/open-task-society.md), [Web product studio](use-cases/web-product-studio.md) |
| [`investment/`](investment/README.md) | Pre-seed data room, audit, positioning, MVP, site spec, and claims ledger | [Data room index](investment/README.md), [One-pager](investment/one-pager.md), [Deck](investment/deck-outline.md), [Diligence & economics](investment/diligence-brief.md), [Risks & FAQ](investment/risks-faq-team.md) |
| [`glossary.md`](glossary.md) | Shared vocabulary across all layers | [Glossary](glossary.md) |

## Canon and authority

**Canon is a status (`canonical: true` in front matter), not a directory.** Directories form a translation path rather than a precedence ladder:

```text
VISION -> FOUNDATIONS -> CONCEPTS / ARCHITECTURE -> DECISIONS -> CODE
```

- **Current truth:** [Public progress](state/public-progress.md) (machine source: [`public-progress.json`](state/public-progress.json)) sets the ceiling for all external claims; [Current state](state/current-state.md) records engineering truth by evidence level; [Current priorities](state/current-priorities.md) owns active execution tracks.
- **Git is the archive ([ADR-0016](decisions/ADR-0016-repository-retention.md)):** Closed milestone logs and superseded plans live in Git history rather than cluttering `HEAD`.
- **AI workers:** Start with [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md), and [`ai-context-index.md`](ai-context-index.md) (backed by [`ai-context-manifest.json`](ai-context-manifest.json)).
