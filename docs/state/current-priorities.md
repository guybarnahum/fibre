---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-05
canonical: true
---

# Current priorities

1. Continue the approved [`M1 Persistent Thread Round Trip`](../validation/m1-persistent-thread-round-trip.md) from persistent state, private appraisal, accepted authorization, kernel-timed exclusive thaw lease, deterministic Actor, and declaration-auditing Goal Guardian into freeze, consumption, replay, editor, and end-to-end stages.
2. Preserve the deterministic milestone boundary: no production LLM provider, marketplace, embodiment, family, high-availability, multi-region, or production cloud scope until the persistent round trip passes.
3. Implement PR #20: validate proposed life changes, consume accepted authorization exactly once, freeze the Thread through an append-only event, mutate or discharge unresolved intentions explicitly, complete the runtime session, release the thaw lease, and prove replay after restart.
4. Keep external disclosure and audience-visible response distinct from private stance, authorization, runtime cognition, and performed action. No external message or tool execution may be inferred from deterministic Actor output.
5. Preserve kernel-owned time and the explicit request-attempt recovery contract: after Thread advancement, create a fresh request-attempt ID under the same correlation ID rather than silently reusing historical authorization.
6. Before introducing a tool-capable or model Actor, add an isolated worker/tool gateway that records independently observed tool calls and command attempts. Goal Guardian declarations are not a capability sandbox.
7. Reject stale, cross-request, cross-Thread, requester-substituted, expired-lease, aborted-session, duplicate-consumption, and replay attempts with named behavioral evidence.
8. Convert the static Thread Editor into an API-backed inspection and simulation tool after freeze/replay is complete, including access-aware private/public views, runtime state, event history, integrity state, and explicit projection repair.
9. Complete Mina's persistent-round-trip end-to-end proof after the API-backed editor can inspect every stage.
10. Continue targeted mutation analysis, crash/concurrency tests, and drift baselines; do not treat an aggregate passing count as sufficient evidence.
11. After M1, implement Identity and Embodiment v0.
12. Execute the web-product-studio task-marketplace vertical slice after the Thread lifecycle and identity foundations are reliable.
