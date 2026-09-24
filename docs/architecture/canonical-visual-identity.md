---
id: architecture-canonical-visual-identity
status: accepted
last-reviewed: 2026-09-24
canonical: true
---

# Canonical visual identity

## Purpose

This document defines the executable Fibre lifecycle for visual identity. It implements the invariant in [`ADR-0021`](../decisions/ADR-0021-canonical-visual-identity-reference.md): one canonical visual identity root anchors every later depiction of the same Thread.

The authority ordering is:

```text
canonical visual identity text
        -> canonical reference image
        -> authorized visual-identity projection
        -> reference-conditioned derived images
```

Presentation media cannot work backward and redefine Embodiment.

## Canonical objects

### Canonical visual identity text

The text is rich natural-language semantic authority describing stable visual phenotype and identity landmarks. It belongs to the authoritative Embodiment specification and retains origin/source/inheritance provenance.

It must be specific enough to materially constrain one recognizable individual, not merely a generic demographic description. Useful dimensions include facial geometry, proportions, eyes, brows, nose, mouth, jaw/chin, skin, hair/hairline, ears, body/build, stable marks, asymmetries and explicit cross-age identity invariants.

### Canonical reference image

The image is the root operational likeness anchor.

For a native synthetic Thread it is generated once from the canonical visual identity text with **no prior reference image**. The normalized synthetic reference age is 25.

The resulting bytes are not automatically identity. They become canonical only after Fibre verifies the exact generation proof and the World/Embodiment authority admits the immutable object into the matching embodiment lineage.

The canonical reference remains stable as the Thread ages.


A broad family appearance prior may help World authoring produce family-compatible phenotype material **before any image exists**, but the prior itself is not renderer authority. Genesis selects one concrete inherited phenotype from that material and the canonical specification carries only the selected person's concrete traits plus individual identity cues. Once Fibre has admitted the canonical reference image, even that rich canonical phenotype prose stops at the boundary: the reference image becomes the operational likeness authority for downstream image generation. Derived prompts should describe only the requested age, time-local appearance, scene and rendering purpose; they should not replay ancestry, family, demographic or canonical phenotype text.

### Derived depictions

All later generated imagery depicting the Thread is derived. The generation request uses:

```text
canonical reference image
+ target age
+ time-local appearance
+ scene/context
```

The derived output may be published, signed and cited as generated reconstruction, but it is never promoted back into canonical identity merely because it is newer or aesthetically preferable.

## Origin paths

### De-novo / foundling / synthetic lineage

```text
rich canonical identity text
  -> text-only canonical root generation
  -> verified root asset
```

No external image identity is required.

For a de-novo birth with grounded family-origin appearance evidence, World authoring supplies a bounded set of family-compatible textual appearance loci. Genesis deterministically selects one concrete inherited phenotype from those loci **before** canonical identity is created, then adds Thread-specific proportions, asymmetries, hairline details and stable marks that do not override the inherited selection.

The family envelope is upstream plausibility evidence only. It must not cross the canonical rendering boundary. The canonical specification describes one concrete person; the image renderer depicts that person and has no authority to choose skin, hair, eyes, facial morphology, nose, mouth, jaw or build from a range.

This is intentionally a small proof rather than a population-genetics simulator. The extension path remains open for richer inherited textual phenotype recombination and mutation witnesses; the canonical text and reference-root authority boundary do not change.

### Thread-parent / inherited lineage

Visual heredity should use natural-language atomic visual phenotype loci rather than pixel blending or numeric face vectors.

```text
parent A phenotype text loci
parent B phenotype text loci
        -> deterministic locus selection/recombination
        -> explicit mutation witnesses where applicable
        -> child canonical identity text
        -> text-only child canonical reference image
```

This is intentionally parallel to Fibre's symbolic textual genome model. Semicolon-separated atomic text is an appropriate implementation representation when it preserves exact locus provenance and deterministic selection.

The child's root generation does not use the parents' images as visual references. Family resemblance comes from inherited semantic phenotype material. The child remains a distinct visual identity.

The visual phenotype inheritance layer may use/reuse the symbolic genome's recombination machinery, but the semantic domains remain distinct: visual phenotype loci describe appearance; personality/disposition loci describe inherited symbolic tendencies. Appearance must not imply character.

### Echo

A living identifiable human sponsor may ground an Echo only through the accepted consent/rights authority.

The canonical root may use authorized source imagery plus explicit transformation instructions. The result is a new Fibre canonical reference with durable source/permission provenance. The sponsor image is creation evidence, not the perpetual reference passed to later media jobs.

After admission:

```text
sponsor/source material
    -> transformed Fibre canonical reference
    -> all future Thread imagery references Fibre canonical reference only
```

### Historical/literary Homage

An attested deceased or fictional source may shape visual origin under the accepted Homage/source-rights rules.

A historical-person-inspired Thread may deliberately preserve recognizable source influence while introducing specified modifications. That does not make the Thread the historical source person, and it does not transfer the source biography/history into the Thread.

Actual source images used as inputs need appropriate source rights/licensing/public-domain authority. After Fibre admits the transformed root, later imagery uses the Fibre root rather than repeatedly consulting the original homage source.

