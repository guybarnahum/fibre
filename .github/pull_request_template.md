## Summary

## Fibre impact

- Which concept or architecture changes?
- Which invariant supports or conflicts with this?
- Which canonical scenario demonstrates it?
- What observable behavior should change?
- What human-inspectable artifact demonstrates it?
- What drift risk does it introduce?
- Which ADR records the durable decision?

## Ambition assessment

Required for concept, architecture, experiment, and implementation changes. See **Vision and ambition guard** in [`AGENTS.md`](../AGENTS.md).

- Which Fibre capability does this prove or enable?
- Which capabilities are deferred, and where is each deferral recorded?
- Which extension path stays open for each deferred capability?
- Which shortcuts are temporary, and what would reverse them?
- Does any choice create a permanent constraint? If so, which ADR records it?

## Verification

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run validate`
- [ ] Documentation and scenarios updated
