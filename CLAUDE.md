@AGENTS.md

# Claude-specific guidance

- Use planning mode before changing accepted Fibre concepts.
- Follow `docs/decisions/ADR-0015-fibre-centric-development.md`: advance Fibre capability first; do not recreate freeze/review ceremony for ordinary iteration.
- Follow `docs/decisions/ADR-0016-repository-retention.md`: current `HEAD` describes current Fibre; Git history is the development archive.
- Milestone #39 and its pre-#40 scientific bridge are closed; use `docs/history/milestones/pr39.md` and `docs/history/genesis-selectivity-scientific-hardening.md` for their distinct outcomes.
- "Hostile" review means adversarial review of Fibre personhood, authority, provenance, scientific validity and milestone truth—not generic cyber-security review.
- Do not update `docs/state/current-state.md` without recording the corresponding decision or completed milestone boundary.
- Promote durable architectural discoveries into current semantic repository documents; keep generated development runs disposable.
- For focused Node tests, use `node --test --test-reporter=./tools/test-infra/fibre-spec-reporter.mjs ...`; do not use bare `node --test` except when debugging reporter behavior.
