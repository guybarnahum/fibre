---
id: architecture-canonical-visual-identity
status: accepted
last-reviewed: 2026-09-28
canonical: true
---

# Canonical visual identity

## Purpose

This document defines the executable Fibre lifecycle for visual identity. It implements the durable root/reference invariant in [`ADR-0021`](../decisions/ADR-0021-canonical-visual-identity-reference.md): one canonical visual identity root anchors every later depiction of the same Thread. The inherited-embodiment mechanism in the accepted [Human physical inheritance](human-physical-inheritance.md) architecture supersedes ADR-0021's earlier textual-locus recombination sketch without changing that root/reference lifecycle.

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

For a native synthetic Thread, the **final** canonical reference is instantiated geometry-first at normalized reference age 25:

```text
layered canonical appearance text
  -> text-only monochrome geometry anchor
  -> reference-conditioned surface application
  -> final canonical reference
```

The geometry anchor is generation scaffolding only. It is never projected as the Thread's visual identity and never becomes a second Embodiment authority. The final bytes become canonical only after Fibre verifies both the anchor provenance and the final generation proof, including the exact reference from final job to anchor, and World/Embodiment admits the final immutable object.

The canonical reference remains stable as the Thread ages.


Human Appearance partitions the canonical text into **structural morphology**, **reference geometry state**, **surface phenotype**, and **reference surface state**. The first generation receives only geometry-bearing layers. The second receives the resulting anchor plus only surface-bearing layers. This prevents pigmentation, hair and grooming from becoming latent instructions to choose a different face.

Before any image exists, the Thread's inherited physical genome is the embodiment authority. Genesis expresses that genome into one concrete sex-conditioned phenotype and a continuous inherited rendering projection; ancestry and family-origin labels do not cross into the renderer as instructions. The canonical specification carries the selected person's inherited traits and continuous individual variation, not a demographic range for the provider to resolve. Once Fibre has admitted the canonical reference image, that reference becomes the operational likeness authority for downstream image generation. Derived prompts should describe only the requested age, time-local appearance, scene and rendering purpose; they should not replay ancestry, family, demographic or canonical phenotype text.

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
rich layered canonical identity text
  -> text-only geometry anchor
  -> surface application using the anchor
  -> verified final root asset
```

No external image identity is required.

For a de-novo Genesis birth without admitted biological parent Threads, family-history authoring supplies separate maternal and paternal physical-ancestry provenance. Fibre samples two transient founder physical genomes, recombines them into the child's private physical genome, and expresses that genome into one concrete inherited phenotype **before** canonical identity is created.

The ancestry provenance is bootstrap evidence for missing parents only. It must not cross the canonical rendering boundary as a face-selection instruction. The canonical specification describes one concrete person; the image renderer depicts that person and has no authority to choose skin, hair, eyes, facial morphology, nose, mouth, jaw or build from a demographic range. Continuous inherited coordinates accompany the semantic phenotype so individuality inside broad labels is not discarded.

This remains a compact genotype-like model rather than molecular genetics. The physical-genome representation and founder priors are replaceable; the durable boundary is two parental physical genomes -> recombination -> child physical genome -> inherited phenotype -> canonical root.

### Thread-parent / inherited lineage

When a chronologically truthful newborn/reproduction lifecycle supplies actual biological parent Threads, each parent's private physical genome becomes the inheritance authority.

```text
parent A physical genome
parent B physical genome
        -> deterministic allele transmission/recombination
        -> child physical genome
        -> sex-conditioned inherited phenotype
        -> layered canonical identity text
        -> text-only child geometry anchor
        -> surface-applied child canonical reference image
```

The child's root generation does not use the parents' images as visual references. Family resemblance comes from inherited physical state, while recombination preserves sibling variation and hidden inherited material. The child remains a distinct visual identity.

Physical inheritance is separate from Fibre's symbolic/personality genome. Appearance must not imply character, competence, values, class, religion or behavior.

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

Native Human Appearance roots use two bounded Asset Generator jobs.

The **geometry-anchor job** receives structural morphology and reference geometry state only. It has no image input:

```text
referenceObjectRefs = []
role = canonical_visual_identity_geometry_anchor
```

The **final root job** receives the verified geometry anchor as exactly one reference plus surface phenotype/state:

```text
referenceObjectRefs = [geometryAnchorObjectRef]
role = canonical_visual_identity_reference
```

Both jobs carry Thread/Embodiment/specification identity, normalized reference age, exact semantic brief, source/permission refs and provider profile. The second job identity is bound to the deterministic anchor object ref.

The geometry brief deliberately suppresses pigmentation, hair color/texture, grooming and other surface cues while fixing stable geometry/asymmetry. The final edit applies those surface cues with high reference fidelity and explicitly forbids redesigning facial geometry from them.

For source-grounded Echo/Homage roots, authorized source references remain a distinct origin path and must carry matching source/permission provenance.

## Admission boundary

Asset Generator remains an executor.

```text
pending layered Embodiment specification
      -> geometry-anchor AssetGenerationJob
      -> verified immutable geometry object + provenance
      -> final surface-application AssetGenerationJob referencing that object
      -> verified immutable final root + provenance
      -> World Kernel verifies both proofs and exact anchor linkage
      -> Embodiment revision becomes available
      -> final canonical referenceObjectRef admitted
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

