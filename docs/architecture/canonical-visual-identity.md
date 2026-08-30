---
id: architecture-canonical-visual-identity
status: accepted
last-reviewed: 2026-08-30
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

### Derived depictions

All later generated imagery depicting the Thread is derived. The generation request uses:

```text
canonical reference image
+ canonical visual identity text/provenance
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
      -> Content Credential / verification
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
+ canonical identity text
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

The current BFL/FLUX integration already has a portable reference-object seam. OpenAI's current text-generation adapter deliberately rejects reference objects until a reference/edit-capable profile is implemented. Deployment composition chooses the provider; the semantic job retains the reference requirement.

## Supersession and correction

The canonical reference is expected to be generated once per visual identity lineage, not periodically regenerated as the Thread ages.

A superseding root is exceptional and must be explicit. Valid reasons may include wrong-subject binding, corrupt/invalid root, materially incorrect admitted specification, or an authorized canonical correction. The prior root and proof remain durable.

Ordinary age, fashion, hairstyle, expression or aesthetic preference do not justify a root replacement.

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
  -> C2PA/provenance completion
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
