---
id: validation-pre-m2-causal-status-register
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Pre-M2 causal-status register

This register describes the current pre-M2 mechanism maturity after the accepted Semantic Guardian v4 and History bends judgment v4 standing proofs. It does **not** modify or reinterpret the closed M1 causal-status register.

The maturity labels follow `AGENTS.md`: **Named-only**, **Stored-only**, **Context-only**, and **Behaviorally/future-state causal**.

| Mechanism | Current maturity | Current evidence / authorship | Current consequence | Next proof required |
|---|---|---|---|---|
| Natural-language identity and self-model in semantic appraisal | **Behaviorally causal, narrow standing scope** | Fibre selects persisted Thread identity/self-model/trait prose. Semantic Guardian frozen candidate 4 passed held-out match, mismatch, paraphrase, contradiction, generic-work, and target-isolation cases. | Individual-specific semantic meaning changes participation appraisal under controlled conditions. | Repeated-identical-condition stability/history-grounded divergence remains required for Non-interchangeability score 2. |
| Semantic Dignity Guardian v4 judgment | **Behaviorally/future-state causal** | Stateless `openai/gpt-5.1-2025-11-13` worker consumes only Fibre-owned bounded evidence; Fibre validates and persists the structured appraisal. `semantic_guardian_v4_standing_gate_v4` passed 18/18 with all failure buckets zero. | Thread-owned semantic appraisal can produce willing acceptance, clarification, negotiation, or refusal; generic helpfulness and polite/urgent framing cannot manufacture high dignity. | Preserve the frozen standing evidence. Do not tune Guardian against the accepted v4 gate. |
| Semantic State v0 | **Behaviorally causal** | Restricted, evidence-backed, append-only semantic state has registered dimensions, staleness, supersession, provenance, descriptive-not-instructional validation, and Fibre-owned bounded selection. Accepted state-to-state counterfactuals hold request/state structure constant while changing only semantic meaning. | Mina `need/autonomy` supportive meaning produced `accept/high`; opposing meaning produced `negotiate/mixed`. Semantic state therefore bends appraisal causally. | Connect future semantic-state evolution to actual episodes and Thread-authored interpretation rather than only supplied current state. |
| **Semantic Relationship State v0** (`relationship_attitude`) | **Behaviorally causal, narrow relationship scope** | Persistent requester-targeted relationship-attitude records exist in `semantic_state_records`. The accepted Amara/Acme trust counterfactual changed only relationship-state meaning for the same requester/request. | Supportive trust produced `accept/high`; opposing trust produced `negotiate/mixed`. Target isolation and generic-work controls also passed. | Broader reciprocal/shared relationship structures remain deferred. Later work should prove relationship development from actual episodes rather than only supplied current state. |
| Broader relationship subsystem | **Named-only / deferred** | Reciprocal/shared relationship structures, mutual commitments and expectations, repair workflows, relationship-specific permissions, family/social roles, and cross-party state are not implemented. | None beyond the narrow private Semantic Relationship State v0 layer. | Implement only when a milestone has a causal relationship use case. |
| Persisted Guardian assessment and replay | **Behaviorally/future-state causal for replay integrity** | Valid cognition input/output is append-only persisted with provider/model/prompt/schema provenance. Restart reuses the stored assessment/private stance and does not re-call the model. | A recorded judgment survives restart deterministically; model/provider failure cannot silently become a personal choice. | Retain as an invariant in later lifecycle work. |
| Willing aligned participation authority | **Behaviorally causal** | High-dignity `accept` can produce `desiredAction=accept`, `authorizedAction=accept`, `participationBasis=aligned`, and `obligationReferences=[]`; the standing model independently demonstrates willing high-fit acceptance. | Canonical runtime can proceed from willing semantic consent without obligation override. | Preserve in later episode/lifecycle proofs. |
| Durable episodic memory bending later judgment | **Behaviorally causal, narrow Development scope** | In `history_bends_judgment_standing_gate_v4`, an accepted Episode A passed canonical participation/runtime/freeze authority, produced one evidence-backed deterministic episodic memory, survived database close/reopen, and Fibre resolved that memory into the later Guardian input. Exact one-memory withholding held Thread/request/Semantic State constant. | The same later request moved from `refuse/low` without the memory to `accept/high` with it. The memory is load-bearing in `individualizedAdvantage` and `interchangeability`. Development earns `0 -> 1`. | Rich self-authored development remains open: Thread-authored observation/reflection, experience-derived self-model/state change, adverse/low-dignity memories, repeated cross-episode learning, and default live-socket integration. |
| Structured obligation applicability | **Named-only / deferred** | Current M1 exact-prose unresolved-intention references remain provisional; caller can still nominate a governing reference. | Obligation override remains load-bearing authority, but applicability authorship is not yet Fibre-owned structured policy. | PR #35: stable obligation IDs plus Fibre-authored applicability decision, provenance, lifecycle, and migration preserving already-spent obligations. |
| Economic model-token consequence | **Context-only** | `modelTokensAvailable` is durable and model usage provenance is recorded, but no durable appraisal debit is implemented. | No budget or future-capability change. | Optional later proof of metered durable spend. |

