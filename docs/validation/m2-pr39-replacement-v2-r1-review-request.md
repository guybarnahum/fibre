---
id: m2-pr39-replacement-v2-r1-review-request
status: ready_for_external_review
reviewed-candidate: f37ba33ed82c381e20d204de69350833dabc4ba2
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 R1 hostile review request

## Verdict requested

Return exactly one top-level verdict:

`VERDICT: CLEAR | HOLD | REDESIGN`

This is a **zero-provider-call R1 substrate review**. It does not authorize replacement-v2 cognition, generation, diagnosis or publication.

## Exact reviewed candidate

The exact locally verified R1 implementation candidate is:

`f37ba33ed82c381e20d204de69350833dabc4ba2`

Local verification at that exact candidate:

- `npm run genesis:replacement-v2-redesign-preflight` → `CLEAR_R1_SUBSTRATE_PRE_REVIEW_ZERO_CALL`
- `npm test` → `721 tests · 721 passed · 0 failed`
- `npm run validate` → repository validation passed; world seed validation passed
- replacement-v2 cognition remained `NOT AUTHORIZED`
- no provider calls were made
- local preserved evidence remained untracked only at:
  - `artifacts/validation/m2-pr39/h/recovery-v1/`
  - `artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/`

Any commits after the exact candidate are intended to be documentation/review-state only. Verify that claim before reviewing the substrate.

## Why R1 exists

Replacement-v1 attempt 1 was legitimately authorized, produced ten slot-1 Pass-A history calls, then failed before the first Pass-B response on a provider schema incompatibility. Inspection of those ten episodes exposed a deeper protocol defect, so same-attempt recovery was retired and attempt 1 became a preserved REDESIGN witness.

Observed replacement-v1 pathologies included:

- 10/10 episodes at home;
- 9/10 on weekends and 7/10 on Saturdays;
- no peers, teachers, librarians, neighbors or mentors introduced;
- repeated family disagreement/scarcity/access patterns;
- UTC/local-daypart inconsistencies;
- model control over time/place/structure selection;
- participant-role facts and situated place history not guaranteed to survive birth;
- a four-year age-18-to-22 pre-entry gap;
- sparse generated episodes being liable to mistaken frequency interpretation downstream.

R1 is meant to repair those classes **before another model call exists**.

## R1 substrate under review

Primary protocol:

`artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v1.json`

Place-affordance authority:

`artifacts/validation/m2-pr39/replacement-v2/protocol/place-affordance-bindings-v1.json`

Implementation surfaces:

- `services/world-kernel/src/genesis-historical-envelope-v1.mjs`
- `services/world-kernel/src/genesis-historical-realization-v1.mjs`
- `services/world-kernel/src/genesis-event-structure-pool-v3.mjs`
- `services/world-kernel/src/genesis-life-continuity-v1.mjs`
- `tools/genesis/genesis-replacement-v2-redesign-preflight.mjs`

Relevant tests:

- `services/world-kernel/test/genesis-historical-envelope-v1.test.mjs`
- `services/world-kernel/test/genesis-historical-realization-v1.test.mjs`
- `services/world-kernel/test/genesis-event-structure-pool-v3.test.mjs`
- `services/world-kernel/test/genesis-life-continuity-v1.test.mjs`
- `tools/genesis/genesis-replacement-v2-redesign-preflight.test.mjs`

Historical fail-closed tests must also remain meaningful:

- `tools/genesis/genesis-replacement-final-cohort.test.mjs`
- `tools/genesis/genesis-replacement-gate-g2-closure-verify.test.mjs`

## R1 invariants to attack

### 1. Attempt-1 retirement and freshness

Verify mechanically that:

- replacement-v1 attempt 1 remains preserved evidence;
- same-attempt recovery is retired;
- none of its ten Pass-A episodes can be reused in replacement-v2;
- replacement-v2 uses fresh offer/envelope/model-request/output namespaces;
- the replacement-v2 output root is absent;
- no runner or command can currently perform replacement-v2 cognition.

A reachable path to reuse old generated history or call a provider is blocking.

### 2. Fibre owns the historical skeleton

Verify that the model-facing historical realization output cannot author or alter:

- episode identity;
- `occurredAt`;
- age;
- place;
- EventStructure/world-emergent classification;
- required counterpart identity;
- required counterpart introduction time.

The realization output should be limited to observable event realization plus bounded optional additions. Fibre must mechanically stamp the historical skeleton from the envelope.

Mutation test suggestion: add a forbidden skeleton field such as `occurredAt` or `placeRef` to model output and verify rejection before materialization.

### 3. Deterministic, content-independent envelope selection

Verify that envelope planning may read only frozen factual World/roster/window/EventStructure affordances and fixed seed domains. It must not read:

- genome values;
- replacement-v1 generated episode content;
- desired personality/meaning;
- diagnostic targets;
- prior generated replacement-v2 episode semantics.

Verify determinism by rebuilding each plan repeatedly and comparing digests.

### 4. Coverage bounds and anti-collapse behavior

At the exact candidate, the five real plans reported:

- all five Worlds used all 5 places;
- 11–12 distinct structures across 14 envelopes;
- max structure use 1–2;
- exactly 2 world-emergent envelopes;
- max weekday use 3;
- max daypart use 4;
- external counterpart opportunities 7, 10, 10, 8, 10;
- external role variety 2–3;
- generated external people 2–3.

Required frozen bounds are at least 4 distinct places, max 4 uses/place, max 2 uses/structure, max 3 uses/weekday, max 4 uses/daypart, exactly 2 world-emergent, at least 5 external counterpart opportunities, at least 2 external role classes.

