# Fibre state documents

What is true about Fibre right now.

State documents are current operational and project truth and are expected to change as accepted work lands. Updating current state must not erase the historical record of how Fibre arrived there.

## Public / plain-English progress

**Canonical machine-readable source:** [`public-progress.json`](public-progress.json)  
**Human-readable companion:** [`public-progress.md`](public-progress.md)  
**Schema:** [`public-progress.schema.json`](public-progress.schema.json)

Use this when the question is:

> What has Fibre actually achieved, what has only been demonstrated, what are we working on, and what do we explicitly not have yet?

This is the contract intended for `insidefibre.com` and other public renderers. It uses ordinary language, preserves failed experiments, and states an important limitation beside every positive claim.

## Technical current state

[`current-state.md`](current-state.md)

Use this for architecture, milestone posture, persistence surfaces, causal standing and technical boundaries. It may use Fibre-specific terminology that is inappropriate as the primary public explanation.

## Current engineering priorities

[`current-priorities.md`](current-priorities.md)

Use this for the immediate execution sequence, frozen experimental constraints, blockers and rules for what maintainers may or may not do next.

## Rule

These documents are different views of the same project, not separate authorities.

If a public statement would overstate the technical evidence, **the public statement must be weakened**. If engineering progress materially changes what Fibre has achieved, `public-progress.json` should be updated as part of recording that milestone boundary rather than left for a later website rewrite.
