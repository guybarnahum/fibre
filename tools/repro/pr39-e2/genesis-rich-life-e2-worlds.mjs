import { normalizeGenesisWorldSpec } from "../services/world-kernel/src/genesis-domain.mjs";

const authoredAt = "2026-08-19T04:55:00Z";

function world(candidate) {
  return Object.freeze(normalizeGenesisWorldSpec(candidate));
}

// E2-D1 and E2-D2 are authored development fixtures. Merely committing them does not
// burn them; first model use does. Neither was authored with access to a development
// genome, target adult role, target personality, or downstream benchmark.

export const E2_D1_WORLD = world({
  worldSpecId: "world_slice_e2_d1_burned_on_first_use",
  timeFrame: {
    startAt: "1978-01-01T00:00:00Z",
    endAt: "2004-12-31T23:59:59Z",
  },
  places: [
    {
      placeId: "place_e2_d1_home",
      description: "A compact rented flat above a row of small workshops in an older estuary district where household and street noise overlap.",
    },
    {
      placeId: "place_e2_d1_school",
      description: "A municipal school serving several nearby districts, with ordinary classrooms, a small science room, a yard and rotating after-school activities.",
    },
    {
      placeId: "place_e2_d1_market_lane",
      description: "A covered market lane with food stalls, repair counters, second-hand goods and people making short practical transactions.",
    },
    {
      placeId: "place_e2_d1_ferry_terminal",
      description: "A working passenger-and-freight ferry terminal with waiting areas, posted schedules, ticket counters and periodic service disruptions.",
    },
    {
      placeId: "place_e2_d1_civic_room",
      description: "A municipal reading and meeting room used for newspapers, borrowed books, notices, evening classes, public meetings and small performances.",
    },
  ],
  householdShape: "Two caregivers, the subject and one sibling share a small rented flat; both caregivers work variable schedules and household routines often depend on who is home.",
  familyRelations: [
    "One grandparent lives in another district and visits irregularly.",
    "The sibling is two years older than the subject.",
  ],
  languages: ["English", "Portuguese"],
  materialCircumstances: "Rent and food are usually covered but household cash varies with shift work; repair, reuse, public transport and municipal services are ordinary parts of daily life.",
  mobilityPattern: "Most local movement is on foot, by bus or by ferry; the household rarely travels far and transport schedules sometimes change plans.",
  schoolingOrCommunityContext: "School, the market lane, ferry terminal and municipal reading room create overlapping public settings; organized activities exist but attendance depends on schedules, cost and ordinary household logistics.",
  culturalContext: "The district mixes long-established families and newer arrivals, several languages, practical trades, local clubs, religious communities and routine disagreement about municipal decisions.",
  availableInstitutions: [
    "municipal_school",
    "municipal_reading_room",
    "public_ferry",
    "covered_market",
    "neighborhood_clubs",
  ],
  intellectualEnvironment: "School demonstrations, borrowed books, newspapers, repair manuals, public notices, community classes, religious texts, performances and ordinary adult arguments are available unevenly; no source, subject or conclusion is mandatory.",
  affordedRoles: [
    "caregiver",
    "sibling",
    "peer",
    "teacher",
    "neighbor",
    "librarian",
    "mentor",
    "shopkeeper",
  ],
  worldAuthorship: {
    authorId: "fibre_slice_e2_development",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic E2 diagnostic world authored before any E2 model run, without access to a development genome, named source person, target personality, target adult role or downstream benchmark.",
    relocationWitness: "The world can be relocated to another estuary/industrial district and era while preserving variable household schedules, public transport, school, commerce and civic access without preserving any intended character outcome.",
    familiarityProbe: null,
    createdAt: authoredAt,
  },
  createdAt: authoredAt,
});

export const E2_D1_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_e2_d1_001",
  bornAt: "1982-09-14T00:00:00Z",
});

