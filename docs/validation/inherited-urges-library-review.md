---
id: validation-inherited-urges-library-review
status: proposed
last-reviewed: 2026-10-28
---

# Inherited Urges v2 — permanent genome library, proposed for approval

**Births remain paused until validation and explicit approval of all 130 records.**

The following records reproduce `core/src/inherited-urges.mjs` without paraphrasing.
All inherited experience texts and closed orientations remain unchanged from
the approved revision. Only the G/T/P numerical positions changed.

G = inherited gain, T = felt awareness threshold, P = persistence,
each in [-1, +1]. Each family contains precisely one intentional matched
cross-orientation triple, all other triples are distinct, and there are no
exact sign-inverted mirror pairs. Every family has both ≥ +0.85 and ≤ -0.85
in each dimension, family means within ±0.10, and mixed-sign gain with
orientation means within ±0.25.

Under `inheritedSpread = 1` the effective threshold for each record is
`0.05 × 2^(-2 × T)` (approximately 0.0125–0.2 over the full possible
genome range). Distinct inherited T positions have distinct effective
thresholds; `T = 0` and `inheritedSpread = 0` give the common
species threshold 0.05.

## Measured family balance and range

| Family | G min–max | T min–max | P min–max | Mean G / T / P | Distinct triples | Matched pair | Effective felt threshold min–max |
|---|---|---|---|---|---:|---|---|
| `social_contact` | -0.93 to 0.94 | -0.94 to 0.91 | -0.95 to 0.97 | 0.03 / 0.01 / -0.05 | 9/10 | `social_contact_02` + `social_contact_05` | 0.0142 to 0.1840 |
| `exploration` | -0.92 to 0.97 | -0.93 to 0.91 | -0.93 to 0.98 | 0.10 / 0.07 / 0.07 | 9/10 | `exploration_02` + `exploration_09` | 0.0142 to 0.1815 |
| `presence` | -0.97 to 0.95 | -0.95 to 0.91 | -0.96 to 0.95 | 0.03 / 0.02 / 0.05 | 9/10 | `presence_02` + `presence_09` | 0.0142 to 0.1866 |
| `rest` | -0.97 to 0.92 | -0.97 to 0.94 | -0.94 to 0.95 | -0.00 / 0.05 / -0.03 | 9/10 | `rest_02` + `rest_09` | 0.0136 to 0.1919 |
| `energy` | -0.90 to 0.90 | -0.97 to 0.97 | -0.98 to 0.95 | 0.08 / 0.04 / -0.08 | 9/10 | `energy_02` + `energy_09` | 0.0130 to 0.1919 |
| `thermal_comfort` | -0.92 to 0.90 | -0.97 to 0.97 | -0.95 to 0.91 | -0.07 / 0.01 / -0.09 | 9/10 | `thermal_comfort_02` + `thermal_comfort_09` | 0.0130 to 0.1919 |
| `sensory_load` | -0.94 to 0.99 | -0.92 to 0.97 | -0.91 to 0.99 | -0.01 / 0.07 / -0.01 | 9/10 | `sensory_load_02` + `sensory_load_09` | 0.0130 to 0.1790 |
| `safety_threat` | -0.95 to 0.94 | -0.94 to 0.96 | -0.99 to 0.98 | -0.06 / 0.07 / 0.04 | 9/10 | `safety_threat_02` + `safety_threat_09` | 0.0132 to 0.1840 |
| `attachment_proximity` | -0.94 to 0.93 | -0.97 to 0.98 | -0.99 to 0.95 | 0.01 / -0.03 / -0.08 | 9/10 | `attachment_proximity_02` + `attachment_proximity_09` | 0.0129 to 0.1919 |
| `closure` | -0.98 to 0.94 | -0.92 to 0.91 | -0.93 to 0.94 | -0.01 / -0.00 / -0.02 | 9/10 | `closure_02` + `closure_06` | 0.0142 to 0.1790 |
| `verification_itch` | -0.92 to 0.93 | -0.94 to 0.92 | -0.93 to 0.96 | -0.06 / 0.06 / -0.01 | 9/10 | `verification_itch_02` + `verification_itch_09` | 0.0140 to 0.1840 |
| `standing_flare` | -0.95 to 0.92 | -0.96 to 0.94 | -0.98 to 0.93 | -0.07 / 0.04 / -0.03 | 9/10 | `standing_flare_02` + `standing_flare_05` | 0.0136 to 0.1892 |
| `mastery_itch` | -0.98 to 0.94 | -0.94 to 0.97 | -0.98 to 0.98 | -0.06 / -0.03 / 0.09 | 9/10 | `mastery_itch_02` + `mastery_itch_09` | 0.0130 to 0.1840 |

