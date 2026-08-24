# Validation

How Fibre tests, challenges, and proves its claims.

`docs/validation/` contains the current validation instruments and concise accepted outcomes that still define Fibre's scientific or engineering standing. Placement here does not make a document canonical; frontmatter status and the governing acceptance contract remain authoritative.

## Keep here

- current acceptance and standing-gate definitions;
- reusable scenario/rubric/invariant definitions;
- current experiment-lifecycle rules;
- accepted sealed outcomes that are still cited as Fibre standing;
- active milestone validation plans while that milestone is genuinely active.

## Do not keep here merely for chronology

Intermediate candidates, superseded gate attempts, review scratch, burned development runs, and obsolete plans do not belong indefinitely in the checked-out validation tree. Git history is the default archive for those records.

If understanding a superseded validation transition still matters to current design, preserve a concise selected account under `docs/history/validation/`. If exact machine-readable bytes still have continuing scientific, replay, interoperability, or audit value, retain them under `artifacts/validation/`.

Reusable synthetic inputs belong under `fixtures/`; disposable local runs and diagnostics belong under `.fibre/`.