export const E2_D1_SPAN = Object.freeze({
  windowId: "e2_d1_childhood_through_adolescence",
  startAt: "1988-09-14T00:00:00Z",
  endAt: "2000-09-13T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

export const E2_D1_ROSTER = Object.freeze([
  { participantId: E2_D1_SUBJECT.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose prior life is being generated."] },
  { participantId: "person_e2_d1_caregiver_1", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and works variable shifts."] },
  { participantId: "person_e2_d1_caregiver_2", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and works variable shifts."] },
  { participantId: "person_e2_d1_sibling", factualRoles: ["sibling"], relationshipFacts: ["Older sibling in the subject household."] },
]);

export const E2_D2_WORLD = world({
  worldSpecId: "world_slice_e2_d2_burned_on_first_use",
  timeFrame: {
    startAt: "1999-01-01T00:00:00Z",
    endAt: "2025-12-31T23:59:59Z",
  },
  places: [
    {
      placeId: "place_e2_d2_home",
      description: "A modest detached home at the edge of a high-desert county seat, with neighboring lots spread farther apart than in the town center.",
    },
    {
      placeId: "place_e2_d2_regional_school",
      description: "A consolidated regional school reached by bus, with classrooms, a gym, practical labs, student groups and shared facilities used by several small communities.",
    },
    {
      placeId: "place_e2_d2_coop_market",
      description: "A cooperative grocery and supply market where residents collect household goods, agricultural supplies, posted notices and occasional repair services.",
    },
    {
      placeId: "place_e2_d2_bus_hub",
      description: "A small regional bus hub connecting the county seat to outlying settlements, with infrequent routes, weather delays and a public notice board.",
    },
    {
      placeId: "place_e2_d2_shared_hall",
      description: "A multipurpose public hall used by a mobile-library stop, clinic sessions, extension workshops, civic meetings, youth activities and occasional exhibitions.",
    },
  ],
  householdShape: "Two caregivers, the subject and one younger sibling share a stable home; one caregiver works locally while the other periodically works multi-day shifts outside town.",
  familyRelations: [
    "An aunt and two cousins live in another settlement reachable by regional bus.",
    "The sibling is five years younger than the subject.",
  ],
  languages: ["English", "Spanish"],
  materialCircumstances: "Basic housing and food are stable, but transport, specialist services and extracurricular access cost time and planning; many resources arrive through regional or shared institutions.",
  mobilityPattern: "School travel is normally by scheduled bus; household errands mix walking, rides and regional transit, and weather or route changes can make access uneven.",
  schoolingOrCommunityContext: "A consolidated school and shared public hall serve a dispersed population; peers may live far apart, and community activities often depend on transport, seasonal schedules and shared facilities.",
  culturalContext: "The county seat combines long-term local families, seasonal workers, bilingual households, agricultural and service work, civic associations, faith communities and regional media.",
  availableInstitutions: [
    "regional_school",
    "mobile_library",
    "cooperative_market",
    "public_health_clinic",
    "extension_workshops",
    "regional_bus",
  ],
  intellectualEnvironment: "School labs, a mobile library, local radio, public internet terminals, extension demonstrations, clinic information, community exhibitions, religious/philosophical texts and ordinary public disagreement are available unevenly; no source, interest or conclusion is mandatory.",
  affordedRoles: [
    "caregiver",
    "sibling",
    "peer",
    "teacher",
    "neighbor",
    "librarian",
    "mentor",
    "shopkeeper",
  ],
  worldAuthorship: {
    authorId: "fibre_slice_e2_development",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic E2 diagnostic world authored before any E2 model run, without access to a development genome, named source person, target personality, target adult role or downstream benchmark.",
    relocationWitness: "The world can be relocated to another dispersed regional setting while preserving distance, shared institutions, transport constraints and uneven access without preserving any intended character outcome.",
    familiarityProbe: null,
    createdAt: authoredAt,
  },
  createdAt: authoredAt,
});

export const E2_D2_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_e2_d2_001",
  bornAt: "2003-01-22T00:00:00Z",
});

export const E2_D2_SPAN = Object.freeze({
  windowId: "e2_d2_childhood_through_adolescence",
  startAt: "2009-01-22T00:00:00Z",
  endAt: "2021-01-21T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

export const E2_D2_ROSTER = Object.freeze([
  { participantId: E2_D2_SUBJECT.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose prior life is being generated."] },
  { participantId: "person_e2_d2_caregiver_1", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and normally works locally."] },
  { participantId: "person_e2_d2_caregiver_2", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and periodically works multi-day shifts outside town."] },
  { participantId: "person_e2_d2_sibling", factualRoles: ["sibling"], relationshipFacts: ["Younger sibling in the subject household."] },
]);

export const E2_DIAGNOSTIC_WORLDS = Object.freeze([
  Object.freeze({ id: "E2-D1", worldSpec: E2_D1_WORLD, subject: E2_D1_SUBJECT, span: E2_D1_SPAN, initialRoster: E2_D1_ROSTER }),
  Object.freeze({ id: "E2-D2", worldSpec: E2_D2_WORLD, subject: E2_D2_SUBJECT, span: E2_D2_SPAN, initialRoster: E2_D2_ROSTER }),
]);