## Per-orientation mean gain

| Family | Orientation | Count | Mean G |
|---|---|---:|---:|
| `social_contact` | `ambient_company` | 3 | 0.120 |
| `social_contact` | `familiar_person` | 3 | -0.007 |
| `social_contact` | `conversation` | 2 | -0.100 |
| `social_contact` | `closeness` | 2 | 0.080 |
| `exploration` | `places` | 3 | 0.233 |
| `exploration` | `ideas` | 3 | 0.120 |
| `exploration` | `people` | 2 | 0.025 |
| `exploration` | `making` | 2 | -0.080 |
| `presence` | `places` | 3 | -0.030 |
| `presence` | `people` | 2 | -0.030 |
| `presence` | `mediated_connection` | 2 | -0.005 |
| `presence` | `activities` | 3 | 0.140 |
| `rest` | `stillness` | 3 | 0.107 |
| `rest` | `sleep` | 4 | -0.062 |
| `rest` | `solitude` | 3 | -0.027 |
| `energy` | `nourishment` | 4 | -0.025 |
| `energy` | `replenishment` | 3 | 0.140 |
| `energy` | `conservation` | 3 | 0.167 |
| `thermal_comfort` | `warmth` | 4 | 0.100 |
| `thermal_comfort` | `cooling` | 3 | -0.230 |
| `thermal_comfort` | `shelter` | 3 | -0.147 |
| `sensory_load` | `quiet` | 3 | -0.027 |
| `sensory_load` | `dimness` | 2 | 0.135 |
| `sensory_load` | `space` | 3 | -0.190 |
| `sensory_load` | `reduced_motion` | 2 | 0.125 |
| `safety_threat` | `distance_from_threat` | 4 | -0.162 |
| `safety_threat` | `shelter` | 3 | 0.230 |
| `safety_threat` | `help_from_known_person` | 3 | -0.223 |
| `attachment_proximity` | `familiar_person` | 3 | 0.127 |
| `attachment_proximity` | `caregiver` | 2 | 0.095 |
| `attachment_proximity` | `reciprocal_contact` | 3 | -0.217 |
| `attachment_proximity` | `shared_presence` | 2 | 0.075 |
| `closure` | `decisions` | 4 | -0.200 |
| `closure` | `tasks` | 3 | 0.067 |
| `closure` | `answers_owed` | 3 | 0.160 |
| `verification_itch` | `unresolved_claim` | 4 | -0.055 |
| `verification_itch` | `untested_assumption` | 3 | -0.203 |
| `verification_itch` | `conflicting_evidence` | 3 | 0.090 |
| `standing_flare` | `public_correction` | 4 | 0.107 |
| `standing_flare` | `refusal_by_close_person` | 3 | -0.187 |
| `standing_flare` | `exclusion` | 3 | -0.180 |
| `mastery_itch` | `technique` | 3 | -0.047 |
| `mastery_itch` | `unfinished_work` | 2 | 0.080 |
| `mastery_itch` | `repeated_practice` | 3 | -0.183 |
| `mastery_itch` | `interrupted_learning` | 2 | -0.020 |

## Exact library: all 130 variants

### social_contact (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `social_contact_01` | `ambient_company` | `(0.94, -0.77, 0.12)` | In an otherwise empty shared space, the absence of ordinary human bustle registers as something missing from the surroundings. |
| `social_contact_02` | `ambient_company` | `(0.35, 0.26, -0.19)` | During extended time alone, attention turns toward the simple sound and movement of other people nearby, without needing a particular exchange. |
| `social_contact_03` | `ambient_company` | `(-0.93, 0.91, -0.95)` | After a stretch without company, the body inclines toward occupying space alongside others, even as a quiet observer. |
| `social_contact_04` | `familiar_person` | `(0.12, -0.10, 0.00)` | The absence of a known person registers as a recognizable gap in the social surroundings rather than a general lack of people. |
| `social_contact_05` | `familiar_person` | `(0.35, 0.26, -0.19)` | When contact with someone familiar is missing, attention returns toward that particular person's presence instead of interchangeable company. |
| `social_contact_06` | `familiar_person` | `(-0.49, 0.19, -0.32)` | A missing familiar voice draws attention toward its remembered cadence and the small habits of being together. |
| `social_contact_07` | `conversation` | `(-0.86, 0.81, 0.97)` | In a long stretch without reciprocal speech, the body seems poised for turn-taking, as though awaiting another voice to answer. |
| `social_contact_08` | `conversation` | `(0.66, 0.05, 0.30)` | Without meaningful verbal exchange, attention returns to the possibility of a shared question and another voice answering. |
| `social_contact_09` | `closeness` | `(-0.14, -0.57, 0.67)` | When closeness with a particular person has been absent, bodily attention gathers around the distance between them rather than the absence of talk. |
| `social_contact_10` | `closeness` | `(0.30, -0.94, -0.90)` | Separation from someone with an established close connection can register as a pull toward shared physical presence rather than mediated contact. |

