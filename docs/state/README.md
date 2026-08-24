# Fibre state documents

What is true about Fibre right now.

State documents are current operational and project truth and are expected to change as accepted work lands. Updating current state must not erase the historical record of how Fibre arrived there.

## Public progress

**Canonical machine-readable source:** [`public-progress.json`](public-progress.json)  
**Human-readable companion:** [`public-progress.md`](public-progress.md)  
**Schema:** [`public-progress.schema.json`](public-progress.schema.json)

Use this when the question is:

> What has Fibre actually achieved, what has only been shown working, what are we working on, and what do we explicitly not have yet?

Every public claim has two layers:

1. **Simple English** — understandable by a teenager with no Fibre background.
2. **More accurate description** — the precise mechanism, validation boundary and important limitation.

The simple layer may remove jargon. It may not remove uncertainty, hide a failed experiment, or make the claim stronger than the accurate layer.

This is the contract intended for `insidefibre.com` and other public renderers. It distinguishes generated artifacts from living/validated Threads and distinguishes live Thread parents from household caregivers and synthetic genetic ancestors.

The public-progress contract is currently one evolving canonical contract. Do not create compatibility versions until a real external consumer requires a frozen historical shape.

## Technical current state

[`current-state.md`](current-state.md)

Use this for architecture, milestone posture, persistence surfaces, causal standing and technical boundaries. It may use Fibre-specific terminology that is inappropriate as the primary public explanation.

## Current engineering priorities

[`current-priorities.md`](current-priorities.md)

Use this for the immediate execution sequence, current experimental constraints, blockers and rules for what maintainers may or may not do next.

## Future capability map

[`future-capability-map.md`](future-capability-map.md)

Use this to preserve promising future product, service and capability boundaries without keeping empty implementation directories in the repository. A listed capability is design intent, not current architecture; recreate the implementation namespace only when real code, operations or an accepted authority boundary needs it.

## Rule

These documents are different views of the same project, not separate authorities.

If a public statement would overstate the technical evidence, **the public statement must be weakened**. If engineering progress materially changes what Fibre has achieved, `public-progress.json` and its Markdown companion should be updated as part of recording that milestone boundary rather than left for a later website rewrite.
