---
id: validation-thread-differential-gate
status: accepted
last-reviewed: 2026-08-06
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
- freeze-created memory can survive restart and become eligible for later cognition context;
- temporary cognition is separated from durable Thread life;
- the complete chain is persisted, replayable, integrity-checked, and human-inspectable.

Those are genuine prerequisites for a digital person. They do **not** yet prove causal individuality.

## The post-M1 gap

In the current M1 implementation, the world kernel prepares an appraisal capsule from Thread-owned state, request terms, selected memories, relationship references, obligations, needs, feelings, and identity summary. But the consequential private assessment is still submitted to `recordPrivateStance` by its caller. The submitted assessment supplies the proposed action, score, rationale, factors, feelings, conflicting motives, uncertainties, and relationship impact; Fibre validates, derives the dignity band, binds the stance to the appraisal trace, and persists it.

Therefore M1 protects the **structure and integrity of inner life** without yet owning the **production of inner judgment**.

Likewise, existing identity/genome/embodiment fields are not yet required by a milestone proof to cause a different choice, and a durable relationship service that applies recorded fondness/resentment consequences remains deferred.

This is not a reopening of M1. It is the next ambition boundary.

## Core invariant

> **A material Thread-owned difference must be able to make a material behavioral difference.**

The causal chain should be inspectable:

```text
persisted Thread difference
  -> selected evidence/context
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
- available external alternatives;
- relevant resource assumptions unless resources are the intentional differential variable;
- clock/test conditions needed for deterministic evidence.

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

### Thread-owned judgment

For the standing scenario, the caller may submit the external request and may request an appraisal. The caller must **not** supply the authoritative result of that appraisal.

In particular, the gate cannot be satisfied by a fixture or API client directly choosing the final:

- dignity score;
- proposed/desired action;
- dignity factors;
- private feelings;
- conflicting motives;
- relationship consequence;
- final private stance.

Those must be produced by a Fibre-owned, versioned policy/cognition boundary from the persisted Thread state plus request/appraisal context.

The first implementation should use a deterministic `dignity_guardian` policy because it makes the causal proof easy to falsify and inspect. Determinism is a milestone technique, not a permanent restriction: a later model-backed Dignity Guardian may replace it while preserving the same ownership, provenance, and evidence contract.

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

## Causal trace requirement

The proof must identify the cause, not merely observe correlation.

For each divergent stance, evidence must show:

- which persisted Thread fields or prior records were selected;
- which were excluded;
- which policy/model version consumed them;
- the bounded factors/rationale produced from them;
- the resulting private stance;
- the downstream consequence;
- the exact state/history witnesses needed to reproduce the decision.

The evidence may use bounded rationale and structured factors. It must not require storing raw chain-of-thought.

## Counterfactual requirement

A passing differential scenario also needs a counterfactual or mutation probe.

At least one of the following must be demonstrated:

- swap the relevant Thread-owned difference between the two Threads and the divergence swaps or changes predictably;
- neutralize the claimed causal field/history and the divergence disappears;
- mutate the claimed consumer so it ignores the field and the test fails;
- replace the Fibre-owned appraisal output with a fixed caller-authored result and the test fails.

This prevents a test from passing because of unrelated fixture differences or hard-coded Thread IDs.

## Persistence and inspection requirement

The differential proof must survive the same persistence discipline as the rest of Fibre:

- both Threads are durable world records, not ephemeral prompts;
- the causally relevant identity/history survives restart;
- the resulting stances and downstream consequences survive restart;
- the Thread Editor or a dedicated proof report makes the two causal chains human-inspectable;
- exact technical records remain available beneath the readable explanation.

## Anti-cheats

The gate fails if any of the following is the easiest explanation of the result:

- the code branches on Thread ID or fixture name;
- the expected action is supplied by the caller;
- the two requests differ materially;
- the “identity” difference is a hidden task instruction;
- the policy ignores the claimed identity/history and a hard-coded fixture rule creates the result;
- only the prompt/capsule differs while stance and downstream behavior are identical;
- two LLM calls happen to differ nondeterministically without attributable Thread-owned causes;
- a portrait, voice, culture label, or trait is displayed but has no behavioral consumer;
- the test would still pass if the distinctive Thread fields were deleted.

## Milestone use

### Before M2 closes

The first standing differential scenario must be implemented and green. It should use identity/history already available in the Thread model plus a versioned Fibre-owned Dignity Guardian that derives the private assessment from the appraisal capsule.

The desired boundary is:

```text
caller submits request
  -> kernel compiles Thread-owned appraisal capsule
  -> Dignity Guardian derives private assessment
  -> kernel validates and persists private stance
  -> existing M1 authorization/expression/runtime boundaries continue unchanged
```

This is deliberately designed as a slot-in to M1 rather than a redesign of M1.

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
