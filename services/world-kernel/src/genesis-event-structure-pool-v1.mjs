import { createEventStructure, eventStructurePoolDigest } from "./genesis-pass-a-domain.mjs";

const WITNESS_FRAMES = Object.freeze([
  Object.freeze({
    era: "late_19th_century",
    economy: "smallholder_agriculture",
    culture: "multi_generational_mountain_village",
  }),
  Object.freeze({
    era: "late_20th_century",
    economy: "industrial_wage_port_city",
    culture: "dense_multilingual_urban_neighborhood",
  }),
  Object.freeze({
    era: "early_21st_century",
    economy: "service_and_digital_economy",
    culture: "transit_connected_mixed_household_metro",
  }),
]);

function witnesses(instantiations) {
  if (!Array.isArray(instantiations) || instantiations.length !== WITNESS_FRAMES.length) {
    throw new TypeError("EventStructure witness definitions must match the three relocation frames");
  }
  return WITNESS_FRAMES.map((frame, index) => ({ ...frame, instantiation: instantiations[index] }));
}

function structure({ structureId, abstractSituation, consequenceClass, participatingRoles = [], instantiations }) {
  return createEventStructure({
    structureId,
    abstractSituation,
    participatingRoles,
    developmentalRange: { minAge: 5, maxAge: 18 },
    consequenceClass,
    instantiationWitnesses: witnesses(instantiations),
    sourceDerivation: "Fibre-authored abstract situation; relocation witnesses establish portability and are provenance-only.",
  });
}

