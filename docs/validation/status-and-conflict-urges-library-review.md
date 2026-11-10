---
id: validation-status-and-conflict-urges-library-review
status: proposed
last-reviewed: 2026-11-10
---

# Status and conflict urges — draft loci for review (library v5)

**Status: proposed, for Guy's review.** These are the three new families that [ADR-0037](../decisions/ADR-0037-status-and-conflict.md) adds to the 15 in [library v4](social-body-urges-library-review.md). Once accepted, library v5 publishes them unchanged, and `core/test/inherited-urges.test.mjs` checks the rules below on every family.

The texts describe what a Body inherits, never an instruction or a trait. Each is one proposition and one sentence, with no semicolon (`assertAtomicGenomeLocus`).

G = inherited gain, T = felt awareness threshold, P = persistence, S = `selfRegard` (on `standing` only), each in [-1, +1]. The positions meet the same rules as the existing library, checked mechanically on these drafts:
- every dimension reaches at least +0.85 and at most -0.85;
- family means are within ±0.10;
- every orientation has mixed-sign gain, with an orientation mean within ±0.25;
- exactly one matched triple, across two orientations;
- no duplicate or sign-mirrored triples;
- distinct effective thresholds.

`selfRegard` meets one more rule: its mean within each orientation is within ±0.25, so no way of wanting standing is inherited as more confident or more insecure than another. The matched pair shares it too, so the two differ only in direction.

**What the positions mean here:**

| Family | G | T | P | S |
|---|---|---|---|---|
| `standing` | how much one's place matters | how soon a slight or a want of standing is felt | how long a loss of standing stays | how far felt self-status leans above (+) or below (−) what the record shows |
| `provocation` | how hot the answer to a threat runs | the fuse: how small a sting is felt | how long anger lingers | — |
| `remorse` | how heavy having done harm weighs | how small a harm is felt | how long it stays | — |

