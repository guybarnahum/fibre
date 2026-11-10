---
id: adr-0036-social-body
status: accepted
last-reviewed: 2026-11-09
canonical: true
---

# ADR-0036 — The social Body: hunger, battery, familiarity and trust

**Accepted by Guy, November 9, 2026**, with the twenty loci in the [review](../validation/social-body-urges-library-review.md). Built in slices S1–S6; S1 (library v4 and late expression) is built, the rest are designed.

## Why

Conversations ended only when an eight-turn compute guard cut them off, or when a Thread said goodbye. Messages ran in loops: Kaleb and Bontu wrote to each other every thirty minutes all day on November 8–9. Nothing in the Body said *enough for now*, *I don't know you yet* or *I trust you*.

Six of the eight living Threads (born before the urge library) have no urge genes at all, so their social Bodies are identical.

Guy's direction: behaviour emerges from Body urges and is never coded, and the genome holds the Body urges and nothing else.

## Decision

**States and urges.** The Body holds states that change with what World records. Inherited urge loci (ADR-0030) set how strongly, how soon and how persistently each is felt. The Thread feels them in words, and its own cognition decides what to do. No rule ends a conversation, delays a reply or grants trust.

**Social hunger** is the existing `social_contact` family. Messages now relieve it too, more weakly than talk.

**Social energy** is a new directional family, `social_energy`: the battery.
- **Drain:** social exposure drains it, as gain × (unfamiliarity + expected harm), plus a small effort term.
- **Charge:** it recharges where this Body is inherited to: `company`, `quiet_company`, `solitude` or `doing`.
- **Trust lowers the drain; it does not add charge** (Guy: "it drains less").

**Familiarity** is history, not a family. It is how much a Thread has lived around a person: co-presence, noticed encounters, conversations, messages, all already recorded. It lowers the uncertainty part of the drain. Existing loci decide whether the unfamiliar is a cost or a pull: exploration `people`, social_contact `familiar_person`, trust `familiarity`.

**Trust** is a new directional family, `trust`, held toward each person met, humans included.
- **What it is:** reduced expected harm. *They could have hurt me, and did not.*
- **It grows** from exposure without harm, and **falls** with harm taken.
- **It fades** toward the species baseline without contact.
- **Inherited:** what counts as evidence of safety: `reliability`, `warmth`, `reciprocity` or `familiarity`.
- **What flows from it:** openness, doors, stance, and less drain.

**Other social states** come from existing ADR-0030 families, each enabled only when World feeds it real evidence:
- `attachment_proximity` (bond);
- `closure` with `answers_owed` (a reply owed, the healthy end of a message chain);
- `standing_flare` (the sting of correction, refusal or exclusion);
- `safety_threat` (distrust felt in the Body);
- `presence` (expecting someone);
- `exploration` (sameness within and across conversations; a pull toward the new).

**Conversations.**
- The live-encounter guard rises to 24 opportunities. If conversations reach it, they will continue in the next invocation instead of ending.
- A `PAUSE:` turn admits a non-verbal moment. Mutual pauses become a `lull`.
- Endings are recorded as `quiescent` (closed), `lull`, `scene_changed` or `bounded`.

**Library v4** adds the two families, ten reviewed loci each, to v3. Births draw all 15, by the same per-family selection.

**Late expression** amends ADR-0030's "never back-filled". World may add a locus for a family **never expressed** for that Thread (a species default is not a gene), under four conditions:
1. **Drawn deterministically** from the Thread's existing genome digest. It is never chosen, and never inferred from character or behaviour.
2. **Recorded** as a timed `THREAD_GENOME_LOCI_EXPRESSED` event. The original genome, its digest and the Thread's history are untouched; earlier decisions stay attributed to what the Thread then had.
3. **Once per family.** A locus already expressed is never redrawn or replaced.
4. **The same library and review** as births. `inheritedSpread = 0` still reverts every inherited and expressed locus to the species default.

The six legacy Threads therefore gain all 15 families, and the two v3 Threads gain the two new ones. This changes their behaviour from the event onward, by design: a legacy Body's regulator sensitivity, derived from its runtime baselines, gives way to its expressed loci, as for every Thread born with urge genes. Its legacy loci stay stored and inert.

**How it runs.** The draw is `sha256("fibre-urge-expression:" + genomeDigest + ":" + family)` over the family's variants, from the Thread's birth genome (`lateExpressedUrges`). The operator runs `world-genome:express -- --env <env>` (`--dry-run` shows what each Thread would receive); retired Threads are left as they are. Replay recomputes the draw and refuses any event whose loci differ from it.

