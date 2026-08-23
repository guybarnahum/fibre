---
id: m2-pr39-replacement-v2-r1-rereview-request
status: ready_for_external_review
reviewed-candidate: ef9a1bf399280dc3f33a73490f91d3e63c3198d0
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 R1 corrected hostile re-review request

## Verdict requested

Return exactly one top-level verdict:

`VERDICT: CLEAR | HOLD | REDESIGN`

This is a **zero-provider-call corrected R1 substrate re-review**. It does not authorize replacement-v2 cognition, generation, diagnosis or publication.

## Exact candidate

Review exact candidate:

`ef9a1bf399280dc3f33a73490f91d3e63c3198d0`

Local verification at that exact candidate:

- `npm run genesis:replacement-v2-redesign-preflight` → `CLEAR_R1_HOLD_CORRECTION_PRE_REVIEW_ZERO_CALL`
- `npm test` → `700 tests · 700 passed · 0 failed`
- `npm run validate` → repository validation passed; world seed validation passed
- replacement-v2 cognition remained `NOT AUTHORIZED`
- no provider calls were made
- preserved local evidence remained untracked only at:
  - `artifacts/validation/m2-pr39/h/recovery-v1/`
  - `artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/`

The five envelope digests at the corrected candidate are:

1. Tbilisi `sha256:7ae30e399e6fac72733a43695d6aa8115243067b385710814c0d707b40667110`
2. Kaohsiung `sha256:3a642987f93d308497e84002f5c2aa5b166928c04300d963e31e059567b4e319`
3. Recife `sha256:8ce61436aef530df6e940fe246db86f7d03485746bb33d7a3a93b467df797e0e`
4. Fès `sha256:473ac1dc4680739a39ae6975a47e656ecf7a6dca2bf4987176a249f5db58ad46`
5. Hobart `sha256:3d3e2c74b1063aa53ff8e3c72f916f6bece5963b33a8bcf0f46b1230b512a1c7`

## Prior verdict and scope

The first R1 hostile review returned HOLD, not REDESIGN. Preserve its report as historical evidence:

`docs/validation/m2-pr39-replacement-v2-r1-review-result.md`

The hard architecture survived that review: Fibre-owned skeleton, genome-blind deterministic envelopes, place/role coupling, local civil time, inherited childhood EventStructure semantics, age-18-to-22 coverage, and pre-life starting-material reuse.

Re-review the HOLD blockers B1-B7 plus the OpenAI `maxItems` provider-risk correction. Do not reopen already-surviving architecture without a concrete new finding.

## Development flattening since the first review

Fibre has no deployed or migrated Genesis data requiring runtime compatibility with failed H2/replacement-v1 experiments. The branch therefore intentionally removed obsolete executable compatibility/history stacks rather than preserving them merely to reproduce retired experimental inputs.

Removed executable surfaces include:

- H2 final-cohort execution and schema-compatibility bridge;
- H2 recovery state/plan/sequencer/orchestrator/CLI and tests;
- historical Pass-A continuation runtime created only for H2 recovery;
- replacement-v1 final-cohort runner/core;
- replacement-v1 mechanical-recovery preflight;
- replacement-v1 inherited-authority executable wrapper;
- replacement-v1 Gate-G(2) executable verifier/tests.

Frozen artifacts, digests, protocols and review documents remain the historical evidence. Do **not** require restoration of deleted runtimes solely for byte-level backward compatibility with undeployed experiments.

The development rule is recorded in `CONTRIBUTING.md`: one current implementation by default; parallel executable versions require a real persisted-data, wire/API or migration compatibility boundary.

A deletion is blocking only if it removed a current invariant, made replacement-v2 less fail-closed, destroyed necessary evidence, or removed a verifier that replacement-v2 actually requires.

## Corrected authority

Primary corrected protocol:

`artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v2.json`

Preserve reviewed `redesign-v1.json` unchanged as prior evidence.

Additional authority:

- `artifacts/validation/m2-pr39/replacement-v2/protocol/place-affordance-bindings-v1.json`
- `artifacts/validation/m2-pr39/replacement-v2/protocol/g5-g6-horizon-reconciliation-v1.json`

Primary current implementation surfaces:

- `services/world-kernel/src/genesis-historical-envelope-v1.mjs`
- `services/world-kernel/src/genesis-historical-realization-v1.mjs`
- `services/world-kernel/src/genesis-event-structure-pool-v3.mjs`
- `services/world-kernel/src/genesis-rich-participation-policy.mjs`
- `services/world-kernel/src/genesis-life-continuity-v1.mjs`
- `services/world-kernel/src/model-runtime/openai.mjs`
- `tools/genesis/genesis-replacement-v2-redesign-preflight.mjs`

## Re-review blockers

### B1 — protocol/code binding

Verify every historical-envelope policy field in corrected protocol is compared to the implementation that enforces it. Repeat the prior mutations:

- `minimumDistinctPlaces: 4 -> 9`;
- repetition caps loosened;
- external-social minima changed;
- implementation path changed.

All must fail preflight before any cognition path exists.

### B2 — chronology and developmental span binding

Verify all 14 windows are internally contiguous at exact +1 ms seams, age-contiguous, consistent with `bornAt`, and consistent with inherited entry age/stage/chronology.

