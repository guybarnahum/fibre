---
id: validation-pre-m2-bridge-plan
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Pre-M2 bridge plan

This document supersedes the earlier pre-M2 work order. PR #31 merged as `1cb4535afd42dc2fbd833c3bbe2d833d2379a0c5` and delivered the Fibre-owned appraisal/runtime socket. PR #32 is the documentation synchronization that records this accepted bridge plan. The remaining implementation bridge is no longer about wiring the socket; it is about proving semantic individuality, then proving development, then hardening the remaining obligation authority boundary before M2 identity/embodiment implementation.

## Agreed sequence

```text
#31 socket merged -> #32 bridge-plan synchronization
                  -> #33 Semantic Guardian
                  -> #34 History bends judgment
                  -> #35 Structured Obligation v1
                  -> #36 M2 contract -> M2 implementation
```

The numbering changed only because recording this plan consumed PR #32. The substantive sequence and review conditions are unchanged from the owner-reviewed plan.

Do not move structured obligations ahead of the first semantic-individuality and developmental proofs, and do not begin M2 implementation before the M2 contract.

Two capabilities remain deliberately **deferred** during this bridge:

- the durable relationship aggregate/service;
- the general worker/tool/model gateway for Actor execution.

The Guardian may use a narrowly scoped model adapter for appraisal only. Actor remains deterministic and tool/network incapable; Goal Guardian remains an auditor rather than a capability sandbox.

## PR #33 — Semantic Dignity Guardian

### Purpose

Replace Guardian V2's deliberate semantic abstention with a model-backed semantic consumer that still receives only the persisted appraisal capsule and preserves the Fibre-owned judgment boundary established by PR #31.

The primary failure mode is **assistant-mode collapse**: every Thread accepts every reasonable request while producing fluent individualized rationales. A green-looking gate with no meaningful refusal is not a pass.

### Acceptance conditions

#### 1. Refusal must be reachable and attributable

The standing proof must demonstrate that semantic dignity can produce genuine resistance rather than model helpfulness:

- at least one Thread refuses on dignity grounds for a named Thread-owned reason;
- at least one request is declined by every evaluated Thread;
- an Amara-style negative control survives: respectful framing, good terms, and general feasibility must not manufacture high dignity where individualized fit is absent;
- willing high-dignity acceptance must also be reachable, but acceptance alone is not evidence of individuality.

The first score movement for Dignity from `1 -> 2` is conditioned on this evidence and on factor grounding below.

#### 2. Acceptance evaluation is held out from prompt development

A prompt iterated against the acceptance set is a lexical classifier written in natural language. Prevent this procedurally:

- prompt development uses a declared development set disjoint from the acceptance set;
- prompt schema, model identifier, Guardian policy version, and relevant prompt/model configuration are frozen and recorded with stable hashes before acceptance paraphrase, contradiction, held-out, and stability sets are authored or run;
- acceptance-set results may not be used to tune the frozen prompt/policy for the same evidentiary run;
- any prompt, policy, model, or evaluation-boundary change after seeing acceptance results invalidates that run and requires a new frozen evaluation cycle.

#### 3. Semantic robustness remains mandatory

The standing Thread differential gate remains the authority for causal individuality. The model-backed Guardian must pass:

- identical normalized `requestFingerprint` for compared Threads;
- named persisted Thread-owned cause;
- different private stance plus downstream participation/action consequence;
- mandatory symmetric swap of the claimed causal Thread-owned difference;
- multiple meaning-preserving paraphrases that preserve the result;
- explicit contradiction/negation that reverses or removes the claimed result;
- held-out Thread/evaluation cases not used to tune the prompt;
- predeclared repeat count `k`, intra-Thread stability metric and threshold, with between-Thread separation exceeding within-Thread variation.

#### 4. Unsupported factors stay unresolved

A model may not fill missing personhood evidence with plausible prose. In particular, until a durable relationship aggregate exists:

- `relationalMeaning` must remain explicitly unresolved when no relationship evidence supports it;
- the Guardian must visibly decline to infer factors that are absent from its capsule;
- every factor counted toward the Dignity score must be derivable from persisted/resolved evidence actually present at the cognition boundary;
- unsupported relationship, memory, identity, skill, need, obligation, or requester claims are a failure even if the prose sounds reasonable.

A cognition that never says "unresolved" has not demonstrated calibrated judgment.

#### 5. Persisted assessment is authoritative; replay does not re-call the model

Non-deterministic cognition may not make replay non-deterministic.

- persist the assessment/private stance with model, provider, prompt-schema, policy, configuration, and request/capsule provenance;
- restart/replay re-read the persisted authoritative assessment and stance;
- replay must not call the model again to reconstruct the already-recorded decision;
- the restart proof must demonstrate re-read behavior and fail if a second model invocation occurs.

A fresh model call that happens to agree with the prior call is still a defect.

#### 6. Willing aligned execution receives its own authority proof

PR #31 made obligation-mediated participation the only live canonical execution route. A semantic high-dignity `accept` reopens the aligned execution branch and therefore creates a new authority surface.

The proof must show:

