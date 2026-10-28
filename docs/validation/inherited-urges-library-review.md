---
id: validation-inherited-urges-library-review
status: proposed
last-reviewed: 2026-10-28
---

# S1 inherited urges — complete immutable v2 library for review

**Do not deploy new births until Guy and reviewer approve all 130 entries.**

This is a rendered review view of the exact records authored in
[`core/src/inherited-urges.mjs`](../../core/src/inherited-urges.mjs).
The source file is the versioned executable authority. Each entry's
natural-language text, orientation, and frozen gain / felt threshold /
persistence position is shown without abbreviation. `G,T,P` are in [-1,1].

Newborns inherit one variant per family selected deterministically by request
ID and family key. Text is not an LLM instruction. Directional orientations
set felt direction without suppressing the evidence-backed drive; triggered
orientations heighten only the corresponding trigger, preserving default
reactivity to other trigger kinds.

## social_contact — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `social_contact_01` | `ambient_company` | `(-1, -0.6, -0.9)` | In an otherwise empty shared space, the absence of ordinary human bustle registers as something missing from the surroundings. |
| `social_contact_02` | `ambient_company` | `(0.2, 0.4, -0.4)` | During extended time alone, attention turns toward the simple sound and movement of other people nearby, without needing a particular exchange. |
| `social_contact_03` | `ambient_company` | `(0.9, -0.5, 0.8)` | After a stretch without company, the body inclines toward occupying space alongside others, even as a quiet observer. |
| `social_contact_04` | `familiar_person` | `(-0.7, 0.9, 1)` | The absence of a known person registers as a recognizable gap in the social surroundings rather than a general lack of people. |
| `social_contact_05` | `familiar_person` | `(0.2, 0.4, -0.4)` | When contact with someone familiar is missing, attention returns toward that particular person's presence instead of interchangeable company. |
| `social_contact_06` | `familiar_person` | `(1, -1, 0.4)` | A known person's absence draws attention toward their distinctive voice and ordinary manner of being present, when those are actually known. |
| `social_contact_07` | `conversation` | `(0.5, 1, -0.8)` | In a long stretch without reciprocal speech, the body seems poised for turn-taking, as though awaiting another voice to answer. |
| `social_contact_08` | `conversation` | `(-0.4, -0.9, 0.7)` | Without meaningful verbal exchange, attention returns to the possibility of a shared question and an actual reply. |
| `social_contact_09` | `closeness` | `(0.8, 0.1, 0.9)` | When evidenced closeness with a particular person has been absent, bodily attention gathers around the distance between them rather than the absence of talk. |
| `social_contact_10` | `closeness` | `(-0.2, -0.3, -1)` | Separation from someone with an established close connection can register as a pull toward shared physical presence rather than mediated contact. |

## exploration — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `exploration_01` | `places` | `(0.8, 0.3, 0.2)` | Familiar paths begin to feel narrow; attention stretches beyond the usual streets toward an unfamiliar turn. |
| `exploration_02` | `ideas` | `(0.2, 0.4, -0.4)` | A repeated explanation leaves a small unfilled space in attention, pointing toward another way to understand it. |
| `exploration_03` | `people` | `(-0.4, 0.7, 0.5)` | A day of familiar encounters leaves attention alert to an unfamiliar face and an unanticipated exchange. |
| `exploration_04` | `making` | `(0.9, -0.6, 0.8)` | After repeating the same activity, the hands seem ready for an unfamiliar material or object to assemble. |
| `exploration_05` | `places` | `(-0.8, 0.9, -0.7)` | In a place visited many times, the eye repeatedly seeks exits and nearby routes not yet followed. |
| `exploration_06` | `ideas` | `(1, -0.8, 0.7)` | A familiar question acquires a felt edge of incompleteness, drawing attention toward an untested explanation. |
| `exploration_07` | `people` | `(0.5, -0.2, -0.9)` | After predictable company, attention widens toward strangers whose ways of speaking have not yet become familiar. |
| `exploration_08` | `making` | `(-0.2, 0.2, 0.9)` | Repetition at a workbench sharpens awareness of unused tools and the possibility of constructing something different. |
| `exploration_09` | `places` | `(0.2, 0.4, -0.4)` | When the day repeats its usual geography, the body leans toward another landscape rather than another conversation. |
| `exploration_10` | `ideas` | `(-0.9, -0.3, 0.2)` | When a familiar account is heard again, attention begins wandering among alternative connections between its parts. |

