---
id: architecture-world-context-specificity-v1
status: accepted
last-reviewed: 2026-08-20
canonical: true
---

# World Context Specificity v1

## Purpose

A Fibre World is not a generic setting archetype. It is a particular place and historical-cultural context in which a Thread could actually have lived.

The WorldSpec must therefore answer not only *what sort of city is this?* but also *where is it, which institutions and languages exist there, and what ordinary cultural facts constrain life there?*

> **A World must be particular enough to produce a particular past without writing a particular personality.**

## Existing authority, not a parallel geography authority

`GenesisWorldSpec` already has the semantic surfaces needed for concrete world context:

```text
places[]
languages[]
materialCircumstances
mobilityPattern
schoolingOrCommunityContext
culturalContext
availableInstitutions[]
intellectualEnvironment
worldAuthorship.sourcesConsulted[]
```

Current authoring should use those fields concretely. Fibre does not need a second competing geography authority merely to repair generic prose.

For newly authored current Worlds, `places[].description` and `culturalContext` must explicitly situate the World in an actual country and locality. `worldAuthorship.sourcesConsulted` records factual grounding when real-world institutional/geographic facts are used.

Legacy retained WorldSpecs remain readable even if they predate this discipline. That compatibility does not authorize new generic Worlds.

## Minimum current authoring discipline

A current World intended to generate a Thread life must include:

1. **actual locality + country** — explicitly named in the WorldSpec;
2. **locally grounded places** — home, school, transit, market/library/community settings must belong to that locality rather than describe an interchangeable city type;
3. **situated language use** — not merely a list of language names, but enough context to distinguish household, school/civic, media or secondary-language exposure where relevant;
4. **specific mobility/institutions** — ordinary transport, schooling, libraries/markets/community systems must reflect the actual setting;
5. **multiple factual cultural anchors** — holidays/public rhythms, economic patterns, religious/secular plurality, regional links, climate/material constraints, media/technology change or other ordinary facts that can alter available experiences;
6. **factual provenance** — named public/credible sources when authoring depends on real institutional or geographic claims.

For #39 G1-v2, at least five distinct factual cultural/institutional anchors are required in `culturalContext`.

## What concrete context may do

Concrete geography and culture may constrain lived affordances:

```text
which languages are encountered
which school/institution structures exist
what transport is practical
what foods/markets/media are ordinary
which holidays change public rhythms
what weather/material constraints recur
which kinds of work are visible
which family/regional movements are plausible
which public disagreements or institutions can be encountered
```

These are world facts. They may later become historically consequential only through actual generated events, memories and meanings.

## What concrete context may never imply

Country, city, culture, ethnicity, religion, language, class or regional history may **not** mechanically imply:

```text
personality
morality
politics
competence
intelligence
dignity
religious belief
ethnic self-identification
willingness
future profession
required adversity
required formative event
adult behavior policy
```

A Thread may later affirm, reject, reinterpret or barely notice parts of the culture around them. The World provides opportunities and constraints; it does not finish the person.

## Relocation test

The prior G1 authoring used a relocation witness to ensure a World was not secretly a named biography. That remains useful, but the interpretation changes:

- **good:** the household/event mechanics could be rebuilt elsewhere without preserving a target personality;
- **bad:** therefore the actual city/country should be omitted or treated as interchangeable scenery.

After this correction, relocation should change the World's factual context even when it does not preserve any intended character outcome.

## Presentation boundary

`WorldPresentation` derives website copy and visual grounding from the WorldSpec. It may make existing facts easier to see but must not invent missing geographic or cultural specificity.

If an asset generator needs to guess which country, architecture, signage, transport system or public culture the World belongs to, the WorldSpec is under-specified. Fix the WorldSpec before generating canonical presentation assets.

## #39 G1 finding

The first G1 cohort passed its cold familiarity screen but human review found it too geographically abstract: it described a river-delta city, industrial rail city, highland city, tropical coastal city and northern lake city without making country/locality sufficiently authoritative.

That result is preserved as evidence. Because no G2 cohort genome existed, G1 was corrected before genome exposure by authoring a v2 set grounded in:

```text
Cần Thơ, Vietnam
Łódź, Poland
Cusco, Peru
Accra, Ghana
Greater Sudbury, Ontario, Canada
```

The household/origin/comparative structure was retained so the correction addresses missing world specificity rather than tuning expected personalities or H outcomes.

## Rule

> **Specific place is world authority. Stereotyped personality is not.**
