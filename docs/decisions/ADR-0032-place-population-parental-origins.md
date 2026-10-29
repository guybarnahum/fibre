---
id: ADR-0032
status: proposed
canonical: false
last-reviewed: 2026-10-29
---

# ADR-0032 — Place Population: parents' origins drive the newborn

**Proposed; not implemented.** A place is not one household. Birth Center owns a shared **versioned Place record** for each canonical place × **child's birth decade**. It describes that era's civic World context and the origins of parents living there. A birth draws a couple, not a prewritten family profile. [ADR-0031](ADR-0031-birth-center-single-birth-authority.md) owns the lifecycle.

## One Place record; lazy names

The optional `place_authored` stage makes **one journaled model call** when a place/decade lacks a record. That single output contains both:

- **Civic context:** the existing World-context fields, including place/time zone, home, schooling, transit, institutions, local and schooling languages, and material/social context.
- **Place Population:** `originGroups` and `couples`, with provenance and a version/digest. No given-name or surname lists are in this call.

`originGroups` are 8–20 concrete resident lineage sources, each with an `originId`, resident `share`, physical `referencePopulations` (existing codes), `heritageLanguages` and their `householdRetentionRate`. A group can be explicitly mixed; an umbrella “A or B” is not a single selectable group.

`couples` are weighted `motherOriginId × fatherOriginId` pairs. Their `weight` represents plausible couples in that place/decade, **not** independent draws from resident shares. Cross-origin couples should be frequent where they are common (Hilo) and rare where they are not (Aswan). Each couple carries **only** weights for the child's given-name source: mother's tradition, father's tradition or local mainstream. Naming conventions are not stored on the couple.

**Naming is lazy.** The first time a birth draws an origin group, Birth Center obtains one small **journaled naming-tradition model call** for that group. It records given-name pools for the parents' birth decade and for the child's birth decade, plus family names. It also owns the naming rules: `transmission ∈ {father, mother, mother+father, patronymic}`, `nameOrder` and `joiner`. Reuse that version for subsequent births; author missing decade material under the same journaled first-use rule. Parents' birth decades need not equal the child's decade. Authored naming data must be large enough to permit individual variation; names are not a code for religion or personality.

The Place and naming versions remain inspectable. New versions require explicit commands and provenance; **Admin edits are deferred**. Slice 3 only shows the Place record. Every birth pins the versions it consumed. Older births and Threads are not rewritten.

## One deterministic child

From `requestId` and pinned Place/naming versions:

1. Filter couples by any explicit heritage constraint. Heritage never creates a separate World/Place authoring call. If nothing matches, report a clear selection failure.
2. Select a weighted couple. Select distinct named mother and father from their **own** traditions and birth decades. These are synthetic ancestors/household caregivers, not live Threads.
3. Use each selected origin's `referencePopulations` to make a missing parent's founder genome, then the existing physical recombination core for the child's genome. A known live biological parent's **admitted physical genome overrides** that side's population prior.
4. Sample retained household languages from the parents and local place. Limit **raised languages** to three. For now **eventual languages = raised languages ∪ Place schooling language(s), capped at three**, by a deterministic, replayable rule. Life-history-based eventual-language acquisition is **deferred**.
5. Sample which tradition supplies the child's given name by the couple's weights. Compose the family name using the selected tradition's `transmission`, `nameOrder` and `joiner`; preserve spaces and culturally meaningful joins.
6. Atomically reserve the child's complete name in a **Birth Center index keyed by canonical place and full name**. It covers issued names, including **in-flight** births. On the **first new-model birth in each place**, seed it once from the World thread directory. Later births use the local index, with **no per-birth World call or new World index**. If a name is taken, redraw deterministically with a small bound; do not redraw parents or silently loop.
7. Pass both named parents into Genesis history as household participants and synthetic genetic ancestors, never disguised as live Threads. Keep these parent slots available for future real Thread parents. The independently versioned v3 inherited urges do **not** depend on ancestry, language, sex or name.