Native synthetic canonical roots require a provider profile that supports both text-to-image geometry generation and reference-image editing for the surface pass. GPT Image 2 processes image inputs at high fidelity automatically, so Fibre deliberately sends no separate fidelity knob; the surface pass simply carries the verified geometry anchor as its required reference.

Later Thread-depicting generation also requires a provider profile capable of reference-image conditioning. Fibre must not silently drop `referenceObjectRefs` and fall back to text-only generation, because that would reintroduce likeness drift.

If the selected provider cannot accept the canonical reference, the asset demand remains deferred or selects another explicitly configured reference-capable provider.

Both current image integrations preserve Fibre's reference-object requirement. BFL/FLUX sends canonical references through its native reference inputs; the OpenAI adapter uses the Images edits endpoint when a job carries reference objects and the generations endpoint when it does not. Deployment composition still chooses the provider profile; the semantic job retains the same reference requirement independent of provider.

Image profiles may name a deployment-owned secondary profile. Current routing is:

```text
reference-conditioned image: BFL FLUX.2 Pro -> OpenAI GPT Image 2
reference-free image:        OpenAI GPT Image 2 -> BFL FLUX.2 Pro
```

A provider rejection can therefore fail over without dropping the canonical reference or changing the semantic job. Fibre does not switch providers for ambiguous transport/timeouts where the first provider may already have accepted work, and it resumes a durable accepted provider operation rather than racing it with another render. Provider rejections and failover are logged.

For explicit validation, a deliberately crafted Asset Generation job may set `context.imageProviderMode = "secondary"`. This bypasses the primary for that job only and exists as an operator/test seam; ordinary planners leave it unset.

## Supersession and correction

The canonical reference is expected to be generated once per visual identity lineage, not periodically regenerated as the Thread ages.

A superseding root is exceptional and must be explicit. Valid reasons may include wrong-subject binding, corrupt/invalid root, materially incorrect admitted specification, an authorized canonical correction, or a bounded platform visual-renewal migration that preserves the exact canonical specification while replacing a legacy generated root. The prior root and proof remain durable.

Ordinary age, fashion, hairstyle, expression or aesthetic preference do not justify a root replacement.

## Existing Thread visual renewal

A legacy Thread may have a valid canonical visual specification but a poor operational root produced by an older rendering stack. Fibre may renew that root **without changing the person**.

Renewal has one strict semantic invariant:

```text
before specificationDigest == after specificationDigest
```

The current specification is copied exactly into a superseding Embodiment revision. The revision carries a dedicated renewal witness bound to the immediate prior specification digest and prior canonical root; it is **not** a respecification because the person/specification did not change. Fibre clears the old root from the new lineage head, requests generation under the current renderer/profile, admits a new immutable root, projects it through Thread Presentation, and lets the existing FID lifecycle replace derived official media. The prior root and prior FIN credential remain historical.

This is a software/presentation migration, not a life event or authority rewrite. Renewal must not infer ancestry from a face, name or birthplace; it must not invent parents or a physical genome; and it must not silently enrich a thin or wrong canonical specification.

Run one renewal from the repo root after the matching code is deployed to staging:

```bash
npm run appearance:rerender -- \
  --thread-id=thr_... \
  --reason="Re-render the current canonical appearance; physical genome and canonical specification unchanged."
```

The command verifies staging deployment evidence, asserts that the renewal response preserves the specification digest, waits for the new root, then waits for Presentation and FIN media to converge.

### Appearance migration and re-rendering

Fibre distinguishes **physical-authority migration** from **root re-rendering**.

Use **appearance migration** when the Thread has no physical genome or carries an older appearance-model version. The operator supplies or reuses trustworthy maternal/paternal physical ancestry evidence. Fibre never infers ancestry from portrait pixels, name, birthplace, nationality, culture or language.

The migration uses the same shared founder/inheritance machinery as Genesis:

```text
parent genomes when known
    or explicit founder-population priors when missing
        -> current physical genome
        -> shared physical phenotype projection
        -> canonical visual specification
        -> new Embodiment root
        -> Presentation
        -> FID
```

A current physical genome cannot be replaced merely to obtain a preferred style or face. A versioned appearance-model upgrade is valid only when Fibre has explicitly superseded the older physical model. The old genome/specification/root and downstream credentials remain historical evidence.

