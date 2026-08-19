---
id: m2-pr39-slice-d-gate-d-result
status: accepted
last-reviewed: 2026-08-18
canonical: false
---

# Milestone #39 — Slice D Gate D result

## Verdict

**CLEAR**

Gate D closes. Slice E is unblocked.

Review head: `a8f5cda8ce755322d9cd81fee0e046b6547fd0e6`

Tested implementation head: `faf8f7b846c8e0c40cb9c1da3e98e1e40b6e0ab8`

Maintainer and hostile-review verification:

- full repository tests: **504/504 pass**;
- `npm run check`: green;
- hostile reviewer independently reran the suite and attacked all fourteen named Gate-D boundaries;
- four guards were mutation-tested to prove the corresponding tests are load-bearing.

## Gate-D standing

Slice D establishes and mechanically separates:

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

Pass B remains memory-only, with treatment/control exposure mechanically derived and cross-checked. Pass C remains one-memory-scoped and genome-blind, cannot reread target history, cannot see sibling memories or conditions/semantic needs, and may revise meaning without rewriting the Pass-B recollection. Genesis publishes memories through the existing #38 authority with shared digest/head/anchor/photo mechanics and atomic rollback. Reinterpretation eligibility is mechanical, computed before a deterministic per-Thread run cap, and characterization remains measurement-only with `admissionVerdict: null`.

## Deferred observation O1 — required before Slice G freeze

The hostile review reproduced a pre-existing #38 read-policy-drift property: reading an already-admitted autobiographical-memory record re-runs the current content-policy validator. Tightening a future v1/v2 content bound can therefore strand old admitted memory records.

This predates Slice D and is not a Gate-D blocker, but Slice D widens the surface because v2 policy constants may evolve during E/F development. Resolve **before the Slice-G protocol freeze**.

Expected repair shape: historical read paths dispatch by recorded format and structural shape without re-applying mutable current content/form limits; write paths continue to enforce current admission policy. Canonical JSON, revision digest chains, lineage heads, anchors and replay remain the tamper/integrity boundary.

Treat this as a G preflight obligation alongside the existing long-Thread-ID/#37 claim-predicate budget check.

## Scope discipline

The CLEAR does not review or close:

- Slice E EventStructurePool v2, developmental richness or intellectual formation;
- Slice F origin/source integrity;
- Slice G cohort burn/freeze, treatment arithmetic, actual cohort-genome ceiling or O1 repair;
- #40/#41 causal standing;
- #42 conditions/endogenous motivation.
