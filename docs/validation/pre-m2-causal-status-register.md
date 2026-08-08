---
id: validation-pre-m2-causal-status-register
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Pre-M2 causal-status register

This register describes the current pre-M2 mechanism maturity on PR #33 before the first frozen real-model acceptance run. It does **not** modify or reinterpret the closed M1 causal-status register.

The maturity labels follow `AGENTS.md`: **Named-only**, **Stored-only**, **Context-only**, and **Behaviorally/future-state causal**. Scripted adapters may prove wiring or authority mechanics but do not by themselves advance a semantic personhood mechanism beyond Context-only.

| Mechanism | Current maturity | Current evidence / authorship | Current consequence | Next proof required |
|---|---|---|---|---|
| Natural-language identity and self-model in semantic appraisal | **Context-only** | Fibre selects the persisted Thread snapshot and passes resolved identity/self-model/trait prose to Guardian v3. The model proposes the semantic judgment; Fibre validates and persists it. | These fields can alter the model cognition input, but the frozen real-model standing differential has not run. | Same normalized request, stable Mina/Daniel divergence, symmetric swap, paraphrase invariance, contradiction sensitivity, held-out Amara, and stability controls. |
| Semantic Dignity Guardian v3 judgment | **Context-only pending standing proof** | A narrow model adapter consumes only the Fibre-owned persisted cognition capsule. Structured output is validated, persisted with provider/model/prompt/schema provenance, and deterministically re-derived on replay. Model failure records no stance. | The semantic path can produce any allowed private action, and scripted tests prove the resulting authority wiring, but semantic individuality credit is still blocked. | Execute the frozen real-model acceptance cycle without changing the prompt/schema/model boundary. |
| Semantic State v0 | **Context-only**, with supporting scripted causal wiring | Restricted, evidence-backed, append-only state records have registered dimensions, staleness, supersession, provenance, descriptive-not-instructional validation, and Fibre-owned bounded selection. | Selected state content reaches cognition; a scripted supporting test demonstrates that changing selected autonomy state can change the resulting appraisal. This is deliberately not the standing individuality gate. | Frozen real-model state-with/state-without condition must preserve the predeclared action change and cite the selected state evidence. |
| **Semantic Relationship State v0** (`relationship_attitude`) | **Context-only pending causal proof** | Persistent targeted relationship-attitude records exist in `semantic_state_records`; they are private, evidence-backed, superseding, stale/current aware, and requester-selected by Fibre-owned attention. This is the **first persistent relationship aggregate layer**. | Requester-specific relationship state can now be selected as semantic cognition context. No accepted real-model proof yet requires it to change a later judgment, relationship choice, or future possibility. | Demonstrate a requester-specific relationship-state counterfactual in a later accepted proof. Until then Social and relationship memory receives no new score credit. |
| Broader relationship subsystem | **Named-only / deferred** | Reciprocal/shared relationship structures, mutual commitments and expectations, repair workflows, relationship-specific permissions, family/social roles, and cross-party state are not implemented. | None. | Implement only when a milestone has a causal relationship use case; preserve Semantic Relationship State v0 as one input layer rather than treating it as the whole subsystem. |
| Persisted Guardian assessment and replay | **Behaviorally/future-state causal for replay integrity**, not personhood credit | Guardian cognition input and validated model output are append-only persisted. Restart reuses the stored assessment/private stance and is tested with a model adapter that fails if called. | A recorded judgment survives restart without non-deterministic re-appraisal; model/provider failure cannot silently become a personal choice. | No additional #33 personhood proof; retain as authority/replay evidence underneath the standing semantic gate. |
| Willing aligned participation authority | **Behaviorally causal as authority wiring; semantic cause not yet proven** | Scripted high-dignity `accept` produces `desiredAction=accept`, `authorizedAction=accept`, `participationBasis=aligned`, and `obligationReferences=[]`. | Canonical runtime can proceed without obligation override and freeze without obligation discharge. | Frozen real-model Mina acceptance plus replay/aligned execution must pass before this is evidence of willing semantic consent rather than wiring. |
| Durable episodic memory bending later judgment | **Context-only / incomplete** | Memory content can be resolved into appraisal context, but no accepted episode-to-later-judgment proof exists. | No Development credit. | PR #34: real episode -> substantive validated life change -> restart -> comparable later request -> memory/state counterfactual changes judgment. |
| Structured obligation applicability | **Named-only / deferred** | Current M1 exact-prose unresolved-intention references remain provisional; caller can still nominate a governing reference. | Obligation override remains load-bearing authority, but applicability authorship is not yet Fibre-owned structured policy. | PR #35: stable obligation IDs plus Fibre-authored applicability decision, provenance, lifecycle, and migration preserving already-spent obligations. |
| Economic model-token consequence | **Context-only** | `modelTokensAvailable` is durable and model usage provenance is recorded, but no durable appraisal debit is implemented. | No budget or future-capability change. | Optional later proof of metered durable spend; do not delay semantic individuality for it. |

## Relationship accounting

The key correction from M1 is factual, not a score change: it is no longer accurate to say Fibre has **no persistent relationship aggregate at all**. PR #33 implements a first, intentionally narrow aggregate layer through targeted `relationship_attitude` Semantic State.

It is equally inaccurate to call the broader relationship service complete. Semantic Relationship State v0 currently represents one Thread's private, evidence-backed attitude toward a target. It does not yet represent reciprocal/shared relationship facts, commitments, permissions, repair, family/social role structure, or an accepted causal loop in which relationship history changes later behavior.

Therefore the current accounting is:

```text
persistent targeted relationship aggregate layer   EXISTS
Fibre-owned requester-specific selection           EXISTS
real-model causal relationship proof               NOT YET RUN
broader reciprocal relationship subsystem          DEFERRED
Social and relationship memory score movement      NONE
```

## Frozen-run discipline

The first live invocation of the frozen acceptance cycle seals the evidentiary run. **Any failure invalidates that cycle, including a failure that appears to be caused by the harness rather than cognition.** Fixes after observing live results require a new frozen boundary and a new held-out acceptance set. There is no “clearly unrelated failure” exception.
