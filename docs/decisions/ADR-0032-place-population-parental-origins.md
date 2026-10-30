---
id: ADR-0032
status: accepted
canonical: true
last-reviewed: 2026-10-29
---

# ADR-0032 — Place Population: parents' origins drive the newborn

**Accepted 2026-10-29; Slice 2 staging verified at `6831f3b`, with language atomicity correction awaiting fresh validation.** A place is not one household. Birth Center owns a shared **versioned Place record** for each canonical place × **child's birth decade**. It describes that era's civic World context and the origins of parents living there. A birth draws a couple, not a prewritten family profile. [ADR-0031](ADR-0031-birth-center-single-birth-authority.md) owns the lifecycle.

## One Place record; lazy names

The optional `place_authored` stage makes **one journaled model call** when a place/decade lacks a record. That single output contains both:

- **Civic context:** the existing World-context fields, including place/time zone, home, schooling, transit, institutions, local and schooling languages, and material/social context.
- **Place Population:** `originGroups`, `couples`, `mixedParentShare` and `householdPatterns`, with provenance and a version/digest. No given-name or surname lists are in this call.

`originGroups` are 8–20 concrete resident lineage sources, each with an `originId`, resident `share`, physical `referencePopulations` (existing codes), `heritageLanguages` and their `householdRetentionRate`. Each group has at most three heritage tags and at most three ancestry references; reference codes are selected from the complete canonical Human Appearance enumeration, not guessed. A group can be explicitly mixed; an umbrella “A or B” is not a single selectable group.

`couples` are at most 40 weighted `motherOriginId × fatherOriginId` pairs, representing the large majority of births rather than an exhaustive combinatorial set. The authored `mixedParentShare` still estimates the full local mixed-parent frequency even when rare pairings are omitted. Their `weight` represents plausible couples in that place/decade, **not** independent draws from resident shares. Cross-origin couples should be frequent where they are common (Hilo) and rare where they are not (Chengdu). Each couple carries **only** weights for the child's given-name source: mother's tradition, father's tradition or local mainstream. Naming conventions are not stored on the couple.

**Place-specific mixed parentage:** `mixedParentShare ∈ [0,1]` is the
model-authored, believable estimated proportion of children in this exact
place and child's birth decade whose mother and father have **different
`originId` values**. It is produced in the **same single Place authoring
call** as civic context, origin groups and couples; pinned with the Place
version and visible in Admin's read-only Place view (Slice 3). It is not
a global hyper-parameter or runtime configuration. A group explicitly
describing mixed ancestry paired with itself is **same-origin**; equality
means matching IDs, not whether the underlying ancestry is mixed.

Validation requires `mixedParentShare > 0` to have at least one couple
with distinct parent origin IDs and `mixedParentShare < 1` to have at least
one same-ID couple. Any violation rejects the authored Place material and
uses the existing **single journaled repair call**; it must not be
silently normalized or corrected by a fallback. A later change to a
place's share requires a new versioned Place edit; editing is deferred.

**Two independent deterministic draws** (seeded by `requestId`) select a
couple after the heritage filter: first choose different-origin versus
same-origin with probability `mixedParentShare`, then weighted-sample
within that class from the authored couple weights. If heritage removes
every couple in the chosen class, use the other filtered class. If it
removes every couple, fail selection clearly. The value controls a
place's *mixed-child frequency*, whereas couple weights control the
composition *within* each class; do not multiply the two or apply one
single weighted draw across both classes.

**Households are drawn, not templated.** The same Place authoring call returns
`householdPatterns`: 3–6 weighted entries of `{caregivers,siblings,weight}`.
Caregivers are a nonempty subset of `mother`, `father`, `grandmother`,
`grandfather` and include at least one biological parent; siblings is an
integer from 0 to 4. Weights reflect believable household arrangements for
the place and the child's birth decade. Reject invalid output with the
existing single Place repair invocation.

Each birth draws one household pattern deterministically by `requestId`
and, for each sibling, independently draws sex, older/younger status and a
1–8-year age gap. An older sibling's gap is capped at the younger biological parent's age at the subject's birth minus 18; if that leaves no positive gap, the sibling is younger. Both parent ages use the same deterministic birth material. Siblings receive distinct names from the child's naming
tradition using the corresponding child-decade pool, and share the child's
family name or a patronymic derived from their common father. Grandparents
remain unnamed, with roles and maternal/paternal family-root facts. Both
parents remain synthetic genetic ancestors even when not caregivers; this is
pinned under each parent's `geneticProvenance`, never inserted into the
historical participant's `factualRoles`. A non-caregiving parent is
explicitly recorded as living outside the child's household. The WorldSpec's
`affordedRoles` are the existing base roles plus the drawn participants'
actual family roles (mother, father, grandparents and sibling sex roles);
home `ordinaryCounterpartRoles` derive from this same role authority and
the household's caregiving/sibling participants. Household selection changes
WorldSpec household description, family relations, historical participants
and home counterpart roles.
Previously pinned Slice 1 family-profile births retain their original
household material.