### exploration (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `exploration_01` | `places` | `(0.06, 0.66, 0.43)` | Familiar paths begin to feel narrow; attention stretches beyond the usual streets toward an unfamiliar turn. |
| `exploration_02` | `ideas` | `(-0.23, -0.23, 0.98)` | A repeated explanation leaves a small unfilled space in attention, pointing toward another way to understand it. |
| `exploration_03` | `people` | `(-0.92, 0.77, -0.71)` | A day of familiar encounters leaves attention alert to an unfamiliar face and an unanticipated exchange. |
| `exploration_04` | `making` | `(-0.50, -0.93, -0.43)` | After repeating the same activity, the hands seem ready for an unfamiliar material or object to assemble. |
| `exploration_05` | `places` | `(0.87, 0.12, 0.38)` | In a place visited many times, the eye repeatedly seeks exits and nearby routes not yet followed. |
| `exploration_06` | `ideas` | `(-0.33, -0.72, 0.17)` | A familiar question acquires a felt edge of incompleteness, drawing attention toward an untested explanation. |
| `exploration_07` | `people` | `(0.97, 0.43, -0.93)` | After predictable company, attention widens toward strangers whose ways of speaking have not yet become familiar. |
| `exploration_08` | `making` | `(0.34, 0.91, -0.48)` | Repetition at a workbench sharpens awareness of unused tools and the possibility of constructing something different. |
| `exploration_09` | `places` | `(-0.23, -0.23, 0.98)` | When the day repeats its usual geography, the body leans toward another landscape rather than another conversation. |
| `exploration_10` | `ideas` | `(0.92, -0.04, 0.30)` | When a familiar account is heard again, attention begins wandering among alternative connections between its parts. |

### presence (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `presence_01` | `places` | `(-0.86, 0.72, 0.18)` | An intended destination occupies a distinct place in bodily orientation while the present surroundings remain elsewhere. |
| `presence_02` | `people` | `(0.43, 0.55, 0.95)` | Separation from a person one intended to meet registers as a pull toward being alongside that person. |
| `presence_03` | `mediated_connection` | `(0.37, -0.76, -0.96)` | An expected remote connection leaves attention poised for the moment a shared channel becomes present. |
| `presence_04` | `activities` | `(0.44, -0.95, 0.06)` | When intended work has not begun, bodily readiness gathers around the activity's expected start. |
| `presence_05` | `places` | `(0.34, -0.33, 0.37)` | A missed turn toward a planned place produces a directional tug toward the route that would recover the intended arrival. |
| `presence_06` | `people` | `(-0.49, 0.91, 0.82)` | As an arranged meeting nears, attention turns toward the absence of the particular person expected to be present. |
| `presence_07` | `mediated_connection` | `(-0.38, -0.44, -0.68)` | An upcoming call becomes felt as an unclosed distance between the current room and a distant participant. |
| `presence_08` | `activities` | `(0.95, -0.13, -0.71)` | The gap between planned practice and present inactivity draws attention toward the equipment or setting where practice occurs. |
| `presence_09` | `places` | `(0.43, 0.55, 0.95)` | Approaching a planned stop draws awareness toward physical arrival and the remaining interval of separation. |
| `presence_10` | `activities` | `(-0.97, 0.06, -0.49)` | A scheduled shared task becomes perceptible as readiness to enter its particular rhythm and sequence. |

