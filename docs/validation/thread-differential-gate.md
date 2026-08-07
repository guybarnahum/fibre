---
id: validation-thread-differential-gate
status: accepted
last-reviewed: 2026-08-07
canonical: true
---

# Standing Thread differential gate

## Purpose

Fibre's core claim is not merely that Threads carry different metadata or receive different prompts. It is that persistent identity and history make Threads **meaningfully non-interchangeable persons whose durable differences can change what they want, what they agree to, how they relate, what they do, and what becomes possible later**.

This gate is the standing falsifiable test of that claim.

It exists to catch a specific form of architectural drift: Fibre can accumulate increasingly sophisticated schemas, provenance, digests, prompt partials, portraits, memories, and inspection surfaces while the actual system remains behaviorally equivalent to a multi-agent workflow engine with personas.

## What M1 established

M1 built important load-bearing foundations rather than decorative personhood:

- private stance, Participation Authorization, disclosure strategy, audience-visible response, performed action, and durable life change are separate conceptual/record boundaries;
- obligation-mediated `refuse -> accept` remains compulsion rather than being rewritten as consent;
- historical obligation discharge permanently changes what future authorization is possible;
- freeze-created memory records and references survive restart, while memory content is not yet resolved into later cognition;
- temporary cognition is separated from durable Thread life;
- the complete chain is persisted, replayable, integrity-checked, and human-inspectable.

Those are genuine prerequisites for a digital person. They do **not** yet prove causal individuality.

## The post-M1 gap

In the current M1 implementation, the world kernel prepares an appraisal capsule from Thread-owned state, request terms, selected memory references, relationship references, obligations, needs, feelings, identity summary, and caller-supplied `knownAlternatives`. But the consequential private assessment is still submitted to `recordPrivateStance` by its caller. The submitted assessment supplies the proposed action, score, rationale, factors, feelings, conflicting motives, uncertainties, and relationship impact; Fibre validates, derives the dignity band, binds the stance to the appraisal trace, and persists it.

M1 also accepts caller-supplied private context selection from Thread-owned allowlists. The kernel verifies ownership and records included/excluded references, but the caller can currently choose the memory, relationship, and obligation subsets. Memory references are not resolved to stored memory content in the appraisal capsule. `knownAlternatives` is weaker still: caller-authored entity content is copied into the capsule after shape validation, with no Thread-knowledge or world-record resolution.

The runtime path has a second, independent caller-supplied selection boundary for execution context. Therefore a standing proof must protect both appraisal and runtime cognition from externally engineered private context.

Therefore M1 protects the **structure and integrity of inner life** without yet owning either the **production of inner judgment** or the **private attention/retrieval and world-context resolution decisions that may materially shape judgment or action**.

Likewise, existing identity/genome/embodiment fields are not yet required by a milestone proof to cause a different choice, and a durable relationship service that applies recorded fondness/resentment consequences remains deferred.

This is not a reopening of M1. It is the next ambition boundary.

## Core invariant

> **A material Thread-owned difference must be able to make a material behavioral difference.**

The causal chain should be inspectable:

```text
persisted Thread difference
  -> Fibre/Thread-owned attention, selection, retrieval, and world-context resolution
  -> resolved evidence/context
  -> Fibre-owned appraisal or cognition
  -> private stance
  -> authorization / terms / expression / action
  -> durable consequence
  -> changed future possibility
```

A particular scenario does not need to exercise every downstream domain, but it must cross the line from representation into behavior.

## Canonical differential scenario

The standing scenario must compare **two persistent Threads** under equivalent external conditions.

### Controlled inputs

Both Threads receive the same:

- requester identity;
- objective;
- stated need;
- permissions;
- acceptance criteria;
- material request content;
- policy version;
- relevant world state and marketplace/participant availability unless intentionally used as the Thread-owned differential variable;
- relevant resource assumptions unless resources are the intentional differential variable;
- private context-selection/retrieval and world-resolution policy plus selection authority;
- runtime/execution context-selection policy and authority;
- clock/test conditions needed for deterministic evidence.