**Name-index seed is a narrow World query.** Once per canonical Place,
Birth Center reads `GET /internal/thread-directory/names?birthCity=<exact>`,
which returns only matching full display names from World Thread identity
rows; it never requests the full directory, live location evidence or
Presentation. This minimal World read route is the only deliberate World
change in this slice.

**Reviewable birth projection.** A birth's persisted lifecycle row carries
parent names, origin labels and birth decades; mixed-couple status; selected
child naming tradition; the drawn caregivers and named siblings with sex,
relative age and year gap; and the pinned Place's `mixedParentShare`.
`GET /births/:id` and `genesis:births` expose these without further
World or model reads or fetching an entire Place record.

**Atomic language evidence:** `heritageLanguages` and
`schoolingLanguages` each contain only bare language names, never dialect
descriptions or parenthetical varieties. Place validation reuses the
family-profile language validator. Birth composition merges household and
school language evidence without counting regional varieties twice and
reserves room for a plausible school-taught language.

**Naming is lazy.** The first time a birth draws an origin group, Birth Center obtains one small **journaled naming-tradition model call** for that group. It records given-name pools for the parents' birth decade and for the child's birth decade, plus family names. It also owns the naming rules: `transmission ∈ {father, mother, mother+father, patronymic}`, `nameOrder` and `joiner`. Reuse that version for subsequent births; author missing decade material under the same journaled first-use rule. Parents' birth decades need not equal the child's decade. Authored naming data must be large enough to permit individual variation; names are not a code for religion or personality.

The Place and naming versions remain inspectable. New versions require explicit commands and provenance; **Admin edits are deferred**. Slice 3 only shows the Place record. Every birth pins the versions it consumed. Older births and Threads are not rewritten.

## One deterministic child

From `requestId` and pinned Place/naming versions:

1. Filter couples by any explicit heritage constraint. Heritage never creates a separate World/Place authoring call. If nothing matches, report a clear selection failure.
2. Make two deterministic draws: mixed/same-origin using the pinned `mixedParentShare`, then a weighted couple within that class (or the other available class after heritage filtering). Select distinct named mother and father from their **own** traditions and birth decades. These are synthetic ancestors/household caregivers, not live Threads.
3. Use each selected origin's `referencePopulations` to make a missing parent's founder genome, then the existing physical recombination core for the child's genome. A known live biological parent's **admitted physical genome overrides** that side's population prior.
4. Sample retained household languages from the parents and local place. Limit **raised languages** to three. For now **eventual languages = raised languages ∪ Place schooling language(s), capped at three**, by a deterministic, replayable rule. Life-history-based eventual-language acquisition is **deferred**.
5. Sample which tradition supplies the child's given name by the couple's weights. Compose the family name using the selected tradition's `transmission`, `nameOrder` and `joiner`; preserve spaces and culturally meaningful joins.
6. Atomically reserve the child's complete name in a **Birth Center index keyed by canonical place and full name**. It covers issued names, including **in-flight** births. On the **first new-model birth in each place**, seed it once from the World thread directory. Later births use the local index, with **no per-birth World call or new World index**. If a name is taken, redraw deterministically with a small bound; do not redraw parents or silently loop.
7. Pass both named parents into Genesis history as synthetic genetic ancestors, with caregiving only when the sampled household includes them; include drawn siblings and unnamed caregiving grandparents. Never disguise them as live Threads. Keep these parent slots available for future real Thread parents. The independently versioned v3 inherited urges do **not** depend on ancestry, language, sex or name.

No origin field may infer religion, class, job, ability, intelligence, values or temperament. Names and languages are plausible outcomes of specific parental traditions, not identities or destinies.

## Field → consumer → consequence

