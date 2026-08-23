---
id: m2-pr39-replacement-attempt1-redesign
status: preserved-redesign-witness
last-reviewed: 2026-08-23
---

# PR #39 replacement attempt 1 — REDESIGN

## Standing

Replacement-v1 attempt 1 remains preserved exactly as the first authorized replacement final-life attempt. It began at `2026-08-23T07:14:24.267Z`, durably committed ten slot-1 Pass-A calls, then terminated before the first Pass-B model response on an OpenAI structured-schema rejection. No replacement Thread generation bundle completed and no replacement Thread was published.

The earlier mechanical-recovery design remains useful evidence, but **same-attempt recovery is retired**. The ten generated Pass-A episodes are burned experimental output and may not be reused in a later replacement cohort.

This REDESIGN decision is not based only on the provider 400. Close inspection of the preserved Pass-A output and the compiler mechanism exposed protocol defects that would make continuing into Pass B scientifically misleading.

## Findings that force redesign

1. **Chooser/realizer collapse.** Pass A received nine EventStructure affordances per window but `selectedOpportunity=null`, so the temperature-0 model chose the abstract event, place, exact time and realization. The Tbilisi slot collapsed to one high-probability household narrative.
2. **Self-reinforcing prior-history feedback.** Every new Pass-A call saw all prior admitted episodes. Early household/disagreement choices therefore became prompt context for later calls and amplified themselves.
3. **World under-consumption.** The Tbilisi World afforded home, school, transit, library, market and a broad social role set; the ten generated episodes used the home every time and introduced no new people.
4. **Schema-friction social bias.** Reusing a roster caregiver/sibling was mechanically easier than inventing a valid stable peer/teacher/etc. ID, role and exact introduction witness.
5. **Local-time incoherence.** WorldSpecs carried no local civil-time authority. Several natural-language dayparts conflicted with the actual local time implied by the emitted UTC timestamp.
6. **Structure annotation instability.** Semantically similar events could be labeled with an offered `structureRef` or `null`, while downstream reinterpretation treats structure identity as causal scheduling evidence.
7. **Sparse-sample frequency ambiguity.** Pass B was not explicitly told that visible episodes are sparse coverage samples rather than frequency evidence. Repeated generator artifacts could therefore become false autobiographical frequency signals.
8. **Durable social discontinuity.** Initial-roster relationship facts and introduced social roles were not guaranteed to survive birth as structured durable life context; participant IDs could become opaque references after publication.
9. **Durable geographic discontinuity.** World/place references colored generated prose, but replacement publication did not guarantee a situated place-history bundle at birth.
10. **Pre-entry gap.** The historical plan ended at age 17.999 although the Thread enters Fibre at age 22, leaving roughly four years of young-adult life unauthored.

## Replacement-v2 correction

Replacement-v2 is a new final-life experiment, not a quality retry of replacement-v1.

The correction is generic and pre-cognition:

- Fibre deterministically chooses a **historical envelope** before Pass A: exact local civil time, exact place, and selected EventStructure/world-emergent status.
- Pass A realizes the observable event inside that envelope; it no longer chooses the historical skeleton.
- Envelope selection is genome-blind and cannot inspect prior generated episode content or desired adult outcomes.
- Coverage rules bound pathological repetition without claiming the sparse sample represents real-life frequency.
- A minimum number of selected opportunities require non-household counterpart roles, so social expansion is mechanically required rather than requested as prose diversity.
- Local civil time is bound by IANA timezone and natural-language weekday/daypart contradictions are rejected.
- EventStructurePool v3 preserves all v2 structures and adds portable age-17-to-22 affordances; the redesigned history contains fourteen windows through the day before age-22 entry.
- Pass B must receive an explicit sparse-history notice and may not infer whole-life frequency from sample repetition or absence.
- A durable continuity bundle must resolve every published participant to role authority and every published place to WorldSpec evidence before R2 may wire birth publication.

## Starting material

The five frozen replacement-v1 Worlds, genomes and World/genome assignment may be reused. They are pre-life starting material and are not edited in response to the observed slot-1 history. No Pass-B response, genome-conditioned memory, meaning, G5/G6 life diagnostic, publication or live replacement Thread exists from attempt 1.

All final-life generation material is fresh: event-offer namespace, historical-envelope namespace, model-request namespace and output root.

## Authority

Replacement-v1 Gate-G(2) CLEAR is consumed historical authorization and may not authorize replacement-v2.

Replacement-v2 currently authorizes **zero provider calls**. R1 must first make the historical-envelope, age-18-to-22 affordance and continuity substrate locally green and survive a hostile review. Only then may R2 wire a new runner/publication path and seek a new pre-life execution gate.
