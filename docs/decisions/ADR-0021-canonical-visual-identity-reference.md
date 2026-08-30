---
id: ADR-0021
status: accepted
last-reviewed: 2026-08-30
---

# ADR-0021: Canonical visual identity text and root reference image

## Status

Accepted.

## Context

Fibre needs a Thread to remain visually recognizable across many derived images: identity-card photos, autobiographical-memory reconstructions, public presentation portraits, later-life scenes, and other generated media. A text prompt alone is too weak as the repeated operational anchor because image generators can drift toward a different face from one request to the next. Conversely, allowing each generated image to become new identity authority would make presentation media rewrite the person.

Age creates a second problem. The same Thread may be depicted as a child, young adult, middle-aged adult, or older person. Age must change appearance without changing who the person is.

Fibre also supports more than one origin family. A de-novo or inherited Thread can be entirely synthetic. An Echo may be grounded in a consenting living sponsor. A Homage may be grounded in an attested deceased or fictional source. A child may inherit visual phenotype material from Thread parents. These cases need one visual-identity model with truthful provenance rather than separate ad-hoc image paths.

## Decision

Fibre separates **canonical visual identity text**, the **canonical reference image**, and **derived depictions**.

```text
canonical visual identity text
        -> canonical reference image
        -> all later Thread-depicting images
             + target age
             + time-varying appearance state
             + scene/context
```

The canonical reference image is the root visual anchor. Once admitted, it is immutable identity-supporting embodiment material. Later generated images are derived media and never become a replacement visual authority merely because they look plausible or are newer.

### 1. Canonical visual identity text is semantic authority

The visual-identity specification must be rich, concrete natural-language semantic state. It should materially constrain the same recognizable person and include, where known and appropriate:

- face shape and proportions;
- eye shape, spacing, color, brows and asymmetries;
- nose geometry;
- mouth/lip shape;
- jaw/chin;
- skin tone and ordinary texture;
- hair color, texture, hairline and stable growth pattern;
- ears and other useful landmarks;
- body/build and proportions where relevant;
- distinctive stable marks or asymmetries;
- explicit identity invariants that should survive age transformation.

Generic text such as `brown hair, brown eyes` is not sufficient canonical identity material. The text should be useful both for first creation of the reference image and as a semantic recovery witness if the image object is unavailable.

The text remains authoritative even after an image exists. The image is the stronger operational likeness anchor; it does not erase the semantic specification or its provenance.

### 2. Native synthetic root generation is text-only

For de-novo, foundling, synthetic-lineage and Thread-parent children whose visual identity is not grounded in an external human/source image, the canonical reference image is generated exactly once from canonical visual identity text **without a prior image reference**.

This first generation is the point at which Fibre instantiates one concrete face/body realization from the semantic visual specification. The resulting immutable, verified asset is then bound back to canonical Embodiment authority.

A pending text specification alone is not yet a usable public visual reference. The visual identity becomes operationally usable only after the canonical reference asset has been generated, verified, durably stored, and admitted by the owning Embodiment authority.

### 3. Fixed reference age; age is not identity

Fibre uses a normalized canonical reference age of **25 years** for synthetic root visual identity unless a future accepted decision supersedes this convention.

The reference age is a rendering normalization, not a claim that the Thread is currently 25 or that a historical photograph was taken at age 25.

Later generation is conditioned as:

```text
canonical reference image at referenceAge = 25
+ canonical visual identity text
+ targetAge = N
+ scene-specific appearance/context
-> same recognizable Thread at age N
```

Age, hairstyle, clothing, weight fluctuation, expression, temporary injury, ordinary aging and scene styling are time-varying appearance state. They do not mint a new person and do not replace the canonical reference image.

### 4. All later Thread-depicting images use the canonical reference

After the canonical reference exists, any generated image intended to depict the Thread must use it as a reference input whenever the selected media provider supports reference conditioning. The bounded job also carries the relevant target age and semantic context.

Examples include:

- official Fibre identity-card photograph;
- autobiographical-memory reconstruction in which the Thread appears;
- public profile or presentation portrait;
- later-life or historical-life reconstruction;
- scene imagery that explicitly depicts the Thread.

Pure environmental/place images that do not depict the Thread remain reference-free.

A derived image may never be fed back as a new canonical reference merely because it is aesthetically better, newer, or more age-appropriate.

### 5. Inherited visual identity recombines text, not parent pixels

For a biological-style Thread-parent lineage, Fibre may derive the child's canonical visual identity text from parental visual-phenotype text using the same natural-language-first inheritance principles as the symbolic genome:

```text
parent A visual phenotype loci
+ parent B visual phenotype loci
+ deterministic recombination
+ explicit bounded mutation witnesses
-> child canonical visual identity text
-> text-only child canonical reference generation
```

The preferred representation is atomic natural-language loci, compatible with semicolon-separated recombination where appropriate. Fibre chooses exact inherited textual atoms under deterministic policy rather than averaging numeric face vectors or blending parent pixels.

Parent canonical images are not reference inputs to the child's root generation merely to create a visual mash-up. Parentage is preserved through textual/provenance-bearing inheritance. The child receives its own root visual anchor.

This inherited visual phenotype is origin material, not mature character. Appearance inheritance may not be used to infer personality, morality, intelligence, profession, interests, politics or other non-visual semantic traits.

### 6. Echo and Homage are source-grounded root exceptions

Echo/Homage origin may legitimately begin with source-grounded visual material rather than text-only generation.

- A living identifiable sponsor requires the accepted Echo consent/rights boundary.
- A deceased/fictional Homage requires the accepted source-status and source-rights boundary.
- Any actual image used as generation input must have durable permission/licensing/public-domain authority appropriate to the intended use and visibility.

In this case Fibre may use authorized source image(s) plus an explicit transformation specification to create the Thread's canonical reference image. The source person and the Thread remain distinct identities. The canonical Fibre output must carry the source provenance and the intended modifications; source biography or historical truth does not transfer into the Thread.

For example, a disclosed historical Homage may be visually inspired by an attested deceased person with explicit modifications. Once Fibre admits the resulting canonical reference, **later generated images use the Fibre canonical reference, not the original source image again**. This creates one stable Fibre identity boundary and prevents every later provider call from reopening sponsor/source identity and rights semantics.

### 7. Root-reference admission requires generation proof

For generated roots, the canonical asset must be tied to its exact generation job, semantic brief, input/reference witnesses, immutable object digest, Content Credential/provenance proof where required by deployment policy, and the matching Embodiment revision.

Asset Generator does not own the visual identity. It produces candidate bytes plus immutable generation proof. World/Embodiment authority decides whether that exact output is admitted as the canonical reference.

### 8. Canonical reference replacement is exceptional

Ordinary passage of time never replaces the canonical root image.

A replacement/superseding canonical reference is allowed only through an explicit authority correction or respecification path, for example when the prior reference was incorrectly generated, corrupt, bound to the wrong subject, or the canonical identity specification itself was legitimately corrected. Such a change must retain the old reference and provenance rather than silently overwrite it.

Aesthetic preference alone is not sufficient reason to rewrite canonical identity.

## Consequences

Positive:

- one Thread remains visually recognizable across many ages and scenes;
- age becomes an explicit rendering variable instead of accidental identity drift;
- visual identity remains Fibre-owned while Asset Generator stays a bounded execution service;
- parent inheritance can produce family resemblance without pixel blending or numeric face vectors;
- Echo/Homage can preserve truthful source provenance and rights without contaminating every later generation request;
- canonical text remains meaningful and inspectable while the image supplies stronger operational likeness continuity.

Costs:

- the first synthetic visual reference needs a richer-than-normal text specification and high-quality generation path;
- providers used for later person-depicting images must support reference-image conditioning or the job must remain deferred/use an explicitly approved fallback;
- canonical reference objects become long-lived identity-supporting assets with stronger integrity/provenance requirements than ordinary presentation media;
- Echo/Homage source-grounded creation needs explicit source-rights handling before the canonical Fibre root can be admitted.

## Implementation ordering

The standing implementation order is:

```text
1. canonical visual identity text/origin provenance
2. root-reference generation demand
3. verified immutable root asset
4. Embodiment admission
5. bounded public visual-identity projection
6. Thread Presentation rewrite / identity-card slot
7. reference-conditioned + age-conditioned derived media demand
8. Asset Generator + Content Credential completion
9. Thread Presentation acceptance/publication
10. Viewer consumption
```

No later step may bypass steps 1–4 by inventing a face from name, culture, legacy `portraitRef`, a prior presentation image, or an arbitrary generator prompt.

This ADR complements [`ADR-0005-family-and-inheritance.md`](ADR-0005-family-and-inheritance.md), [`ADR-0006-echo-and-homage.md`](ADR-0006-echo-and-homage.md), [`ADR-0013-source-identity-consent-boundary.md`](ADR-0013-source-identity-consent-boundary.md), and the canonical Thread birth/presentation architecture.