**Orientations:**
- `standing`: what standing means to this Body (`recognition`, `deference`, `competence`, `belonging`);
- `provocation`: the Body's answer to a threat (`confront`, `withdraw`, `appease`, `deflect`);
- `remorse` (triggered): what this Body is most sensitive to having done (`broken_faith`, `harshness`, `exclusion`). It reacts to the others at species level (ADR-0030's triggered rule).

**Matched pairs** (the same positions, a different direction): `standing_02` + `standing_05`, `provocation_02` + `provocation_07`, and `remorse_05` + `remorse_08`.

| Family | Mean G / T / P (/ S) | Orientation gain means |
|---|---|---|
| `standing` | -0.01 / 0.00 / -0.06 / -0.01 | recognition 0.08 · deference -0.12 · competence 0.15 · belonging -0.12 |
| `provocation` | 0.00 / 0.00 / -0.07 | confront 0.06 · withdraw -0.04 · appease 0.08 · deflect -0.07 |
| `remorse` | 0.00 / 0.01 / -0.04 | broken_faith 0.01 · harshness -0.14 · exclusion 0.13 |

### standing (directional)

| Variant | Orientation | (G, T, P, S) | Complete inherited experience text |
|---|---|---|---|
| `standing_01` | `recognition` | `(0.88, -0.40, 0.30, 0.50)` | When something one has said or made is passed over in a group, attention stays on the moment it went unacknowledged. |
| `standing_02` | `recognition` | `(-0.45, 0.22, -0.60, -0.30)` | Hearing one's own name attached to an idea brings a warm settling, and hearing it credited to someone else brings a small jolt. |
| `standing_03` | `recognition` | `(-0.20, 0.90, 0.55, -0.88)` | In company, the body keeps track of whose words are taken up and whose are left lying. |
| `standing_04` | `deference` | `(-0.86, -0.70, 0.88, 0.15)` | When others pause to hear one out, the body eases, and when they talk on regardless, it tightens. |
| `standing_05` | `deference` | `(-0.45, 0.22, -0.60, -0.30)` | In a disagreement, the body registers who gives way first, and holding one's ground brings a steadying warmth. |
| `standing_06` | `deference` | `(0.95, 0.48, -0.25, 0.88)` | Being followed in a small choice, such as where to sit or what to read next, settles the body more than being agreed with in words. |
| `standing_07` | `competence` | `(0.60, -0.92, -0.88, 0.35)` | Being asked for help with something one knows well brings a quiet straightening of the body. |
| `standing_08` | `competence` | `(-0.30, 0.65, 0.10, -0.60)` | Being corrected on a matter one knows lands harder in the body than being corrected on something new. |
| `standing_09` | `belonging` | `(-0.70, -0.10, 0.62, 0.15)` | Being expected among a group, missed when absent and greeted on arrival, steadies the body like solid ground. |
| `standing_10` | `belonging` | `(0.45, -0.33, -0.70, -0.10)` | Standing at the edge of a group that has closed its circle draws the body's attention to the gap. |

### provocation (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `provocation_01` | `confront` | `(0.92, -0.85, 0.40)` | After a sting from someone, heat rises toward them and the body readies to answer in kind. |
| `provocation_02` | `confront` | `(-0.35, 0.30, -0.55)` | When pushed, the body leans forward rather than back, and the words to push back come quickly. |
| `provocation_03` | `confront` | `(-0.40, 0.60, 0.90)` | A slight left unanswered keeps the body tense until it has been met. |
| `provocation_04` | `withdraw` | `(0.55, 0.15, -0.90)` | After a sharp word, the body wants distance first, and the room seems to narrow until it can leave. |
| `provocation_05` | `withdraw` | `(-0.88, -0.45, 0.25)` | When someone turns hostile, warmth drains from the body and it goes still and cool toward them. |
| `provocation_06` | `withdraw` | `(0.20, 0.88, -0.15)` | Provocation sends the body inward, toward silence, rather than toward the person who caused it. |
| `provocation_07` | `appease` | `(-0.35, 0.30, -0.55)` | When tension rises between people, the body reaches to soften it before anything else. |
| `provocation_08` | `appease` | `(0.50, -0.62, 0.35)` | After friction with someone, the body stays restless until the other seems at ease again. |
| `provocation_09` | `deflect` | `(-0.60, -0.20, -0.70)` | In a tense moment, a lightness rises in the body and reaches for something to laugh at. |
| `provocation_10` | `deflect` | `(0.45, -0.10, 0.20)` | When a conversation turns sharp, attention slides sideways toward another subject. |

### remorse (triggered)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `remorse_01` | `broken_faith` | `(0.90, 0.35, -0.40)` | After failing to do what one said one would, the body carries a weight that returns whenever the other person comes to mind. |
| `remorse_02` | `broken_faith` | `(-0.50, -0.88, 0.60)` | A broken promise sits in the body as an unfinished act that pulls toward setting it right. |
| `remorse_03` | `broken_faith` | `(0.30, 0.15, 0.92)` | Having let someone down, the body tends to turn away from meeting them. |
| `remorse_04` | `broken_faith` | `(-0.65, 0.55, -0.20)` | The memory of a missed meeting returns with a small sinking in the chest. |
| `remorse_05` | `harshness` | `(-0.25, -0.30, -0.65)` | After speaking sharply, the other person's face stays with the body long after the words. |
| `remorse_06` | `harshness` | `(0.70, 0.90, 0.10)` | A sharp word one has spoken echoes back as discomfort once the heat has passed. |
| `remorse_07` | `harshness` | `(-0.86, -0.15, 0.45)` | Seeing hurt in someone after one's own words brings a quick drop in the body's warmth. |
| `remorse_08` | `exclusion` | `(-0.25, -0.30, -0.65)` | Having left someone out, the body keeps returning to the place where they were not. |
| `remorse_09` | `exclusion` | `(0.55, -0.60, -0.88)` | Seeing someone at the edge of a group one belongs to brings an uneasy pull to make room. |
| `remorse_10` | `exclusion` | `(0.10, 0.40, 0.30)` | Remembering a time one shut someone out brings a dull heaviness. |

## For review

- **Texts:** does each read as something a Body inherits, not a trait or an instruction? `remorse_03` (turning away from the person one let down) is deliberately the avoidant answer, beside the reparative ones.
- **`selfRegard` spread:** from -0.88 to +0.88. At the extremes, a Body feels clearly above or below what its life shows. Narrowing the range makes temperament matter less.