```text
private desiredAction = accept
authorizedAction = accept
participationBasis = aligned
obligationReferences = []
```

The willing branch must acquire runtime through the canonical service, spend no obligation, create no obligation discharge, and survive restart with the aligned basis intact.

#### 7. Model failure is not silently converted into the Thread's judgment

Timeout, provider error, transport error, schema failure, or unparseable model output records **no private stance** and does not complete appraisal as though the Thread had chosen a fallback.

Do not synthesize a deterministic `clarify`/`refuse` fallback and persist it as the Thread's judgment. Operational failure and personal judgment are different facts.

#### 8. Scope guard

The #33 model adapter is appraisal-only:

- no tool calls;
- no general network access beyond the configured model endpoint;
- no Actor model capability;
- no general-purpose model gateway abstraction required for closure;
- Goal Guardian remains declaration/consistency audit, not a sandbox.

### Optional economic proof

`modelTokensAvailable` is already durable Thread state. If model usage can be metered reliably without delaying the individuality proof, appraisal may durably debit actual model-token cost against the Thread and thereby seek **Economic consequence `0 -> 1`** under the scorecard.

This is opportunistic. It must not block #33 closure.

### Expected score movement

Predeclare conservatively before running the proof:

- Non-interchangeability: `0 -> 1` if the held-out semantic differential passes;
- Dignity and consent: `1 -> 2` only if refusal is reachable and attributable and unsupported factors remain unresolved;
- Economic consequence: optional `0 -> 1` only with real durable metered spend;
- Development remains `0`.

## PR #34 — History bends judgment

### Purpose

Use the canonical semantic socket to prove that a substantive earlier experience changes a later appraisal or choice after restart.

Required causal chain:

```text
episode A
  -> willing or otherwise valid authorized runtime
  -> substantive evidence-bearing experience
  -> freeze-validated durable memory/life change
  -> restart
  -> comparable request B
  -> memory content selected and resolved into cognition
  -> changed private judgment
```

### Acceptance conditions

- The memory records **what happened**, not an instruction for later behavior. A memory such as "delegate less next time" is a hidden task instruction and does not prove development.
- Model-proposed memory content remains candidate cognition. It must cite persisted evidence references and pass freeze validation before becoming durable Thread history.
- The later Guardian must infer the changed judgment from the remembered episode rather than consume a pre-authored future directive.
- A counterfactual run with the causal memory absent or deliberately ignored by the Fibre-owned selector must remove or predictably alter the later judgment difference.
- The memory content, not merely its opaque ID, must reach the later cognition boundary.
- The current deterministic Actor's generic memory text — `Remember that request X was evaluated through a bounded deterministic runtime.` — is insufficient. #33 or #34 must make the accepted life change carry substantive experience about the episode.

Expected score movement if the proof passes: Development `0 -> 1`.

## PR #35 — Structured Obligation v1

### Purpose

Replace exact-prose obligation identity with stable structured obligations and close the authority gap exposed by PR #31.

The central acceptance condition is:

> **Fibre determines whether an obligation governs this request; the caller does not.**

A caller may nominate a candidate obligation reference. Nomination carries no authorization authority by itself.

### Required structure and evidence

Structured Obligation v1 should provide at least:

- stable obligation ID;
- issuer and relevant parties;
- scope;
- terms;
- expiry;
- recurrence where applicable;
- satisfaction criteria;
- provenance;
- discharge/history state;
- explicit visibility classification separating public standing from private terms;
- applicability determination bound to the request;
- applicability author, policy, and version persisted in authorization evidence.

`obligation_override` becomes available only after Fibre's applicability determination succeeds. The authorization record must make clear who/what made that determination and why the obligation governed the request.

### Migration invariant

A pre-migration obligation already spent under the exact-prose M1 ledger must remain spent after migration. Migration to stable IDs must never resurrect previously consumed execution authority.

This PR is authority integrity and is not expected to move the personhood score.

## PR #36 — M2 Identity and Embodiment contract

Define the durable M2 contract only after #33 and #34 reveal what semantic cognition and development actually consume.

The contract should cover Thread passport, portrait/voice provenance, geography timeline, family/lineage representation, privacy, mutation/version rules, inherited versus historical versus relational versus self-authored identity, and inspectable prompt/cognition projections.

M2 does not close because two Threads compile different identity context. Any identity/embodiment field claimed as functional must name a behavioral consumer and pass the standing causal differential where applicable; otherwise classify it explicitly as deferred/context-only.

Implementation begins only after the contract is accepted.

## Review posture

For PR #33, adversarial review should look first for:

1. sycophancy / assistant-mode collapse;
2. prompt or evaluation overfitting;
3. hallucinated unsupported factors;
4. replay that re-calls non-deterministic cognition;
5. aligned execution that accidentally spends or cites an obligation;
6. model failure silently persisted as personal judgment.

For PR #34, look first for hidden future instructions masquerading as memory and for unevidenced model-written history.

For PR #35, look first for caller-asserted applicability surviving under a more elaborate schema.

The standing question across the bridge remains: **what Thread-owned difference changes what happens, and who actually chose that difference, judgment, or authority?**