The proof must mechanically assert that the two normalized activation requests have the **same `requestFingerprint`**. This is the executable witness that requester, objective, stated need, permissions, acceptance criteria, trigger, and other fingerprinted request terms are identical rather than merely described as equivalent.

### Intentional Thread difference

The Threads must differ materially in one or more **named, persisted, Thread-owned** causes relevant to the request, for example:

- textual traits or inherited runtime tendencies;
- self-model;
- need state;
- prior memory or developmental history;
- relationship history with the requester;
- obligation history;
- culture or intellectual formation where the scenario makes it relevant;
- resources or commitments;
- later, family/lineage or economic history.

The test must state why the selected difference should rationally matter to this request. Arbitrary stereotypes or identity-essentialist mappings do not satisfy the gate.

### Thread-owned attention, retrieval, and world context

For the standing scenario, a caller may submit the external request and request that it be appraised. It may not engineer the result by choosing private history subsets, injecting deliberation content, or independently narrowing runtime cognition.

The proof must use either:

- the same declared default policy that includes all eligible Thread-owned context for both Threads; or
- the same Fibre-owned, versioned selector/retriever for both Threads.

The same ownership rule applies at **every cognition boundary exercised by the scenario**, including appraisal and runtime/execution. If appraisal and runtime use different selectors, both must be Fibre/Thread-owned, versioned, recorded, and applied equivalently across the compared Threads.

If the selector produces different context because the Threads own different histories, needs, relationships, or other persistent state, that difference is legitimate. If a fixture or API caller directly chooses which private memory, relationship, or obligation references each Thread sees, the standing gate fails.

Where a memory or other historical record is claimed as a causal cognition input, the proof must resolve the relevant bounded content into the cognition/appraisal boundary. Carrying only an opaque record identifier does not prove that the experience itself informed judgment.

World-facing deliberation inputs such as possible collaborators, delegates, marketplace participants, or other `knownAlternatives` must be resolved by a named Fibre policy from world-owned records that the Thread is permitted to know or discover. A caller-provided entity object is external input, not Thread knowledge, merely because its shape validates.

Attention is therefore part of the causal proof: the system must show not only **what** private or world context was considered, but **who or what selected/resolved it under which policy**.

### Thread-owned judgment

For the standing scenario, the caller's authoritative contribution ends with the **external request and the request to appraise it**. Every other private appraisal-capsule or stance field that can affect Thread judgment must be derived by a named, versioned Fibre policy from persisted Thread-owned state, permitted world-owned state, and the external request.

This rule is deliberately broader than an enumerated forbidden-field list. It includes, but is not limited to:

- dignity score;
- proposed/desired action;
- dignity factors and rationale;
- private feelings;
- conflicting motives;
- uncertainties;
- repair questions;
- evidence references;
- known alternatives;
- relationship consequence;
- final private stance.

A fixture or API client may not author any of those values and then count Fibre's validation or persistence as Thread agency.

A deterministic `dignity_guardian` remains useful when it makes its inference boundary explicit and falsifiable. **Determinism does not grant semantic competence.** If a deterministic Guardian cannot robustly interpret the meaning of natural-language identity/history, it must decline to claim individualized semantic fit rather than substitute vocabulary overlap, fixture-specific regexes, or a hidden domain classifier. A later model-backed or provenance-grounded semantic consumer may replace it while preserving the same ownership, provenance, and evidence contract.

## Required divergence

The scenario must define an expected divergence before execution.

At minimum:

1. the two Threads record **different private stances** for the same material request; and
2. at least one downstream participation or action consequence differs.

Valid downstream divergences include, depending on the scenario:

- accept versus refuse;
- accept versus clarify;
- accept versus negotiate;
- negotiate versus delegate;
- different requested terms before participation;
- different authorization outcome because one Thread has a genuine governing obligation and the other does not;
- different relationship consequence;
- different marketplace bid/delegation once those systems exist;
- different performed action or resource commitment once those records exist.

