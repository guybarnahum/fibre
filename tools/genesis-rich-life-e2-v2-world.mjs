import { normalizeGenesisWorldSpec } from "../services/world-kernel/src/genesis-domain.mjs";

const authoredAt = "2026-08-19T23:42:00Z";

function world(candidate) {
  return Object.freeze(normalizeGenesisWorldSpec(candidate));
}

export const E2_V2_WORLD_AUTHORING_RECORD = Object.freeze({
  version: "pr39-slice-e2-v2-world-authoring-record-v1",
  recordedBeforeFirstModelUse: true,
  authorKnowledgeAtRecordTime: Object.freeze([
    "E2-V1 generation and N1-on-A0 results were already known when E2-V2 was authored.",
    "The old Pass-B epistemic/detection framing defect and its not_remembered pattern were already known.",
  ]),
  differencesFromE2V1: Object.freeze([
    "Household composition changes from one caregiver plus grandparent and younger sibling to two caregivers plus an older cousin.",
    "Daily mobility changes from tram/bicycle emphasis to bus/walking with occasional rides from relatives.",
    "The public-space mix changes from community workshop, tram loop and river fields to branch library/civic hall, bus-market interchange and canalside park.",
    "The bilingual context changes from English/Arabic to English/Tagalog.",
    "The calendar shifts later while preserving the same ordinary childhood-through-adolescence age span and urban public-institution access pattern.",
  ]),
  reasonForDifferences: "Create a second ordinary, source-free developmental substrate that is materially distinct from E2-V1 while preserving comparable access constraints. The changes were not selected to target any known remembered/not_remembered episode, desired adult identity, target personality, genome signal, or N2 score.",
  knownConfoundDisclosure: "The author could not unsee E2-V1 or the failed N1-on-A0 run. This record makes that author-after-observation fact explicit; N2 therefore remains development evidence rather than an independent population sample.",
});

