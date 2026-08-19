---
id: architecture-genesis-rich-life-intellectual-formation-v1
status: accepted
last-reviewed: 2026-08-18
canonical: false
---

# Genesis rich life + intellectual formation v1

## Scope

This note records the Slice-E implementation seam for Milestone #39. It is subordinate to `genesis-compiler-contract-v1.md` and does not change the Gate-C/Gate-D authority boundaries.

Slice E claims only:

> Different worlds and inherited symbolic possibilities can create particular lives through one compiler, while intellectual sources influence a Thread only through encounters that actually happen to it.

It does **not** claim causal individuality, Whole-Person standing, source-person transfer, or endogenous motivation.

## 1. One historical compiler for de-novo and synthetic lineage

Slice E supports two rich-life compiler modes:

```text
de_novo
synthetic_lineage
```

Synthetic lineage requires a policy-side inheritance witness naming the resulting symbolic genome, at least two parent/ancestor refs and the recombination witness. That witness is validated **outside Pass A and discarded before the Pass-A input is built**.

Therefore two otherwise identical worlds/chronologies produce byte-equivalent Pass-A cognition inputs whether the Thread is de-novo or synthetic-lineage. The symbolic genome can later affect Pass B under the Slice-D treatment design, but it cannot author childhood history.

Echo/Homage/thread-parent/fork remain Slice-F origin-integrity work, not alternate history generators in E.

## 2. EventStructurePool v2 is developmental affordance, not a maturity script

The Slice-C flat development instrument is replaced for rich-life development by `genesis-event-structure-pool-v2`.

V2 retains the existing portable EventStructure authority:

```text
structureId
abstractSituation
participatingRoles
developmentalRange
consequenceClass
instantiationWitnesses
sourceDerivation
digest
```

and adds **policy-side pool metadata** describing broad context/access classes. These metadata do not enter Pass-A cognition.

The canonical v2 pool:

- uses varied, overlapping developmental ranges rather than one `5–18` placeholder;
- contains ordinary practical events as well as conversational/social events;
- includes caregiver-mediated intellectual access at younger ages;
- includes peer-mediated and self-directed access where developmentally plausible;
- retains overlap instead of encoding a required ladder toward maturity;
- keeps the existing >=40% low-consequence offer floor;
- keeps every relocation witness outside cognition.

A weak generated life is still legal. Pool richness is an instrument property; generated richness is characterized, not admission-gated.

## 3. Intellectual encounter is history, not meaning

An intellectual encounter is optional structured metadata on a Pass-A life episode:

```text
IntellectualEncounter {
  kind
  subjectKind
  subjectLabel
  participantRef
  accessMode
  subjectRef       // Fibre-derived
}
```

Kinds include:

```text
book
teacher_or_mentor
argument
conversation
overheard_discussion
art
scientific_idea
religious_or_philosophical_text
other_intellectual_source
```

The witness records **what was encountered and how access occurred**. It has no field for lesson, meaning, trait, impact, belief, future policy or causal status.

### Subject identity

For a person encounter, `subjectRef` is the already-grounded episode participant ID; the encounter may not mint a second identity for that person.

For a non-person encountered subject, Fibre derives a stable content-addressed `isrc_…` reference from `subjectKind + subjectLabel`. This reference means only “the encountered subject described this way in Genesis history.” It is not a bibliographic truth claim and does not import an author's biography/personality.

If the Thread later encounters the same recorded subject again, policy can mechanically establish `same_intellectual_source` by equality of these stable refs. Pass C still receives only the bounded later episode + typed relation under the Gate-D contract.

## 4. Authority and replay

`THREAD_LIFE_EPISODE_RECORDED` remains the only Genesis historical event type. Rich episodes extend its payload optionally with the intellectual-encounter witness; no second intellectual-history table or biography authority exists.

The encounter witness is bound into the content-addressed life-event ID. Rewriting both its prose label and derived source ref still changes the event identity and fails replay against the stored event ID.

Historical replay depends only on the recorded rich-episode shape and encounter validator. It deliberately does **not** import the current creative EventStructurePool, so later pool development cannot make admitted history unreadable.

Legacy Slice-C episodes without an intellectual encounter retain their old canonical payload shape and replay path.

## 5. Record repair

Pass-A form repair may change only `observableAction`. It may not change:

- chronology;
- participants;
- place;
- structure ref;
- introduced participants;
- intellectual encounter kind/subject/access/ref.

This preserves the existing rule that repair fixes record form rather than selecting or rewriting event facts.

## 6. Characterization, not gating

Slice-E characterization reports:

- historical event count;
- structure-grounded vs world-emergent count;
- intellectual-encounter count;
- encounter kind / subject kind / access-mode counts;
- unique and repeated encountered-source refs;
- developmental-range signatures represented by the pool;
- policy-side structure context/access counts.

The artifact contains:

```text
admissionVerdict: null
```

A life with zero intellectual encounters is measurable and legal. If development output is bland, uniform, over-scripted or intellectually empty, change the compiler and burn the development world; do not turn those qualities into an admission gate.

## 7. Boundaries carried forward

Slice F must still prove that named source/origin modes cannot launder a living person's life or transfer source-person personality into the Thread.

Slice G must still freeze the final v2 pool, treatment schedule, development-world burn list and cohort protocol. Gate-D O1 — mutable #38 memory content policy on historical reads — must be repaired before the G freeze, along with the long-Thread-ID/#37 claim-predicate hygiene check.
