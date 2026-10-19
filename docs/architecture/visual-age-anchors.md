---
id: architecture-visual-age-anchors
status: accepted
last-reviewed: 2026-10-19
---

# Visual age anchors

A Thread has one canonical visual root (normalized age 25) and may additionally have zero or more immutable, derived **age anchors**. An anchor helps depict that same individual at another age; it is never another canonical identity or evidence of how the Thread actually looked at that age.

## Admission and read contract

`services/world-kernel/src/visual-age-anchors.mjs` defines a portable admitted-age-anchor record: Thread and target age; portrait object reference and digest; canonical root reference and digest; references to source anchors (if any); generation receipt; operator approval reference; admission identity and time.

Normalization alone checks record *shape*, not actual approval or image provenance. The Admin age-anchor producer now freezes each candidate's current World-owned canonical root, target age, selected admitted references and exact Asset Generator job into an immutable object. Only a completed OpenAI job whose receipt, reference-input witness and image digest match that manifest may be admitted. An authenticated operator explicitly reviews the image beside the canonical portrait and approves it before an immutable approval artifact and admission record are written. The existing presentation R2 object store and D1 catalog retain the evidence; an indexed Thread-local catalog lookup supplies the resolver with admitted records, never arbitrary candidates.

## Reference selection

For a given Thread, canonical root and chronological target age:

1. Exclude anchors owned by other Threads or different canonical root ref/digest. One admitted active anchor per age is selected by latest admission time (with deterministic ID tie-break), without overwriting earlier immutable records.
2. Always include the original canonical root first. It is the only reference at age 25.
3. If an exact-age anchor exists, add it. Otherwise add the closest younger and closest older known ages, as available. Canonical age 25 participates in proximity selection without being duplicated.
4. Return at most three object refs, compatible with the existing multi-reference Asset Generator interface. With no anchors, return precisely the canonical reference used today.

There is no fixed list of anchor ages. The Observatory's 3–95-year control is a UI affordance, not a genetic or domain constraint. All candidate generations remain derived depiction, never physical authority. Actual weight, injuries, grooming and other lived physical state remain owned by World/Embodiment; references alone cannot establish lived history.

## Operator workflow — source implemented; staging proof pending

The authenticated Admin Thread Observatory now displays active ages and the canonical root and offers **Generate age portrait**. The operator selects an integer age from 3–95; 25 remains the canonical root and cannot be generated as an extra anchor. The action creates one persistent candidate/job identity, requests reference-conditioned OpenAI generation through the existing Asset Generator, shows the candidate alongside the canonical portrait, and separately presents **Approve age portrait** or **Discard candidate**. Only approval makes an anchor active. Revisiting an existing candidate ID resumes the same immutable job rather than inventing a second render.

The new Admin endpoints are scoped under `/api/threads/:threadId/age-anchors`: a current-root/active-anchor list; canonical and admitted-image reads; and candidate request, status, preview and admission actions. They reuse Cloudflare Access administration, the existing R2 object port, the presentation D1 catalog and the Asset Generator service port. No new service, table, or World lifecycle event is introduced. Historical admissions stay immutable; a later same-age approval becomes the active source without deleting predecessors. A superseded canonical root invalidates old anchors for reference selection.

## Age-conditioned current-present depiction

The existing Thread Presentation current-present pipeline now reads this same Thread-scoped admitted catalog. Only when there are admitted anchors, a known birth date and an admitted canonical reference does it need the current root's immutable image digest; that digest gates eligibility for all supplemental portraits. The shared resolver supplies at most the canonical reference plus two nearby age anchors, dynamically for the particular scene date. The model receives each selected image's actual age and order.

The accepted anchor IDs and image digests contribute to the depiction's source identity, so a later approved replacement may change a **future requested** depiction without rewriting any World fact, earlier image or encounter. With zero eligible anchors, the generated brief and canonical-only references remain as before. This is demand-time selection, not bulk regeneration.

**Boundary:** operator admission is **not** a new canonical identity or proof of a Thread's historical appearance. FID, historical memories, encounter imagery and Genesis still use their established reference paths. The newly wired current-present path must pass local validation and staging evidence before production claims. Human inspection of actual age-conditioned portraits remains necessary. Joint generation, extrapolation quality and individual lived physical development remain experimental.