## presence — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `presence_01` | `places` | `(0.8, 0.4, 0.5)` | An intended destination occupies a distinct place in bodily orientation while the actual surroundings remain elsewhere. |
| `presence_02` | `people` | `(0.2, 0.4, -0.4)` | Separation from a person one intended to meet registers as a pull toward being alongside that person. |
| `presence_03` | `mediated_connection` | `(-0.6, 1, -0.7)` | An expected remote connection leaves attention poised for the moment a shared channel becomes present. |
| `presence_04` | `activities` | `(0.9, -0.6, 0.8)` | When intended work has not begun, bodily readiness gathers around the activity's expected start. |
| `presence_05` | `places` | `(-0.4, -0.4, 1)` | A missed turn toward a planned place produces a directional tug toward the route that would recover the intended arrival. |
| `presence_06` | `people` | `(1, -0.8, 0.3)` | As an arranged meeting nears, attention turns toward the absence of the particular person expected to be present. |
| `presence_07` | `mediated_connection` | `(0.5, 0.8, -0.3)` | An upcoming call becomes felt as an unclosed distance between the current room and a distant participant. |
| `presence_08` | `activities` | `(-0.8, -0.2, 0.9)` | The gap between planned practice and present inactivity draws attention toward the equipment or setting where practice occurs. |
| `presence_09` | `places` | `(0.2, 0.4, -0.4)` | Approaching a planned stop draws awareness toward physical arrival and the remaining interval of separation. |
| `presence_10` | `activities` | `(-0.2, 0.7, -0.9)` | A scheduled shared task becomes perceptible as readiness to enter its particular rhythm and sequence. |

## rest — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `rest_01` | `stillness` | `(0.8, 0.5, 0.7)` | After sustained exertion, movement itself becomes conspicuous and the body reaches toward a period without demands. |
| `rest_02` | `sleep` | `(0.2, 0.4, -0.4)` | As fatigue accumulates, attention gravitates toward the bodily surrender of wakefulness. |
| `rest_03` | `solitude` | `(-0.7, 0.8, -0.2)` | After exhausting interaction, the body draws toward an interval without another person's demands. |
| `rest_04` | `sleep` | `(1, -0.8, 1)` | Prolonged wakefulness brings attention repeatedly toward closing the eyes and allowing sleep. |
| `rest_05` | `stillness` | `(-0.4, -0.5, 0.9)` | A demanding stretch makes unhurried posture and a quiet seat feel like a missing physical condition. |
| `rest_06` | `solitude` | `(0.9, 0.2, -0.8)` | When tiredness grows amidst company, attention moves toward a private place to recover without conversation. |
| `rest_07` | `sleep` | `(0.5, 1, -0.7)` | Exertion leaves a distinct pull toward lying down and letting wakeful thought recede. |
| `rest_08` | `stillness` | `(-0.9, -0.4, 0.4)` | After continuous activity, the muscles seem to seek the brief absence of motion rather than a change of task. |
| `rest_09` | `solitude` | `(0.2, 0.4, -0.4)` | Recovery appears bodily connected to the absence of interruption, with attention drawn toward being alone. |
| `rest_10` | `sleep` | `(-0.2, -0.7, 0.5)` | The felt boundary of tiredness gathers around the prospect of a sustained period of sleep. |

