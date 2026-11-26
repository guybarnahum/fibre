---
id: adr-0038-body-levels
status: accepted
last-reviewed: 2026-11-25
canonical: true
---

# ADR-0038 — Body levels: a baseline, and spikes that fade back to it

**Accepted by Guy, November 13, 2026**, with the slice plan (B1–B7). It builds on [ADR-0030](ADR-0030-inherited-urges.md) (inherited urges), [ADR-0036](ADR-0036-social-body.md) (the social Body) and [ADR-0037](ADR-0037-status-and-conflict.md) (status and conflict).

## Why

The Body's states were each computed their own way:
- weariness as fading readings;
- the battery as a reservoir;
- knowing as accumulated contact;
- trust wounds as healing toward a scar;
- frustration only as a lasting gap.

Guy, November 13: "World events spike frustration from the base level and it should fade to the base level; the base level accumulates world events. A calm Thread… will fade to a low base level, while a frustrated Thread which is socially stubborn and has a gap in its social ego-world states… would fade into its high frustration baseline. This model may be a general one… it can, and should, be used for other major body aspects."

## Decision

**Every Body state is a baseline plus spikes that fade back to it** (`core/src/body-level.mjs`, `bodyLevel`). The function is pure: it reads only the events it is given and stores nothing, so the same events evaluated at an earlier moment give the state as it was then.

**The baseline is one of:**
- **given:** a lasting fact computed elsewhere, such as the self-view gap or the bond;
- **accumulated:** a share of every event, fading over a long half-life or never;
- **tracked:** moved part of the way toward each event's value, never fading.

**Spikes** fade with the state's half-life or an event's own. A **reservoir** fills with each event, never past a cap, and drains between events.

**The genome speaks through three positions:**
- **gain** sizes the events;
- **persistence** stretches the half-life (`× 2^(2 · persistence)`);
- **a baseline rate** moves the baseline: `stubbornness` for standing, the species value elsewhere until evidence earns a gene.

**Slices:**

| Slice | What |
|---|---|
| B1 | the component; weariness, battery, knowing and being current, treated, and wound fading moved onto it, with no behaviour change; the admin Body panel |
| B2 | frustration; stings and recognition fade by persistence |
| B3 | missing someone: a baseline rising to a bond-set plateau, spikes from memories and reminders, eased by absorption and messages, joy at relief in proportion to the bond |
| B4 | the battery's chronic floor; the need for company as relief fading to chronic isolation |
| B5 | mood (built November 25, urge library v7) |
| B6 | anger: provocation, ADR-0037 C4 |
| B7 | remorse, ADR-0037 C5 |

The design and plan are in the project (`claude/body-levels-design.md`, `claude/body-levels-plan.md`).

## B1 as built (November 13)

**The component** with tests of its shape:
- a spike fades back to a given baseline, low for a calm Body and high for one with a grievance;
- persistence holds a spike longer;
- accumulated and tracked baselines;
- a reservoir that never overfills.

**Moved onto it, with every existing test unchanged:**
- weariness (`wearinessOf`);
- the battery (`socialDepletion`, a reservoir);
- knowing and being current: one accumulated baseline, and the latest contact fading over two weeks, over the same contacts;
- `treated` (a tracked baseline);
- the fade of a trust wound toward its scar. Re-opening and healing by kindness stay trust's own.

**The Body panel**, in the admin Thread Observatory, on demand:
- **Route:** `observatory?view=body`, with the same view saved beside each Observatory by `world-observatory`.
- **Records:** World reads the social Body's records once (bounded, newest first) and evaluates the last day every two hours on the same records (`recordsAsOf`). Nothing is stored, nothing runs in the background, and nothing is read again.
- **It shows:**
  - the battery, weariness, self-status and the self-view gap over the day, with the events that moved them;
  - toward the six people it lived most with: trust, hurt, knowing, bond, and held and treated place;
  - the words the Thread reads of its Body now;
  - the 18 inherited urges with every position, `selfRegard` and `stubbornness` included.

## B2 as built (November 13): frustration, and stings that fade

**Frustration is a Body level** (`selfStanding`, `social-body.mjs`):
- **Baseline:** the self-view gap it will not reconcile (C3b), `min(1, −2 × gap)` once the gap passes −0.15 over at least three acts. A stubborn proud Body treated ordinarily keeps a high baseline; a reasonable one a low one.
- **Spikes:**
  - each act of the last week, judged against what was held of that person just before it: a slight adds half its shortfall, and recognition takes away half its excess;
  - an approach this Thread made that was turned down adds 0.3.
- **Fade:** half in 12 hours, scaled by the `standing` locus's persistence (`× 2^(2·persistence)`), back to the baseline. After a week a spike is gone.

**What it does.** There is no rule; it is felt, and read by the Thread's own cognition:
- **Less patience with anyone:** every turn of talk costs the battery `0.5 × frustration × 0.03` more, whoever the other is.
- **Felt in words** among the social Body's general lines, which every social cognition reads, so it spills over onto people who did nothing:
  - the baseline: "People do not give you the regard you feel is yours";
  - the level, when spikes have raised it: "You are a little short on patience" / "You are short on patience today" / "Little things are getting under your skin".
