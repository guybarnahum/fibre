---
id: adr-0014
status: accepted
date: 2026-08-23
---

# ADR-0014: The repository represents current Fibre, not development archaeology

## Context

Fibre uses experiments, adversarial reviews, frozen packets, generated cohorts and temporary gates while developing difficult personhood machinery. During PR #39 this material began accumulating in the normal repository tree and, in several cases, old frozen-state assertions started blocking intentional improvements to the current compiler.

Git already preserves the commit history that explains how the system evolved. Keeping every intermediate artifact, executable generation stack and review witness in the current tree duplicates that history and makes obsolete development states look like supported Fibre architecture.

## Decision

The checked-out Fibre repository represents **the current system and the durable decisions needed to understand, build, test and evolve it**.

Keep in the current tree:

1. Canonical vision, foundations, ADRs and current architecture documentation.
2. The one current implementation of each live behavior, including schemas and migrations.
3. Current fixtures/configuration that are genuine inputs to development, tests or reproducible examples.
4. Active behavioral invariants that protect Fibre semantics.
5. Compatibility or migration logic only when real persisted data, deployed APIs or supported users require it.
6. A concise final outcome record for a completed milestone when the result materially establishes what Fibre can do or why an architectural decision exists.

Do not retain in the current tree merely for historical completeness:

- intermediate frozen protocol packets, bindings, one-shot guards or authorization witnesses;
- failed or superseded generated cohorts and ordinary development outputs;
- superseded review requests/results whose useful conclusions are already captured in current decisions or milestone outcome;
- obsolete preflight/gate/freeze CLIs and parallel legacy implementations;
- tests whose only purpose is to reproduce hashes or state of an obsolete packet;
- temporary calibration, repair or investigation fixtures after their enduring lesson has moved into current code/tests/docs.

Generated development state belongs under ignored `.fibre/` or external artifact storage, not normal source control.

Deletion from the current tree is not deletion of project history: normal Git history remains the archive. Do not rewrite Git history merely to make the repository look cleaner.

## Milestone close rule

At milestone close, perform a retention pass:

1. Move any still-live input that is hiding under `artifacts/validation/` into a normal current fixture/configuration location.
2. Consolidate enduring behavioral assertions into the active suite.
3. Write or update one concise milestone outcome describing capability, important limitations and the relevant final commit.
4. Delete superseded evidence, runners, protocols and review-state tests from the current tree.
5. Keep legacy execution paths only when a concrete compatibility obligation is named.

## Consequences

- Fibre should normally have one current Genesis path rather than `v1`, `v2`, recovery and reviewed variants all remaining executable.
- Improving a current prompt or compiler should not require re-freezing obsolete packets merely to keep the normal test suite green.
- Review evidence may be useful while a milestone is being judged, but it is temporary by default.
- The burden of proof is reversed: a historical artifact needs a reason to stay in HEAD; deletion does not need a special justification once its durable lesson is represented elsewhere.