## energy — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `energy_01` | `nourishment` | `(0.9, 0.5, -0.4)` | As available energy falls, bodily attention gravitates toward eating and the anticipation of nourishment. |
| `energy_02` | `replenishment` | `(0.2, 0.4, -0.4)` | Depletion creates a pull toward a condition in which energy can be restored rather than immediately spent. |
| `energy_03` | `conservation` | `(-0.5, 0.8, 0.7)` | A dwindling reserve makes the effort of each movement noticeable and draws the body toward conserving expenditure. |
| `energy_04` | `nourishment` | `(1, -0.8, 0.9)` | An actual nourishment deficit brings awareness to the physical act of taking in food. |
| `energy_05` | `replenishment` | `(-0.8, 0.3, 1)` | An energy shortfall registers as attraction toward a sustained interval of restoration before further exertion. |
| `energy_06` | `conservation` | `(0.6, -0.6, -0.8)` | After resource-intensive activity, attention seeks fewer demands and a gentler pace of bodily work. |
| `energy_07` | `nourishment` | `(0.3, 0.9, 0.1)` | Energy loss is felt in the body as a pull toward available sustenance and its expected effect. |
| `energy_08` | `replenishment` | `(-0.9, -0.3, 0.5)` | A lower reserve produces readiness to seek conditions that restore capacity for continued activity. |
| `energy_09` | `conservation` | `(0.2, 0.4, -0.4)` | When energy is scarce, the body attends to unnecessary exertion and draws toward a lighter physical load. |
| `energy_10` | `nourishment` | `(-0.3, -0.9, -0.1)` | After sustained expenditure, eating becomes a bodily possibility that repeatedly returns to attention. |

## thermal_comfort — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `thermal_comfort_01` | `warmth` | `(0.9, 0.4, 0.8)` | Chill on the skin draws bodily attention toward a source of warmth and the change it could bring. |
| `thermal_comfort_02` | `cooling` | `(0.2, 0.4, -0.4)` | Excess heat concentrates awareness on the possibility of cooler air against the body. |
| `thermal_comfort_03` | `shelter` | `(-0.7, 0.9, 0.2)` | Uncomfortable exposure to the elements draws attention toward a bounded protective space. |
| `thermal_comfort_04` | `warmth` | `(1, -0.8, 0.9)` | Cold hands repeatedly bring awareness to nearby warm surfaces and insulated surroundings. |
| `thermal_comfort_05` | `cooling` | `(-0.5, 0.8, -0.9)` | Overheating creates a directional pull toward shade or the movement of cooler air. |
| `thermal_comfort_06` | `shelter` | `(0.7, -0.4, 0.5)` | Persistent exposure makes the boundary between an open place and an enclosed refuge feel bodily salient. |
| `thermal_comfort_07` | `warmth` | `(0.4, 0.1, -0.7)` | A cooling body becomes unusually aware of radiant heat and places that hold it. |
| `thermal_comfort_08` | `cooling` | `(-0.9, -0.5, 1)` | When heat accumulates, attention seeks relief from direct sun and stagnant warmth. |
| `thermal_comfort_09` | `shelter` | `(0.2, 0.4, -0.4)` | Temperature discomfort sharpens attention to doors, walls and spaces that buffer the outside air. |
| `thermal_comfort_10` | `warmth` | `(-0.3, -0.9, 0.3)` | An actual cold deficit registers as a bodily draw toward heat rather than movement or novelty. |