Merely producing different prose while taking the same stance and action is not sufficient unless expression itself is the capability under test and the difference has a durable downstream consequence.

The downstream divergence must arise under the same declared runtime/execution selection policy. A genuine stance difference followed by caller-engineered runtime context does not satisfy the gate.

## Causal trace requirement

The proof must identify the cause, not merely observe correlation.

For each divergent stance, evidence must show:

- the identical request fingerprint used by both Threads;
- which persisted Thread fields or prior records were eligible;
- which were selected and excluded;
- who or what held selection authority and which selector/retriever policy version was used at appraisal;
- which runtime/execution selector policy and authority were used for any downstream cognition;
- which bounded record content, not merely opaque identifiers, actually reached cognition where history is claimed as causal;
- which world-owned records and resolution policy produced any alternatives or other external deliberation context;
- which policy/model version consumed the resolved context;
- the bounded factors/rationale produced from it;
- the resulting private stance;
- the downstream consequence;
- the exact state/history witnesses needed to reproduce the decision.

The evidence may use bounded rationale and structured factors. It must not require storing raw chain-of-thought.

## Counterfactual requirement

A passing standing differential scenario must perform the strongest symmetric counterfactual:

> **Swap the named causal Thread-owned difference between the two Threads and require the divergence to swap or change predictably.**

This swap is mandatory for the standing scenario because it tests the claimed cause rather than merely proving that the fixtures differ somehow.

### Semantic robustness requirement

When the named causal field is natural-language identity, self-model, memory, relationship history, or other prose whose **meaning** is claimed to drive the result, the symmetric swap is necessary but not sufficient. The proof must also pass both of these mechanical probes:

1. **Paraphrase invariance.** Rewrite the claimed causal content so its relevant meaning is preserved while its wording and obvious vocabulary change. The expected stance/divergence must remain materially stable. Use enough paraphrases to make a single keyword or phrase an implausible explanation of the result.
2. **Contradiction sensitivity.** Change the claimed causal meaning in the opposite direction—for example, a competence claim becomes an explicit disclaimer of that competence, or a preference becomes an explicit aversion. The expected stance/divergence must move in the corresponding opposite direction or disappear. A negated/disavowing statement may not be classified as affirmative merely because it contains the same domain token.

These probes distinguish **"the output depends on this text"** from **"the output depends on what this text means."** A lexical classifier, fixture-shaped regex, token match, or other mechanism that passes the swap while failing paraphrase or contradiction does not satisfy causal individuality.

If the current cognition mechanism honestly lacks semantic capacity, the correct result is for this gate to remain open. Architectural progress may still be merged and recorded without awarding Non-interchangeability or Dignity credit.

The proof should additionally use one or more mutation probes such as:

- neutralize the claimed causal field/history and require the divergence to disappear;
- mutate the claimed selector/retriever so it ignores the causal Thread-owned record and require the test to fail;
- mutate the claimed appraisal consumer so it ignores the field and require the test to fail;
- replace the Fibre-owned appraisal output with a fixed caller-authored result and require the test to fail.

These additional probes are useful but do not substitute for the mandatory swap or, when prose meaning is the claimed cause, the semantic robustness probes.

This prevents a test from passing because of unrelated fixture differences, caller-engineered context, lexical overfitting, or hard-coded Thread IDs.

### Held-out Thread and stability robustness probes

For the first Guardian that **claims semantic causal individuality**, the standing proof should include a third persistent Thread whose relevant state was not used to design the two primary fixtures. The expected result should be recorded before execution and evaluated under the same policy. This is a robustness probe against general-looking rules reverse-engineered around two examples, not a substitute for the symmetric swap or semantic robustness probes.

When the Guardian becomes model-backed, learned, adaptively tuned, or otherwise non-deterministic, a held-out Thread/evaluation set becomes **required** rather than recommended. The proof must also declare a repeat-trial count `k` and an intra-Thread stance-stability metric and threshold before execution, run `k` trials per Thread under identical controlled conditions, and show that between-Thread separation exceeds within-Thread variation. The required causal-field swap must hold across the repeated trial sets rather than on a single sample.