## S2 as built (November 9)

`social_energy` is enabled. What World does, mechanically and read-only, from records it already keeps (`services/world-kernel/src/social-body.mjs`):
- **Familiarity** toward a person is how much this Thread has lived around them: Stories with both present that it noticed, and messages between them, each counting less as it ages (half-life 14 days). Four recent contacts make a person half-known. *(Replaced by knowing and being current in R1, below.)*
- **The battery.** Each turn of talk, spoken or heard, costs `0.03 × (unfamiliarity + 0.5)`; the 0.5 is the species' expected harm from anyone, until trust is lived (S3). A message costs half a turn. Depletion recovers with a 90-minute half-life. World computes it from the last half-day of conversations and messages; nothing new is stored.
- **In a conversation**, each turn sees its battery where it stood when the talk began, drained by every turn since, through the Thread's own `social_energy` locus: gain sets how heavily it weighs, threshold how early it is felt, and the orientation is what the Body is pulled toward to restore it (company, quiet company, solitude or something to do), as every ADR-0030 orientation names the object of a pull. The live turn and the contact decision read it in words; plans and social initiation already read the Body frame.
- **Messages ease hunger:** a message sent or received since the last talk leaves half of the gap built up before it.
- **`PAUSE:`** turns and the `lull` ending; the guard is 24 appraisals.

Simplifications, each to be reversed by evidence: recovery runs at the species rate wherever the Thread is, rather than faster in its inherited setting; familiarity does not yet count co-presence the Thread did not notice; a conversation that reaches the guard ends there rather than continuing in the next invocation, and how often that happens is measured first.

## S5a as built (November 10): curiosity toward the unfamiliar

Guy, November 10: "a stranger is inherently interesting and alluring as it presents new unpredictable behavior. The body urge should kick in and present this as something to be attracted to or avoid depending on the Thread's makeup." The genome already carried it: `exploration`'s `people` orientation ("After predictable company, attention widens toward strangers…").

- **Evidence:** a person this Thread perceives and hardly knows (familiarity below one half) raises `exploration` toward that person by half their unfamiliarity, without a boring day first. It cites the World record of their presence. People it knows add nothing.
- **Where it is felt:** in the glance (a person item may carry `felt`), in choosing whom to approach (the Body frame, and a salience anchor that makes a stranger worth considering), and in live turns with someone new.
- **Whose pull:** only a Body whose `exploration` locus is oriented to `people` feels it as a pull toward the person; others feel novelty toward places, ideas or making, as their loci say. Gain and threshold set how strongly and how soon.
- **The other side:** the same unfamiliarity makes talk cost the battery more, and with S3 a `familiarity`-oriented trust locus will keep an unknown face alerting. Whether a stranger is sought or avoided comes from the Thread's own loci; nothing is coded.

## S3 as built (November 10): trust per person

`trust` is enabled. Trust toward a person is reduced expected harm, measured by World from its records (`regardOf` in `social-body.mjs`):
- **Safe exposure raises it:** each lived contact (a noticed Story with both present, a message between them) and each act by the other that kept faith (accepted, kept, opened, repaired). Four recent ones make a person half-trusted.
- **Harm lowers it:** each act by the other that broke faith (declined, broken, closed); each unit halves what was built. The Thread's own acts never count as harm done to it.
- **It fades** with the same 14-day half-life as familiarity. *(Withdrawn in R1, below: trust does not fade with absence.)*
- **Inherited:** the locus's orientation weights the kinds of evidence (reliability: kept appointments and accepted offers; warmth: time together, and declines sting more; reciprocity: accepted offers and opened doors; familiarity: repeated contact). Gain and threshold set how strongly and how soon wariness is felt. Spread zero counts every kind the species way.
- **What it does:** expected harm in the battery becomes `0.5 × (1 − trust)`, so a trusted friend drains far less than a stranger. Wariness, `0.5 × (1 − trust)²`, is felt toward a stranger and toward someone who let this Thread down, and not toward a trusted friend: in live turns, the glance, choosing whom to approach, and toward each party a message could go to.
- **Two layers:** felt trust is the Body's; the stance (what the person means) is still the Thread's own, authored in consolidation ([relationships concept](../concepts/relationships-doors-and-trust.md)).

Deferred: subtle exposures from the Thread's own appraisal (a confidence kept, a disagreement handled with care), and felt trust in the consolidation that forms stances.

## R1 as built (November 10): knowing, being current, and wounds