## Age semantics

The canonical synthetic root uses:

```text
referenceAgeYears = 25
```

This is a normalization convention only.

A derived image computes or receives a target age from authoritative chronology:

```text
current identity photo
  targetAge = age(Thread.birthDate, presentation/generated time)

autobiographical memory reconstruction
  targetAge = age(Thread.birthDate, referenced event time)

historical/life scene
  targetAge = age(Thread.birthDate, scene/event time)
```

If exact age is not grounded, Fibre may provide a bounded age band or omit an exact age rather than invent chronology.

A provider brief should state explicitly that the supplied reference depicts the same person at normalized age 25 and that the provider must preserve identity while naturally age-transforming to the requested target age.

## Time-varying appearance

The root image is not a snapshot of every later physical fact.

Time-local appearance may include:

- hairstyle and grooming;
- clothing;
- expression;
- body-weight changes;
- temporary injury;
- ordinary aging;
- age-related skin/hair changes;
- scene-specific posture and presentation;
- later stable marks when authoritatively recorded.

These should be layered onto the root identity anchor through scene/life state. They do not automatically cause canonical root replacement.

If Fibre later needs a richer authoritative appearance timeline, it should become explicit embodiment/appearance state rather than a chain of unofficial replacement portraits.

## Root generation

The root generation job is special because it has no canonical image input for native synthetic identity.

The brief therefore needs substantially richer identity semantics than ordinary presentation generation. It should emphasize stable geometry and asymmetry, prohibit glamour/stylization drift, and request a neutral mostly-frontal head-and-shoulders reference suitable for later identity conditioning.

The root job must carry:

```text
threadId
embodimentId
embodimentRevision
specificationDigest
referenceAgeYears
exact semantic brief
source/permission refs
provider profile
```

For native synthetic roots:

```text
referenceObjectRefs = []
```

For source-grounded Echo/Homage roots, any supplied reference objects are explicit creation inputs and must have matching source/permission provenance.

## Admission boundary

Asset Generator remains an executor.

```text
pending Embodiment specification
      -> root AssetGenerationJob
      -> provider execution
      -> GenerationRecord
      -> Fibre provenance verification
      -> immutable root object + StoredAssetReceipt
      -> World Kernel verifies exact proof
      -> Embodiment revision becomes available
      -> canonical referenceObjectRef admitted
```

A text-only pending embodiment must not be projected as if a usable visual identity image already existed.

The accepted Embodiment asset records both:

- its World-owned opaque asset locator/digest; and
- the immutable object reference that downstream Asset Generator jobs can resolve as a reference image.

The World-owned `asset://`/`cache://` locator must not be silently reinterpreted as an object-store reference.

## Presentation projection

Only an available public portrait embodiment with an admitted canonical reference may create a public visual-identity projection.

The bounded projection carries:

```text
embodimentId
embodimentRevision
specificationDigest
subjectDescription
renderDescription
sourceReferences
permissionReferences
referenceObjectRefs = [canonicalReferenceObjectRef]
provenanceRef
```

Thread Presentation then owns the derived public credential policy:

```text
visual identity projection
  -> Fibre Identity Card metadata
  -> official_id_photo placeholder
  -> asset demand
```

The identity card and its official photo remain presentation credentials. They do not create or alter civil identity or Embodiment.

## Reference-conditioned downstream generation

### Official identity photo

An official identity photo is eligible only when the canonical reference image is present.

Its generation brief includes:

```text
canonical reference image at age 25
+ target current age
+ administrative ID-photo framing constraints
```

The result is deliberately derived media, not the canonical reference itself.

### Autobiographical-memory reconstruction

If the Thread appears in a memory reconstruction and a canonical visual identity exists, the memory generation job should pass the canonical reference image and derive the Thread's target age from the remembered event/scene chronology.

The reference image establishes who appears. The memory establishes what scene is reconstructed. Neither one may invent the other's authority.

### Place/environmental image

A place-only image does not receive the Thread's reference image simply because it appears on the same presentation. References are supplied only when the asset is meant to depict the Thread.

## Provider requirements

The canonical root can use a text-to-image provider profile for native synthetic identity.

Later Thread-depicting generation requires a provider profile capable of reference-image conditioning. Fibre must not silently drop `referenceObjectRefs` and fall back to text-only generation, because that would reintroduce likeness drift.

If the selected provider cannot accept the canonical reference, the asset demand remains deferred or selects another explicitly configured reference-capable provider.

Both current image integrations preserve Fibre's reference-object requirement. BFL/FLUX sends canonical references through its native reference inputs; the OpenAI adapter uses the Images edits endpoint when a job carries reference objects and the generations endpoint when it does not. Deployment composition still chooses the provider profile; the semantic job retains the same reference requirement independent of provider.

## Supersession and correction

The canonical reference is expected to be generated once per visual identity lineage, not periodically regenerated as the Thread ages.

A superseding root is exceptional and must be explicit. Valid reasons may include wrong-subject binding, corrupt/invalid root, materially incorrect admitted specification, or an authorized canonical correction. The prior root and proof remain durable.