### rest (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `rest_01` | `stillness` | `(-0.41, -0.97, 0.03)` | After sustained exertion, movement itself becomes conspicuous and the body reaches toward a period without demands. |
| `rest_02` | `sleep` | `(-0.45, -0.02, 0.45)` | As fatigue accumulates, attention gravitates toward the bodily surrender of wakefulness. |
| `rest_03` | `solitude` | `(0.69, -0.34, -0.94)` | After exhausting interaction, the body draws toward an interval without another person's demands. |
| `rest_04` | `sleep` | `(0.25, 0.50, -0.32)` | Prolonged wakefulness brings attention repeatedly toward closing the eyes and allowing sleep. |
| `rest_05` | `stillness` | `(0.90, -0.62, -0.27)` | A demanding stretch makes unhurried posture and a quiet seat feel like a missing physical condition. |
| `rest_06` | `solitude` | `(-0.32, 0.65, 0.29)` | When tiredness grows amidst company, attention moves toward a private place to recover without conversation. |
| `rest_07` | `sleep` | `(-0.97, 0.32, -0.42)` | Exertion leaves a distinct pull toward lying down and letting wakeful thought recede. |
| `rest_08` | `stillness` | `(-0.17, 0.94, -0.55)` | After continuous activity, the muscles seem to seek the brief absence of motion rather than a change of task. |
| `rest_09` | `solitude` | `(-0.45, -0.02, 0.45)` | Recovery appears bodily connected to the absence of interruption, with attention drawn toward being alone. |
| `rest_10` | `sleep` | `(0.92, 0.05, 0.95)` | The felt boundary of tiredness gathers around the prospect of a sustained period of sleep. |

### energy (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `energy_01` | `nourishment` | `(0.27, -0.46, -0.16)` | As available energy falls, bodily attention gravitates toward eating and the anticipation of nourishment. |
| `energy_02` | `replenishment` | `(0.26, 0.97, 0.78)` | Depletion creates a pull toward a condition in which energy can be restored rather than immediately spent. |
| `energy_03` | `conservation` | `(0.80, 0.86, 0.21)` | A dwindling reserve makes the effort of each movement noticeable and draws the body toward conserving expenditure. |
| `energy_04` | `nourishment` | `(-0.37, 0.26, -0.98)` | A hollowing sense of dwindling energy draws bodily attention toward the physical act of taking in food. |
| `energy_05` | `replenishment` | `(-0.18, -0.87, -0.76)` | An energy shortfall registers as attraction toward a sustained interval of restoration before further exertion. |
| `energy_06` | `conservation` | `(-0.56, -0.37, 0.95)` | After resource-intensive activity, attention seeks fewer demands and a gentler pace of bodily work. |
| `energy_07` | `nourishment` | `(-0.90, -0.15, -0.58)` | Energy loss is felt in the body as a pull toward available sustenance and its expected effect. |
| `energy_08` | `replenishment` | `(0.34, 0.13, -0.61)` | A lower reserve produces readiness to seek conditions that restore capacity for continued activity. |
| `energy_09` | `conservation` | `(0.26, 0.97, 0.78)` | When energy is scarce, the body attends to unnecessary exertion and draws toward a lighter physical load. |
| `energy_10` | `nourishment` | `(0.90, -0.97, -0.41)` | After sustained expenditure, eating becomes a bodily possibility that repeatedly returns to attention. |

### thermal_comfort (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `thermal_comfort_01` | `warmth` | `(-0.02, 0.97, 0.51)` | Chill on the skin draws bodily attention toward a source of warmth and the change it could bring. |
| `thermal_comfort_02` | `cooling` | `(-0.35, 0.07, -0.59)` | Excess heat concentrates awareness on the possibility of cooler air against the body. |
| `thermal_comfort_03` | `shelter` | `(0.65, -0.46, 0.91)` | Uncomfortable exposure to the elements draws attention toward a bounded protective space. |
| `thermal_comfort_04` | `warmth` | `(-0.92, 0.54, 0.65)` | Cold hands repeatedly bring awareness to nearby warm surfaces and insulated surroundings. |
| `thermal_comfort_05` | `cooling` | `(-0.86, -0.97, -0.85)` | Overheating creates a directional pull toward shade or the movement of cooler air. |
| `thermal_comfort_06` | `shelter` | `(-0.74, -0.37, 0.66)` | Persistent exposure makes the boundary between an open place and an enclosed refuge feel bodily salient. |
| `thermal_comfort_07` | `warmth` | `(0.90, 0.20, 0.30)` | A cooling body becomes unusually aware of radiant heat and places that hold it. |
| `thermal_comfort_08` | `cooling` | `(0.52, 0.68, -0.95)` | When heat accumulates, attention seeks relief from direct sun and stagnant warmth. |
| `thermal_comfort_09` | `shelter` | `(-0.35, 0.07, -0.59)` | Temperature discomfort sharpens attention to doors, walls and spaces that buffer the outside air. |
| `thermal_comfort_10` | `warmth` | `(0.44, -0.63, -0.95)` | Cold settles across the skin and draws the body toward heat rather than movement or novelty. |

