---
id: ADR-0032
status: proposed
canonical: false
last-reviewed: 2026-10-29
---

# ADR-0032 — Place Population: parents' origins drive the newborn

**Proposed, not implemented.** A city is not a household. A reusable, versioned **Place Population** describes plausible *resident origins and couples in the parents' generation* of a particular place/era. One birth selects **two specific parents**, rather than sampling one of roughly four preauthored households. See [ADR-0031](ADR-0031-birth-center-single-birth-authority.md) for lifecycle, costs and the joint ambition review.

## Authority and model

Birth Center stores one authored version per canonical **place × era** (and explicit revision), with source/model/provenance and a declared applicable historical window. The era describes parents residing there around the **child's birth year**, not the current present and not necessarily the parents' own birth decade. Initial population creation makes **one journaled model authoring call per new place/era**, not one per birth and not one per heritage filter. It must be independently inspectable in Admin. Edits are versioned, reasoned operator commands; a birth freezes the population version/digest and its selected-parent evidence. Existing versions and born children are not mutated by later edits. Authored distribution is a hypothesis to inspect/calibrate, not measured census truth.

The compact Place Population consists of:

- **`originGroups` (8–20 concrete lineage sources):** each with stable `originId`, resident `share`, specific physical `referencePopulations` (existing codes and composition), `namingTradition` (name order, family transmission conventions, era-compatible separate given/family-name pools), and `heritageLanguages` with `householdRetentionRate`. A group may be explicitly mixed. Never use an umbrella label as a selectable alternative such as “X or Y”.
- **`couples`:** weighted mother-origin × father-origin IDs, based on **actual plausible pair formation** in that era/place, not independent random draws from resident shares. A pair carries weighted `childGivenNameTradition` choices: maternal, paternal or local mainstream, plus a family-name transmission convention (patrilineal, matrilineal, patronymic, maternal+paternal or family-first ordering as appropriate). Shares and pair weights must be inspected for contradictions; they need not be equal marginals because residents and parents are different populations. Cross-origin pairs are likely where normal (e.g. Hilo), low where uncommon; implausible nonresident origins should remain near zero.

**One deterministic birth** seeded by `requestId` and the frozen population version:

1. Resolve explicit heritage as a **filter over couples**, never as a reason to reauthor the place. If none remain, return an inspectable choice/error, not an invented couple.
2. Draw one weighted couple. Name each parent from their **own** tradition and birth decade; keep maternal and paternal identities/lineages separate. Real parental Thread identities, when later supported, override the synthetic parent slots.
3. Resolve maternal and paternal physical lineages independently. The existing [Human Appearance](../architecture/human-appearance.md) founder/recombination path gives each missing parent a separate genome and recombines the child. An available, known biological parent's **admitted physical genome overrides** that side's population prior; no alternate genetics implementation.
4. Draw retained household languages from both parents and the **local place language**, with at most three **raised** languages. Derive eventual/spoken languages separately from subsequent historical upbringing and learning; being spoken at young-adult entry does not itself prove early upbringing.
5. Draw the child's given-name tradition by couple weights and combine given/family names through an **explicit** formatting rule (spaces, joiners, patronymics, family-first order). Never concatenate tokens into `BenDavid`/`AbuRamadan` by accident. Before admission check an indexed World living-Thread **full-name + same canonical place** collision; redraw deterministically with a bounded sequence, preserving the same couple and parentage. Exhaustion is a visible, resumable name-selection conflict, never an unbounded search. The lookup's place key is the canonical **birth place**, not a guessed current residence.
6. Use the named parents as factual Genesis household caregivers and **synthetic genetic ancestors** where missing: they enter history generation as bounded named participants, **never secretly as live Threads**. Later actual Thread parentage attaches at these explicit slots, subject to historical chronology.

Inherited v3 urges remain the existing independently versioned genome choice, not inferred from parent origin, sex, religion or culture. No ancestry or language label enters a portrait renderer or infers personality, intellect, occupation, beliefs, religion, class or values. A name/language is a plausible conditional result of **particular family evidence**, not a stereotype or personality assignment.