## Accepted standing evidence

Two standing claims are now accepted.

### Semantic Guardian v4

`semantic_guardian_v4_standing_gate_v4` is the accepted standing cycle for `semantic_guardian_v4_candidate_4`.

```text
Cases passed                    18/18
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral failures              0
Differential failures            0
```

See [`semantic-guardian-v4-standing-gate-v4.md`](semantic-guardian-v4-standing-gate-v4.md).

Semantic standing cycles v1-v3 remain permanently failed/sealed historical evidence. Their postmortems are retained because they exposed evaluation-boundary defects and led to the stronger state-to-state causal method. They are not retrospectively changed to pass.

### History bends judgment v4

`history_bends_judgment_standing_gate_v4` is the accepted standing cycle for `history_bends_judgment_candidate_4`.

```text
WITH history:     accept / high
WITHOUT history:  refuse / low
Request fingerprint: sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2
Causal memory: mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0
```

The committed evidence bundle is `artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json`. It records the exact model rationales, factor evidence refs, normalizations, provider request/digest data, one retrying `MODEL_TIMEOUT`, persisted memory, restart integrity witness, and counterfactual memory witnesses.

History standing cycles v1-v3 remain failed/sealed and their exact evidence bundles are also committed.

## Scope of the Development credit

The Development `1` credit is real but narrow.

- Episode A's participation appraisal was scripted setup so #34 could isolate later history causality rather than re-test #33.
- The durable memory is deterministic descriptive text derived from the accepted request objective and criteria. It is evidence-backed history, not a Thread-authored reflection.
- The later appraisal used Guardian v4 directly in the standing harness rather than the default canonical service socket.
- The default live runtime has not yet generalized this evidence path into broad Thread behavior.

The accepted causal sentence is therefore:

> **A Fibre-owned durable record formed through this Thread's earlier canonical episode survived restart and causally changed its later appraisal.**

Do not silently inflate that into experience-derived self-authorship or broad developmental learning.

## Relationship accounting

The accounting is now:

```text
persistent targeted relationship aggregate layer   EXISTS
Fibre-owned requester-specific selection           EXISTS
real-model causal relationship proof               PASSED
broader reciprocal relationship subsystem          DEFERRED
Social and relationship memory score               1
```

This does **not** mean the full relationship system exists. Semantic Relationship State v0 is one Thread's private, evidence-backed attitude toward a target. It does not yet represent reciprocal/shared relationship facts, mutual commitments, repair, family/social role structure, or institutional relationship semantics.

## Counterfactual rules

Semantic-state causality is demonstrated by downstream differential behavior, not by asking the model to label its own causal contribution. The accepted semantic-state control changes explicit semantic meaning while holding structural state identity and the request constant.

History causality is demonstrated by withholding the **exact claimed causal record** while holding the later request, Thread state, and other semantic state constant. An unresolved memory reference is not sent to Guardian cognition as evidence; only the canonical condition receives the resolved memory evidence item.

## Frozen-run and archive discipline

A standing cycle seals on the first real provider attempt. Missing credentials or a pre-invocation frozen-boundary mismatch may block without consuming the cycle.

After a sealed cycle failure, fixes or evaluation changes require a new frozen boundary and new held-out set. A successful sealed cycle is immutable standing evidence and must not be tuned against afterward.

After sealing, provider-executable standing runners are retired from the active command surface. Exact committed evidence bundles plus canonical postmortems are the human/audit authority; Git history preserves retired executable source. Read-only inspectors may expose sealed results but may not contain a provider/model execution path.

## Current score consequence

Under rubric v2, accepted #33 and #34 standing evidence moves the live pre-M2 checkpoint to **15/26**:

```text
Non-interchangeability        0 -> 1
Dignity and consent           1 -> 2
Social/relationship memory    0 -> 1
Development                   0 -> 1
Economic consequence          stays 0
```

Historical M1 remains frozen at 11/26. The next bridge milestone is **#35 Structured Obligation v1**.
