---
id: architecture-model-output-recovery
status: accepted
last-reviewed: 2026-08-26
canonical: true
---

# Model output recovery

## Principle

**Models are fallible cognitive machinery. Fibre owns the boundary that decides whether model output is mechanically usable; domain authorities still decide whether that output is semantically admissible.**

Ordinary model-output brittleness must not force Fibre to discard valid prior work, silently resample for quality, or teach domain code about provider-specific structured-output limitations.

The intended execution boundary is:

```text
Fibre domain / cognition policy
        ↓
model execution policy
        ↓
mechanical output recovery
        ↓
provider adapter
```

Mechanical recovery lives below Genesis, memory, identity, dignity and other semantic domains. It does not decide what a Thread should remember, believe, mean or do.

## Ownership

The provider-neutral reasoning integration owns mechanical model-output recovery. Provider adapters such as OpenAI or Google may project Fibre's canonical response schema to the subset their transport supports, but the provider's schema support never becomes Fibre's validity definition.

Domain callers own semantic admission and any budget for making another model call. The generic recovery layer may identify and mechanically recover an authorized form failure; it may never retry because an answer is weak, boring, inconvenient or scientifically disappointing.

Durable execution remains owned by the runtime using the model call. A recovery helper does not create a second journal or authority.

## Recovery order

Fibre prefers the least generative recovery that can preserve meaning:

1. **Validate** the provider response against Fibre's canonical response contract.
2. **Normalize deterministically** only when a transformation is explicitly known to be mechanical and meaning-preserving.
3. **Revalidate the complete canonical contract.** A normalization that creates or exposes another violation is not accepted.
4. **Optionally request bounded mechanical repair** only when the caller's policy explicitly authorizes another model call.
5. **Fail visibly** when recovery is unavailable or its budget is exhausted.

Normalization and repair are different from a fresh semantic record retry. Their provenance and accounting must remain distinguishable.

## Initial supported recovery

The first supported deterministic normalization is JSON-Schema `uniqueItems`:

```text
["episode-03", "episode-07", "episode-07"]
        ↓ preserve first occurrence
["episode-03", "episode-07"]
```

The rule applies only where the canonical schema declares `uniqueItems: true`. The transformation is recursive, does not mutate the original response and must be idempotent. Fibre records a recovery witness containing the canonical path, constraint and action, then revalidates the result.

If de-duplication causes another constraint to fail, such as `minItems`, Fibre rejects the result rather than inventing content.

## Recovery hints

Some provider/schema gaps are easier to avoid when cognition receives a lightweight structural hint. Hints are advisory; they never define validity.

Where useful, model execution may derive a hint from the canonical schema or a known provider limitation, for example:

> `episodeRefs must contain distinct values; do not repeat an episode reference.`

If model-assisted mechanical repair is later needed, Fibre may construct a repair instruction from the actual mechanical violation. Such a prompt must constrain the model to repairing form, not improving substance.

The canonical schema and Fibre/domain policy remain authoritative even when a prompt contains a hint.

## Extensibility rule

Do not build a speculative universal LLM repair framework. Add a recovery handler when an observed failure mode demonstrates the need and Fibre can state a safe mechanical rule for it.

For each new handler answer:

- What exact violation does it recognize?
- Can it be repaired without semantic judgment?
- Is the transformation deterministic, or does it require a bounded model call?
- What provenance/recovery witness is retained?
- What happens when recovery still fails canonical validation?

If those questions do not have narrow answers, the failure remains a domain/runtime failure rather than becoming generic automatic recovery.

## Prompt and provider separation

Provider adapters may know that a transport cannot express a canonical constraint. They may not weaken the canonical contract. Prompt hints may reduce malformed output but may not replace validation.

The same model-output recovery surface should therefore remain usable across OpenAI, Google and future providers even when each provider has a different structured-output subset.

## Observability

Long model calls should expose lightweight progress through existing observer/event surfaces: request started, waiting/heartbeat, provider response, mechanical recovery, durable commit/replay and terminal failure. Observability must never change prompts, request identity, repair budgets or cognition behavior.

## Scope and ambition

This capability proves execution robustness, not Thread individuality or agency. It deliberately excludes semantic admission policy, quality judgment, autonomous model selection and general provider orchestration; those remain in their owning domains/runtime layers.

No permanent Fibre constraint is introduced. The extension path remains open to new providers, new mechanical recovery handlers and richer model gateways without moving identity, memory, meaning or authorization authority into the reasoning integration layer.
