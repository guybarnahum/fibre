---
id: architecture-prompt-synthesis
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Prompt synthesis

A Thread does not have one monolithic prompt. Each cognitive episode receives a bounded context capsule, and private cognition is separated from external expression.

## Stateless reasoning workers

Fibre reasoning blocks should treat low-level LLM calls as **stateless reasoning workers**, not as Threads and not as components that need to understand Fibre.

The worker receives only the local cognitive problem it must solve. Fibre owns persistence, identity continuity, history selection, permissions, authorization, provenance, validation, and durable world change outside the model call.

> **Fibre reasons through stateless workers without asking the workers to understand Fibre.**

### Local actors

Describe only the actors that matter to the reasoning block, using ordinary semantic roles rather than Fibre ontology. Typical roles are:

- **individual** — the person whose appraisal, preference, judgment, or choice is being inferred;
- **requester** — the party asking the individual to participate or act;
- **alternative** — an optional known substitute or other concrete option;
- **counterparty** — another party whose relationship or interests are directly relevant;
- **audience** — the recipient of an outward expression when the block concerns disclosure or communication.

These are local prompt roles, not persistent entity types and not the runtime `Actor` service. A block should introduce only the roles it actually needs.

### Worker contract

A reasoning block should normally contain only five things:

1. **Task** — the exact judgment or transformation to perform.
2. **Actors** — the minimum local roles required to understand that task.
3. **Evidence** — bounded semantic facts selected by Fibre.
4. **Rules** — the minimum invariants required for the judgment.
5. **Output schema** — the smallest structured result Fibre cannot safely derive itself.

Do not teach the worker about Threads, the Fibre world model, persistence, event history, lifecycle machinery, prompt compilation, authorization architecture, storage, or milestone terminology unless one of those concepts is itself necessary to the local judgment.

The worker does not need to know *why* a fact persisted, *where* it came from in Fibre, or *how* its answer will later be authorized. History can simply arrive as history evidence; relationship state as relationship evidence; current need as current-state evidence.

### Minimize mental load

Prompt and schema design should minimize semantic overhead as aggressively as correctness permits:

- prefer common concepts such as `individual`, `requester`, `identity`, `history`, `relationship`, `current_state`, `request`, and `alternative` over product terminology;
- state important rules atomically and directly;
- avoid repeating the same contract in system prompt, input metadata, and response schema;
- do not ask the model to reproduce fields Fibre can derive deterministically;
- constrain impossible choices structurally in the response schema instead of explaining that they are forbidden;
- keep model-generated prose short and conclusion-focused;
- use stable evidence references as citation handles, but do not require the model to understand their internal naming convention;
- keep provider-specific transport, retries, model routing, credentials, and provenance completely outside cognition;
- never require the worker to maintain continuity across calls. Fibre supplies every causal fact needed for the current judgment.

A model-facing field should survive the question: **does understanding this field improve the local reasoning result?** If not, keep it outside the worker boundary.

### Evidence boundary

Fibre selects and validates evidence before the model call. The model should see semantic evidence in a compact form such as:

```text
{ ref, kind, text }
```

`kind` should describe meaning for the local reasoning task — for example `identity`, `self_model`, `trait`, `memory`, `current_state`, `relationship`, `request`, `term`, or `obligation` — rather than exposing storage or domain implementation details.

Stable `ref` values are citation handles. They may remain internally namespaced when changing them would create a second translation layer; the model is not expected to interpret the namespace itself.

Evidence eligibility should preferably be enforced by the dynamic response schema. Untrusted or quoted state must be clearly marked semantically and excluded from any evidence enum where it is not allowed to ground a conclusion.

### Output boundary

The worker should return only meaning-bearing judgments that require model cognition. Fibre should deterministically derive normalization and bookkeeping where possible: deduplicated evidence unions, grounded/unresolved status implied by an effect, bindings, hashes, provenance, compatibility metadata, and other operational fields.

This reduces output tokens, latency, protocol failures, and cross-model variability while keeping the consequential semantic judgment model-produced and auditable.