### sensory_load (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `sensory_load_01` | `quiet` | `(-0.93, -0.92, 0.32)` | Sustained noise makes the spaces between sounds feel scarce, and attention reaches toward quiet. |
| `sensory_load_02` | `dimness` | `(0.56, -0.03, 0.99)` | A bright field of light leaves the eyes drawn toward a softer, less illuminated edge. |
| `sensory_load_03` | `space` | `(-0.94, 0.97, 0.35)` | Crowding makes bodily boundaries noticeable, pulling attention toward a roomier position. |
| `sensory_load_04` | `reduced_motion` | `(0.99, -0.25, -0.91)` | Continuous movement around the body draws attention toward a place where fewer things shift. |
| `sensory_load_05` | `quiet` | `(0.29, -0.10, -0.54)` | Overlapping voices and abrupt sounds create a distinct pull toward unbroken silence. |
| `sensory_load_06` | `dimness` | `(-0.29, 0.68, -0.39)` | Extended glare makes shaded surfaces and darker corners physically salient. |
| `sensory_load_07` | `space` | `(-0.46, -0.71, -0.40)` | When people or objects are too close, awareness reaches toward an unobstructed area for movement. |
| `sensory_load_08` | `reduced_motion` | `(-0.74, 0.88, -0.17)` | A restless visual field makes a still horizon attractive as a sensory condition. |
| `sensory_load_09` | `quiet` | `(0.56, -0.03, 0.99)` | Repeated sound transients draw attention toward a setting with fewer interruptions to hearing. |
| `sensory_load_10` | `space` | `(0.83, 0.16, -0.33)` | Sensory compression in a dense setting creates a bodily pull toward open distance. |

### safety_threat (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `safety_threat_01` | `distance_from_threat` | `(-0.61, 0.96, -0.29)` | An observed hazard makes the interval separating body and danger feel urgently relevant. |
| `safety_threat_02` | `shelter` | `(-0.49, 0.71, -0.32)` | A credible nearby threat draws attention toward a protective barrier or reliable refuge. |
| `safety_threat_03` | `help_from_known_person` | `(-0.95, -0.16, -0.54)` | Under danger, awareness reaches toward the reassuring voice and steady company of a familiar helper. |
| `safety_threat_04` | `distance_from_threat` | `(0.46, -0.94, -0.04)` | In the presence of a real approaching hazard, the body becomes oriented toward widening separation. |
| `safety_threat_05` | `shelter` | `(0.24, 0.45, 0.63)` | An exposed setting under threat makes the possibility of cover feel physically distinct from open ground. |
| `safety_threat_06` | `help_from_known_person` | `(0.77, -0.44, 0.72)` | A threatening moment brings the remembered steadiness of a capable familiar person into focus, pulling toward their assistance. |
| `safety_threat_07` | `distance_from_threat` | `(-0.51, -0.70, -0.99)` | A developing hazard keeps attention on space that could increase distance from its source. |
| `safety_threat_08` | `shelter` | `(0.94, -0.37, 0.98)` | Unprotected proximity to a hazard sharpens awareness of walls, doors or other real cover. |
| `safety_threat_09` | `help_from_known_person` | `(-0.49, 0.71, -0.32)` | Threat pressure draws attention toward reaching a familiar helper and hearing a steadying response. |
| `safety_threat_10` | `distance_from_threat` | `(0.01, 0.52, 0.57)` | A nearby danger sharpens awareness of the space the body could put between itself and the threat. |

