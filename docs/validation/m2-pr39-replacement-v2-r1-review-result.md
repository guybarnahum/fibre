---
id: m2-pr39-replacement-v2-r1-review-result
status: hold_correction_in_progress
reviewed-head: 67404f50aa934b121670619c73b1536099dfc631
implementation-candidate: f37ba33ed82c381e20d204de69350833dabc4ba2
review-date: 2026-08-23
---

# PR #39 replacement-v2 R1 hostile review result

## Verdict

`VERDICT: HOLD`

The hostile R1 review used zero provider calls. It independently verified that the claimed implementation candidate was unchanged by the two documentation-only commits between `f37ba33...` and reviewed head `67404f5...`.

## What survived

The review found the hard redesign properties sound:

- Fibre, not the model, owns historical skeleton fields;
- the realization schema refuses model-authored time/place/structure/identity skeleton fields;
- envelope planning is deterministic and structurally genome-blind;
- place selection is constrained by the already-bound counterpart role;
- all 70 reviewed local civil instants round-trip correctly in their declared zones;
- EventStructurePool v3 preserves all 32 v2 entries exactly without widening childhood ranges;
- the age-18-to-22 coverage hole is closed in the declared fourteen-window plan;
- replacement-v1 execution authority is dead and fail-closed;
- reuse of the frozen Worlds, genomes, assignment and fresh G2 pre-life evidence remains scientifically defensible.

This is therefore a HOLD correction, not a second REDESIGN.

## Blocking findings and corrective surfaces

1. **B1 — protocol/code binding.** `redesign-v1.json` copied historical-envelope bounds without the preflight binding those values to `GENESIS_HISTORICAL_ENVELOPE_POLICY`.
   - Correction: replacement-v2 `redesign-v2.json` plus exact preflight binding.

2. **B2 — chronology/window self-consistency.** Internal gaps, overlap, or a wrong birth date could survive the old R1 preflight.
   - Correction: assert every +1 ms window seam, age seam, measured age against `bornAt`, generated-span endpoints, and inherited G4 entry chronology.

3. **B3 — EventStructure authority.** The v3 digest was printed but not pinned, and inherited v2 source drift could pass.
   - Correction: pin and assert both inherited v2 and effective v3 pool digests.

4. **B4 — timezone authority.** A plausible but geographically wrong IANA zone could pass.
   - Correction: pin and assert the five exact World→timezone bindings.

5. **B5 — D3 horizon reconciliation.** The redesigned Pass-B horizons `[4,6,8,10,12,14]` move treated ordinals 3/6 to horizons 8/14 while replacement-v1 diagnostics still named horizons 6/10.
   - Correction: freeze `g5-g6-horizon-reconciliation-v1.json`; preserve treated ordinals 3/6, five-edge D3 rule and threshold, with effective primary horizons 8/14.

6. **B6 — continuity derivation soundness.** The old neutral derivation accepted pre-introduction use, unsorted observation reversal, empty/unafforded role authority, and hard-coded guarantee booleans.
   - Correction: chronological derivation, introduction-time grounding, required introduction participation, World-afforded non-empty roles, duplicate guards, and guarantees computed from derived records.

7. **B7 — young-adult counterpart mapping.** All twelve v3 additions fell through the old v2-only counterpart policy to `present_required`, structurally biasing young-adult envelopes toward external participation.
   - Correction: counterpart-policy v2 explicitly maps v3 self-directed structures to `present_optional` and the remaining interpersonal/institutional structures to `present_required`. Coverage bounds are unchanged.

## Provider compatibility carried forward

The review also identified a same-class provider risk: `maxItems` remained provider-visible although the one-shot attempt had already demonstrated that unsupported/variant JSON-Schema behavior can terminate the cohort before a model response. The HOLD correction projects `maxItems` from OpenAI transport and locally re-enforces the canonical constraint. Other latent schema-surface questions remain R2 review obligations unless they become reachable on the replacement-v2 path.

## Authorization

The HOLD authorizes no cognition, generation, diagnostics or publication. Corrections are zero-call and pre-life only. After the corrected preflight, full tests and repository validation are locally green, request a short hostile R1 re-review. R2 remains blocked until that re-review returns CLEAR.