export const GENESIS_EVENT_STRUCTURE_POOL_V1 = Object.freeze([
  structure({
    structureId: "ges_routine_plan_shift",
    consequenceClass: "low",
    abstractSituation: "an ordinary plan changes for a practical reason and creates unplanned waiting, rerouting, or rescheduling",
    instantiations: [
      "A family waits an extra afternoon for a cart because rain has made the mountain track impassable.",
      "A bus route closes for roadwork, so neighbors wait together and take a longer route to an after-school activity.",
      "A transit outage changes the route to a library visit, leaving an unscheduled hour at a station plaza.",
    ],
  }),
  structure({
    structureId: "ges_minor_object_problem",
    consequenceClass: "low",
    abstractSituation: "a familiar object needed for an ordinary task is lost, damaged, or temporarily unavailable",
    instantiations: [
      "A water pail splits before the evening household collection and another container has to be borrowed.",
      "A bicycle chain slips off on the way to a neighborhood errand and two people stop to put it back on.",
      "A school tablet will not charge before an ordinary assignment and the student uses a shared terminal instead.",
    ],
  }),
  structure({
    structureId: "ges_small_help_request",
    consequenceClass: "low",
    abstractSituation: "someone asks the young person to assist with a minor practical task that could also be done by another person",
    participatingRoles: ["household_member"],
    instantiations: [
      "A relative asks the child to sort beans while several adults prepare the evening meal.",
      "A neighbor asks for help carrying folded chairs from a community room after a meeting.",
      "A household member asks the child to bring a parcel downstairs while preparing dinner.",
    ],
  }),
  structure({
    structureId: "ges_ordinary_exchange",
    consequenceClass: "low",
    abstractSituation: "the young person lends, borrows, trades, returns, or shares an everyday object or small favor",
    participatingRoles: ["peer"],
    instantiations: [
      "Two children exchange a knife-sharpening stone and a basket for the afternoon and return both before supper.",
      "Two classmates trade comic books for the weekend and compare which pages were already torn.",
      "Two students lend each other a charging cable and a transit card during separate parts of the school day.",
    ],
  }),
  structure({
    structureId: "ges_shared_routine_task",
    consequenceClass: "low",
    abstractSituation: "several people coordinate an ordinary shared task with no serious consequence if it goes imperfectly",
    participatingRoles: ["peer"],
    instantiations: [
      "Several children stack harvested kindling by size and have to redo one leaning pile.",
      "Students set up tables for a neighborhood meal and discover they have placed too many chairs on one side.",
      "A small group sorts returned library materials and has to redo one shelf after using the wrong labels.",
    ],
  }),
  structure({
    structureId: "ges_adult_resolves_without_consulting",
    consequenceClass: "moderate",
    abstractSituation: "an adult resolves a young person's practical difficulty without consulting the young person about the chosen solution",
    participatingRoles: ["responsible_adult"],
    instantiations: [
      "An uncle replaces a child's damaged work basket with a cousin's spare before the child returns from the fields.",
      "A teacher changes a student's project group after a scheduling problem without asking which group the student prefers.",
      "A program coordinator moves a student's workshop registration to another day to solve a capacity conflict without checking first.",
    ],
  }),
  structure({
    structureId: "ges_conflicting_factual_accounts",
    consequenceClass: "moderate",
    abstractSituation: "two familiar people give incompatible factual accounts of the same recent event",
    participatingRoles: ["household_member", "peer"],
    instantiations: [
      "Two relatives disagree about which animal broke a boundary fence and point to different tracks.",
      "Two classmates give different accounts of who moved equipment before a community game.",
      "Two friends remember a school-club meeting differently and disagree about what deadline was announced.",
    ],
  }),
  structure({
    structureId: "ges_rule_applied_differently",
    consequenceClass: "moderate",
    abstractSituation: "a household or institution applies an ordinary rule differently across two otherwise similar cases",
    participatingRoles: ["responsible_adult", "peer"],
    instantiations: [
      "Two children return late from neighboring farms, but only one is assigned an extra household chore.",
      "Two students arrive after the same bell, but one is admitted to class while the other is sent to the office.",
      "Two club members miss the same registration deadline, but only one is allowed to join the session.",
    ],
  }),
  structure({
    structureId: "ges_familiar_person_temporarily_absent",
    consequenceClass: "moderate",
    abstractSituation: "a familiar person is temporarily absent during a routine period, changing who handles ordinary responsibilities",
    participatingRoles: ["household_member"],
    instantiations: [
      "A grandparent stays several days in another village, so different relatives divide the morning animal care.",
      "A parent works a week of night shifts, so an older sibling handles the walk home and evening groceries.",
      "A caregiver travels for several days, so school pickup and meals rotate among relatives and neighbors.",
    ],
  }),
  structure({
    structureId: "ges_material_move_or_transition",
    consequenceClass: "formative_capable",
    abstractSituation: "the young person enters a new neighborhood, school, community, or institution after a material change in circumstances",
    participatingRoles: ["responsible_adult", "peer"],
    instantiations: [
      "A household moves from an upland hamlet to a river market settlement and the child starts attending a different seasonal school.",
      "A factory transfer moves a family across the city and the child begins at a new public school midyear.",
      "A rent increase moves a household to another transit district and the student joins a different neighborhood school.",
    ],
  }),
  structure({
    structureId: "ges_caregiver_unavailable_during_problem",
    consequenceClass: "formative_capable",
    abstractSituation: "a usual responsible adult is unavailable when a significant practical problem has to be handled",
    participatingRoles: ["responsible_adult"],
    instantiations: [
      "A storm delays the adults returning from market while a roof leak begins over stored grain and older children fetch nearby help.",
      "A parent cannot leave a factory shift when a younger sibling is injured at school, so another relative meets the children at the clinic.",
      "A caregiver is unreachable during a building water shutdown, so the young person and a neighbor arrange temporary supplies for the household.",
    ],
  }),
  structure({
    structureId: "ges_visible_mistake_in_shared_activity",
    consequenceClass: "formative_capable",
    abstractSituation: "the young person's avoidable mistake becomes visible to other participants during a shared activity",
    participatingRoles: ["peer", "responsible_adult"],
    instantiations: [
      "A child knots a load incorrectly and several bundles spill while neighbors are preparing a shared cart.",
      "A student reads the wrong starting time and arrives after the rest of a music group has begun a public rehearsal.",
      "A student uploads an outdated file during a group presentation and the mismatch appears on the shared screen.",
    ],
  }),
]);

export const GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST = eventStructurePoolDigest(GENESIS_EVENT_STRUCTURE_POOL_V1);