For upgrades, the latest durable `THREAD_PHYSICAL_GENOME_MIGRATED` event is the authority for previously operator-confirmed maternal/paternal physical ancestry. Fibre reuses that evidence instead of asking an operator to retype it. If no trustworthy migration evidence exists, explicit ancestry input remains required.

The canonical visual specification after Genesis belongs to the current Embodiment. The identity-level `canonicalVisualIdentity` material is historical Genesis seed/provenance and must not be treated as newer authority after a correction or appearance migration.

Use **re-render appearance** when the current physical genome and canonical specification are sound but the generated canonical root is poor. Re-rendering preserves the exact specification digest and creates only a new operational root plus normal downstream Presentation/FID convergence.

The first 2026-09-27 Li Jing staging run proved the migration/replay machinery but exposed a real appearance-model failure: the v0.1 genome-derived portraits were visually inconsistent with the operator-confirmed East Asian ancestry. That failure reopened calibration.

Slices 1-5 subsequently validated the calibrated `physical-genome-v0.2` model in Population Lab, and a second live Li Jing staging run proved the versioned authority upgrade itself: durable operator ancestry evidence was reused unchanged, v0.1 upgraded to v0.2, a new anatomy-first canonical specification/root was admitted, Presentation converged, and FID revision 4 superseded revision 3. Final diagnosis reports v0.2 plus Embodiment-owned canonical visual authority. Direct inspection of that migrated portrait remains the final live visual-quality acceptance step.

The active sequence is [Physical appearance model calibration and migration plan](../validation/physical-appearance-calibration-plan.md).


## Operator appearance commands

The complete operator procedure is [Appearance operations](../operations/appearance.md).

Use the dedicated Appearance CLI for ordinary maintenance:

```bash
npm run appearance:diagnose -- --thread-id=thr_...

npm run appearance:migrate -- \
  --thread-id=thr_... \
  --reason="Upgrade the Thread to the current calibrated physical appearance model."

npm run appearance:rerender -- \
  --thread-id=thr_... \
  --reason="Re-render the current canonical appearance without changing physical authority."
```

When a previous physical migration event contains operator-confirmed maternal/paternal ancestry, `appearance:migrate` reuses that durable evidence automatically. For a Thread without such evidence, provide `--physical-ancestry-file=/path/to/ancestry.json`.

`appearance:correct` remains the exceptional manual-specification path described below.

## Operator runbook: correcting appearance

A manual canonical appearance correction is an **exceptional authority correction**, not the normal path for inherited physical appearance. Use appearance-model migration for missing/outdated physical authority and re-rendering for a poor root. Manual correction remains only for genuinely exceptional cases such as wrong-subject binding or an independently established specification error that cannot be resolved from physical authority.

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
npm run appearance:correct -- \
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

Thread Details now exposes a dedicated **Appearance** surface. It shows physical-model version, target model, canonical visual authority, canonical root and any durable operator-confirmed parental physical-origin evidence. An outdated/missing physical model offers **Migrate appearance / Upgrade appearance model**; recorded evidence is reused as-is, while absent evidence requires explicit maternal/paternal origin plus a calibrated reference population. A current healthy model offers **Re-render appearance** without changing genome/specification.

Admin never rerolls generated roots. **Refresh appearance** starts one low-frequency watch: immediate status read, then one read every 20 seconds while canonical generation/publication remains pending. **Re-render appearance** starts the same bounded watch after the renewal is admitted so both appearance actions remain blocked with visible progress until publication reaches a terminal state. The watch stops on publication or terminal failure and refreshes the Thread once when the new portrait is current. Manual **Correct appearance** remains an exceptional CLI authority correction, not the ordinary inherited-appearance workflow.

## Required end-to-end proof

The deployment E2E must ultimately prove one birth flowing through:

```text
Genesis birth
  -> public pre-embodiment presentation
  -> rich layered canonical visual identity specification
  -> text-only geometry-anchor job
  -> verified immutable geometry anchor
  -> final root job referencing that anchor
  -> verified immutable final root image
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

1. native geometry-anchor generation has no reference image;
2. the final native root references exactly its verified geometry anchor;
3. geometry scaffolding can never become public visual identity;
4. generic/thin identity text is rejected as insufficient root material;
5. root admission requires verified provenance for both stages and exact anchor linkage;
6. the public visual identity carries exactly the admitted final canonical reference object;
7. official-photo demand carries that reference and a chronology-derived target age;
8. person-depicting memory generation carries the same root reference and event-derived target age;
9. place-only images do not receive a person reference;
10. ordinary aging cannot replace the root;
11. Echo/Homage source-grounded creation retains source/permission provenance and later jobs stop depending on the original source image.
