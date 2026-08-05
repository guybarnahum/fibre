---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-05
canonical: true
---

# Current priorities

1. Continue the approved [`M1 Persistent Thread Round Trip`](../validation/m1-persistent-thread-round-trip.md) from persistent state, private appraisal, accepted authorization, kernel-timed exclusive runtime, Guardian-gated freeze, single-use authorization consumption, obligation discharge, explicit Guardian-reject abandonment, diagnosable timeout, and replay into editor and end-to-end demonstration stages.
2. Preserve the deterministic milestone boundary: no production LLM provider, marketplace, embodiment, family, high-availability, multi-region, or production cloud scope until the persistent round trip passes.
3. Implement PR #21: convert the static Thread Editor into an API-backed inspection and simulation tool with access-aware public/private views for Thread state, request/appraisal/stance, authorization, lease/runtime, Actor, Guardian, freeze report, abandonment, timeout, consumption, event history, integrity, and explicit projection repair. PR #21 must not create or edit `unresolvedIntentions` or any obligation record.
4. Implement PR #22: run Mina's complete persistent-round-trip demonstration through a separate process and the API-backed editor, including restart, stale-attempt recovery, accepted and rejected participation paths, explicit closure of one Guardian-rejected runtime, one unattended rejection ending as a distinct timeout, one obligation override/discharge, freeze, replay equality, and no active runtime.
5. Keep external disclosure and audience-visible response distinct from private stance, authorization, runtime cognition, freeze, and performed action. Persistent live-kernel disclosure remains unfinished and must not be inferred from deterministic Actor output.
6. Preserve kernel-owned time and the explicit request-attempt recovery contract: after Thread advancement, create a fresh request-attempt ID under the same correlation ID rather than silently reusing historical authorization.
7. Before introducing a tool-capable or model Actor, add an isolated worker/tool gateway that records independently observed tool calls and command attempts. Goal Guardian declarations are not a capability sandbox.
8. Immediately after the deterministic M1 demonstration, evolve unresolved-intention strings into structured obligation records with stable identity, issuer, scope, expiry, recurrence, and satisfaction criteria, before any API or editor is permitted to create or edit obligations. Until then, obligation identity is exact UTF-8 prose equality, successful obligation-mediated freeze discharges that exact reference once, and historical consumption permanently prevents the identical reference from authorizing another override.
9. Continue targeted mutation analysis, including per-layer assertions for defense-in-depth freeze guards, crash/concurrency tests, and drift baselines; do not treat an aggregate passing count as sufficient evidence.
10. After M1, implement Identity and Embodiment v0.
11. Execute the web-product-studio task-marketplace vertical slice after the Thread lifecycle and identity foundations are reliable.