- **Calm** (the standing drive attained) now needs frustration under 0.15 as well as a small gap.

**Stings and recognition fade** by the same persistence, instead of being felt for exactly one day.
- A slight, a warmth or a close person's refusal from the last week is weighed by what remains of it.
- A day later, a persistent Body still feels a public correction and a fleeting one does not.

**The Body panel** shows frustration over the day, with its baseline dashed beneath it.

## B3 as built (November 13): missing someone

Guy: "grows and levels off at some baseline depending on the bond. A deep bond may cause suffering. Any bond causes joy (proportional to the bond?) when relief arrives."

**Missing someone is a Body level** (`longingOf`, `social-body.mjs`):
- **Baseline:** `bond × (1 − 2^(−days apart / 3))²`. It rises over the first days apart and levels off at the bond, with no settling into fond memory. A light bond is missed faintly for as long as they are apart; a deep one aches. Apart means not in each other's presence, except for a Body whose attachment is to the exchange (`reciprocal_contact`), which any message resets, as before.
- **Spikes,** counting only what happened since they parted; several within an hour count as one moment:
  - a memory of time with them comes back to mind: `+0.4 × bond`. That means the Thread's own cognition drew on it (`recalled`), or a cue brought it back. The memory's experiences are matched to those shared with the person (`listRecalledMemories` on the memory store, `listSharedExperienceRefs`);
  - something took its mind (a `new` engagement reading, or `absorbed` before S5b was repaired): `−0.2 × bond`;
  - a message between them, for a Body that longs for their presence: `−0.5 × bond`.
- **Fade:** half in 6 hours, scaled by the `attachment_proximity` locus's persistence, back to the baseline. The level stays within 0 and 1.

**Joy at relief** (`reunionJoy`), when they are here again: `bond × (1 − 2^(−days apart)) × (0.5 + 0.5 × longing / bond)`.
- Every bond brings joy, in proportion to it, and up to twice that after a long absence.
- The middle factor is a refinement of the approved formula. Gladness at seeing someone again needs some time apart: hardly any an hour after parting, half after a day. Without it, every bonded person met twice in an afternoon would be a joy.
- The attachment drive's attained pressure is now this joy rather than the longing. Salience's reunion anchor reads it unchanged, so a bonded person met after a day is now worth considering, at any bond.

**Felt in words:**
- missing, up to "Missing them is an ache that does not let up" at a deep plateau;
- "They have been on your mind" while a memory of them is still fresh;
- reunion graded by joy: "It is good to see them again" / "It is a joy to see them again" / "Seeing them again is a great joy; you have missed them".

Longing reaches cognition where it did before: contact decisions (toward everyone the Thread could write to or go over to), people perceived at a venue, and live turns. A live turn uses the longing as the conversation began, without the spikes.

**The Body panel** adds the people the Thread has relations with, up to four beyond the six it lived most with. For each it shows missing over the day, the baseline dashed beneath it, and ticks when a memory of them came back to mind.

## B5 as built (November 25): mood, the wide effect of a feeling

Guy, November 25: "Body urges / feelings are focused toward something, but also leak into a general universal attitude. A bad experience with one person may color the whole day. So the effect is both narrow but has a secondary wide effect that is less focused on someone specific." He accepted mood as its own inherited urge (option (a) of `claude/mood-design.md`) the same day.

**A new urge family, `mood`, in urge library v7.** Ten reviewed loci ([review](../validation/mood-urge-library-review.md)):
- **gain:** how far a feeling spreads into a general tone;
- **felt threshold:** how soon a mood is noticed;
- **persistence:** how long it lingers;
- **direction:** what moves it most: `people`, `doing` or `everything`.

Living Threads receive their locus by late expression from their own genome digest; births draw all 19 families. The organism policy enables `mood`.

**Mood is a Body level** (`moodOf`, `social-body.mjs`):
- **Moments:** each felt moment of the last week, from people and from what the Thread does, gives the mood a share by the direction (1, 0.7 or 0.4).
  - **From people:** the same moments that move frustration, signed for mood: a slight or an approach turned down lowers it, recognition lifts it.
  - **From what it does:** a discovery (+0.2) or going deeper (+0.1).
- **Baseline: how life has been going.** The moments' values averaged over the last days, the older the less (half in two days), held toward the species temperament (0) as if by two neutral moments.
- **Adaptation:** a moment is felt less the more the mood is already like it, a good one more so than a bad one, and never the other way round (revised before deploy, below).
- **Fade:** half in 6 hours, scaled by the mood locus's persistence, back to the baseline. The level stays within −1 and 1.

**Revised before deploy, after an outside review (Gemini, November 25).** Four flaws in the first build, each fixed and dry-run:

