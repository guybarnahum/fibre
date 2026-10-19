---
id: architecture-visual-age-anchors
status: accepted
last-reviewed: 2026-10-19
---

# Visual age anchors

A Thread has one canonical visual root (normalized age 25) and may additionally have zero or more immutable, derived **age anchors**. An anchor helps depict that same individual at another age; it is never another canonical identity or evidence of how the Thread actually looked at that age.

## Source-only read contract

`services/world-kernel/src/visual-age-anchors.mjs` defines a portable admitted-age-anchor record: Thread and target age; portrait object reference and digest; canonical root reference and digest; references to source anchors (if any); generation receipt; operator approval reference; admission identity and time.

Normalization checks record *shape*, not actual approval, image likeness, provider receipts or object bytes. **Only the future operator-approved admission boundary may produce records that the resolver is allowed to consume.** Callers must supply records read from that verified authority, not candidates or arbitrary presentation data. Durable admission and retrieval are deferred to the admin-approved generation path; Slice 1 does not expose a write route or publish any anchors.

## Reference selection

For a given Thread, canonical root and chronological target age:

1. Exclude anchors owned by other Threads or different canonical root ref/digest. One admitted active anchor per age is selected by latest admission time (with deterministic ID tie-break), without overwriting earlier immutable records.
2. Always include the original canonical root first. It is the only reference at age 25.
3. If an exact-age anchor exists, add it. Otherwise add the closest younger and closest older known ages, as available. Canonical age 25 participates in proximity selection without being duplicated.
4. Return at most three object refs, compatible with the existing multi-reference Asset Generator interface. With no anchors, return precisely the canonical reference used today.

There is no fixed list of anchor ages. The Observatory's future 3–95-year control is a UI affordance, not a genetic or domain constraint. All candidate generations remain derived depiction, never physical authority. Actual weight, injuries, grooming and other lived physical state remain owned by World/Embodiment; references alone cannot establish lived history.

## Deferred execution path

Next, bind operator-approved candidate generation, exact asset provenance and immutable approval to durable admission; use the existing World/asset storage ports rather than introduce a new service. Then expose a Thread Observatory age selector and wire age-conditioned media planners to this resolver. No current renderer, FIA route, Genesis birth or memory depiction is changed by this read-side contract. Automated tests verify selection and authority exclusions; actual generation quality and approval must be validated with inspectable images at the admission boundary.

**Causal maturity:** source-only/read-contract scaffold. No visual change happens until an authorized producer and a rendering consumer are connected. Joint generation, extrapolation quality and individual physical development remain experimental; this slice neither asserts nor excludes those capabilities.