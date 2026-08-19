import { normalizeGenesisWorldSpec } from "../services/world-kernel/src/genesis-domain.mjs";

const authoredAt = "2026-08-19T22:32:00Z";

function world(candidate) {
  return Object.freeze(normalizeGenesisWorldSpec(candidate));
}

// E2-V1 is a source-free fresh validation fixture authored only after the E2 mechanism
// was frozen and after Gate-F review requested off-development-world validation.
// Committing this fixture does not burn it; the first model call using it does.
export const E2_V1_WORLD = world({
  worldSpecId: "world_slice_e2_v1_fresh_burned_on_first_use",
  timeFrame: {
    startAt: "1986-01-01T00:00:00Z",
    endAt: "2014-12-31T23:59:59Z",
  },
  places: [
    {
      placeId: "place_e2_v1_home_courtyard",
      description: "A rented flat in a mid-rise mixed-use block whose shared courtyard is used for laundry, bicycles, small repairs, conversation and children's ordinary play.",
    },
    {
      placeId: "place_e2_v1_school",
      description: "A public school with ordinary classrooms, a practical science room, a gym, a small art room and clubs that meet when staff and space are available.",
    },
    {
      placeId: "place_e2_v1_tram_loop",
      description: "A tram terminus beside a compact commercial arcade, with ticket machines, posted route changes, food counters, repair shops and people transferring between local routes.",
    },
    {
      placeId: "place_e2_v1_community_workshop",
      description: "A neighborhood community workshop and meeting hall with tool benches, a lending shelf, bulletin boards, evening classes, repair sessions and occasional public talks or performances.",
    },
    {
      placeId: "place_e2_v1_river_fields",
      description: "A public riverside strip with playing fields, allotment plots, paved paths, flood markers and a small seasonal kiosk used by families, clubs and nearby residents.",
    },
  ],
  householdShape: "One caregiver, the subject, a younger sibling and a grandparent share a rented flat; household routines are stable but space, privacy and discretionary money are limited.",
  familyRelations: [
    "The grandparent handles some school pickups and household errands.",
    "The sibling is four years younger than the subject.",
    "Another caregiver lives elsewhere in the same city and is seen irregularly rather than being part of the daily household.",
  ],
  languages: ["English", "Arabic"],
  materialCircumstances: "Housing, food and schooling are stable; the household budgets carefully, uses public transport and shared facilities, repairs ordinary possessions when practical, and plans larger purchases in advance.",
  mobilityPattern: "Daily movement is mostly on foot, by tram and by bicycle; the household stays within the city most of the time, and route changes, weather and caregiving schedules sometimes alter plans.",
  schoolingOrCommunityContext: "School, the tram loop, the community workshop and public riverside facilities create overlapping peer and adult settings; activities exist without being mandatory and access depends on ordinary schedules and household logistics.",
  culturalContext: "The district contains long-term residents and newer households, multiple languages, small trades, neighborhood associations, faith communities, youth groups and routine disagreement about local changes and shared spaces.",
  availableInstitutions: [
    "public_school",
    "public_tram",
    "community_workshop",
    "lending_shelf",
    "local_commerce",
    "public_recreation_fields",
  ],
  intellectualEnvironment: "School demonstrations, borrowed books and magazines, repair instructions, transit maps, community classes, local notices, performances, religious or philosophical texts, public talks and ordinary household disagreement are available unevenly; no subject, source or conclusion is mandatory.",
  affordedRoles: [
    "caregiver",
    "sibling",
    "extended_family",
    "peer",
    "teacher",
    "neighbor",
    "librarian",
    "mentor",
    "shopkeeper",
  ],
  worldAuthorship: {
    authorId: "fibre_slice_e2_validation",
    sourcesConsulted: [],
    abstractionMethod: "Source-free synthetic fresh validation world authored after the E2 development mechanism was frozen, without access to a validation genome, named source person, target personality, target adult role or validation output.",
    relocationWitness: "The fixture can be relocated to another temperate inland city with public transit, mixed-use housing, school, shared workshop space and public recreation while preserving ordinary access constraints without preserving any intended character outcome.",
    familiarityProbe: null,
    createdAt: authoredAt,
  },
  createdAt: authoredAt,
});

export const E2_V1_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_e2_v1_001",
  bornAt: "1990-04-11T00:00:00Z",
});

export const E2_V1_SPAN = Object.freeze({
  windowId: "e2_v1_childhood_through_adolescence",
  startAt: "1996-04-11T00:00:00Z",
  endAt: "2008-04-10T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

export const E2_V1_ROSTER = Object.freeze([
  {
    participantId: E2_V1_SUBJECT.provisionalThreadId,
    factualRoles: ["subject"],
    relationshipFacts: ["This is the provisional Thread whose prior life is being generated."],
  },
  {
    participantId: "person_e2_v1_caregiver",
    factualRoles: ["caregiver"],
    relationshipFacts: ["Lives with the subject and handles most day-to-day caregiving."],
  },
  {
    participantId: "person_e2_v1_grandparent",
    factualRoles: ["extended_family"],
    relationshipFacts: ["Grandparent in the subject household who handles some errands and school pickups."],
  },
  {
    participantId: "person_e2_v1_sibling",
    factualRoles: ["sibling"],
    relationshipFacts: ["Younger sibling in the subject household."],
  },
]);

export const E2_V1_WORLD_FIXTURE = Object.freeze({
  id: "E2-V1",
  worldSpec: E2_V1_WORLD,
  subject: E2_V1_SUBJECT,
  span: E2_V1_SPAN,
  initialRoster: E2_V1_ROSTER,
});
