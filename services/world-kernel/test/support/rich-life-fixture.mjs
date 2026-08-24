import { normalizeGenesisWorldSpec } from "../../src/genesis-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  sampleEventStructuresV2,
} from "../../src/genesis-event-structure-pool-v2.mjs";

const EPISODE_COUNT = 10;
const STRUCTURES_PER_WINDOW = 9;
const AUTHORED_AT = "2026-08-19T04:55:00Z";

export const RICH_LIFE_TEST_SEEDS = Object.freeze([
  "slice-e2-a0-seed-01",
  "slice-e2-a0-seed-02",
  "slice-e2-a0-seed-03",
]);

const worldSpec = normalizeGenesisWorldSpec({
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
    abstractionMethod: "Synthetic diagnostic world authored before model use, without access to a development genome, named source person, target personality, target adult role or downstream benchmark.",
    relocationWitness: "The world can be relocated to another estuary or industrial district and era while preserving variable household schedules, public transport, school, commerce and civic access without preserving any intended character outcome.",
    familiarityProbe: null,
    createdAt: AUTHORED_AT,
  },
  createdAt: AUTHORED_AT,
});

const subject = Object.freeze({
  provisionalThreadId: "thr_slice_e2_d1_001",
  bornAt: "1982-09-14T00:00:00Z",
});

const span = Object.freeze({
  windowId: "e2_d1_childhood_through_adolescence",
  startAt: "1988-09-14T00:00:00Z",
  endAt: "2000-09-13T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

const initialRoster = Object.freeze([
  { participantId: subject.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose prior life is being generated."] },
  { participantId: "person_e2_d1_caregiver_1", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and works variable shifts."] },
  { participantId: "person_e2_d1_caregiver_2", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household and works variable shifts."] },
  { participantId: "person_e2_d1_sibling", factualRoles: ["sibling"], relationshipFacts: ["Older sibling in the subject household."] },
]);

export const RICH_LIFE_TEST_WORLD_FIXTURE = Object.freeze({
  id: "E2-D1",
  worldSpec,
  subject,
  span,
  initialRoster,
});

function rounded(value) {
  return Number(value.toFixed(6));
}

function stratifyDevelopmentSpan(baseWindow, episodeCount = EPISODE_COUNT) {
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("episodeCount must be a positive integer");
  const startMs = Date.parse(baseWindow.startAt);
  const endMs = Date.parse(baseWindow.endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) throw new TypeError("developmental span timestamps are invalid");
  const inclusiveMillis = endMs - startMs + 1;
  const ageSpan = baseWindow.maxAge - baseWindow.minAge;
  return Object.freeze(Array.from({ length: episodeCount }, (_, index) => {
    const sliceStart = startMs + Math.floor((inclusiveMillis * index) / episodeCount);
    const sliceEnd = startMs + Math.floor((inclusiveMillis * (index + 1)) / episodeCount) - 1;
    return Object.freeze({
      windowId: `${baseWindow.windowId}_stratum_${String(index + 1).padStart(2, "0")}`,
      startAt: new Date(sliceStart).toISOString(),
      endAt: new Date(sliceEnd).toISOString(),
      minAge: rounded(baseWindow.minAge + (ageSpan * index) / episodeCount),
      maxAge: rounded(baseWindow.minAge + (ageSpan * (index + 1)) / episodeCount),
    });
  }));
}

export function buildRichLifeTestPlan({
  worldFixture = RICH_LIFE_TEST_WORLD_FIXTURE,
  seed = RICH_LIFE_TEST_SEEDS[0],
} = {}) {
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("rich-life test seed is required");
  const windows = stratifyDevelopmentSpan(worldFixture.span);
  return Object.freeze(windows.map((developmentalWindow) => Object.freeze({
    developmentalWindow,
    offeredEntries: sampleEventStructuresV2(
      GENESIS_EVENT_STRUCTURE_POOL_V2,
      developmentalWindow,
      {
        seed: `${seed}:${worldFixture.id}:structures:${developmentalWindow.windowId}`,
        count: STRUCTURES_PER_WINDOW,
      },
    ),
  })));
}