Guy, November 10: "Why fade trust? Especially after no contact?" and "time may make us forgive trivial 'sins' but cardinal 'sins' are difficult to forgive." The design and its effect list are in the project's reunion-and-forgiveness proposal, accepted the same day. World computes everything below from its records (`regardOf` in `social-body.mjs`); nothing new is stored.

**Familiarity becomes two facts about a person:**
- **Knowing:** contact weighted by depth (a noticed Story with both present 0.25; one in which both spoke 1, plus 0.1 a turn up to 2; a message 0.5). Each contact's weight halves over two years, so an old friend is still known after years. `knowing = 1 − 2^(−depth/4)`: the first meetings teach the most. The 64 most recent contacts of each kind are read; past them a person is fully known.
- **Being current:** `2^(−days since the last contact / 14)`. Staleness is `knowing × (1 − current)`: only someone known can be out of date.
- **Uses:** each turn costs `0.03 × ((1 − knowing) + 0.25 × staleness + 0.5 × (1 − trust))`. Curiosity toward a person is `(1 − knowing) + 0.5 × staleness` when above one half, so a long-unseen friend draws a people-seeking Body to catch up, felt in words of its own ("It has been a long time since you were with them…").

**Trust is built safety held down by wounds:**
- **Built safety** comes from each contact (by its depth) and each act by the other that kept faith, weighted by the locus's orientation. It never expires.
- **A wound** is what a harm by the other leaves. Severity is trivial (1, declined), moderate (2, broken) or serious (4, closed); grave harms (8) arrive with the confidence, care and commitment doors. Its weight is `severity × orientation weight × (1 + trust just before)/4`, times 1.5 for each earlier harm of the same kind by the same person within a year, times `1 + 0.5 ×` what earlier wounds from them still weigh.
- **A scar** is the share nothing heals: 0, 0, 25%, 60%.
- **Internal forgiveness** is unchosen. The rest of the wound halves every `3 days × severity²` (3, 12 and 48 days; 192 for grave), scaled by `2^(2 × persistence)` of the trust locus, so a forgiving Body heals a broken appointment in days and an unforgiving one in weeks. Each later contact or kept faith by the same person heals a share of what remains, `0.1 × its weight × (1 − the wound's remaining share)`, so kindness heals little while the wound is fresh, and never the scar.
- **A new harm re-opens old ones:** each earlier wound from the same person regains `healed part × 0.5 × min(1, new severity / old severity)`, twice that for the same kind. A trivial slight barely stirs a serious old wound; a second broken appointment brings back much of the first.
- **`trust = (1 − 2^(−built/4)) × 2^(−open wound weight)`.** It does not fade with absence.

**Felt in words:** wariness as before; what still hurts ("What they did still hurts."), in bands of `1 − 2^(−open wound weight)`; and for a week after a harm that re-opened a quarter unit or more, "This brings back the last time they hurt you."

Deferred: excused harm, apology and spoken forgiveness, and the Thread's own grievances (R3–R4 of the proposal); grave severities with their doors.

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Attraction, romance, couples | deferred | `attachment_proximity` and the accepted attraction concept on the same trust and familiarity |
| Groups, belonging, standing within a group | deferred | groups and institutions; the same states toward many |
| Real hazards for `safety_threat` | deferred | World hazards as evidence |
| Whole-day fatigue beyond the social battery | deferred | the existing `rest` and `energy` families |
| Recombination of the new families from legacy parents | deferred | the existing family-keyed rule once both parents carry v4 |
| Faster recovery in the Body's inherited setting | deferred | the battery's recovery reads the setting from the Thread's own situations (private place, public venue, journey, reading) |
| Familiarity from unnoticed co-presence | deferred | the same shared-contact query over situations at one venue |
| A conversation continuing past the guard in the next invocation | deferred | the live encounter resumes from its recorded Story, if `bounded` endings appear |

No permanent constraint.

## Evidence (as slices land)

- Mechanical library balance: [review](../validation/social-body-urges-library-review.md).
- S1: deterministic, recorded and idempotent expression; spread-0 ablation.
- S2: the same conversation drains two Bodies differently; familiar strangers drain less; messages relieve hunger.
- S3: a kept appointment makes the next talk drain less, a broken one more.
- R1: an old friend after six months is still known and trusted; time forgives a declined invitation and not a closed door; a friend's harm and a repeated one weigh more; the inherited pace of forgiving; kept faith never heals a scar; a second broken appointment brings back the first.
- On staging: endings by kind; length by familiarity and trust; messages per pair per day.
