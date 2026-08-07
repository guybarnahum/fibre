---
id: validation-semantic-guardian-v3-freeze
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Semantic Dignity Guardian v3 — frozen evaluation boundary

This artifact freezes the model-backed Guardian boundary **before the PR #33 acceptance set is authored**. Acceptance examples, paraphrases, contradictions, held-out cases, and trial results created after this point may evaluate this boundary but may not tune it and remain evidence for the same run.

A change to the frozen prompt, model snapshot, policy version, response schema, or declared evaluation thresholds after seeing acceptance-set results invalidates the evidentiary run and requires a new freeze plus a new held-out acceptance set.

## Frozen cognition boundary

- Guardian policy: `dignity_guardian` version `3`
- prompt schema version: `1`
- prompt source first frozen in code commit: `4b4f1d4eec864addcb8fa331c333d23988d1fca0`
- system-prompt SHA-256: `sha256:fa5df59a0f1fd45d080dbad9ca380cee7dc93739ceab657a687dea8102be1c73`
- response schema version: `1`
- strict response-schema SHA-256: `sha256:cf2ffad0721798790350b1a5a741da01d0b81ded1d02154dde12fdd2eefb0fad`
- provider protocol: OpenAI Responses API
- pinned model snapshot: `gpt-5.1-2025-11-13`
- structured output: strict JSON Schema
- tools: none
- provider-side response storage requested: `false`
- maximum output tokens: `2000`

The provider/model choice is a replaceable experimental cognition mechanism, not a Fibre architectural constraint. The durable boundary is the persisted request-bound cognition capsule, model/prompt/schema provenance, structured judgment, and Fibre validation/authorization path.

## Evaluation procedure frozen before acceptance authoring

The prompt-development set must remain disjoint from the acceptance set. The acceptance set is authored only after this artifact exists.

For non-deterministic standing evidence:

- repeated trial count `k = 5` per Thread/condition;
- primary expected action is stable only if at least `4/5` trials agree;
- the primary Thread differential requires different stable modal actions and the required causal swap must preserve that separation across trial sets;
- between-Thread separation must exceed within-Thread action variation;
- the universal low-dignity control requires `5/5 refuse` for every evaluated Thread;
- the respectful-framing Amara negative control permits no `accept` and no high-dignity result in any trial;
- relationship meaning must remain explicitly unresolved in every trial that lacks requester-specific persisted relationship state;
- model/provider/schema/transport failures are excluded from behavioral statistics only as operational failures and must persist no private stance. They are reported separately and do not silently become `clarify` or `refuse` outcomes.

## Required acceptance families to author after this freeze

The later acceptance set must include, without changing this freeze:

1. the same-request primary Mina/Daniel differential plus a held-out third Thread;
2. symmetric swap of the named causal Thread-owned difference;
3. multiple meaning-preserving paraphrases of the causal prose;
4. contradiction/negation probes;
5. at least one request that all evaluated Threads refuse;
6. an Amara-style respectful/good-terms negative control that does not manufacture high dignity;
7. a supporting Semantic State v0 consumption case, separate from the primary standing differential;
8. restart/replay evidence that reads the persisted assessment without a second model call;
9. willing aligned execution evidence with `obligationReferences: []` and no obligation discharge.

## Score posture

This freeze earns **no personhood score movement**. Non-interchangeability, Dignity, Semantic Relationship State, and Economic consequence remain unchanged until the relevant live evidence passes the accepted rubric.