### attachment_proximity (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `attachment_proximity_01` | `familiar_person` | `(-0.14, -0.69, -0.55)` | Separation from a valued familiar person registers as the absence of their distinctive presence. |
| `attachment_proximity_02` | `caregiver` | `(0.42, -0.97, 0.95)` | Distance from a caregiver feels like a gap where a familiar steadying presence ought to be. |
| `attachment_proximity_03` | `reciprocal_contact` | `(0.93, 0.47, -0.82)` | An established reciprocal relationship left without contact becomes a particular felt gap. |
| `attachment_proximity_04` | `shared_presence` | `(-0.55, -0.18, 0.31)` | Being apart from a person with whom presence has mattered draws attention toward occupying the same place. |
| `attachment_proximity_05` | `familiar_person` | `(0.10, -0.08, -0.99)` | The remembered nearness of a known person becomes a bodily point of orientation during separation. |
| `attachment_proximity_06` | `caregiver` | `(-0.23, 0.21, 0.10)` | A caregiver's absence leaves a distinct pull toward the place where their care has often been felt. |
| `attachment_proximity_07` | `reciprocal_contact` | `(-0.64, 0.64, -0.39)` | Missing an ordinary two-way exchange with a particular person draws attention toward mutual contact. |
| `attachment_proximity_08` | `shared_presence` | `(0.70, 0.98, -0.19)` | The lack of shared physical time registers as a distance that mediated words do not fully fill. |
| `attachment_proximity_09` | `familiar_person` | `(0.42, -0.97, 0.95)` | When known closeness has been interrupted, attention returns to that person's particular place in everyday life. |
| `attachment_proximity_10` | `reciprocal_contact` | `(-0.94, 0.33, -0.21)` | A long pause in an established mutual connection is felt as the missing rhythm of response. |

### closure (triggered)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `closure_01` | `decisions` | `(-0.54, 0.22, -0.39)` | When an important choice remains undecided, attention keeps returning to the branching alternatives as an open shape that has not settled. |
| `closure_02` | `decisions` | `(-0.37, -0.25, -0.24)` | An unresolved decision occupies a distinct place in awareness, like a question that has not yet acquired an answer. |
| `closure_03` | `decisions` | `(-0.16, -0.63, 0.43)` | When a personally owned decision remains open, the competing possibilities continue to register as an unfinished internal movement. |
| `closure_04` | `decisions` | `(0.27, -0.92, 0.91)` | A choice left between alternatives creates a felt incompleteness around the act of choosing, separate from the practical work that may follow. |
| `closure_05` | `tasks` | `(0.88, 0.77, -0.62)` | An active task left unfinished draws bodily attention toward the point where the work stopped. |
| `closure_06` | `tasks` | `(-0.37, -0.25, -0.24)` | Uncompleted work registers as an interrupted movement, with attention returning to the next concrete step rather than to a choice among possibilities. |
| `closure_07` | `tasks` | `(-0.31, -0.17, -0.93)` | An unfinished activity remains present in attention through the visible or remembered materials of the work itself. |
| `closure_08` | `answers_owed` | `(0.94, -0.05, 0.94)` | A specific unanswered request from another person registers as an unreturned signal, drawing attention toward the absent reply. |
| `closure_09` | `answers_owed` | `(-0.98, 0.91, 0.57)` | When a response is awaited, the open exchange remains perceptible as a gap between receiving a question and answering it. |
| `closure_10` | `answers_owed` | `(0.52, 0.32, -0.59)` | An answer still owed draws attention toward the unfinished exchange rather than an unrelated task. |

### verification_itch (triggered)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `verification_itch_01` | `unresolved_claim` | `(0.31, -0.83, 0.96)` | An unverified claim returns to attention as an unsettled question about what happened. |
| `verification_itch_02` | `untested_assumption` | `(0.26, 0.61, 0.57)` | An explicitly noted assumption without a test registers as a missing point of contact with reality. |
| `verification_itch_03` | `conflicting_evidence` | `(-0.92, 0.35, -0.03)` | Two retained observations that disagree keep attention moving between them without a settled fit. |
| `verification_itch_04` | `unresolved_claim` | `(-0.86, -0.15, -0.53)` | A pending assertion whose source remains unexamined draws attention back to the gap in knowing. |
| `verification_itch_05` | `untested_assumption` | `(0.03, 0.24, -0.82)` | A decision resting on an untried premise carries a felt edge around the absence of a check. |
| `verification_itch_06` | `conflicting_evidence` | `(0.93, 0.92, -0.23)` | Two accounts pointing in opposite directions keep the unresolved mismatch vivid in attention. |
| `verification_itch_07` | `unresolved_claim` | `(0.37, -0.02, -0.41)` | An earlier unconfirmed account periodically resurfaces as a question still awaiting resolution. |
| `verification_itch_08` | `untested_assumption` | `(-0.90, -0.22, -0.93)` | An assumption named in a prior choice becomes felt again as the missing experiment beneath that choice. |
| `verification_itch_09` | `conflicting_evidence` | `(0.26, 0.61, 0.57)` | A pair of inconsistent witnesses occupies attention as a tension between two concrete traces. |
| `verification_itch_10` | `unresolved_claim` | `(-0.04, -0.94, 0.71)` | An outstanding factual claim continues to attract attention to the difference between saying and knowing. |

