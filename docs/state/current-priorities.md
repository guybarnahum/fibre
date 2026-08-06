---
id: fibre-current-priorities
status: accepted
last-reviewed: 2026-08-05
canonical: true
---

# Current priorities

1. Complete PR #22: run Mina's consolidated persistent round trip through the independently running world kernel and credentialed API-backed Thread Editor, including restart, stale-attempt recovery, accepted and rejected participation paths, explicit closure of one Guardian-rejected runtime, one unattended rejection displayed as a distinct pre-reclamation timeout using kernel-owned time, one obligation override/discharge, freeze, replay equality, editor inspection, and no active runtime.
2. Preserve the deterministic milestone boundary: no production LLM provider, marketplace, embodiment, family, high-availability, multi-region, or production cloud scope until the persistent round trip passes.
3. Use the API-backed Thread Editor as an inspection and bounded-simulation surface only. Every editor API request requires its per-run credential. The editor may display public/private lifecycle records and request deterministic command previews, but may not seed, accept commands, acquire runtime, run workers, freeze, abandon, repair, or mutate `unresolvedIntentions` or obligations.
4. Keep live command acceptance and projection repair behind administrative authority. Command preview remains public and non-mutating; the editor redacts its raw preview ID and uses kernel-published time when constructing preview commands.
5. Keep external disclosure and audience-visible response distinct from private stance, authorization, runtime cognition, freeze, and performed action. Persistent live-kernel disclosure remains unfinished and must not be inferred from deterministic Actor output.
6. Preserve kernel-owned time and the explicit request-attempt recovery contract: after Thread advancement, create a fresh request-attempt ID under the same correlation ID rather than silently reusing historical authorization.
7. Before introducing a tool-capable or model Actor, add an isolated worker/tool gateway that records independently observed tool calls and command attempts. Goal Guardian declarations are not a capability sandbox.
8. Immediately after the deterministic M1 demonstration, evolve unresolved-intention strings into structured obligation records with stable identity, issuer, scope, expiry, recurrence, and satisfaction criteria, before any API or editor is permitted to create or edit obligations. Until then, obligation identity is exact UTF-8 prose equality, successful obligation-mediated freeze discharges that exact reference once, and historical consumption permanently prevents the identical reference from authorizing another override.
9. Continue targeted mutation analysis, including per-layer assertions for defense-in-depth freeze guards, cross-connection abandonment races, percent-encoded private-path policy, crash/concurrency tests, and drift baselines.
10. After M1, implement Identity and Embodiment v0.
11. Execute the web-product-studio task-marketplace vertical slice after the Thread lifecycle and identity foundations are reliable.