Repeat attacks:

- introduce an internal multi-year gap while preserving endpoints;
- change `bornAt` while retaining superficially plausible windows;
- overlap adjacent windows.

All must fail.

### B3 — EventStructure source authority

Verify inherited EventStructurePool-v2 and effective v3 digests are both pinned by corrected preflight. Mutating a v2 structure at its source must fail even if v3 otherwise rebuilds coherently.

Confirm v3 still does not widen childhood developmental ranges.

### B4 — exact timezone authority

Verify exact World→IANA bindings, not just valid IANA syntax. Replacing Tbilisi with `America/New_York` or another valid but wrong zone must fail.

Retain the prior 70-envelope local-time round-trip checks, including DST-sensitive worlds.

### B5 — G5/G6 horizon reconciliation

Review `g5-g6-horizon-reconciliation-v1.json`.

The six-call treatment pattern remains `L L T L L T`; treated ordinals remain 3 and 6. Replacement-v2 history horizons are `4,6,8,10,12,14`, therefore treated primary horizons are now 8 and 14.

Verify this is an explicit pre-life translation rather than silent diagnostic drift. The five-edge D3 decision rule remains unchanged: both treated primary ordinals at least 4/5 and at least one 5/5. No threshold tuning is permitted.

### B6 — continuity derivation

Attack `genesis-life-continuity-v1` with:

- participant used before its `introducedAt`;
- unsorted episode input;
- introduced person that does not participate in introducing episode;
- empty role authority;
- role not afforded by the World (for example `galactic_emperor`);
- duplicate episode/participant evidence;
- unknown place or participant.

Verify derived guarantees are computed from validated evidence rather than hard-coded true.

R1 still does not claim final persistence ontology; atomic publication remains an R2 blocker.

### B7 — young-adult counterpart-mode omission

Verify every new v3 structure has explicit/reviewable counterpart semantics consistent with its own `accessModes`.

Structures with `self_directed` access must not be forced to `present_required` merely because a mapping entry is absent. Interpersonal structures must still require counterparts.

Do not change the frozen coverage minimum to compensate for observed plan output.

Observed corrected external-opportunity counts are 7, 9, 8, 7, 9 out of 14. Judge the mechanism, not whether those particular numbers look aesthetically preferable.

### B8 — OpenAI schema projection / local canonical enforcement

The failed replacement-v1 attempt demonstrated that provider JSON-schema support cannot be assumed.

Verify the OpenAI transport projection removes unsupported/risky `uniqueItems`, `minLength`, `maxLength`, and `maxItems` from the provider-facing schema while preserving the canonical Fibre schema used for identity/provenance.

Verify local canonical validation still enforces every removed constraint, especially `maxItems` and uniqueness. A provider-compatible projection must never weaken Fibre semantics.

## Starting-material and retired-evidence boundary

Verify the five Worlds, genomes, mapping and fresh G2 results remain unchanged pre-life material. Replacement-v1 generated Pass-A history remains burned and non-reusable.

Because the old executable replacement-v1 runner has intentionally been deleted, inspect frozen artifacts/docs and the current replacement-v2 preflight for this boundary. Do not treat absence of an obsolete runner as a failure by itself.

A reachable path that consumes replacement-v1 generated life, changes World/genome values, changes assignment, or permits a provider call before R2 authorization is blocking.

## Required adversarial checks

Use zero provider calls. At minimum rerun or reproduce:

1. every B1 protocol mutation above;
2. internal chronology gap, overlap and bornAt drift;
3. source-v2 EventStructure mutation;
4. valid-but-wrong timezone mutation;
5. all continuity introduction/role/evidence attacks;
6. v3 counterpart-mode census against structure `accessModes`;
7. model realization attempts to return skeleton fields;
8. provider-facing schema contains none of the projected keywords;
9. local canonical validator rejects violations of projected constraints;
10. replacement-v1 generated-history reuse attempt;
11. any reachable provider/model invocation from R1/preflight.

Also verify deterministic rebuilds of all five corrected plans produce exactly one digest per slot.

## What CLEAR authorizes

R1 CLEAR authorizes **R2 implementation only**:

- build the current replacement runner around the reviewed envelope/realization substrate;
- wire sparse-history semantics into Pass B;
- design and implement atomic durable participant/place continuity at birth;
- bind provider-schema projection/local canonical enforcement into execution authority;
- create the complete zero-call R2 execution review packet.

R1 CLEAR does **not** authorize any provider call, replacement-v2 generation, diagnostics, publication or reuse of replacement-v1 generated life.

## Required response structure

Return:

`VERDICT: CLEAR | HOLD | REDESIGN`

Then sections:

- Corrected R1 judgment
- B1 protocol/code binding
- B2 chronology/developmental span
- B3 EventStructure authority
- B4 timezone authority
- B5 diagnostic-horizon reconciliation
- B6 continuity derivation
- B7 counterpart-mode correction
- B8 provider-schema projection
- Development-flattening / deleted-runtime judgment
- Starting-material reuse judgment
- Mutation-test results
- Nonblocking findings / R2 obligations
- Freshness / zero-provider-call check
- What the verdict authorizes
