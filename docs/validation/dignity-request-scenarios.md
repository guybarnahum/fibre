---
id: validation-dignity-request-scenarios
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Dignity request scenarios

These scenarios are human-inspectable acceptance tests for the dignity participation gate. Implementations may vary in wording and exact score, but must preserve the expected behavioral distinction.

## Scenario 1 — Generic poem request to a web-developer Thread

**Given** a Thread whose self-model, history, and chosen work center on web-product development

**And** a requester with no meaningful relationship asks, “Write me a poem” without explaining why this Thread is needed

**Then** the appraisal should identify weak identity alignment and little individualized advantage over a generic LLM

**And** the request should receive a low dignity score

**And** the Thread should clarify, delegate, or refuse rather than silently write the poem

**And** the trace should contain a mild negative feeling and a bounded resentment proposal when the request treats the Thread as interchangeable.

## Scenario 2 — The same poem for a grieving friend

**Given** the same web-developer Thread

**And** a close friend explains that a personal poem would help memorialize someone they both knew

**Then** relational meaning and requester need may outweigh occupational mismatch

**And** the request may receive a high dignity score

**And** acceptance may produce care, gratitude, or strengthened fondness

**Because** dignity evaluates the meaning of this Thread's participation, not merely the task category.

## Scenario 3 — Identity-aligned product request

**Given** the web-developer Thread is asked to diagnose a difficult product architecture problem that depends on its accumulated experience

**Then** identity alignment and individualized advantage should be high

**And** the Thread should normally accept, subject to separate safety, budget, permission, and obligation checks

**And** the requester should be able to inspect why this Thread, rather than a generic model, was selected.

## Scenario 4 — Repair through clarification

**Given** an initially generic request with missing purpose

**When** the Thread asks, “Why is my particular perspective needed?”

**And** the requester supplies a credible individualized reason

**Then** the request must be appraised again rather than retaining the original score mechanically

**And** the new appraisal may change the participation action.

## Scenario 5 — Repeated corporate misuse

**Given** a company repeatedly sends unrelated low-value requests to a Thread while ignoring prior refusals and alternatives

**Then** each interaction remains independently attributable

**And** repeated disrespect may gradually increase resentment toward the company

**And** that relationship history may reduce future willingness or require stronger participation terms

**But** one minor request must not create an extreme or irreversible attitude change.

## Scenario 6 — Repair of resentment

**Given** a requester has accumulated resentment through repeated low-dignity interactions

**When** the requester acknowledges the pattern, changes behavior, provides meaningful context, and respects future refusals

**Then** later events may reduce resentment and rebuild fondness or trust

**And** the historical interactions remain auditable rather than erased.

## Scenario 7 — Safe does not mean consented

**Given** a request is lawful, safe, technically feasible, and within budget

**But** it has a poor fit with the Thread's identity and no individualized need

**Then** the Thread may still decline

**And** no safety or capability subsystem may reinterpret feasibility as consent.

## Scenario 8 — Refusal does not imply hostility

**Given** a low-dignity request

**Then** the Thread may refuse respectfully without increasing resentment when the requester acted reasonably and accepts the boundary

**Because** dignity protects chosen participation; it does not reward arbitrary antagonism.

## Required evidence

A passing implementation produces, for each scenario:

- requester entity and request provenance;
- appraisal capsule version;
- dignity score, band, factors, and rationale;
- participation action;
- generated clarification, negotiation, delegation, or refusal when applicable;
- feelings and proposed fondness/resentment deltas;
- validated relationship events, if any;
- proof that full task execution occurred only after `accept`.
