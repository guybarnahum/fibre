# Contributing to Fibre

Fibre is currently a private research and product repository (**All rights reserved**). Contributors and AI agents must follow [`AGENTS.md`](AGENTS.md).

## Validation

During development, run focused tests:

```bash
npm run test:focused -- core/test/body-level.test.mjs
```

At slice completion, run **only** the single repository validation command:

```bash
npm run slice:validate
```

Do not stack `npm run check`, `npm run test:all`, and `npm run validate` after one another — `slice:validate` already checks includes, prompts, TypeScript build, the full test suite, context packs, repository links, World seed, and deployment manifests.

## Test discipline ("Less is more")

- Tests must prove **Fibre semantics** (identity, history, consent, agency, continuity, authority, recovery), not brittle implementation trivia (exact prose fragments, hardcoded commit SHAs, HTTP plumbing, or DOM snapshots).
- Prefer one thematic invariant proof over several narrow helper assertions.
- Follow [`docs/validation/test-lifecycle-best-practice.md`](docs/validation/test-lifecycle-best-practice.md) when classifying tests as permanent, regression, or milestone-scoped.

## Change checklist

For changes in scope of the **Vision and ambition guard** ([`AGENTS.md`](AGENTS.md)):

1. Which Fibre capability does this prove or advance?
2. Which invariant supports or constrains it?
3. What observable behavior or future possibility changes (not merely stored/prompted)?
4. Which capabilities are deferred, and where are they recorded?
5. Which ADR records any durable decision?
6. Is `npm run slice:validate` green with zero secret/private-state leaks?

## Development versioning & retention

- Prefer one current implementation; do not keep obsolete `v2`/`v3` branches without a real persisted-data or wire-compatibility boundary.
- Follow [ADR-0016](docs/decisions/ADR-0016-repository-retention.md): `HEAD` describes current Fibre; Git history is the archive. Remove superseded milestone logs rather than letting them accumulate.
- Never treat a compelling LLM-generated proposal as accepted merely because it is well written.