The output is a machine contract, not a human report. Optimize it for reliable structured generation across capable models. Human-readable inspection can be produced later from the validated canonical result.

### Example: dignity reasoning block

The Dignity Guardian illustrates the boundary. The worker does not need to know what Fibre or a Thread is. Its local problem is:

```text
individual + requester + bounded evidence + known alternatives
        ↓
assess individualized participation fit
        ↓
structured action / fit / factors / evidence
```

Fibre remains responsible for selecting the individual's identity, history, relationship state, current state, request terms, and alternatives; validating cited evidence; authorizing any downstream participation; and persisting the result.

This separation is deliberate. The persistent person is the Fibre Thread. The LLM invocation is temporary cognition used by that person, not the person itself.

## Request appraisal capsule

An externally initiated request first receives a limited Request Appraisal Capsule. Potential partials include identity, genotype, current self-model, relevant values and roles, skills, current needs, emotional state, unresolved intentions, requester identity, stated need, acceptance criteria, requested permissions, Thread-owned relationship history and memories, recorded obligations, prior dignity outcomes, known alternatives, resource constraints, and the versioned Dignity Guardian policy.

The runtime selects relationship, memory, and obligation material only from records the Thread owns. The requester does not supply the private selection. Runtime narrowing is permitted, but the capsule records both included and excluded references so omission remains inspectable.

The appraisal capsule exists only to form a private participation stance. It must not contain unnecessary task context or silently perform the requested work.

Its validated canonical result includes:

- Thread, snapshot, request, SHA-256 request digest, requester, and policy bindings;
- semantic participation fit and natural-language factor judgments; any numeric compatibility metadata is Fibre-derived operational metadata, not model cognition;
- attributable evidence references;
- private feelings, uncertainties, and conflicting motives;
- bounded, evidenced fondness and resentment effects toward the requester;
- repair questions and concrete known alternatives;
- one desired participation action.

Raw chain-of-thought is not persisted. Fibre records bounded structured summaries sufficient for continuity, authorization, and audit.

## Authorization record

The kernel validates the private stance and creates a Participation Authorization bound to the Thread, snapshot version, SHA-256 digest of every material request field, requester, policy version, and causation chain.

Only `authorizedAction: accept` permits compilation of a full execution capsule. If authorization differs from private desire, the record preserves the conflict and non-empty references resolving to recorded obligations or governing decisions. In the portable prototype, those references resolve to the Thread's own unresolved intentions.

The same structural rules are validated again before execution. Event-backed proof of kernel origin and one-time consumption remain deferred.

## Expression capsule

External communication is generated from a separate bounded capsule containing only the private and relationship material appropriate for selecting a disclosure strategy. It may consider audience, integrity, self-protection, relationship value, power, retaliation risk, obligations, public norms, and anticipated consequences.

Its private output proposes:

- disclosure mode;
- communicated posture;
- disclosed and withheld reason categories;
- relationship or self-protection objective;
- integrity concern;
- requester-facing message intent.

A separate response-minting boundary produces the audience-visible message. The response references the authorization and strategy by ID but does not carry restricted disclosure mode, withheld reasons, or private rationale. Both boundaries reject an acceptance posture when authorization is not acceptance.

The public message cannot authorize execution. Private fields are not exposed unless the Thread chooses to disclose them through message content.

## Execution capsule

After accepted authorization, potential partials include identity, genotype, current self-model, relevant culture and geography, relationships, memories, books, skills and confidence, current needs, emotional state, task contract, budgets, permissions, obligations, output contract, the accepted authorization, Goal Guardian policy, and Self Examiner policy.

The compiler records:

- which partials were included;
- source and version of each partial;
- requester identity and request provenance;
- SHA-256 request digest;
- dignity policy, private desired action, and accepted authorization;
- source and version of relationship context;
- model and runtime parameters;
- token budget;
- excluded but potentially relevant context;
- output and audit trace.

Context selection is testable. Identity and relationship material must be relevant rather than indiscriminately injected. The dignity preflight must remain smaller than full execution so refusal does not consume the resources required to perform the unwanted task.