### standing_flare (triggered)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `standing_flare_01` | `public_correction` | `(-0.02, 0.94, 0.93)` | Being corrected in front of others brings a bodily awareness of the correction's public setting. |
| `standing_flare_02` | `public_correction` | `(-0.43, 0.78, -0.73)` | During a witnessed correction, attention expands from the words of correction to the fact that others heard them. |
| `standing_flare_03` | `public_correction` | `(0.47, 0.24, 0.64)` | A public correction creates a social jolt that gathers attention around the exposed moment and its acknowledged audience. |
| `standing_flare_04` | `public_correction` | `(0.41, -0.19, 0.89)` | After a witnessed correction, the body registers the difference between being addressed privately and being corrected before others. |
| `standing_flare_05` | `refusal_by_close_person` | `(-0.43, 0.78, -0.73)` | A refusal from someone with an established close bond registers as a distinct disruption in expected interpersonal contact. |
| `standing_flare_06` | `refusal_by_close_person` | `(0.42, -0.43, -0.98)` | When a close person's reply is a refusal, attention turns toward the mismatch between familiar connection and the present boundary. |
| `standing_flare_07` | `refusal_by_close_person` | `(-0.55, -0.78, -0.07)` | A close person's refusal produces a bodily awareness of distance within an otherwise familiar relationship. |
| `standing_flare_08` | `exclusion` | `(-0.51, -0.27, -0.67)` | Being explicitly excluded from an anticipated role registers as an interrupted social approach toward that activity. |
| `standing_flare_09` | `exclusion` | `(0.92, -0.96, -0.49)` | When an expected opening is closed specifically to the self, attention gathers around the boundary that now separates participation from exclusion. |
| `standing_flare_10` | `exclusion` | `(-0.95, 0.33, 0.92)` | Exclusion from a social place registers as a bodily sense of belonging suddenly slipping beyond reach. |

### mastery_itch (directional)

| Variant | Orientation | (G, T, P) | Complete inherited experience text |
|---|---|---|---|
| `mastery_itch_01` | `technique` | `(-0.72, -0.82, 0.20)` | An imperfect movement in a practiced skill leaves the body poised to feel the next more precise repetition. |
| `mastery_itch_02` | `unfinished_work` | `(0.25, 0.16, 0.26)` | A partially made object draws attention toward the untouched portion and its possible completion. |
| `mastery_itch_03` | `repeated_practice` | `(-0.23, 0.61, 0.88)` | A familiar rehearsal leaves an anticipatory pull toward another encounter with the same pattern. |
| `mastery_itch_04` | `interrupted_learning` | `(-0.98, 0.85, -0.56)` | Learning halted before understanding settles creates an attentive reach toward the missing connection. |
| `mastery_itch_05` | `technique` | `(0.33, -0.09, -0.35)` | A recent failed movement lingers bodily as a shape the hands want to try once more. |
| `mastery_itch_06` | `unfinished_work` | `(-0.09, -0.74, 0.98)` | An incomplete creation remains felt through the tools and materials that would resume it. |
| `mastery_itch_07` | `repeated_practice` | `(0.30, -0.50, -0.23)` | A recurring practiced action carries a bodily expectation for another session of its rhythm. |
| `mastery_itch_08` | `interrupted_learning` | `(0.94, -0.94, -0.98)` | A paused lesson leaves attention at the exact point where the explanation broke off. |
| `mastery_itch_09` | `technique` | `(0.25, 0.16, 0.26)` | A technique not yet fluent registers as an unfinished coordination among its component motions. |
| `mastery_itch_10` | `repeated_practice` | `(-0.62, 0.97, 0.46)` | After many repetitions, a practiced sequence returns as a felt anticipation of its next turn. |