No origin field may infer religion, class, job, ability, intelligence, values or temperament. Names and languages are plausible outcomes of specific parental traditions, not identities or destinies.

## Field → consumer → consequence

| Field | Consumer | Effect |
| --- | --- | --- |
| `placeId`, child's `birthDecade`, Place version/digest | Birth Center Place resolver and Genesis World-context builder | One shared era-specific civic/population source; exact replay |
| Civic World-context fields, including schooling languages | Genesis WorldSpec/childhood authoring, eventual-language selector | Situated life and deterministic schooling language exposure |
| `originId`, resident `share` | Couple validator, population inspector/calibration | Inspect resident composition; shares **do not** independently select parents |
| `referencePopulations` | Existing maternal/paternal founder-genome resolver | Distinct parental physical genomes and child phenotype; live-parent precedence |
| `couples`: parent origin IDs, weights | Couple sampler | Plausible mixed-parent distribution and separate ancestry |
| `childGivenNameTradition` weights | Child's given-name selector | Mother's, father's or mainstream tradition selected per birth |
| Naming pools per parent/child decade | Parent-name and child-name selectors | Era-appropriate individual names; lazy model calls |
| Naming `transmission`, `nameOrder`, `joiner` | Child full-name composer | Correct surname inheritance, order and spacing |
| `heritageLanguages`, `householdRetentionRate` | Household language sampler | Raised languages and childhood context |
| Schooling languages; selected raised languages | Eventual-language selector | Deterministic eventual language set of at most three; historical learning deferred |
| Selected parent names/decades and ancestry witnesses | Genesis participants, World lineage admission | Named caregivers and synthetic ancestors; future live-parent slots |
| `requestId`, heritage filter, redraw ordinal, name reservation | Couple selector and Birth Center place/name index | Repeatable selection; no duplicate issued local names, even while in flight |

## Why resident authority, and what it costs

Resident origins and couple rates describe a **shared place**, not an individual child. Authoring them separately for every CLI run or birth would invent inconsistent populations. Birth Center owns this model-authored, inspectable prior. **World owns admitted personal lineage.** The prior is not a census fact or a claim about any resident.

Cost: **one model call per new place × child's birth decade** authors civic context and population together. Only drawn origin groups incur **one small naming call per missing naming tradition/decade material**. Parent draws, physical inheritance, household languages and name redraws are bounded local work. Seeding issued names uses **one World directory read per place**, not each birth. Normal status reads use indexed local records and never reauthor or scan World. Genesis development retains its existing separate model cost.

## Vision and review

**Fidelity:** independent parents make ancestry, names and languages consequential for one child's body and historical context. **Ambition:** live Thread parentage, siblings, richer culture and later self-authorship remain open. None are replaced by demographic labels. **Causal limit:** physical inheritance changes the body; childhood input is context-only until a later Thread-authored decision demonstrably changes. Name uniqueness is an issued-name rule within a place, not a universal naming law.

**Deferred:** population editing in Admin, live parents, historical language learning, and later behavioral differential evidence. Extend through versioned Place commands, World lineage, Genesis life and Thread-owned cognition. **Experimental:** population weights and appearance calibration. Bounds on groups, languages, names and local index work are reversible. No other preserved ambition path closes.

**Alternatives:** large fixed household profiles still clone families; independent parent draws erase real couple patterns; per-birth models add cost; per-birth World name checks add load. We reject these for this slice, not broader natural family development. No caller or model assigns the child's future feelings, attention, choices or values. History can bend the future only when a Thread later consumes admitted parental/childhood evidence. Birth-cohort differential tests must change selected parents while fixing place and verify changed admitted lineage, naming and upbringing; the standing **behavioral** differential remains separate and unproved.

**Proof:** bounded samples for Hilo, Addis Ababa, London and Aswan should expose name collisions, improbable parents, family repetition and language errors. Verify one Place authoring call, lazy naming, one-time World name-index seed, in-flight name reservations, and unchanged lineage after replay.