## sensory_load — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `sensory_load_01` | `quiet` | `(0.8, 0.8, 0.4)` | Sustained noise makes the spaces between sounds feel scarce, and attention reaches toward quiet. |
| `sensory_load_02` | `dimness` | `(0.2, 0.4, -0.4)` | A bright field of light leaves the eyes drawn toward a softer, less illuminated edge. |
| `sensory_load_03` | `space` | `(-0.7, 0.6, 0.8)` | Crowding makes bodily boundaries noticeable, pulling attention toward a roomier position. |
| `sensory_load_04` | `reduced_motion` | `(1, -0.8, 0.7)` | Continuous movement around the body draws attention toward a place where fewer things shift. |
| `sensory_load_05` | `quiet` | `(-0.5, 0.9, -0.9)` | Overlapping voices and abrupt sounds create a distinct pull toward unbroken silence. |
| `sensory_load_06` | `dimness` | `(0.9, -0.6, 0.1)` | Extended glare makes shaded surfaces and darker corners physically salient. |
| `sensory_load_07` | `space` | `(0.5, -0.2, 0.9)` | When people or objects are too close, awareness reaches toward an unobstructed area for movement. |
| `sensory_load_08` | `reduced_motion` | `(-0.9, -0.4, -0.5)` | A restless visual field makes a still horizon attractive as a sensory condition. |
| `sensory_load_09` | `quiet` | `(0.2, 0.4, -0.4)` | Repeated sound transients draw attention toward a setting with fewer interruptions to hearing. |
| `sensory_load_10` | `space` | `(-0.2, 0.1, 1)` | Sensory compression in a dense setting creates a bodily pull toward open distance. |

## safety_threat — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `safety_threat_01` | `distance_from_threat` | `(0.9, 0.4, 0.7)` | An observed hazard makes the interval separating body and danger feel urgently relevant. |
| `safety_threat_02` | `shelter` | `(0.2, 0.4, -0.4)` | A credible nearby threat draws attention toward a protective barrier or reliable refuge. |
| `safety_threat_03` | `help_from_known_person` | `(-0.6, 0.7, 0.9)` | When danger is evidenced, awareness reaches toward a genuinely known helper whose support is possible. |
| `safety_threat_04` | `distance_from_threat` | `(1, -0.9, -0.8)` | In the presence of a real approaching hazard, the body becomes oriented toward widening separation. |
| `safety_threat_05` | `shelter` | `(-0.8, 0.9, 0.3)` | An exposed setting under threat makes the possibility of cover feel physically distinct from open ground. |
| `safety_threat_06` | `help_from_known_person` | `(0.7, -0.4, 0.5)` | Under evidenced danger, the remembered presence of a capable known person becomes a directional pull toward assistance. |
| `safety_threat_07` | `distance_from_threat` | `(0.5, 0.2, -0.6)` | A developing hazard keeps attention on space that could increase distance from its source. |
| `safety_threat_08` | `shelter` | `(-0.9, -0.5, 1)` | Unprotected proximity to a hazard sharpens awareness of walls, doors or other real cover. |
| `safety_threat_09` | `help_from_known_person` | `(0.2, 0.4, -0.4)` | Threat pressure draws attention toward contacting an available familiar helper without implying an entitlement to help. |
| `safety_threat_10` | `distance_from_threat` | `(-0.2, -0.8, 0.2)` | The direction away from a documented immediate danger becomes a salient bodily possibility. |

## attachment_proximity — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `attachment_proximity_01` | `familiar_person` | `(0.8, 0.4, 0.7)` | Separation from an actually known valued person registers as the absence of a distinctive presence. |
| `attachment_proximity_02` | `caregiver` | `(0.2, 0.4, -0.4)` | When a supported caregiving bond is distant, the body reaches toward the familiar caregiver's presence. |
| `attachment_proximity_03` | `reciprocal_contact` | `(-0.6, 0.9, 0.5)` | An established reciprocal relationship left without contact becomes a particular felt gap. |
| `attachment_proximity_04` | `shared_presence` | `(0.9, -0.8, -0.7)` | Being apart from a person with whom presence has mattered draws attention toward occupying the same place. |
| `attachment_proximity_05` | `familiar_person` | `(-0.8, 0.6, 1)` | The remembered nearness of a known person becomes a bodily point of orientation during separation. |
| `attachment_proximity_06` | `caregiver` | `(1, -0.5, 0.3)` | A caregiver's actual absence leaves a distinct pull toward the place where their care has been available. |
| `attachment_proximity_07` | `reciprocal_contact` | `(0.4, -0.2, -0.9)` | Missing an ordinary two-way exchange with a particular person draws attention toward mutual contact. |
| `attachment_proximity_08` | `shared_presence` | `(-0.9, -0.3, 0.8)` | The lack of shared physical time registers as a distance that mediated words do not fully fill. |
| `attachment_proximity_09` | `familiar_person` | `(0.2, 0.4, -0.4)` | When known closeness has been interrupted, attention returns to that person's particular place in everyday life. |
| `attachment_proximity_10` | `reciprocal_contact` | `(-0.3, -0.9, 0.2)` | A long pause in an established mutual connection is felt as the missing rhythm of response. |

