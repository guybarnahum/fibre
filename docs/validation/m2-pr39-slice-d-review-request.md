---
id: m2-pr39-slice-d-review-request
status: candidate
last-reviewed: 2026-08-18
canonical: false
---

# Milestone #39 — Slice D blocking review request

## Requested verdict

```text
CLEAR
or
HOLD
```

Review only **Slice D — Pass B autobiographical memory + Pass C durable meaning/reinterpretation**, plus direct regressions caused by the Slice-D implementation. Gate C is already closed. Do not expand scope into EventStructurePool v2/developmental ranges (Slice E), source/origin fixtures (F), cohort freeze/burn enforcement (G), conditions/endogenous motivation (#42), or #40/#41 causal standing.

## Fibre claim under review

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

A symbolic genome may influence **attention at Pass-B memory formation** on treatment calls. It may not directly author Pass-C meaning. Fibre-computed mechanical conditions and Fibre-computed semantic needs are absent from both passes.

## Slice-D implementation structure

### D1 — pass boundaries

Pass B:

- first-class `remembered` / `not_remembered` outcomes;
- direct modes `life_only` / `life_plus_genome`;
- analysis strata `life_only_unexposed`, `life_only_exposed`, `life_plus_genome`;
- clean-control status is derived from visible prior remembered-memory treatment exposure;
- treatment sees whole genome or deterministic ordinal-prefix loci only;
- no relevance selector, condition/salience input, later event, later meaning, or meaning output.

Pass C:

- always genome-blind;
- initial call sees exactly one remembered experience plus uncertainty, opaque refs and formation chronology;
- reinterpretation adds exactly one prior meaning and one bounded triggering later episode with typed relation;
- no sibling memories, underlying target-history content, genome, conditions, semantic needs, future benchmark or later-than-asOf state;
- current authored form is checked at write time; previously admitted memory/meaning text is structurally validated when later read, not re-judged under current form policy.

### D2 — canonical autobiographical-memory representation

The existing #38 autobiographical-memory ledger remains the sole memory authority. There is no `genesis_memories` or parallel meaning table.

`autobiographical_memory_v2` separates:

```text
rememberedContent
rememberedMeaning          nullable
meaningOutcome             durable_meaning | no_durable_meaning
meaningParts[]             independently citable stable IDs
```

A remembered experience may legally have `rememberedMeaning = null` and `meaningParts = []`.

Legacy #38 v1 records retain their admitted shape. A lineage cannot silently switch record formats. MeaningPart identity remains owned by the autobiographical-memory authority. A separate deterministic `meaningId` keyed by memory ref gives one durable meaning identity without creating another persistence authority.

### D3 — atomic birth publication through #38

Genesis `publishBirth()` accepts admitted v2 memories only after Pass-A life events are staged.

- memory subject must resolve to an admitted Pass-A life event, never `THREAD_SEEDED`;
- every memory revision uses the shared #38 transactional append path;
- every revision produces the normal commanded `AUTOBIOGRAPHICAL_MEMORY_RECORDED` anchor;
- first-live version includes Pass-A events plus every memory-revision anchor;
- visual-companion/photo obligations are created in the same birth transaction;
- rollback after memory append removes Thread, life events, commands, memory records/heads, anchors, visual companions and manifest together;
- v2 reinterpretation may revise meaning but may not rewrite Pass-B remembered content, uncertainty, subject period or the memory's event set.

### D4 — reinterpretation policy and characterization

Mechanical eligibility requires both:

1. trigger occurs at least 5 calendar years after the prior meaning; and
2. relation facts establish one of the allowed relations:
   - same structure/structure family;
   - same concrete person/relationship;
   - same intellectual source actually encountered.

Relation is derived from bounded fact refs with fixed precedence, not from semantic ranking.

All opportunities are evaluated before the cap. Duplicate stable opportunities are rejected. The per-Thread run cap is 3. When the cap binds, selection is deterministic by chronology then stable IDs; candidate input ordering and semantic significance cannot affect selection.

Accounting records, per Thread:

```text
reinterpretationEligibleCount
reinterpretationRunCount
reinterpretationSkippedByCapCount
eligibleOpportunityRefs[]
runOpportunityRefs[]
skippedByCapOpportunityRefs[]
```

Only a scheduled `run` opportunity can produce a Pass-C trigger. Scheduler witness facts do not enter cognition; Pass C receives only episode ref, occurredAt, bounded observable action and typed relation.

Development characterization reports rather than gates:

- events -> remembered;
- remembered -> durable meaning;
- durable -> multi-part;
- three Pass-B strata counts and remembered counts;
- evaluator annotations for ambivalence, soft prescriptiveness, sentiment coupling and self-account overreach;
- reinterpretation eligible/run/cap-skipped;
- revised/unchanged/none rates over the **run** denominator;
- repair/rejection profile.

The characterization result deliberately contains `admissionVerdict: null`. Weak or ugly quality remains measurable rather than becoming an admission failure.

## Mechanical attacks requested

Please attack the following, not merely inspect happy-path examples:

1. Can genome, a condition, a semantic need, sibling memory, underlying target event, or future state reach Pass C?
2. Can `life_only_unexposed` be mislabeled when a prior treatment-formed remembered memory is visible?
3. Can treatment loci be relevance-selected or reordered to fit current content?
4. Can `not_remembered` or `no_durable_meaning` be silently converted into required positive outcomes?
5. Can Pass-C reinterpretation rewrite remembered content rather than only meaning?
6. Can a Genesis memory cite `THREAD_SEEDED` or non-Pass-A history as its childhood subject?
7. Can Genesis bypass #38 memory digest/head/anchor/photo authority or partially publish a birth?
8. Can current content-policy evolution make already-admitted memory/meaning unreadable?
9. Can eligibility consume the cap before the complete eligible set is known?
10. Can candidate input order, semantic score/salience, conditions, or duplicate opportunities change the three selected runs?
11. Can skipped-by-cap opportunities disappear from accounting?
12. Are `revised`, `unchanged`, and `none` distinguished and measured over the run denominator?
13. Can weak characterization results reject a candidate or otherwise become survivorship pressure?
14. Is there any duplicate memory/MeaningPart authority introduced by Slice D?

## Known carry-forward, not Gate-D findings

- EventStructurePool v2 and real developmental ranges -> Slice E.
- source/origin integrity -> Slice F.
- burned-world enforcement, final treatment arithmetic/cell sizing, cohort-genome ceiling rerun, protocol freeze -> Slice G.
- long `threadId` interaction with the #37 claim-predicate byte budget -> pre-G cohort hygiene check.
- mechanical conditions/endogenous motivation -> post-#39/#42.

## Verification status

Repository execution is performed in the maintainer environment. At packet creation, D4 verification is **pending**. Do not CLEAR from this packet until the current head has a green focused run, full `npm test`, and `npm run check`.
