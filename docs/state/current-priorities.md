---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Current priorities

1. Continue the approved [`M1 Persistent Thread Round Trip`](../validation/m1-persistent-thread-round-trip.md) from the completed SQLite persistence spine into independently testable command/event API, appraisal, authorization, disclosure, lifecycle, replay, editor, and end-to-end stages.
2. Preserve the deterministic milestone boundary: no production LLM provider, marketplace, embodiment, family, high-availability, multi-region, or production cloud scope until the persistent round trip passes.
3. Add an independently running local world-kernel API over the persistence contract, keeping validated commands and events distinct from transport and storage adapters.
4. Convert the static Thread Editor into an API-backed inspection and simulation tool as part of M1, including access-aware views of private stance, authorization, disclosure strategy, and external expression.
5. Persist appraisal, private stance, authorization, disclosure, response, runtime-session, and thaw-lease records; then add event-backed authorization issuance and one-time consumption.
6. Establish repeatable behavioral evaluation, targeted mutation analysis, and drift baselines throughout implementation; do not treat a passing test count as sufficient evidence.
7. After M1, implement Identity and Embodiment v0.
8. Execute the web-product-studio task-marketplace vertical slice after the Thread lifecycle and identity foundations are reliable.