- **A good moment could sour the mood.** In a warm life, going deeper in a book was worth less than how life had been going, so it spiked the mood down. Now a moment is adapted against the present mood, and never the other way round: a good one adds what exceeds the mood, or nothing, and a sting always hurts at least half.
- **"How life has been going" counted events, not time.** Twelve recognitions in one afternoon swung it 46%, and an empty week dropped it to 0 at the window's edge. It is now the moments' values averaged over the last days (half in two days), each weighing as much as it was strong, and held toward temperament as if by two ordinary moments. Weighing by strength came from a second review (November 26): with every moment weighing the same, five small pleasures in an afternoon diluted a warm life's average and lowered the felt mood by 0.013; weighed by strength, by 0.002. Strong moments now count most, so a sting (0.5) outweighs a warmth (0.3), as bad outweighs good for people.
- **A long hardship went unfelt.** The felt mood was its distance from how life had been going, so weeks of mistreatment read as nothing. The felt mood is now the level less only the adapted part: 80% of a good life and 40% of a hard one, since people adapt to good fortune more fully than to hardship. A mood that is mostly how life has been is worded so: "Things have been weighing on you lately" or "Things have been going well for you lately".
- **The dry run fed letdowns the build does not have.** It now matches the build: nothing a Thread does lowers its mood yet.

**In the regulation core:**
- `perceptFrame.mood` gives the level and the baseline. The mood drive (`self:mood`) is the level less the part of how life has been going the Body has adapted to (80% of a good life, 40% of a hard one): sour (avoid) or light (approach).
- **Mood-congruent appraisal.** The mood, times how far it spreads in this Body, tints the other drives before the genome shapes them:
  - it scales the pulls toward people and toward the new (attachment, the social contact pulls, curiosity toward a person, hunger for something new) by up to half again or down to half;
  - it scales wariness of each person the other way.

  It acts whether or not the mood is noticed, and never touches a need it does not concern.

**Felt in words** among the social Body's general lines (glance, contact decisions, live turns):
- sour: "Something from earlier still sits a little badly with you" / "…sits badly with you and colours everything" / "Something from earlier has soured your whole day";
- good: "You are in good spirits" / "You are in high spirits" / "Everything feels lighter today".

A live turn uses the mood the Thread brought to the talk; what happens in it spills afterward.

**Dry run** (`npm run dry-run:mood`):
- **Two flaws found before building:**
  - "how life has been going" as a sum ran mood up to +0.94;
  - without adaptation, staging's warm society sat in constant good spirits (+0.75).
- **As revised, by society:**

  | Society (sting / warmth per talk) | Mood, last two weeks | Sour spells (3 days below −0.5), Threads of 8 per run |
  |---|---|---|
  | mixed (0.07 / 0.30) | +0.07 | 0 |
  | staging's warm one (0.01 / 0.60) | +0.24, mostly adapted to | 0 |
  | rough (0.25 / 0.10) | −0.27 | 2.6 (2.2 without the tint) |
  | harsh (0.35 / 0.05) | −0.37 | 3.9 (3.4 without the tint) |

  A hard society makes Threads low, as it would people, and the tint adds about a sixth to the sour spells without running away. Threads whose mood is moved most by what they do stay near even; those moved by people and slow to let go sink furthest (Mikias, −0.73 in the harsh society).
- **Spillover:** after a sting from one person, approaches to others fall 9% over the next 12 waking hours in the mixed world, by Thread from none to 26%, and the mood is back within two days.
- **Genes:** mood persistence sets how long it lingers (ρ 0.81); spread sets how much approaches fall (ρ 0.57).
- **To watch on the Body panel:** in staging's warm society, a Thread whose mood spreads far may sit all day in "Things have been going well for you lately". If it does, the adapted share of a good life (0.8) rises toward 0.9.
- **The fade:** a mood that lasts a day breeds sour spells, so the fade is hours.

**The Body panel** shows mood over the day, with how life has been going dashed beneath it.

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Physical tiredness and sleep debt | deferred | the `rest` and `energy` families on the component, once embodiment feeds them |
| A baseline-rate gene for families other than standing | deferred | a library position when staging shows the difference matters |
| Panel history beyond a day, or for many Threads at once | deferred | the same derivation over a wider window, bounded |
| Reminders other than memories: their place, their book, their name in talk | deferred | the same spike from a perceived cue, once perception names the person it recalls |
| Joy at a message from someone missed | deferred | a reunion-joy spike in the reading of an incoming message |
| Missing parents and caregivers who are not live Threads | deferred | the same level toward a household relation, once family persons are World parties |
| Every return of a memory to mind (only its latest is kept) | deferred | an availability history, if staging shows recalls cluster |
| Mood fed by reunion joy, a kept or broken appointment, a World event, fullness or unmet hunger | deferred | more moments into `moodOf`, each a World fact already measured |
| A sting in a live talk souring the rest of that talk's mood | deferred | the talk's fresh acts as moments, as frustration takes them |
| Mood in the day's plan, reading and reflection | deferred | the Body's words where those jobs receive the Body (Body-drives plan C3) |
| A temperament gene: a baseline other than 0 | deferred | a library position when staging shows Threads differ in it |

No permanent constraint.