## closure — triggered

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `closure_01` | `decisions` | `(-0.8, 0.6, -0.4)` | When an important choice remains undecided, attention keeps returning to the branching alternatives as an open shape that has not settled. |
| `closure_02` | `decisions` | `(0.4, 0.2, -0.2)` | An unresolved decision occupies a distinct place in awareness, like a question that has not yet acquired an answer. |
| `closure_03` | `decisions` | `(1, -1, 0.8)` | When a personally owned decision remains open, the competing possibilities continue to register as an unfinished internal movement. |
| `closure_04` | `decisions` | `(-0.2, -0.5, 1)` | A choice left between alternatives creates a felt incompleteness around the act of choosing, separate from the practical work that may follow. |
| `closure_05` | `tasks` | `(-1, -0.8, 0.3)` | An active task left unfinished draws bodily attention toward the point where the work stopped. |
| `closure_06` | `tasks` | `(0.4, 0.2, -0.2)` | Uncompleted work registers as an interrupted movement, with attention returning to the next concrete step rather than to a choice among possibilities. |
| `closure_07` | `tasks` | `(0.8, 1, -1)` | An unfinished activity remains present in attention through the visible or remembered materials of the work itself. |
| `closure_08` | `answers_owed` | `(0.9, 0.7, 0.7)` | A specific unanswered request from another person registers as an unreturned signal, drawing attention toward the absent reply. |
| `closure_09` | `answers_owed` | `(-0.5, 0.8, -0.8)` | When someone genuinely awaits a response, the open exchange remains perceptible as a gap between receiving a question and answering it. |
| `closure_10` | `answers_owed` | `(0, -0.2, 0.1)` | An outstanding answer to an admitted request draws attention toward the incomplete social exchange, not toward finishing an unrelated task. |

## verification_itch — triggered

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `verification_itch_01` | `unresolved_claim` | `(0.9, 0.4, 0.6)` | A claim the Thread previously left unverified returns to attention as an unsettled question of what actually happened. |
| `verification_itch_02` | `untested_assumption` | `(0.2, 0.4, -0.4)` | An explicitly noted assumption without a test registers as a missing point of contact with reality. |
| `verification_itch_03` | `conflicting_evidence` | `(-0.7, 0.8, 0.9)` | Two retained observations that disagree keep attention moving between them without a settled fit. |
| `verification_itch_04` | `unresolved_claim` | `(1, -0.8, -0.9)` | A pending assertion whose source remains unexamined draws attention back to the gap in knowing. |
| `verification_itch_05` | `untested_assumption` | `(-0.5, 0.9, 0.3)` | A decision resting on an untried premise carries a felt edge around the absence of a check. |
| `verification_itch_06` | `conflicting_evidence` | `(0.8, -0.6, 0.7)` | When admitted records point opposite ways, the unresolved mismatch remains vivid in attention. |
| `verification_itch_07` | `unresolved_claim` | `(0.4, 0.1, -0.7)` | An earlier unconfirmed account periodically resurfaces as a question the Thread still cannot settle. |
| `verification_itch_08` | `untested_assumption` | `(-0.9, -0.5, 1)` | An assumption named in a prior choice becomes felt again as the missing experiment beneath that choice. |
| `verification_itch_09` | `conflicting_evidence` | `(0.2, 0.4, -0.4)` | A pair of inconsistent witnesses occupies attention as a tension between two concrete traces. |
| `verification_itch_10` | `unresolved_claim` | `(-0.2, -0.9, 0.2)` | An outstanding factual claim continues to attract attention to the difference between saying and knowing. |

