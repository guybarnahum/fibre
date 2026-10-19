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

## Historical memory depictions

Thread memory-reconstruction planning can now use the same dynamically admitted Thread age anchors. An admitted, participant-backed memory gets its target age from the actual event's timestamp and the Thread's birth date—not from the memory's later formation date or invented scene details. When a precise age is supported, the planner selects the canonical root plus the nearest admitted age portraits, at most three images total. The generation brief identifies each input portrait's actual age; its source identity incorporates the specific admissions and image digests.

The existing admitted-snapshot demand trigger and Thread Presentation's media-generation fixture route share one demand-time catalog reader. There is no new storage or service and no bulk reconstruction. Already-ready images remain untouched; a new admission can influence a **future** requested depiction without retroactively altering the historical event or existing media. If the scene does not establish the Thread's presence, the age is unknown, or no eligible portrait exists, the prior behavior is preserved. Official FIN/FID photographs remain bound to the canonical reference only.

**Boundary:** operator admission is **not** a new canonical identity or proof of a Thread's historical appearance. Encounter imagery and Genesis still use their established reference paths. Live staging generation and human likeness review have not yet been demonstrated by these source-level changes. Joint generation, extrapolation quality and individual lived physical development remain experimental.

## Shared encounter imagery

The existing objective Encounter Story image/video planner accepts the same optional admitted visual-age references for each depicted Thread. The encounter time and each participant's birth date determine the participant's depicted age. Each individual's references are chosen independently: canonical age-25 identity first, then at most two exact or nearest admitted ages. Image order and reference ages are explicitly attributed to their owner in the generation brief. One object cannot silently serve two different depicted Threads.

The Thread Presentation service makes its current-root, approved age-reference selection available through a **private read-only** endpoint to Fibre's existing live encounter validation/render workflow; no separate encounter media service or image generation loop is introduced. Different Threads' history and anchors never become a common persona or a new identity authority. Approving or superseding an anchor can change *future* encounter imagery for its owner without modifying the objective Encounter Story, the other participants' likenesses, or existing generated media.

With no eligible age anchors, the encounter reference set and source identity remain canonical-only. If a depicted Thread's canonical visual reference is unavailable, rendering is deferred. The validator still needs deployment and an actual provider-conditioned still image to establish visual quality; semantic reference selection alone is not an empirical same-person guarantee. The current pathway concerns objective Encounter Story reconstructions, not independent first-person POV or a continuous video identity model.