// E2-V2 is a second source-free fresh world for the corrected Pass-B N2 instrument.
// Its role is only to supply three additional A0 lives so the 18-trial protocol can
// be frozen against six source lives. First model use burns the world.
export const E2_V2_WORLD = world({
  worldSpecId: "world_slice_e2_v2_fresh_burned_on_first_use",
  timeFrame: {
    startAt: "1991-01-01T00:00:00Z",
    endAt: "2018-12-31T23:59:59Z",
  },
  places: [
    {
      placeId: "place_e2_v2_home_walkup",
      description: "A small second-floor flat above ordinary neighborhood shops, with a narrow kitchen table used for meals, homework, repairs and household paperwork and a shared rear stair where residents leave bicycles and carts.",
    },
    {
      placeId: "place_e2_v2_school",
      description: "A public school with standard classrooms, a library room, science benches, a music room, outdoor courts and after-school activities that depend on staff availability and family schedules.",
    },
    {
      placeId: "place_e2_v2_bus_market",
      description: "A municipal bus interchange beside an indoor produce market, pharmacy, copy shop and small food stalls, with posted service notices, ticket kiosks and frequent changes in crowding through the day.",
    },
    {
      placeId: "place_e2_v2_library_civic",
      description: "A branch library connected to a modest civic hall, with borrowing shelves, newspapers, public computers, notice boards, study tables, occasional workshops and community meetings.",
    },
    {
      placeId: "place_e2_v2_canalside_park",
      description: "A public linear park beside a flood-control canal, with basketball courts, community garden plots, benches, a footbridge, maintenance sheds and paths used for walking, cycling and informal gatherings.",
    },
  ],
  householdShape: "Two caregivers, the subject and an older cousin share the flat; one caregiver works irregular shifts and the other combines part-time work with most household scheduling, so responsibilities move between family members from week to week.",
  familyRelations: [
    "The older cousin is six years older than the subject and sometimes helps with school pickup, meals or errands without acting as a parent.",
    "One caregiver has siblings elsewhere in the city who are seen occasionally but are not part of the daily household.",
    "Household decisions about money, transport and schedules are usually discussed openly because small changes affect everyone.",
  ],
  languages: ["English", "Tagalog"],
  materialCircumstances: "The household is stable but budget-conscious, rents its home, uses public transport, buys many ordinary goods from neighborhood shops and the market, and tends to repair or share things before replacing them.",
  mobilityPattern: "Most travel is on foot or by city bus, with occasional rides from relatives; school, market, library and park are reachable without a car, but shift work, missed buses, rain and household errands regularly change plans.",
  schoolingOrCommunityContext: "School, the branch library, market, civic hall and canalside park provide overlapping peer and adult settings; participation in clubs, public events and workshops is available but contingent on timing, cost and ordinary family obligations.",
  culturalContext: "The neighborhood includes families with different migration histories, languages, occupations and religious practices, along with long-term residents, small merchants, civic groups and routine disagreement about public space, school activities and neighborhood changes.",
  availableInstitutions: [
    "public_school",
    "branch_library",
    "municipal_bus",
    "public_market",
    "civic_hall",
    "public_park",
    "community_garden",
  ],
  intellectualEnvironment: "School lessons, library books and newspapers, transit notices, market price signs, repair manuals, public computers, family discussions, civic meetings, music rehearsals, community workshops and religious or philosophical materials are available unevenly; no topic, conclusion or later identity is mandatory.",
  affordedRoles: [
    "caregiver",
    "extended_family",
    "peer",
    "teacher",
    "neighbor",
    "librarian",
    "mentor",
    "shopkeeper",
  ],
  worldAuthorship: {
    authorId: "fibre_slice_e2_n2_validation",
    sourcesConsulted: [],
    abstractionMethod: "Source-free synthetic fresh world authored after the Pass-B formation-semantics defect was identified, without access to a validation genome, named source person, target personality, target adult role or N2 output. Relative to E2-V1 it deliberately changes household composition, transit mode, public-space mix, bilingual context and calendar to create a materially distinct ordinary substrate; those changes were not selected to target known remembered/not_remembered episodes or a desired score.",
    relocationWitness: "The fixture can be relocated to another dense transit-served neighborhood with a public school, market, library/civic space and public park while preserving household scheduling and access constraints without preserving any intended character outcome.",
    familiarityProbe: null,
    createdAt: authoredAt,
  },
  createdAt: authoredAt,
});

export const E2_V2_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_e2_v2_001",
  bornAt: "1994-09-03T00:00:00Z",
});

export const E2_V2_SPAN = Object.freeze({
  windowId: "e2_v2_childhood_through_adolescence",
  startAt: "2000-09-03T00:00:00Z",
  endAt: "2012-09-02T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

export const E2_V2_ROSTER = Object.freeze([
  {
    participantId: E2_V2_SUBJECT.provisionalThreadId,
    factualRoles: ["subject"],
    relationshipFacts: ["This is the provisional Thread whose prior life is being generated."],
  },
  {
    participantId: "person_e2_v2_caregiver_a",
    factualRoles: ["caregiver"],
    relationshipFacts: ["Lives with the subject and works irregular shifts that sometimes change household routines."],
  },
  {
    participantId: "person_e2_v2_caregiver_b",
    factualRoles: ["caregiver"],
    relationshipFacts: ["Lives with the subject and handles much of the household scheduling around part-time work."],
  },
  {
    participantId: "person_e2_v2_cousin",
    factualRoles: ["extended_family"],
    relationshipFacts: ["Older cousin in the household who sometimes helps with errands, meals and school logistics."],
  },
]);

export const E2_V2_WORLD_FIXTURE = Object.freeze({
  id: "E2-V2",
  worldSpec: E2_V2_WORLD,
  subject: E2_V2_SUBJECT,
  span: E2_V2_SPAN,
  initialRoster: E2_V2_ROSTER,
});
