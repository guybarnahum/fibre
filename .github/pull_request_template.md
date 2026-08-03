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

Required unless this change neither defers a capability nor moves a domain boundary. See **Vision and ambition guard** in [`AGENTS.md`](../AGENTS.md).

- Which Fibre capability does this prove or enable?
- Which capabilities does it deliberately exclude, what is the status of each (deferred / experimental / rejected / permanent constraint), and where is each recorded?
- Which extension path stays open for each deferred capability?
- Which shortcuts are temporary, and what would reverse them?
- Does any choice create a permanent constraint? If so, which ADR records it?

### Review questions

- Does this keep a credible extension path for every preserved ambition path? Name any path it closes.
- If an alternative that preserved more of those paths was considered, why was it not chosen?
- Is a conventional workflow, assistant, persona, or SaaS architecture being mistaken for the Fibre end state?
- Does engineering convenience risk redefining an accepted concept?

## Verification

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run validate`
- [ ] Documentation and scenarios updated
