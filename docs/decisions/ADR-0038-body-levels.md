---
id: adr-0038-body-levels
status: accepted
last-reviewed: 2026-11-13
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
| B5 | mood |
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

## Status of what this excludes

| Capability | Status | Extension path |
|---|---|---|
| Physical tiredness and sleep debt | deferred | the `rest` and `energy` families on the component, once embodiment feeds them |
| A baseline-rate gene for families other than standing | deferred | a library position when staging shows the difference matters |
| Panel history beyond a day, or for many Threads at once | deferred | the same derivation over a wider window, bounded |

No permanent constraint.