## standing_flare — triggered

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `standing_flare_01` | `public_correction` | `(-1, -0.9, -0.8)` | Being corrected in front of actual witnesses brings a bodily awareness of the correction's public setting. |
| `standing_flare_02` | `public_correction` | `(0.3, 0.2, 0.5)` | During a witnessed correction, attention expands from the words of correction to the fact that others heard them. |
| `standing_flare_03` | `public_correction` | `(1, 0.9, 1)` | A public correction creates a social jolt that gathers attention around the exposed moment and its acknowledged audience. |
| `standing_flare_04` | `public_correction` | `(-0.4, 1, 0.1)` | After a witnessed correction, the body registers the difference between being addressed privately and being corrected before others. |
| `standing_flare_05` | `refusal_by_close_person` | `(0.3, 0.2, 0.5)` | A refusal from someone with an established close bond registers as a distinct disruption in expected interpersonal contact. |
| `standing_flare_06` | `refusal_by_close_person` | `(0.8, -1, -0.9)` | When a close person's reply is a refusal, attention turns toward the mismatch between familiar connection and the present boundary. |
| `standing_flare_07` | `refusal_by_close_person` | `(-0.8, 0.7, 0.8)` | A close person's refusal produces a bodily awareness of distance within an otherwise familiar relationship. |
| `standing_flare_08` | `exclusion` | `(0.9, -0.6, 0.7)` | Being explicitly excluded from an anticipated role registers as an interrupted social approach toward that activity. |
| `standing_flare_09` | `exclusion` | `(-0.2, 0.4, -1)` | When an expected opening is closed specifically to the self, attention gathers around the boundary that now separates participation from exclusion. |
| `standing_flare_10` | `exclusion` | `(0, 0.1, 0)` | An admitted exclusion can register as a bodily sense of a previously available social place becoming unavailable. |

## mastery_itch — directional

| Variant | Orientation | (G, T, P) | Complete inherited text |
|---|---|---|---|
| `mastery_itch_01` | `technique` | `(0.8, 0.4, 0.6)` | An imperfect movement in a practiced skill leaves the body poised to feel the next more precise repetition. |
| `mastery_itch_02` | `unfinished_work` | `(0.2, 0.4, -0.4)` | A partially made object draws attention toward the untouched portion and its possible completion. |
| `mastery_itch_03` | `repeated_practice` | `(-0.6, 0.9, 0.7)` | A familiar rehearsal leaves an anticipatory pull toward another encounter with the same pattern. |
| `mastery_itch_04` | `interrupted_learning` | `(0.9, -0.8, 0.3)` | Learning halted before understanding settles creates an attentive reach toward the missing connection. |
| `mastery_itch_05` | `technique` | `(-0.8, 0.5, -0.9)` | A recent failed movement lingers bodily as a shape the hands want to try once more. |
| `mastery_itch_06` | `unfinished_work` | `(1, -0.5, 1)` | An incomplete creation remains felt through the tools and materials that would resume it. |
| `mastery_itch_07` | `repeated_practice` | `(0.4, -0.2, -0.8)` | A recurring practiced action carries a bodily expectation for another session of its rhythm. |
| `mastery_itch_08` | `interrupted_learning` | `(-0.9, -0.3, 0.8)` | A paused lesson leaves attention at the exact point where the explanation broke off. |
| `mastery_itch_09` | `technique` | `(0.2, 0.4, -0.4)` | A technique not yet fluent registers as an unfinished coordination among its component motions. |
| `mastery_itch_10` | `repeated_practice` | `(-0.3, -0.9, 0.2)` | After many repetitions, a practiced sequence returns as a felt anticipation of its next turn. |