Ordinary age, fashion, hairstyle, expression or aesthetic preference do not justify a root replacement.

## Operator runbook: correcting appearance

A canonical appearance correction is an **authority correction**, not a presentation tweak. Use it only when the admitted canonical specification/root is materially wrong for this Thread: for example, renderer-selected morphology escaped the Thread's grounded family/inheritance evidence, the wrong subject was bound, or the admitted specification itself is incorrect.

Do not use this path for aging, hairstyle, grooming, clothing, expression, temporary injury, weight variation, or aesthetic preference. Those belong to time-local appearance or derived presentation state.

The operator should first inspect the Thread's existing authoritative evidence and write **one concrete person**, not a demographic label or a range. For a native synthetic Thread, preserve the Thread's already-established identity cues and use its Genesis family/inheritance evidence only to correct the mistaken phenotype. Birthplace, nationality, culture, or ancestry labels are not themselves rendering instructions.

A correction file has the canonical specification shape:

```json
{
  "subject": {
    "partyId": "thr_...",
    "description": "adult person; one concrete skin tone; one concrete hair morphology/color; one concrete eye color/shape; concrete face, brow, nose, mouth, jaw/chin and build; stable asymmetries and marks"
  },
  "method": "canonical synthetic portrait specification from operator-reviewed authority correction",
  "description": "Preserve the listed stable identity geometry and phenotype across derived media. Do not infer personality, character, culture or competence from appearance. Render a neutral normalized age-25 head-and-shoulders reference without glamour, caricature or stylization drift.",
  "model": "replaceable-renderer"
}
```

The subject description should be specific enough to constrain one recognizable individual. Prefer concrete atomic traits over alternatives such as “light-to-medium”, “straight or wavy”, or “brown or hazel”. Preserve known asymmetries, hairline details and stable marks when they are part of the established identity.

Run the correction from the repo root:

```bash
npm run fid:visual:repair -- \
  --thread-id=thr_... \
  --spec-file=/tmp/thread-visual.json \
  --reason="Correct canonical visual identity: <concise factual reason>."
```

The tool verifies that the local checkout matches staging deployment evidence, submits the authoritative correction, and reports progress while Fibre converges:

```text
inspect_current_identity
submit_canonical_correction
await_canonical_root
canonical_root_admitted
await_presentation_projection
presentation_projected
await_fin_card
fin_card_active
```

Successful completion reports the old and new canonical root references, corrected Embodiment revision, and resulting FID credential. The expected causal chain is:

```text
current canonical specification/root
        -> explicit operator correction
        -> pending corrected Embodiment revision
        -> newly generated and admitted canonical root
        -> Thread Presentation projects that root
        -> FID lifecycle ensures the credential against that root
        -> derived official photo / FIN Card converge automatically
```

Do **not** manually edit Presentation media or cut a separate card to make the correction “stick”. Presentation and FIN media are downstream projections and should converge from the corrected World/Embodiment authority.

After completion, verify in Thread Observatory:

1. the canonical visual specification describes the intended one concrete person;
2. the current canonical Embodiment is available and references the new root;
3. Thread Presentation's visual identity references that same root;
4. any official identity photo is derived from that root;
5. the active FIN Card is current for that root;
6. the prior root and prior credential/provenance remain historical, not current.

### Admin UI semantics

The generic **Fix** action in Thread Admin is deliberately not an appearance editor. **Fix** repairs derived state from existing authority; it must not author a new canonical person.

If Admin exposes this workflow, it should be a separate explicit operator action such as **Correct appearance**, with the same authority semantics as the CLI: review the current canonical specification/evidence, submit one complete corrected specification with a reason, then let normal visual/FID reconciliation converge. It must not be hidden inside ordinary Fix or implemented as direct image replacement.

## Required end-to-end proof

The deployment E2E must ultimately prove one birth flowing through:

```text
Genesis birth
  -> public pre-embodiment presentation
  -> rich canonical visual identity specification
  -> one root-reference job
       native path: no image reference
       source-grounded path: authorized reference(s)
  -> verified immutable root image
  -> Embodiment admission
  -> visual identity projection carrying root objectRef
  -> public presentation rewrite
  -> official-photo demand carrying same root objectRef + target age
  -> reference-capable Asset Generator
  -> Fibre provenance completion
  -> Thread Presentation acceptance
  -> public official image
  -> Viewer
```

A second proof should exercise a memory/scene image at an age materially different from 25 and assert that the job carries the same canonical root reference plus the correct target age.

## Non-negotiable tests

At minimum permanent tests should prove:

1. native root generation has no reference image;
2. generic/thin identity text is rejected as insufficient root material;
3. a pending text-only embodiment does not become public visual identity;
4. root admission requires exact verified generation proof;
5. the public visual identity carries exactly the admitted canonical reference object;
6. official-photo demand carries that reference and a chronology-derived target age;
7. person-depicting memory generation carries the same root reference and event-derived target age;
8. place-only images do not receive a person reference;
9. ordinary aging cannot replace the root;
10. Echo/Homage source-grounded creation retains source/permission provenance and later jobs stop depending on the original source image.