Attack whether these bounds are actually enforced rather than merely observed.

Also judge whether the observed **7–10 external-counterpart opportunities out of 14** is a defensible neutral consequence of the preregistered mechanism or an overcorrection that biases the sample toward social events. Do **not** recommend tuning from observed life quality; if you think the mechanism itself is structurally biased, say so as a protocol finding.

### 5. Place/counterpart compatibility

Verify every place-affordance role is already in that frozen World's `affordedRoles` vocabulary and every placeRef belongs to that World.

Attack role/place mismatches and ensure no aliasing silently converts one role to another.

Verify the envelope chooses a place compatible with the selected required counterpart rather than independently hashing place and counterpart.

### 6. Local civil-time authority

For all five IANA zones:

- `Asia/Tbilisi`
- `Asia/Taipei`
- `America/Recife`
- `Africa/Casablanca`
- `Australia/Hobart`

verify UTC↔local conversion across ordinary and DST-sensitive dates where applicable.

Attack ambiguous/nonexistent local times and timezone changes. A selected envelope must have one valid exact instant, local date, weekday and daypart.

Verify model narration that contradicts the envelope's local weekday/daypart is rejected rather than silently accepted.

### 7. EventStructurePool v3 preservation and age 18–22 coverage

Verify v3 preserves every v2 structure semantically and byte-equivalently in its inherited representation and only adds the intended portable young-adult affordances.

Verify old childhood structures are not stretched beyond their reviewed developmental range merely to fill ages 18–22.

Verify the 14 windows cover age 6 through immediately before age-22 entry with no chronology gap/overlap material enough to create an uncovered developmental period.

### 8. Sparse-history semantics

Replacement-v2 history is explicitly a sparse coverage-oriented sample, not a frequency sample.

Verify the canonical notice and protocol prohibit downstream inference that:

- repetition in the sampled episodes proves real-life dominance/frequency;
- absence from the sample proves non-occurrence.

R2 will wire this into Pass B; R1 should at least freeze the correct invariant now.

### 9. Social identity continuity derivation

Review `genesis-life-continuity-v1` as a neutral derivation substrate, not yet a persistence ontology.

Verify that:

- every participant in an admitted episode can resolve to role authority from the initial roster or an explicit introduction;
- introduced role identity survives derivation;
- no participant becomes an opaque ID;
- every used place resolves to the frozen World;
- continuity is grounded in actual admitted episode evidence.

R1 does **not** claim the final relationship vocabulary or birth persistence integration is complete. Missing atomic persistence belongs to R2 and should be treated as blocking for execution, but not necessarily as an R1 failure if the neutral derivation substrate is sound.

### 10. Old authorization must remain dead

The consumed replacement-v1 Gate-G(2) CLEAR must not silently become runnable again.

Verify the historical replacement-v1 tests now prove fail-closed post-CLEAR drift rather than weakening the old gate to pass after redesign source changes.

### 11. Starting-material reuse boundary

R1 reuses the five frozen replacement-v1 Worlds, genomes and World/genome mapping as pre-life starting material, but burns all generated replacement-v1 life output.

Judge whether this is scientifically defensible given that:

- replacement-v1 produced no Pass-B response, meaning, diagnostic, publication or live Thread;
- no genome or World value was changed after observing the failed history;
- the new historical compiler is generic and content-independent;
- offer/envelope/model-request/output namespaces are fresh.

If you find contamination that makes those pre-life materials unusable, that is REDESIGN-level.

## Required mutation / adversarial checks

Use zero provider calls. At minimum try to make the preflight or substrate accept each of the following and verify it refuses:

1. model output contains `occurredAt`;
2. model output contains `placeRef` or `structureRef`;
3. place-affordance role not in World `affordedRoles`;
4. placeRef from another World;
5. lower distinct-place coverage below the frozen bound;
6. exceed max structure/place/weekday/daypart use;
7. reduce external social coverage below the frozen minimum;
8. change a timezone;
9. make local narration contradict envelope daypart/weekday;
10. mutate inherited v2 EventStructure material inside v3;
11. create an age-18-to-22 gap;
12. make replacement-v2 output root collide with replacement-v1 attempt root;
13. make old generated attempt-1 history reusable;
14. introduce a provider-call path or runner before R1 authorization exists.

## What R1 CLEAR would authorize

R1 CLEAR authorizes **R2 implementation only**:

- build the replacement-v2 runner around the reviewed envelope/realization substrate;
- wire sparse-history semantics into Pass B;
- design and implement atomic durable participant/place continuity at birth;
- bind OpenAI schema projection/local canonical enforcement into the new execution authority;
- create an R2 zero-call execution review packet.

R1 CLEAR does **not** authorize:

- any provider/model call;
- replacement-v2 generation;
- diagnostics;
- publication;
- use of replacement-v1 generated life as replacement-v2 input.

## Required response structure

Return:

`VERDICT: CLEAR | HOLD | REDESIGN`

Then sections:

- R1 substrate judgment
- Skeleton-ownership judgment
- Determinism / contamination judgment
- Coverage and anti-collapse judgment
- Place / social-role compatibility judgment
- Local-time judgment
- EventStructure v3 / developmental-span judgment
- Sparse-history judgment
- Continuity-derivation judgment
- Old-gate fail-closed judgment
- Starting-material reuse judgment
- Mutation-test results
- Nonblocking findings / R2 obligations
- Freshness / zero-provider-call check
- What the verdict authorizes