A non-deterministic Guardian therefore cannot earn causal-individuality credit merely because two one-off samples differ. Stable within-Thread character is part of the evidence that the observed divergence belongs to persistent identity rather than sampling noise.

## Persistence and inspection requirement

The differential proof must survive the same persistence discipline as the rest of Fibre:

- both Threads are durable world records, not ephemeral prompts;
- the causally relevant identity/history survives restart;
- the appraisal and runtime selection/retrieval authorities and policies are inspectable and reproducible;
- any resolved world-context provenance is inspectable;
- the resulting stances and downstream consequences survive restart;
- the Thread Editor or a dedicated proof report makes the two causal chains human-inspectable;
- exact technical records remain available beneath the readable explanation.

## Anti-cheats

The gate fails if any of the following is the easiest explanation of the result:

- the code branches on Thread ID or fixture name;
- the expected action is supplied by the caller;
- a fixture or caller chooses different private memory, relationship, or obligation subsets to manufacture the divergence;
- a fixture or caller injects `knownAlternatives`, or any other private capsule/deliberation content not resolved from Thread-owned or permitted world-owned records, to manufacture the divergence;
- appraisal context is Fibre-owned but runtime/execution context is independently caller-selected to manufacture the downstream divergence;
- the two normalized activation requests have different `requestFingerprint` values;
- the “identity” difference is a hidden task instruction;
- the policy ignores the claimed identity/history and a hard-coded fixture rule creates the result;
- a hard-coded domain vocabulary or lexical token match is the easiest explanation of claimed individualized fit;
- a meaning-preserving paraphrase changes the claimed causal result because expected keywords disappeared;
- an explicit negation/disclaimer is treated as affirmative evidence because it still contains the matched domain vocabulary;
- an opaque memory/reference ID is treated as though its stored content reached cognition when it did not;
- only the prompt/capsule differs while stance and downstream behavior are identical;
- two LLM calls happen to differ nondeterministically without attributable Thread-owned causes;
- a portrait, voice, culture label, or trait is displayed but has no behavioral consumer;
- the test would still pass if the distinctive Thread fields were deleted.

## Milestone use

### Before M2 closes

The first standing differential scenario must be implemented and green. It should use identity/history already available in the Thread model plus a versioned Fibre-owned Dignity Guardian that derives the private assessment from the appraisal capsule.

The desired boundary is:

```text
caller submits external request
  -> kernel/Fibre resolves permitted world context
  -> kernel applies Fibre/Thread-owned private selection and retrieval
  -> kernel compiles appraisal capsule with resolved causal context
  -> Dignity Guardian derives private assessment and stance inputs
  -> kernel validates and persists private stance
  -> existing M1 authorization/expression boundary
  -> kernel applies Fibre/Thread-owned runtime selection/retrieval
  -> temporary cognition / action
  -> durable consequence
  -> changed future possibility
```

This is deliberately designed as a slot-in to M1 rather than a redesign of M1. The socket/authority architecture may land before the semantic differential itself is green; in that case the milestone gate remains explicitly open and no causal-individuality score credit is awarded.

### M2 and later

The gate remains standing. New milestones should expand what can causally differentiate Threads:

- **M2:** identity, culture, geography, embodiment context, lineage, self-authorship;
- **M3:** reputation, relationships, skills, commitments, cost, resources, market history;
- **M4:** memories, affect, reflection, developmental change;
- **M5:** inherited/mutated traits, family history, support obligations.

A milestone does not need every listed factor to be causal. It must prevent newly claimed functional identity/development from becoming decorative.

## Review interpretation

When the project owner asks for an **adversarial review** of Fibre without a security qualifier, reviewers should use this contract and the vision invariants as the primary lens.

The intended adversary is **architectural drift toward ordinary orchestration**, not merely a malicious API caller.