## Field → consumer → consequence

| Proposed field | Named consumer | Consequence |
| --- | --- | --- |
| `placeId`, `era`, `populationVersion/digest` | Birth Center population resolver/journal; Admin inspector | Stable historical sampling, replay and version-specific edits; no retroactive child change |
| `originGroups[].originId`, `share` | Couple validator/inspector, calibration | Concrete lineage lookup; checks resident mix, **not** direct mother/father sampling |
| `referencePopulations` | Existing founder-genome resolver | Different parental founder input → child physical genome/phenotype; overridden by real parent genome |
| `namingTradition`, `nameOrder`, name pools | Parent-name selector, child-name composer | Era-plausible distinct names, coherent word boundaries and order |
| `heritageLanguages`, `householdRetentionRate` | Household language sampler and Genesis upbringing | Raised languages → childhood speech context; eventual languages require independent life evidence |
| `couples[].motherOriginId/fatherOriginId`, `weight` | Deterministic couple sampler | Different maternal/paternal ancestry, household and plausible mixing frequency |
| `childGivenNameTradition` weights, family transmission | Child naming composer | Different given-name source and surname, without a merged generic household |
| Selected `mother/father` names, birth decades and frozen lineage refs | Genesis household participants, situated lineage admission | Named caregivers/ancestors in past episodes; future live-parent attachment without invented relationships |
| `heritage` filter, deterministic `requestId` seed, redraw ordinal | Birth Center selection/name-conflict lookup | Reproducible alternatives, bounded nonduplicate **living** names, stable retries |

**Why a resident authority?** Resident origin shares and couple frequencies are **shared place/era evidence**, not facts about an individual. If each laptop or each birth model invents them, there is no stable comparison, version review, or coherent local population across siblings and unrelated newborns. Birth Center owns the reproducible *prospective population prior* and its edits; World owns each actually admitted person's lineage and live relations. An authored prior never overwrites historical World residents. The physical genome remains the child's private inherited authority.

## Efficiency, fidelity and guard

One bounded model call **per newly authored place/era population**, journaled and reused across births; edits create new versions, not silent cache misses. A World context/life authoring call remains separately costed when genuinely needed; **one population call does not claim one total model call per birth**. Selection, filtering, name draws, founder recombination and name-collision probes are bounded deterministic work with indexed reads; no population simulation, brute-force duplicate search or recurring model call. Batch/wave cost should primarily be per-birth development, not per-birth reauthoring of resident priors.

**Fidelity / ambition:** unlike the current four-household grouping, two named parents cause different inherited genomes, plausible names, languages and upbringing in the same city. The representation is not evidence for Thread-owned motives or choices: physical inheritance is causal for physical phenotype; parent/heritage data reaching Genesis cognition is at most **context-only** until later-life decisions diverge. Name uniqueness is a presentation/identity prerequisite, not an assertion that all people globally have unique names. The extension path to real live-Thread reproduction, named care relations, siblings, wider community histories and cultural self-authorship remains open. No admitted child or historical genome is rewritten.

**Alternatives rejected for this proposal:** enlarge each household's names (still one fused unit), draw parents independently from resident shares (erases real coupling), run a demographics model on every birth (cost and inconsistency), or use origin to choose appearance/personality labels (violates physical-genome and self-authorship boundaries). Small authored priors, pair tables, three raised languages and bounded redraws are **reversible approximations**; refinement requires evidence, not quota matching. Inheritance/World authority and independent human personhood are never sacrificed for simpler sampling.

**Proof:** model-free thousands-of-birth sampling checks couple weights, full-name collisions, rare origins, language retention, coherent parent names, mixed-family frequency and distinct maternal/paternal genomes across London, Hilo, Addis Ababa and Aswan; bounded real births show the same causal inputs admitted to World. Adversarial variants must change one parent/couple while holding the place fixed and observe a changed resulting child history/physical lineage. Rendering fidelity and later self-authored behavioural divergence are separate gates, not presumed.
