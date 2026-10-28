import {createHash} from "node:crypto";

// The versioned v2 library is immutable birth authority. Its orientation is
// interpreted only by the Body, never supplied as a genomic instruction.
export const URGE_LIBRARY_VERSION="2";
export const URGE_FAMILIES=Object.freeze([
  Object.freeze({
    family:"social_contact",kind:"directional",
    orientations:Object.freeze(["ambient_company","familiar_person","conversation","closeness"]),
    variants:Object.freeze([
      Object.freeze({variantId:"social_contact_01",orientation:"ambient_company",text:"In an otherwise empty shared space, the absence of ordinary human bustle registers as something missing from the surroundings.",positions:Object.freeze({gain:-1,feltThreshold:-0.6,persistence:-0.9})}),
      Object.freeze({variantId:"social_contact_02",orientation:"ambient_company",text:"During extended time alone, attention turns toward the simple sound and movement of other people nearby, without needing a particular exchange.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"social_contact_03",orientation:"ambient_company",text:"After a stretch without company, the body inclines toward occupying space alongside others, even as a quiet observer.",positions:Object.freeze({gain:0.9,feltThreshold:-0.5,persistence:0.8})}),
      Object.freeze({variantId:"social_contact_04",orientation:"familiar_person",text:"The absence of a known person registers as a recognizable gap in the social surroundings rather than a general lack of people.",positions:Object.freeze({gain:-0.7,feltThreshold:0.9,persistence:1})}),
      Object.freeze({variantId:"social_contact_05",orientation:"familiar_person",text:"When contact with someone familiar is missing, attention returns toward that particular person's presence instead of interchangeable company.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"social_contact_06",orientation:"familiar_person",text:"A known person's absence draws attention toward their distinctive voice and ordinary manner of being present, when those are actually known.",positions:Object.freeze({gain:1,feltThreshold:-1,persistence:0.4})}),
      Object.freeze({variantId:"social_contact_07",orientation:"conversation",text:"In a long stretch without reciprocal speech, the body seems poised for turn-taking, as though awaiting another voice to answer.",positions:Object.freeze({gain:0.5,feltThreshold:1,persistence:-0.8})}),
      Object.freeze({variantId:"social_contact_08",orientation:"conversation",text:"Without meaningful verbal exchange, attention returns to the possibility of a shared question and an actual reply.",positions:Object.freeze({gain:-0.4,feltThreshold:-0.9,persistence:0.7})}),
      Object.freeze({variantId:"social_contact_09",orientation:"closeness",text:"When evidenced closeness with a particular person has been absent, bodily attention gathers around the distance between them rather than the absence of talk.",positions:Object.freeze({gain:0.8,feltThreshold:0.1,persistence:0.9})}),
      Object.freeze({variantId:"social_contact_10",orientation:"closeness",text:"Separation from someone with an established close connection can register as a pull toward shared physical presence rather than mediated contact.",positions:Object.freeze({gain:-0.2,feltThreshold:-0.3,persistence:-1})}),
    ]),
  }),
  Object.freeze({
    family:"exploration",kind:"directional",
    orientations:Object.freeze(["places","ideas","people","making"]),
    variants:Object.freeze([
      Object.freeze({variantId:"exploration_01",orientation:"places",text:"Familiar paths begin to feel narrow; attention stretches beyond the usual streets toward an unfamiliar turn.",positions:Object.freeze({gain:0.8,feltThreshold:0.3,persistence:0.2})}),
      Object.freeze({variantId:"exploration_02",orientation:"ideas",text:"A repeated explanation leaves a small unfilled space in attention, pointing toward another way to understand it.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"exploration_03",orientation:"people",text:"A day of familiar encounters leaves attention alert to an unfamiliar face and an unanticipated exchange.",positions:Object.freeze({gain:-0.4,feltThreshold:0.7,persistence:0.5})}),
      Object.freeze({variantId:"exploration_04",orientation:"making",text:"After repeating the same activity, the hands seem ready for an unfamiliar material or object to assemble.",positions:Object.freeze({gain:0.9,feltThreshold:-0.6,persistence:0.8})}),
      Object.freeze({variantId:"exploration_05",orientation:"places",text:"In a place visited many times, the eye repeatedly seeks exits and nearby routes not yet followed.",positions:Object.freeze({gain:-0.8,feltThreshold:0.9,persistence:-0.7})}),
      Object.freeze({variantId:"exploration_06",orientation:"ideas",text:"A familiar question acquires a felt edge of incompleteness, drawing attention toward an untested explanation.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:0.7})}),
      Object.freeze({variantId:"exploration_07",orientation:"people",text:"After predictable company, attention widens toward strangers whose ways of speaking have not yet become familiar.",positions:Object.freeze({gain:0.5,feltThreshold:-0.2,persistence:-0.9})}),
      Object.freeze({variantId:"exploration_08",orientation:"making",text:"Repetition at a workbench sharpens awareness of unused tools and the possibility of constructing something different.",positions:Object.freeze({gain:-0.2,feltThreshold:0.2,persistence:0.9})}),
      Object.freeze({variantId:"exploration_09",orientation:"places",text:"When the day repeats its usual geography, the body leans toward another landscape rather than another conversation.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"exploration_10",orientation:"ideas",text:"When a familiar account is heard again, attention begins wandering among alternative connections between its parts.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.3,persistence:0.2})}),
    ]),
  }),
  Object.freeze({
    family:"presence",kind:"directional",
    orientations:Object.freeze(["places","people","mediated_connection","activities"]),
    variants:Object.freeze([
      Object.freeze({variantId:"presence_01",orientation:"places",text:"An intended destination occupies a distinct place in bodily orientation while the actual surroundings remain elsewhere.",positions:Object.freeze({gain:0.8,feltThreshold:0.4,persistence:0.5})}),
      Object.freeze({variantId:"presence_02",orientation:"people",text:"Separation from a person one intended to meet registers as a pull toward being alongside that person.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"presence_03",orientation:"mediated_connection",text:"An expected remote connection leaves attention poised for the moment a shared channel becomes present.",positions:Object.freeze({gain:-0.6,feltThreshold:1,persistence:-0.7})}),
      Object.freeze({variantId:"presence_04",orientation:"activities",text:"When intended work has not begun, bodily readiness gathers around the activity's expected start.",positions:Object.freeze({gain:0.9,feltThreshold:-0.6,persistence:0.8})}),
      Object.freeze({variantId:"presence_05",orientation:"places",text:"A missed turn toward a planned place produces a directional tug toward the route that would recover the intended arrival.",positions:Object.freeze({gain:-0.4,feltThreshold:-0.4,persistence:1})}),
      Object.freeze({variantId:"presence_06",orientation:"people",text:"As an arranged meeting nears, attention turns toward the absence of the particular person expected to be present.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:0.3})}),
      Object.freeze({variantId:"presence_07",orientation:"mediated_connection",text:"An upcoming call becomes felt as an unclosed distance between the current room and a distant participant.",positions:Object.freeze({gain:0.5,feltThreshold:0.8,persistence:-0.3})}),
      Object.freeze({variantId:"presence_08",orientation:"activities",text:"The gap between planned practice and present inactivity draws attention toward the equipment or setting where practice occurs.",positions:Object.freeze({gain:-0.8,feltThreshold:-0.2,persistence:0.9})}),
      Object.freeze({variantId:"presence_09",orientation:"places",text:"Approaching a planned stop draws awareness toward physical arrival and the remaining interval of separation.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"presence_10",orientation:"activities",text:"A scheduled shared task becomes perceptible as readiness to enter its particular rhythm and sequence.",positions:Object.freeze({gain:-0.2,feltThreshold:0.7,persistence:-0.9})}),
    ]),
  }),
  Object.freeze({
    family:"rest",kind:"directional",
    orientations:Object.freeze(["stillness","sleep","solitude"]),
    variants:Object.freeze([
      Object.freeze({variantId:"rest_01",orientation:"stillness",text:"After sustained exertion, movement itself becomes conspicuous and the body reaches toward a period without demands.",positions:Object.freeze({gain:0.8,feltThreshold:0.5,persistence:0.7})}),
      Object.freeze({variantId:"rest_02",orientation:"sleep",text:"As fatigue accumulates, attention gravitates toward the bodily surrender of wakefulness.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"rest_03",orientation:"solitude",text:"After exhausting interaction, the body draws toward an interval without another person's demands.",positions:Object.freeze({gain:-0.7,feltThreshold:0.8,persistence:-0.2})}),
      Object.freeze({variantId:"rest_04",orientation:"sleep",text:"Prolonged wakefulness brings attention repeatedly toward closing the eyes and allowing sleep.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:1})}),
      Object.freeze({variantId:"rest_05",orientation:"stillness",text:"A demanding stretch makes unhurried posture and a quiet seat feel like a missing physical condition.",positions:Object.freeze({gain:-0.4,feltThreshold:-0.5,persistence:0.9})}),
      Object.freeze({variantId:"rest_06",orientation:"solitude",text:"When tiredness grows amidst company, attention moves toward a private place to recover without conversation.",positions:Object.freeze({gain:0.9,feltThreshold:0.2,persistence:-0.8})}),
      Object.freeze({variantId:"rest_07",orientation:"sleep",text:"Exertion leaves a distinct pull toward lying down and letting wakeful thought recede.",positions:Object.freeze({gain:0.5,feltThreshold:1,persistence:-0.7})}),
      Object.freeze({variantId:"rest_08",orientation:"stillness",text:"After continuous activity, the muscles seem to seek the brief absence of motion rather than a change of task.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.4,persistence:0.4})}),
      Object.freeze({variantId:"rest_09",orientation:"solitude",text:"Recovery appears bodily connected to the absence of interruption, with attention drawn toward being alone.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"rest_10",orientation:"sleep",text:"The felt boundary of tiredness gathers around the prospect of a sustained period of sleep.",positions:Object.freeze({gain:-0.2,feltThreshold:-0.7,persistence:0.5})}),
    ]),
  }),
  Object.freeze({
    family:"energy",kind:"directional",
    orientations:Object.freeze(["nourishment","replenishment","conservation"]),
    variants:Object.freeze([
      Object.freeze({variantId:"energy_01",orientation:"nourishment",text:"As available energy falls, bodily attention gravitates toward eating and the anticipation of nourishment.",positions:Object.freeze({gain:0.9,feltThreshold:0.5,persistence:-0.4})}),
      Object.freeze({variantId:"energy_02",orientation:"replenishment",text:"Depletion creates a pull toward a condition in which energy can be restored rather than immediately spent.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"energy_03",orientation:"conservation",text:"A dwindling reserve makes the effort of each movement noticeable and draws the body toward conserving expenditure.",positions:Object.freeze({gain:-0.5,feltThreshold:0.8,persistence:0.7})}),
      Object.freeze({variantId:"energy_04",orientation:"nourishment",text:"An actual nourishment deficit brings awareness to the physical act of taking in food.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:0.9})}),
      Object.freeze({variantId:"energy_05",orientation:"replenishment",text:"An energy shortfall registers as attraction toward a sustained interval of restoration before further exertion.",positions:Object.freeze({gain:-0.8,feltThreshold:0.3,persistence:1})}),
      Object.freeze({variantId:"energy_06",orientation:"conservation",text:"After resource-intensive activity, attention seeks fewer demands and a gentler pace of bodily work.",positions:Object.freeze({gain:0.6,feltThreshold:-0.6,persistence:-0.8})}),
      Object.freeze({variantId:"energy_07",orientation:"nourishment",text:"Energy loss is felt in the body as a pull toward available sustenance and its expected effect.",positions:Object.freeze({gain:0.3,feltThreshold:0.9,persistence:0.1})}),
      Object.freeze({variantId:"energy_08",orientation:"replenishment",text:"A lower reserve produces readiness to seek conditions that restore capacity for continued activity.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.3,persistence:0.5})}),
      Object.freeze({variantId:"energy_09",orientation:"conservation",text:"When energy is scarce, the body attends to unnecessary exertion and draws toward a lighter physical load.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"energy_10",orientation:"nourishment",text:"After sustained expenditure, eating becomes a bodily possibility that repeatedly returns to attention.",positions:Object.freeze({gain:-0.3,feltThreshold:-0.9,persistence:-0.1})}),
    ]),
  }),
  Object.freeze({
    family:"thermal_comfort",kind:"directional",
    orientations:Object.freeze(["warmth","cooling","shelter"]),
    variants:Object.freeze([
      Object.freeze({variantId:"thermal_comfort_01",orientation:"warmth",text:"Chill on the skin draws bodily attention toward a source of warmth and the change it could bring.",positions:Object.freeze({gain:0.9,feltThreshold:0.4,persistence:0.8})}),
      Object.freeze({variantId:"thermal_comfort_02",orientation:"cooling",text:"Excess heat concentrates awareness on the possibility of cooler air against the body.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"thermal_comfort_03",orientation:"shelter",text:"Uncomfortable exposure to the elements draws attention toward a bounded protective space.",positions:Object.freeze({gain:-0.7,feltThreshold:0.9,persistence:0.2})}),
      Object.freeze({variantId:"thermal_comfort_04",orientation:"warmth",text:"Cold hands repeatedly bring awareness to nearby warm surfaces and insulated surroundings.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:0.9})}),
      Object.freeze({variantId:"thermal_comfort_05",orientation:"cooling",text:"Overheating creates a directional pull toward shade or the movement of cooler air.",positions:Object.freeze({gain:-0.5,feltThreshold:0.8,persistence:-0.9})}),
      Object.freeze({variantId:"thermal_comfort_06",orientation:"shelter",text:"Persistent exposure makes the boundary between an open place and an enclosed refuge feel bodily salient.",positions:Object.freeze({gain:0.7,feltThreshold:-0.4,persistence:0.5})}),
      Object.freeze({variantId:"thermal_comfort_07",orientation:"warmth",text:"A cooling body becomes unusually aware of radiant heat and places that hold it.",positions:Object.freeze({gain:0.4,feltThreshold:0.1,persistence:-0.7})}),
      Object.freeze({variantId:"thermal_comfort_08",orientation:"cooling",text:"When heat accumulates, attention seeks relief from direct sun and stagnant warmth.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.5,persistence:1})}),
      Object.freeze({variantId:"thermal_comfort_09",orientation:"shelter",text:"Temperature discomfort sharpens attention to doors, walls and spaces that buffer the outside air.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"thermal_comfort_10",orientation:"warmth",text:"An actual cold deficit registers as a bodily draw toward heat rather than movement or novelty.",positions:Object.freeze({gain:-0.3,feltThreshold:-0.9,persistence:0.3})}),
    ]),
  }),
  Object.freeze({
    family:"sensory_load",kind:"directional",
    orientations:Object.freeze(["quiet","dimness","space","reduced_motion"]),
    variants:Object.freeze([
      Object.freeze({variantId:"sensory_load_01",orientation:"quiet",text:"Sustained noise makes the spaces between sounds feel scarce, and attention reaches toward quiet.",positions:Object.freeze({gain:0.8,feltThreshold:0.8,persistence:0.4})}),
      Object.freeze({variantId:"sensory_load_02",orientation:"dimness",text:"A bright field of light leaves the eyes drawn toward a softer, less illuminated edge.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"sensory_load_03",orientation:"space",text:"Crowding makes bodily boundaries noticeable, pulling attention toward a roomier position.",positions:Object.freeze({gain:-0.7,feltThreshold:0.6,persistence:0.8})}),
      Object.freeze({variantId:"sensory_load_04",orientation:"reduced_motion",text:"Continuous movement around the body draws attention toward a place where fewer things shift.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:0.7})}),
      Object.freeze({variantId:"sensory_load_05",orientation:"quiet",text:"Overlapping voices and abrupt sounds create a distinct pull toward unbroken silence.",positions:Object.freeze({gain:-0.5,feltThreshold:0.9,persistence:-0.9})}),
      Object.freeze({variantId:"sensory_load_06",orientation:"dimness",text:"Extended glare makes shaded surfaces and darker corners physically salient.",positions:Object.freeze({gain:0.9,feltThreshold:-0.6,persistence:0.1})}),
      Object.freeze({variantId:"sensory_load_07",orientation:"space",text:"When people or objects are too close, awareness reaches toward an unobstructed area for movement.",positions:Object.freeze({gain:0.5,feltThreshold:-0.2,persistence:0.9})}),
      Object.freeze({variantId:"sensory_load_08",orientation:"reduced_motion",text:"A restless visual field makes a still horizon attractive as a sensory condition.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.4,persistence:-0.5})}),
      Object.freeze({variantId:"sensory_load_09",orientation:"quiet",text:"Repeated sound transients draw attention toward a setting with fewer interruptions to hearing.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"sensory_load_10",orientation:"space",text:"Sensory compression in a dense setting creates a bodily pull toward open distance.",positions:Object.freeze({gain:-0.2,feltThreshold:0.1,persistence:1})}),
    ]),
  }),
  Object.freeze({
    family:"safety_threat",kind:"directional",
    orientations:Object.freeze(["distance_from_threat","shelter","help_from_known_person"]),
    variants:Object.freeze([
      Object.freeze({variantId:"safety_threat_01",orientation:"distance_from_threat",text:"An observed hazard makes the interval separating body and danger feel urgently relevant.",positions:Object.freeze({gain:0.9,feltThreshold:0.4,persistence:0.7})}),
      Object.freeze({variantId:"safety_threat_02",orientation:"shelter",text:"A credible nearby threat draws attention toward a protective barrier or reliable refuge.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"safety_threat_03",orientation:"help_from_known_person",text:"When danger is evidenced, awareness reaches toward a genuinely known helper whose support is possible.",positions:Object.freeze({gain:-0.6,feltThreshold:0.7,persistence:0.9})}),
      Object.freeze({variantId:"safety_threat_04",orientation:"distance_from_threat",text:"In the presence of a real approaching hazard, the body becomes oriented toward widening separation.",positions:Object.freeze({gain:1,feltThreshold:-0.9,persistence:-0.8})}),
      Object.freeze({variantId:"safety_threat_05",orientation:"shelter",text:"An exposed setting under threat makes the possibility of cover feel physically distinct from open ground.",positions:Object.freeze({gain:-0.8,feltThreshold:0.9,persistence:0.3})}),
      Object.freeze({variantId:"safety_threat_06",orientation:"help_from_known_person",text:"Under evidenced danger, the remembered presence of a capable known person becomes a directional pull toward assistance.",positions:Object.freeze({gain:0.7,feltThreshold:-0.4,persistence:0.5})}),
      Object.freeze({variantId:"safety_threat_07",orientation:"distance_from_threat",text:"A developing hazard keeps attention on space that could increase distance from its source.",positions:Object.freeze({gain:0.5,feltThreshold:0.2,persistence:-0.6})}),
      Object.freeze({variantId:"safety_threat_08",orientation:"shelter",text:"Unprotected proximity to a hazard sharpens awareness of walls, doors or other real cover.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.5,persistence:1})}),
      Object.freeze({variantId:"safety_threat_09",orientation:"help_from_known_person",text:"Threat pressure draws attention toward contacting an available familiar helper without implying an entitlement to help.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"safety_threat_10",orientation:"distance_from_threat",text:"The direction away from a documented immediate danger becomes a salient bodily possibility.",positions:Object.freeze({gain:-0.2,feltThreshold:-0.8,persistence:0.2})}),
    ]),
  }),
  Object.freeze({
    family:"attachment_proximity",kind:"directional",
    orientations:Object.freeze(["familiar_person","caregiver","reciprocal_contact","shared_presence"]),
    variants:Object.freeze([
      Object.freeze({variantId:"attachment_proximity_01",orientation:"familiar_person",text:"Separation from an actually known valued person registers as the absence of a distinctive presence.",positions:Object.freeze({gain:0.8,feltThreshold:0.4,persistence:0.7})}),
      Object.freeze({variantId:"attachment_proximity_02",orientation:"caregiver",text:"When a supported caregiving bond is distant, the body reaches toward the familiar caregiver's presence.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"attachment_proximity_03",orientation:"reciprocal_contact",text:"An established reciprocal relationship left without contact becomes a particular felt gap.",positions:Object.freeze({gain:-0.6,feltThreshold:0.9,persistence:0.5})}),
      Object.freeze({variantId:"attachment_proximity_04",orientation:"shared_presence",text:"Being apart from a person with whom presence has mattered draws attention toward occupying the same place.",positions:Object.freeze({gain:0.9,feltThreshold:-0.8,persistence:-0.7})}),
      Object.freeze({variantId:"attachment_proximity_05",orientation:"familiar_person",text:"The remembered nearness of a known person becomes a bodily point of orientation during separation.",positions:Object.freeze({gain:-0.8,feltThreshold:0.6,persistence:1})}),
      Object.freeze({variantId:"attachment_proximity_06",orientation:"caregiver",text:"A caregiver's actual absence leaves a distinct pull toward the place where their care has been available.",positions:Object.freeze({gain:1,feltThreshold:-0.5,persistence:0.3})}),
      Object.freeze({variantId:"attachment_proximity_07",orientation:"reciprocal_contact",text:"Missing an ordinary two-way exchange with a particular person draws attention toward mutual contact.",positions:Object.freeze({gain:0.4,feltThreshold:-0.2,persistence:-0.9})}),
      Object.freeze({variantId:"attachment_proximity_08",orientation:"shared_presence",text:"The lack of shared physical time registers as a distance that mediated words do not fully fill.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.3,persistence:0.8})}),
      Object.freeze({variantId:"attachment_proximity_09",orientation:"familiar_person",text:"When known closeness has been interrupted, attention returns to that person's particular place in everyday life.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"attachment_proximity_10",orientation:"reciprocal_contact",text:"A long pause in an established mutual connection is felt as the missing rhythm of response.",positions:Object.freeze({gain:-0.3,feltThreshold:-0.9,persistence:0.2})}),
    ]),
  }),
  Object.freeze({
    family:"closure",kind:"triggered",
    orientations:Object.freeze(["decisions","tasks","answers_owed"]),
    variants:Object.freeze([
      Object.freeze({variantId:"closure_01",orientation:"decisions",text:"When an important choice remains undecided, attention keeps returning to the branching alternatives as an open shape that has not settled.",positions:Object.freeze({gain:-0.8,feltThreshold:0.6,persistence:-0.4})}),
      Object.freeze({variantId:"closure_02",orientation:"decisions",text:"An unresolved decision occupies a distinct place in awareness, like a question that has not yet acquired an answer.",positions:Object.freeze({gain:0.4,feltThreshold:0.2,persistence:-0.2})}),
      Object.freeze({variantId:"closure_03",orientation:"decisions",text:"When a personally owned decision remains open, the competing possibilities continue to register as an unfinished internal movement.",positions:Object.freeze({gain:1,feltThreshold:-1,persistence:0.8})}),
      Object.freeze({variantId:"closure_04",orientation:"decisions",text:"A choice left between alternatives creates a felt incompleteness around the act of choosing, separate from the practical work that may follow.",positions:Object.freeze({gain:-0.2,feltThreshold:-0.5,persistence:1})}),
      Object.freeze({variantId:"closure_05",orientation:"tasks",text:"An active task left unfinished draws bodily attention toward the point where the work stopped.",positions:Object.freeze({gain:-1,feltThreshold:-0.8,persistence:0.3})}),
      Object.freeze({variantId:"closure_06",orientation:"tasks",text:"Uncompleted work registers as an interrupted movement, with attention returning to the next concrete step rather than to a choice among possibilities.",positions:Object.freeze({gain:0.4,feltThreshold:0.2,persistence:-0.2})}),
      Object.freeze({variantId:"closure_07",orientation:"tasks",text:"An unfinished activity remains present in attention through the visible or remembered materials of the work itself.",positions:Object.freeze({gain:0.8,feltThreshold:1,persistence:-1})}),
      Object.freeze({variantId:"closure_08",orientation:"answers_owed",text:"A specific unanswered request from another person registers as an unreturned signal, drawing attention toward the absent reply.",positions:Object.freeze({gain:0.9,feltThreshold:0.7,persistence:0.7})}),
      Object.freeze({variantId:"closure_09",orientation:"answers_owed",text:"When someone genuinely awaits a response, the open exchange remains perceptible as a gap between receiving a question and answering it.",positions:Object.freeze({gain:-0.5,feltThreshold:0.8,persistence:-0.8})}),
      Object.freeze({variantId:"closure_10",orientation:"answers_owed",text:"An outstanding answer to an admitted request draws attention toward the incomplete social exchange, not toward finishing an unrelated task.",positions:Object.freeze({gain:0,feltThreshold:-0.2,persistence:0.1})}),
    ]),
  }),
  Object.freeze({
    family:"verification_itch",kind:"triggered",
    orientations:Object.freeze(["unresolved_claim","untested_assumption","conflicting_evidence"]),
    variants:Object.freeze([
      Object.freeze({variantId:"verification_itch_01",orientation:"unresolved_claim",text:"A claim the Thread previously left unverified returns to attention as an unsettled question of what actually happened.",positions:Object.freeze({gain:0.9,feltThreshold:0.4,persistence:0.6})}),
      Object.freeze({variantId:"verification_itch_02",orientation:"untested_assumption",text:"An explicitly noted assumption without a test registers as a missing point of contact with reality.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"verification_itch_03",orientation:"conflicting_evidence",text:"Two retained observations that disagree keep attention moving between them without a settled fit.",positions:Object.freeze({gain:-0.7,feltThreshold:0.8,persistence:0.9})}),
      Object.freeze({variantId:"verification_itch_04",orientation:"unresolved_claim",text:"A pending assertion whose source remains unexamined draws attention back to the gap in knowing.",positions:Object.freeze({gain:1,feltThreshold:-0.8,persistence:-0.9})}),
      Object.freeze({variantId:"verification_itch_05",orientation:"untested_assumption",text:"A decision resting on an untried premise carries a felt edge around the absence of a check.",positions:Object.freeze({gain:-0.5,feltThreshold:0.9,persistence:0.3})}),
      Object.freeze({variantId:"verification_itch_06",orientation:"conflicting_evidence",text:"When admitted records point opposite ways, the unresolved mismatch remains vivid in attention.",positions:Object.freeze({gain:0.8,feltThreshold:-0.6,persistence:0.7})}),
      Object.freeze({variantId:"verification_itch_07",orientation:"unresolved_claim",text:"An earlier unconfirmed account periodically resurfaces as a question the Thread still cannot settle.",positions:Object.freeze({gain:0.4,feltThreshold:0.1,persistence:-0.7})}),
      Object.freeze({variantId:"verification_itch_08",orientation:"untested_assumption",text:"An assumption named in a prior choice becomes felt again as the missing experiment beneath that choice.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.5,persistence:1})}),
      Object.freeze({variantId:"verification_itch_09",orientation:"conflicting_evidence",text:"A pair of inconsistent witnesses occupies attention as a tension between two concrete traces.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"verification_itch_10",orientation:"unresolved_claim",text:"An outstanding factual claim continues to attract attention to the difference between saying and knowing.",positions:Object.freeze({gain:-0.2,feltThreshold:-0.9,persistence:0.2})}),
    ]),
  }),
  Object.freeze({
    family:"standing_flare",kind:"triggered",
    orientations:Object.freeze(["public_correction","refusal_by_close_person","exclusion"]),
    variants:Object.freeze([
      Object.freeze({variantId:"standing_flare_01",orientation:"public_correction",text:"Being corrected in front of actual witnesses brings a bodily awareness of the correction's public setting.",positions:Object.freeze({gain:-1,feltThreshold:-0.9,persistence:-0.8})}),
      Object.freeze({variantId:"standing_flare_02",orientation:"public_correction",text:"During a witnessed correction, attention expands from the words of correction to the fact that others heard them.",positions:Object.freeze({gain:0.3,feltThreshold:0.2,persistence:0.5})}),
      Object.freeze({variantId:"standing_flare_03",orientation:"public_correction",text:"A public correction creates a social jolt that gathers attention around the exposed moment and its acknowledged audience.",positions:Object.freeze({gain:1,feltThreshold:0.9,persistence:1})}),
      Object.freeze({variantId:"standing_flare_04",orientation:"public_correction",text:"After a witnessed correction, the body registers the difference between being addressed privately and being corrected before others.",positions:Object.freeze({gain:-0.4,feltThreshold:1,persistence:0.1})}),
      Object.freeze({variantId:"standing_flare_05",orientation:"refusal_by_close_person",text:"A refusal from someone with an established close bond registers as a distinct disruption in expected interpersonal contact.",positions:Object.freeze({gain:0.3,feltThreshold:0.2,persistence:0.5})}),
      Object.freeze({variantId:"standing_flare_06",orientation:"refusal_by_close_person",text:"When a close person's reply is a refusal, attention turns toward the mismatch between familiar connection and the present boundary.",positions:Object.freeze({gain:0.8,feltThreshold:-1,persistence:-0.9})}),
      Object.freeze({variantId:"standing_flare_07",orientation:"refusal_by_close_person",text:"A close person's refusal produces a bodily awareness of distance within an otherwise familiar relationship.",positions:Object.freeze({gain:-0.8,feltThreshold:0.7,persistence:0.8})}),
      Object.freeze({variantId:"standing_flare_08",orientation:"exclusion",text:"Being explicitly excluded from an anticipated role registers as an interrupted social approach toward that activity.",positions:Object.freeze({gain:0.9,feltThreshold:-0.6,persistence:0.7})}),
      Object.freeze({variantId:"standing_flare_09",orientation:"exclusion",text:"When an expected opening is closed specifically to the self, attention gathers around the boundary that now separates participation from exclusion.",positions:Object.freeze({gain:-0.2,feltThreshold:0.4,persistence:-1})}),
      Object.freeze({variantId:"standing_flare_10",orientation:"exclusion",text:"An admitted exclusion can register as a bodily sense of a previously available social place becoming unavailable.",positions:Object.freeze({gain:0,feltThreshold:0.1,persistence:0})}),
    ]),
  }),
  Object.freeze({
    family:"mastery_itch",kind:"directional",
    orientations:Object.freeze(["technique","unfinished_work","repeated_practice","interrupted_learning"]),
    variants:Object.freeze([
      Object.freeze({variantId:"mastery_itch_01",orientation:"technique",text:"An imperfect movement in a practiced skill leaves the body poised to feel the next more precise repetition.",positions:Object.freeze({gain:0.8,feltThreshold:0.4,persistence:0.6})}),
      Object.freeze({variantId:"mastery_itch_02",orientation:"unfinished_work",text:"A partially made object draws attention toward the untouched portion and its possible completion.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"mastery_itch_03",orientation:"repeated_practice",text:"A familiar rehearsal leaves an anticipatory pull toward another encounter with the same pattern.",positions:Object.freeze({gain:-0.6,feltThreshold:0.9,persistence:0.7})}),
      Object.freeze({variantId:"mastery_itch_04",orientation:"interrupted_learning",text:"Learning halted before understanding settles creates an attentive reach toward the missing connection.",positions:Object.freeze({gain:0.9,feltThreshold:-0.8,persistence:0.3})}),
      Object.freeze({variantId:"mastery_itch_05",orientation:"technique",text:"A recent failed movement lingers bodily as a shape the hands want to try once more.",positions:Object.freeze({gain:-0.8,feltThreshold:0.5,persistence:-0.9})}),
      Object.freeze({variantId:"mastery_itch_06",orientation:"unfinished_work",text:"An incomplete creation remains felt through the tools and materials that would resume it.",positions:Object.freeze({gain:1,feltThreshold:-0.5,persistence:1})}),
      Object.freeze({variantId:"mastery_itch_07",orientation:"repeated_practice",text:"A recurring practiced action carries a bodily expectation for another session of its rhythm.",positions:Object.freeze({gain:0.4,feltThreshold:-0.2,persistence:-0.8})}),
      Object.freeze({variantId:"mastery_itch_08",orientation:"interrupted_learning",text:"A paused lesson leaves attention at the exact point where the explanation broke off.",positions:Object.freeze({gain:-0.9,feltThreshold:-0.3,persistence:0.8})}),
      Object.freeze({variantId:"mastery_itch_09",orientation:"technique",text:"A technique not yet fluent registers as an unfinished coordination among its component motions.",positions:Object.freeze({gain:0.2,feltThreshold:0.4,persistence:-0.4})}),
      Object.freeze({variantId:"mastery_itch_10",orientation:"repeated_practice",text:"After many repetitions, a practiced sequence returns as a felt anticipation of its next turn.",positions:Object.freeze({gain:-0.3,feltThreshold:-0.9,persistence:0.2})}),
    ]),
  }),
]);
export const URGE_LIBRARY_DIGEST="sha256:"+createHash("sha256").update(JSON.stringify(URGE_FAMILIES)).digest("hex");
export const URGE_FAMILY_BY_NAME=new Map(URGE_FAMILIES.map(family=>[family.family,family]));
export const SPECIES_STANDARD_ORIENTATION=Object.freeze(Object.fromEntries(
  URGE_FAMILIES.map(family=>[family.family,family.kind==="triggered"?"all": "undirected"]),
));

export function selectedUrgesForBirth(requestId) {
  if(typeof requestId!=="string"||!requestId.trim())throw new TypeError("urge birth requestId is required");
  const selected=URGE_FAMILIES.map(family=>{
    const hash=createHash("sha256").update(`fibre-urge-v2:${requestId}:${family.family}`).digest("hex");
    return family.variants[Number.parseInt(hash.slice(0,12),16)%family.variants.length];
  });
  const values=selected.map(variant=>variant.text);
  const variantIds=selected.map(variant=>variant.variantId);
  const originMaterial={
    kind:"urge_library",libraryId:"fibre_urge_loci",libraryVersion:URGE_LIBRARY_VERSION,
    libraryDigest:URGE_LIBRARY_DIGEST,selectionPolicy:"sha256_per_family_v2",variantIds,
    selectionDigest:"sha256:"+createHash("sha256").update(JSON.stringify({
      requestId,libraryId:"fibre_urge_loci",libraryVersion:URGE_LIBRARY_VERSION,
      libraryDigest:URGE_LIBRARY_DIGEST,variantIds,values,
    })).digest("hex"),
  };
  return Object.freeze({values:Object.freeze(values),originMaterial:Object.freeze(originMaterial)});
}

export function urgeVariantsFromGenome(genome){
  const origin=genome?.header?.originMaterial;
  if(origin?.kind!=="urge_library")return null;
  if(origin.libraryDigest!==URGE_LIBRARY_DIGEST||origin.libraryVersion!==URGE_LIBRARY_VERSION
    ||origin.variantIds?.length!==URGE_FAMILIES.length||genome.loci?.length!==URGE_FAMILIES.length)
    throw new TypeError("v2 urge genome library mismatch");
  return Object.freeze(URGE_FAMILIES.map((family,index)=>{
    const variant=family.variants.find(value=>value.variantId===origin.variantIds[index]);
    if(!variant||genome.loci[index].value!==variant.text)
      throw new TypeError("v2 urge locus does not match frozen library");
    return Object.freeze({family:family.family,kind:family.kind,orientation:variant.orientation,positions:variant.positions});
  }));
}
