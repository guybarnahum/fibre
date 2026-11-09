---
id: validation-social-body-urges-library-review
status: proposed
last-reviewed: 2026-11-09
---

# Social Body urges — draft loci for review (library v4)

**Status: proposed, for Guy's review** before library v4 is built ([ADR-0036](../decisions/ADR-0036-social-body.md)). These are the two new directional families that v4 adds to the 13 in [the v2/v3 review](inherited-urges-library-review.md).

The texts describe what a Body inherits, never an instruction or a trait. Each is one proposition and one sentence, with no semicolon (`assertAtomicGenomeLocus`).

G = inherited gain, T = felt awareness threshold, P = persistence, each in [-1, +1]. The positions meet the same rules as the existing library, checked mechanically:
- every dimension reaches at least +0.85 and at most -0.85;
- family means are within ±0.10;
- every orientation has mixed-sign gain, with an orientation mean within ±0.25;
- exactly one matched triple, across two orientations;
- no duplicate or sign-mirrored triples;
- distinct effective thresholds.

**What the positions mean here:**

| Family | G | T | P |
|---|---|---|---|
| `social_energy` | how much social exposure costs this Body | how early depletion is felt | how slowly it recovers |
| `trust` | how fast exposure and its outcome move trust | how early ease or wariness is felt | how long a harm or a kindness lasts |

**Orientations:**
- `social_energy`: where this Body recharges (`company`, `quiet_company`, `solitude`, `doing`);
- `trust`: what this Body counts as evidence of safety (`reliability`, `warmth`, `reciprocity`, `familiarity`).

**Matched pairs** (the same positions, a different direction): `social_energy_02` + `social_energy_05`, and `trust_02` + `trust_05`.

| Family | Mean G / T / P | Orientation gain means |
|---|---|---|
| `social_energy` | 0.05 / -0.01 / 0.01 | company -0.06 · quiet_company 0.23 · solitude 0.08 · doing -0.08 |
| `trust` | 0.00 / -0.00 / 0.00 | reliability 0.02 · warmth -0.15 · reciprocity 0.12 · familiarity 0.09 |

### social_energy (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `social_energy_01` | `company` | `(-0.88, -0.35, 0.21)` | After long talk with others, the body still hums with their voices and seems to gather strength from the next exchange rather than from quiet. |
| `social_energy_02` | `company` | `(0.40, -0.22, 0.15)` | Being among animated people lifts the body's pace, and a long silence afterward feels like a reserve left to run down. |
| `social_energy_03` | `company` | `(0.30, 0.12, -0.91)` | Even when tired, the presence of lively company seems to restore what an afternoon alone would not. |
| `social_energy_04` | `quiet_company` | `(0.91, -0.90, 0.55)` | After much talk, the body seeks to stay near others while the words stop, settling into a shared silence. |
| `social_energy_05` | `quiet_company` | `(0.40, -0.22, 0.15)` | Talk wears the body down sooner than presence does, and rest comes from sitting near people without having to answer them. |
| `social_energy_06` | `quiet_company` | `(-0.62, 0.47, -0.40)` | A room of others quietly at work steadies the body more than either an empty room or a conversation. |
| `social_energy_07` | `solitude` | `(0.62, 0.88, 0.93)` | Each exchange draws a little from a reserve that only time alone refills, and the reserve is felt well before it empties. |
| `social_energy_08` | `solitude` | `(-0.45, -0.60, -0.30)` | After company, even pleasant company, the body leans toward a closed door and an unoccupied space. |
| `social_energy_09` | `doing` | `(-0.71, 0.71, -0.66)` | When talk has gone on long enough, the hands and eyes reach for a task, and absorption in it restores what speaking used. |
| `social_energy_10` | `doing` | `(0.55, 0.05, 0.33)` | Recovery from company comes through a book, a walk or some absorbing work rather than through stillness. |

### trust (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `trust_01` | `reliability` | `(0.92, 0.30, -0.88)` | Ease with another person settles in only after they have done what they said they would, and it loosens quickly when they do not. |
| `trust_02` | `reliability` | `(-0.30, 0.18, 0.27)` | A promise kept by someone relaxes the guard against them more than any kindness of manner. |
| `trust_03` | `reliability` | `(-0.55, -0.87, 0.61)` | The body keeps a quiet tally of who arrives when they said they would, and calm gathers around those who do. |
| `trust_04` | `warmth` | `(-0.86, 0.64, -0.35)` | When someone could have answered coldly and did not, the guard against them lowers a little. |
| `trust_05` | `warmth` | `(-0.30, 0.18, 0.27)` | Gentleness offered at a vulnerable moment registers as safety long after the words themselves are forgotten. |
| `trust_06` | `warmth` | `(0.71, -0.45, 0.94)` | A sharp or dismissive reply leaves a lasting wariness, while patience with a mistake opens the body toward the person. |
| `trust_07` | `reciprocity` | `(0.44, 0.90, -0.15)` | Safety with someone grows as giving and receiving between them come out roughly even. |
| `trust_08` | `reciprocity` | `(-0.20, -0.12, 0.05)` | Being answered, helped or listened to in return eases the body, while one-sided exchanges leave it braced. |
| `trust_09` | `familiarity` | `(0.58, -0.70, -0.52)` | A person seen often without incident soon stops registering as a possible threat, even before any word is exchanged. |
| `trust_10` | `familiarity` | `(-0.40, -0.08, -0.20)` | Ease comes slowly with repeated presence, and an unknown face keeps the body alert however friendly it seems. |