| Field | Consumer | Effect |
| --- | --- | --- |
| `placeId`, child's `birthDecade`, Place version/digest | Birth Center Place resolver and Genesis World-context builder | One shared era-specific civic/population source; exact replay |
| Civic World-context fields, including schooling languages | Genesis WorldSpec/childhood authoring, eventual-language selector | Situated life and deterministic schooling language exposure |
| `originId`, resident `share` | Couple validator, population inspector/calibration | Inspect resident composition; shares **do not** independently select parents |
| `referencePopulations` | Existing maternal/paternal founder-genome resolver | Distinct parental physical genomes and child phenotype; live-parent precedence |
| `householdPatterns` | Household sampler, Genesis WorldSpec and participants | Different caregivers, variable siblings, named family members and home social affordances |
| `mixedParentShare` | Mixed/same-origin class draw | Place/era-specific fraction of mixed-origin newborns; pinned with Place version |
| `couples`: parent origin IDs, weights | Within-class couple sampler | Plausible parent combinations and separate ancestry |
| `childGivenNameTradition` weights | Child's given-name selector | Mother's, father's or mainstream tradition selected per birth |
| Naming pools per parent/child decade | Parent-name and child-name selectors | Era-appropriate individual names; lazy model calls |
| Naming `transmission`, `nameOrder`, `joiner` | Child full-name composer | Correct surname inheritance, order and spacing |
| `heritageLanguages`, `householdRetentionRate` | Household language sampler | Raised languages and childhood context |
| Schooling languages; selected raised languages | Eventual-language selector | Deterministic eventual language set of at most three; historical learning deferred |
| Selected parent names/decades and ancestry witnesses | Genesis participants, World lineage admission | Named caregivers and synthetic ancestors; future live-parent slots |
| `requestId`, heritage filter, redraw ordinal, name reservation | Couple selector and Birth Center place/name index | Repeatable selection; no duplicate issued local names, even while in flight |

## Why resident authority, and what it costs

Resident origins and couple rates describe a **shared place**, not an individual child. Authoring them separately for every CLI run or birth would invent inconsistent populations. Birth Center owns this model-authored, inspectable prior. **World owns admitted personal lineage.** The prior is not a census fact or a claim about any resident.

Cost: **one model call per new place × child's birth decade** authors civic context, bounded origin groups (8–20), at most 40 couples, household patterns and mixed-parent share together. Population authoring alone has a 32k-token output ceiling to accommodate reasoning; naming retains its separate 16k authoring ceiling. An incomplete population output can use the existing single, more concise repair call. Only drawn origin groups incur **one small naming call per missing naming tradition/decade material**. Parent draws, physical inheritance, household languages and name redraws are bounded local work. Seeding issued names uses **one identity-only World birth-city names read per place**, not each birth. Normal status reads use indexed local records and never reauthor or scan World. Genesis development retains its existing separate model cost.

## Vision and review

**Fidelity:** independent parents make ancestry, names and languages consequential for one child's body and historical context. **Ambition:** live Thread parentage, siblings, richer culture and later self-authorship remain open. None are replaced by demographic labels. **Causal limit:** physical inheritance changes the body; childhood input is context-only until a later Thread-authored decision demonstrably changes. Name uniqueness is an issued-name rule within a place, not a universal naming law.

**Deferred:** population editing in Admin, live parents, historical language learning, and later behavioral differential evidence. Extend through versioned Place commands, World lineage, Genesis life and Thread-owned cognition. **Experimental:** population weights and appearance calibration. Bounds on groups, languages, names and local index work are reversible. No other preserved ambition path closes.

**Alternatives:** large fixed household profiles still clone families; independent parent draws erase real couple patterns; per-birth models add cost; per-birth World name checks add load. We reject these for this slice, not broader natural family development. No caller or model assigns the child's future feelings, attention, choices or values. History can bend the future only when a Thread later consumes admitted parental/childhood evidence. Birth-cohort differential tests must change selected parents while fixing place and verify changed admitted lineage, naming and upbringing; the standing **behavioral** differential remains separate and unproved.

**Genesis role-boundary test:** compose a deterministic cohort of real
Birth Center development requests and admit each through World's actual
historical-envelope plan and life-continuity initial-roster validators,
including grandparents, siblings and a non-caregiving biological parent.
All role references must have WorldSpec authority; ancestry provenance
must not masquerade as a lived role. **Household semantic test:** in a large seeded cohort for one Place, pattern frequencies match authored weights and demonstrate zero siblings, younger siblings and a non-caregiving biological parent without changing that parent's physical ancestry. **World names test:** a city-only response lists no other-city names and consults no location evidence. **Slice 2 semantic test:** over a large deterministic sample for one pinned Place, the observed mixed-origin fraction must approximate its `mixedParentShare` within tolerance, and every selected couple must be one of the authored Place couples. The class fallback must remain defined under heritage filtering. **Additional proof:** bounded samples for Hilo, Addis Ababa, London and Aswan should expose name collisions, improbable parents, family repetition and language errors. Verify one Place authoring call, lazy naming, one-time World name-index seed, in-flight name reservations, and unchanged lineage after replay.
