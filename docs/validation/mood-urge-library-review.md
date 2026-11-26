---
id: validation-mood-urge-library-review
status: accepted
last-reviewed: 2026-11-25
---

# The mood urge: loci (library v7)

**Status: accepted** by Guy on November 25, 2026, with mood as its own inherited urge (option (a) of the mood design). Published as library v7 ([ADR-0038](../decisions/ADR-0038-body-levels.md), B5). It is the one family v7 adds to the 18 in [library v5/v6](status-and-conflict-urges-library-review.md). `core/test/inherited-urges.test.mjs` checks the rules below on every family.

The texts describe what a Body inherits, never an instruction or a trait. Each is one proposition and one sentence, with no semicolon (`assertAtomicGenomeLocus`).

G = inherited gain, T = felt awareness threshold, P = persistence, each in [-1, +1]. The positions meet the library's rules, checked mechanically:

- every dimension reaches at least +0.85 and at most -0.85;
- family means are within ±0.10;
- every orientation has mixed-sign gain, with an orientation mean within ±0.25;
- exactly one matched triple, across two orientations;
- no duplicate or sign-mirrored triples;
- distinct effective thresholds.

**What the positions mean here:**

| G | T | P |
|---|---|---|
| how far a feeling spreads into a general tone | how soon a mood is noticed | how long a mood lingers |

**Orientations:** what this Body's mood is most moved by. Each gives a share of every felt moment to the mood:

| Orientation | From people | From what it does |
|---|---|---|
| `people` | 1 | 0.4 |
| `doing` | 0.4 | 1 |
| `everything` | 0.7 | 0.7 |

- **From people:** a slight, recognition, an approach turned down.
- **From what it does:** a discovery, going deeper.

**Matched pair** (the same positions, a different direction): `mood_02` + `mood_05`.

| Mean G / T / P | Orientation gain means |
|---|---|
| -0.02 / -0.01 / -0.01 | people 0.03 · doing -0.03 · everything -0.08 |

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `mood_01` | `people` | `(0.90, -0.40, 0.30)` | A cold word from one person in the morning still weighs on the body at a meal with others hours later. |
| `mood_02` | `people` | `(-0.50, 0.25, -0.60)` | After a warm exchange, the body carries a lightness into whatever comes next. |
| `mood_03` | `people` | `(0.30, 0.90, -0.20)` | A slight from one person leaves the body braced against the next person too. |
| `mood_04` | `people` | `(-0.60, -0.70, 0.88)` | Being met kindly by someone loosens the body toward everyone else nearby. |
| `mood_05` | `doing` | `(-0.50, 0.25, -0.60)` | When something one is doing goes well, the lift of it stays in the body through the rest of the day. |
| `mood_06` | `doing` | `(0.70, -0.92, -0.88)` | A task that goes wrong leaves a heaviness in the body that colours what follows. |
| `mood_07` | `doing` | `(-0.30, 0.60, 0.15)` | Learning something new brightens the body in a way that spills over onto other things. |
| `mood_08` | `everything` | `(0.45, -0.15, 0.62)` | A good or bad turn of any kind settles over the body for some hours afterward. |
| `mood_09` | `everything` | `(-0.88, 0.45, -0.30)` | Whatever has just happened, pleasant or not, lingers in the body as a general tone. |
| `mood_10` | `everything` | `(0.20, -0.33, 0.55)` | The body's general tone shifts with each small event of the day and then drifts back. |
