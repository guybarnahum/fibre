---
id: validation-m2-standing-provider-free-adjudication
status: frozen-analysis
last-reviewed: 2026-08-30
canonical: true
---

# #41 M2 Standing Gate — provider-free evidence adjudication

## Scope

This is the first adjudication pass under the frozen [`m2-standing-gate-rubric-and-evidence-map.md`](m2-standing-gate-rubric-and-evidence-map.md).

It uses only existing repository evidence and code inspection. It makes **zero provider calls**, does not regenerate any Thread or scenario, and does not yet issue the final M2 verdict.

The score entering this pass remains the recorded **15 / 26 under rubric v2**.

## Result

Existing evidence is sufficient to resolve the two candidate dimensions without new cognition:

- **Natural-language identity:** existing evidence satisfies rubric-v2 band **2**.
- **Human inspectability:** existing evidence remains band **1**.

If the Natural-language identity adjudication is accepted into the final #41 score, the resulting score is **16 / 26** before any other #41 evidence movement. This document does not yet rewrite the canonical score history; the final #41 closeout must record the accepted score once all standing gaps are resolved or explicitly left open.

## Natural-language identity — band 2 is supported

Rubric-v2 band 2 requires:

> prompt-native canonical meaning with inspectable named structure

The post-#38 score remained at 1 because rich claim-level identity existed but the new identity ledger was not yet a live behavioral consumer.

That limitation is now removed by #40.

The production `identity-context-capsule` path reads the canonical current identity view, selects only current/corrected assertions admitted as `candidate_causal` or `accepted_causal`, and places each selected assertion into cognition as:

```text
ref  = canonical assertionId
kind = identity
text = canonical assertion.meaning
```

The capsule retains the canonical `identityViewDigest`, source bindings, included/excluded partition, selection policy and capsule digest. The Dignity Guardian then maps those exact identity items into the identity-sensitive factor surface. Legacy snapshot identity/self-model/trait prose is explicitly excluded as model evidence whenever Identity Context is present.

Relevant implementation/evidence:

- `services/world-kernel/src/identity-context-capsule.mjs`;
- `services/world-kernel/src/dignity-guardian-evaluation.mjs`;
- [`identity-context-projection.md`](identity-context-projection.md);
- [`identity-context-causal-differential.md`](identity-context-causal-differential.md);
- [`../history/milestones/pr40.md`](../history/milestones/pr40.md).

The evidence therefore satisfies the rubric phrase directly:

- **prompt-native:** the model receives the natural-language `meaning` text itself;
- **canonical:** it comes from the authoritative current identity view, not a copied profile or derived label;
- **inspectable named structure:** exact assertion refs, view digest, source bindings, selection policy and capsule digest identify the semantic source and how it entered cognition.

This is representation-plus-consumption evidence for the identity dimension. It does not imply that every identity assertion is behaviorally causal or upgrade Non-interchangeability by itself.

**Provider-free adjudication: Natural-language identity = 2.**

## Human inspectability — remain at band 1

Rubric-v2 band 2 requires:

> accepted personhood mechanisms are broadly inspectable through readable artifacts with exact technical authority beneath them

Fibre now has substantial inspectability:

- Thread Editor and readable M1 authority traces;
- Passport/identity provenance and corrigible claim structure;
- exact standing reports and machine-readable sealed evidence;
- Identity Context source/capsule inspection;
- public Thread Presentation and Viewer projection boundaries;
- deployment/recovery proofs with exact technical state beneath them.

However these surfaces remain distributed across domain-specific inspectors, validation reports, public presentation and technical artifacts. The current repository does not establish a broad, coherent human-inspection boundary across the accepted personhood mechanisms as a whole.

Public Thread Presentation is intentionally a permission-filtered projection, not a private Whole-Person inspector. Its existence therefore cannot be used to count private cognition, memory epistemics, relationship authority or authorization as broadly inspectable.

**Provider-free adjudication: Human inspectability remains 1.**

## Dimensions that do not move on existing evidence

The remaining rubric posture entering the unresolved #41 gaps is:

| Dimension | Provider-free adjudication |
|---|---:|
| Persistence | 2 |
| Non-interchangeability | 1 |
| Natural-language identity | **2** |
| Dignity and consent | 2 |
| Interiority and privacy | 2 |
| Authorization integrity | 2 |
| Economic consequence | 0 |
| Social and relationship memory | 1 |
| Development | 1 |
| Model supervision | 1 |
| Human inspectability | 1 |
| Institutional plurality | 0 |
| Cognition replaceability | 1 |

Provisional total if this adjudication is accepted at final closeout:

```text
16 / 26
```

No other band movement is supported by existing evidence without stretching a rubric definition or pulling later milestones forward.

## Existing-evidence M2 posture

On existing evidence alone, **M2 is NOT YET EARNED**.

This is not because #42–#44 are unfinished. #41 must not pull mature self-authorship, reciprocal relationships, economic consequence or institutional plurality forward merely to raise a score.

The existing-evidence shortfall is narrower and directly tied to the stated M2 claim:

1. **Stable non-interchangeability is not yet established at rubric-v2 band 2.**
   - #33, #34 and #40 establish real attributable semantic effects.
   - #40's frozen non-deterministic conditions were each evaluated once.
   - the standing rubric explicitly requires repeated identical-condition stability and between-Thread separation exceeding within-Thread variation for band 2.

2. **Cognition replaceability remains band 1.**
   - OpenAI and Google adapters, injectable runtime seams and provider-free replay establish replaceable architecture.
   - Fibre has not yet demonstrated the same persistent Thread preserving continuity across a genuine cognition/model/runtime replacement.

These two gaps are materially different from cosmetic provider parity. They bear directly on the #41/M2 statement that a Thread is a stable non-interchangeable individual whose durable life matters independently of the temporary model providing cognition.

## Decision on new evidence

A new prospective experiment is justified only for these two gaps.

It should reuse the fixed five #39 born Threads, the already-frozen #40 Identity Context projection policy and the same external request rather than search for a more favorable scenario.

The experiment must be frozen before any model call and must keep two claims analytically separate:

- **stability / non-interchangeability:** repeated identical conditions must show between-Thread structured separation exceeding within-Thread model variation;
- **cognition replacement:** the exact same authoritative Thread/context/request must be consumed through a genuinely different provider/model route while Thread identity and source authority remain unchanged.

The prospective test contract is a separate artifact. Until that contract and its provider-free preflight are green, **no new provider call is authorized**.
