import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  assertPassAInputBoundary,
  buildPassAInput,
  createEventStructure,
  normalizeEventStructure,
  sampleEventStructures,
} from "./genesis-pass-a-domain.mjs";

export const GENESIS_EVENT_STRUCTURE_POOL_V2_VERSION = "genesis-event-structure-pool-v2";
export const GENESIS_PASS_A_RICH_POLICY_VERSION = "genesis-pass-a-policy-v1+event-structure-pool-v2";

export const EVENT_STRUCTURE_V2_CONTEXT_KINDS = Object.freeze([
  "ordinary_practical",
  "social_conversation",
  "intellectual_encounter",
  "responsibility_or_conflict",
  "transition_or_access",
]);

export const EVENT_STRUCTURE_V2_ACCESS_MODES = Object.freeze([
  "caregiver_mediated",
  "institution_mediated",
  "peer_mediated",
  "self_directed",
  "incidental",
]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const SOURCE_DERIVATION = "Human-authored portable developmental affordance; no source scene, character, personality, lesson, or target adult outcome retained.";

function witnesses(a, b, c) {
  return [
    { era: "late_20c", economy: "scarce", culture: "coastal_multilingual", instantiation: a },
    { era: "early_21c", economy: "mixed", culture: "inland_collectivist", instantiation: b },
    { era: "mid_21c", economy: "abundant", culture: "urban_pluralist", instantiation: c },
  ];
}

function entry({ id, situation, roles, range, consequence = "low", contextKinds, accessModes, examples }) {
  const structure = createEventStructure({
    structureId: id,
    abstractSituation: situation,
    participatingRoles: roles,
    developmentalRange: { minAge: range[0], maxAge: range[1] },
    consequenceClass: consequence,
    instantiationWitnesses: witnesses(...examples),
    sourceDerivation: SOURCE_DERIVATION,
  });
  return Object.freeze({
    structure,
    contextKinds: Object.freeze([...contextKinds]),
    accessModes: Object.freeze([...accessModes]),
  });
}

export const GENESIS_EVENT_STRUCTURE_POOL_V2 = Object.freeze([
  entry({ id: "ges_v2_small_help_request", situation: "a young person is asked for a small, concrete contribution whose success is visible", roles: ["caregiver", "sibling"], range: [5, 9], contextKinds: ["ordinary_practical"], accessModes: ["caregiver_mediated"], examples: ["A child carries folded cloth to a neighbor's wash line.", "A child sorts market tokens into two jars for a caregiver.", "A child brings charged lantern cells to an older sibling before dusk."] }),
  entry({ id: "ges_v2_shared_object_disagreement", situation: "two young people want incompatible uses of one ordinary shared object", roles: ["sibling", "peer"], range: [5, 11], contextKinds: ["ordinary_practical", "responsibility_or_conflict"], accessModes: ["peer_mediated"], examples: ["Two children disagree over a single skipping rope.", "Two children want the same kitchen stool for different chores.", "Two children argue about who can use a shared drawing tablet first."] }),
  entry({ id: "ges_v2_caregiver_reads_and_pauses", situation: "a caregiver-mediated text or story is interrupted by a concrete question or observation from the young person", roles: ["caregiver"], range: [5, 10], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["caregiver_mediated"], examples: ["A caregiver pauses a borrowed folktale when the child asks about an unfamiliar tool.", "A caregiver stops during a newspaper story to answer a child's factual question.", "A caregiver pauses an audio story while the child points out that two stated facts conflict."] }),
  entry({ id: "ges_v2_play_rule_negotiation", situation: "children have to settle an ordinary rule before continuing a shared activity", roles: ["peer", "sibling"], range: [5, 10], contextKinds: ["social_conversation"], accessModes: ["peer_mediated"], examples: ["Children settle where a chalk boundary ends before a game.", "Children decide whether a dropped seed bag counts as a turn.", "Children agree what happens when a mixed-reality game loses tracking."] }),
  entry({ id: "ges_v2_lost_small_item", situation: "a young person searches with someone else for an ordinary misplaced item", roles: ["caregiver", "sibling", "peer"], range: [5, 10], contextKinds: ["ordinary_practical"], accessModes: ["caregiver_mediated", "peer_mediated"], examples: ["A child searches a courtyard for a missing button pouch.", "A child and sibling retrace a bus stop for a dropped key.", "A child and peer check charging shelves for a misplaced stylus."] }),
  entry({ id: "ges_v2_adult_finishes_task_unasked", situation: "an adult resolves a young person's manageable difficulty without first consulting them", roles: ["caregiver", "teacher"], range: [5, 13], consequence: "moderate", contextKinds: ["ordinary_practical", "responsibility_or_conflict"], accessModes: ["caregiver_mediated", "institution_mediated"], examples: ["An adult reties a child's fishing knot before the child can try again.", "A teacher rewrites a student's label instead of waiting for a correction.", "A caregiver resets a small fabrication job while the child is still troubleshooting it."] }),
  entry({ id: "ges_v2_library_browse_with_adult", situation: "a caregiver or institution gives a young person access to several texts and allows a concrete choice among them", roles: ["caregiver", "librarian", "teacher"], range: [6, 11], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["caregiver_mediated", "institution_mediated"], examples: ["A child chooses one booklet from a traveling reading chest.", "A child selects a library book after a librarian points out two shelves.", "A child chooses one archived field journal from a school display terminal."] }),
  entry({ id: "ges_v2_simple_explanation_disputed", situation: "a young person notices a concrete mismatch in an adult's or peer's explanation and asks about it", roles: ["caregiver", "teacher", "peer"], range: [6, 12], contextKinds: ["social_conversation", "intellectual_encounter"], accessModes: ["caregiver_mediated", "institution_mediated", "peer_mediated"], examples: ["A child asks why a tide explanation does not match yesterday's shoreline.", "A student asks why a posted bus rule differs from what the driver said.", "A child asks why a classroom simulation contradicts the teacher's first description."] }),
  entry({ id: "ges_v2_peer_invitation", situation: "a peer invites the young person into an ordinary shared activity with room to accept, decline, or alter the terms", roles: ["peer"], range: [6, 13], contextKinds: ["social_conversation"], accessModes: ["peer_mediated"], examples: ["A peer asks the child to join a courtyard marble game.", "A classmate invites the child to help paint a festival sign.", "A peer asks the child to join a lunchtime repair club."] }),
  entry({ id: "ges_v2_question_after_demonstration", situation: "after seeing a concrete demonstration, a young person asks or tests one factual implication", roles: ["teacher", "caregiver", "mentor"], range: [7, 13], contextKinds: ["intellectual_encounter"], accessModes: ["institution_mediated", "caregiver_mediated"], examples: ["After seeing dye wick through cloth, a child tries a thicker thread.", "After a magnet demonstration, a student asks whether the same result holds through wood.", "After a sensor demo, a student changes the distance and watches the reading."] }),
  entry({ id: "ges_v2_overheard_adult_discussion", situation: "a young person overhears a bounded factual disagreement or discussion among adults who are not addressing them", roles: ["caregiver", "teacher", "neighbor"], range: [7, 14], contextKinds: ["social_conversation", "intellectual_encounter"], accessModes: ["incidental"], examples: ["A child overhears two adults disagree about whether the bridge should reopen after rain.", "A student hears teachers compare two explanations for falling enrollment.", "A young person overhears adults debate whether an automated notice is reliable."] }),
  entry({ id: "ges_v2_drawing_or_making_seen", situation: "another person notices an unfinished drawing, model, story, or made object and comments on something concrete in it", roles: ["peer", "caregiver", "teacher"], range: [7, 13], contextKinds: ["social_conversation", "ordinary_practical"], accessModes: ["peer_mediated", "caregiver_mediated", "institution_mediated"], examples: ["A peer notices the uneven wheel on a child's cart model.", "A caregiver asks why one figure in a drawing has no shadow.", "A teacher points to a missing joint in a student's printed mechanism."] }),
  entry({ id: "ges_v2_family_fact_disagreement", situation: "family members remember or describe an ordinary shared fact differently in front of the young person", roles: ["caregiver", "sibling"], range: [8, 14], contextKinds: ["social_conversation"], accessModes: ["caregiver_mediated"], examples: ["Two relatives disagree about which year a shop moved streets.", "A caregiver and sibling remember a school closure differently.", "Two household members disagree about who first suggested a move to a new district."] }),
  entry({ id: "ges_v2_small_public_mistake", situation: "the young person makes a visible but recoverable mistake in an ordinary shared setting", roles: ["peer", "teacher", "caregiver"], range: [8, 14], consequence: "moderate", contextKinds: ["ordinary_practical", "responsibility_or_conflict"], accessModes: ["peer_mediated", "institution_mediated"], examples: ["A child gives the wrong count while dividing supplies and corrects it.", "A student reads the wrong stop name during a group trip and checks the map.", "A student sends a shared fabrication job with one dimension wrong and helps rerun it."] }),
  entry({ id: "ges_v2_first_art_encounter", situation: "the young person encounters an artwork or performance outside routine instruction and attends to one concrete feature", roles: ["caregiver", "teacher", "peer"], range: [8, 15], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["caregiver_mediated", "institution_mediated", "peer_mediated"], examples: ["A child stops at a painted market shutter and asks who made one repeated symbol.", "A student watches a street performance and notices the performers never speak.", "A young person studies an interactive light installation and tests how distance changes it."] }),
  entry({ id: "ges_v2_mundane_errand_independence", situation: "the young person completes a familiar local errand with less adult direction than before", roles: ["caregiver", "shopkeeper", "neighbor"], range: [9, 15], contextKinds: ["ordinary_practical", "transition_or_access"], accessModes: ["self_directed"], examples: ["A child buys two staples from a nearby stall using a written list.", "A young person returns a borrowed tool across the neighborhood alone.", "A young person collects a reserved component from a community locker without an adult beside them."] }),
  entry({ id: "ges_v2_peer_joke_or_reference_missed", situation: "a peer uses a joke, phrase, or reference the young person does not understand and the gap becomes briefly visible", roles: ["peer"], range: [9, 15], contextKinds: ["social_conversation"], accessModes: ["peer_mediated"], examples: ["A peer quotes an old radio comedy and explains why others laughed.", "A classmate uses a regional saying the young person has not heard.", "A peer references a popular simulation and has to explain the premise."] }),
  entry({ id: "ges_v2_choose_text_self_directed", situation: "the young person independently chooses a text or information source from several available possibilities", roles: ["librarian", "teacher", "peer"], range: [9, 17], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["self_directed", "institution_mediated"], examples: ["A young person chooses a weather almanac instead of the assigned adventure pamphlets.", "A student checks out a biography after browsing an unrelated shelf.", "A student opens a technical explainer from a public archive after following a footnote."] }),
  entry({ id: "ges_v2_scientific_claim_test", situation: "the young person encounters a scientific claim and performs or proposes a small observable check", roles: ["teacher", "mentor", "peer"], range: [9, 16], consequence: "moderate", contextKinds: ["intellectual_encounter"], accessModes: ["institution_mediated", "peer_mediated", "self_directed"], examples: ["A student compares shaded and unshaded water bowls after a heat claim.", "A student measures two pendulum lengths after hearing a timing claim.", "A student changes one parameter in a public model to see whether a forecast shifts."] }),
  entry({ id: "ges_v2_help_younger_person_choose", situation: "the young person helps someone younger make a choice without needing to make the choice for them", roles: ["sibling", "peer"], range: [10, 16], contextKinds: ["social_conversation", "ordinary_practical"], accessModes: ["peer_mediated"], examples: ["An older child shows a younger sibling two ways to mend a torn kite and waits.", "A student explains two club options to a younger cousin without choosing one.", "A teen demonstrates two interface settings to a younger student and lets them select."] }),
  entry({ id: "ges_v2_friend_disagreement", situation: "friends disagree about an ordinary interpretation, plan, or recollection and continue interacting afterward", roles: ["peer"], range: [10, 17], consequence: "moderate", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["peer_mediated"], examples: ["Two friends disagree about whether a neighbor's warning was fair and still walk home together.", "Friends dispute what a teacher meant by a deadline and compare notes.", "Friends disagree over whether an automated moderation result was reasonable and keep working on the same project."] }),
  entry({ id: "ges_v2_argument_encounter", situation: "the young person hears or participates in a bounded argument in which at least two explicit reasons are offered", roles: ["peer", "teacher", "caregiver", "mentor"], range: [10, 18], contextKinds: ["social_conversation", "intellectual_encounter"], accessModes: ["peer_mediated", "institution_mediated", "caregiver_mediated"], examples: ["A student hears two adults argue about whether fishing limits should change and each gives a reason.", "Classmates debate whether a school rule is fair using different examples.", "A mentor and student disagree over whether an algorithmic ranking should be trusted and test one case."] }),
  entry({ id: "ges_v2_mentor_optional_path", situation: "a teacher or mentor makes one optional path, practice, text, or community available without assigning it as a requirement", roles: ["teacher", "mentor"], range: [11, 18], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["institution_mediated"], examples: ["A teacher leaves a spare astronomy booklet with a student who had asked about the night sky.", "A mentor mentions an open public lecture and gives the student the schedule.", "A mentor points to an optional machine-vision sandbox after a student asks how a detector failed."] }),
  entry({ id: "ges_v2_friend_confides_uncertain_view", situation: "a peer shares an uncertain belief or interpretation and explicitly leaves room for doubt", roles: ["peer"], range: [11, 18], contextKinds: ["social_conversation"], accessModes: ["peer_mediated"], examples: ["A friend says they may have misread why a relative stopped visiting.", "A classmate admits they are unsure whether a teacher singled them out.", "A peer says they cannot tell whether a recommendation system is helping or merely repeating prior choices."] }),
  entry({ id: "ges_v2_text_conflicts_with_expectation", situation: "a text the young person actually reads presents a claim or perspective that conflicts with one stated expectation", roles: ["teacher", "librarian", "peer", "mentor"], range: [12, 18], consequence: "moderate", contextKinds: ["intellectual_encounter"], accessModes: ["institution_mediated", "peer_mediated", "self_directed"], examples: ["A student reads a local history account that contradicts a family shorthand about a strike.", "A teen reads two newspaper accounts that disagree about the same protest.", "A student reads documentation showing that a familiar system optimizes a different metric than they assumed."] }),
  entry({ id: "ges_v2_religious_or_philosophical_text", situation: "the young person directly encounters a religious or philosophical text or discussion and attends to one explicit proposition without being assigned a conclusion", roles: ["caregiver", "teacher", "mentor", "peer"], range: [12, 18], contextKinds: ["intellectual_encounter"], accessModes: ["caregiver_mediated", "institution_mediated", "peer_mediated", "self_directed"], examples: ["A teen reads a short ethical parable at a community gathering and asks about one stated duty.", "A student compares two translated passages about obligation in a class discussion.", "A young person follows a public seminar transcript arguing that machine decisions still require human responsibility."] }),
  entry({ id: "ges_v2_public_disagreement", situation: "the young person states a disagreement in a group where the social cost is visible but bounded", roles: ["peer", "teacher", "mentor"], range: [12, 18], consequence: "formative_capable", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["peer_mediated", "institution_mediated"], examples: ["A student says in a committee meeting that the proposed rota burdens one family more than others.", "A teen disagrees with a popular class interpretation and points to the text.", "A student challenges a team decision to hide a model's known failure case during a demo rehearsal."] }),
  entry({ id: "ges_v2_art_unsettles_expectation", situation: "an artwork or performance the young person actually encounters violates one concrete expectation about form, audience, or subject", roles: ["teacher", "peer", "mentor"], range: [12, 18], contextKinds: ["intellectual_encounter"], accessModes: ["institution_mediated", "peer_mediated", "self_directed"], examples: ["A teen sees a memorial made from ordinary receipts instead of stone.", "A student watches a play where the audience is asked to choose the order of scenes.", "A young person explores an installation whose visual output is generated from local air-quality data."] }),
  entry({ id: "ges_v2_choose_against_peer_group", situation: "the young person makes an ordinary visible choice different from a peer group's current preference without severing the relationship", roles: ["peer"], range: [13, 18], consequence: "formative_capable", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["peer_mediated", "self_directed"], examples: ["A teen leaves a crowded celebration early while friends stay.", "A student chooses a different elective from their closest friends.", "A young person declines to publish a speculative result while teammates want to post it immediately."] }),
  entry({ id: "ges_v2_mentor_absence_or_unavailability", situation: "a previously available mentor or teacher is temporarily unavailable at a moment when the young person expected ordinary guidance", roles: ["mentor", "teacher"], range: [13, 18], consequence: "formative_capable", contextKinds: ["transition_or_access"], accessModes: ["institution_mediated", "self_directed"], examples: ["A mentor misses a planned workshop and the student must decide what task to attempt alone.", "A teacher is absent during a project milestone and students redistribute questions among themselves.", "A mentor is offline during a field deployment and the student uses the documented fallback procedure."] }),
  entry({ id: "ges_v2_public_failure_recovery", situation: "the young person experiences a visible failure in a chosen activity and has an ordinary opportunity to continue, alter, or leave it", roles: ["peer", "teacher", "mentor"], range: [13, 18], consequence: "formative_capable", contextKinds: ["responsibility_or_conflict"], accessModes: ["peer_mediated", "institution_mediated", "self_directed"], examples: ["A teen's prepared song breaks down at a community rehearsal and the group resets.", "A student's debate opening fails under questioning and the round continues.", "A student's live robotics demo loses localization and the team switches to a recorded trace."] }),
  entry({ id: "ges_v2_family_decision_with_future_effect", situation: "a family decision changes a concrete near-future option available to the young person without dictating their interpretation of it", roles: ["caregiver", "sibling"], range: [13, 18], consequence: "formative_capable", contextKinds: ["transition_or_access", "responsibility_or_conflict"], accessModes: ["caregiver_mediated"], examples: ["A family changes work schedules so the teen can no longer attend one weekly club.", "A household move changes which school programs are reachable by transit.", "A family budget decision postpones access to a specialized fabrication course for a semester."] }),
]);

function normalizeEntry(candidate, index) {
  const path = `eventStructurePoolV2[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["structure", "contextKinds", "accessModes"]);
  const structure = normalizeEventStructure(candidate.structure);
  assertStringArray(`${path}.contextKinds`, candidate.contextKinds);
  assertStringArray(`${path}.accessModes`, candidate.accessModes);
  if (candidate.contextKinds.length === 0 || candidate.accessModes.length === 0) throw new TypeError(`${path} metadata must not be empty`);
  for (const kind of candidate.contextKinds) if (!EVENT_STRUCTURE_V2_CONTEXT_KINDS.includes(kind)) throw new TypeError(`${path}.contextKinds contains invalid value ${kind}`);
  for (const mode of candidate.accessModes) if (!EVENT_STRUCTURE_V2_ACCESS_MODES.includes(mode)) throw new TypeError(`${path}.accessModes contains invalid value ${mode}`);
  return Object.freeze({ structure, contextKinds: Object.freeze([...candidate.contextKinds]), accessModes: Object.freeze([...candidate.accessModes]) });
}

function coversDevelopmentalRange(structure, range) {
  return structure.developmentalRange.minAge <= range.minAge
    && structure.developmentalRange.maxAge >= range.maxAge;
}

export function normalizeEventStructurePoolV2(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 24) throw new TypeError("EventStructurePool v2 requires at least 24 reviewed affordances");
  const entries = candidates.map(normalizeEntry);
  const ids = entries.map((item) => item.structure.structureId);
  if (new Set(ids).size !== ids.length) throw new TypeError("EventStructurePool v2 contains duplicate structure IDs");
  const rangeSignatures = new Set(entries.map(({ structure }) => `${structure.developmentalRange.minAge}-${structure.developmentalRange.maxAge}`));
  if (rangeSignatures.size < 8) throw new TypeError("EventStructurePool v2 must use varied reviewed developmental ranges rather than one flat range");
  const context = new Set(entries.flatMap((item) => item.contextKinds));
  for (const required of ["ordinary_practical", "social_conversation", "intellectual_encounter", "transition_or_access"]) {
    if (!context.has(required)) throw new TypeError(`EventStructurePool v2 is missing ${required} affordances`);
  }
  const access = new Set(entries.flatMap((item) => item.accessModes));
  for (const required of ["caregiver_mediated", "peer_mediated", "self_directed"]) {
    if (!access.has(required)) throw new TypeError(`EventStructurePool v2 is missing ${required} access`);
  }
  return Object.freeze(entries);
}

export function eventStructurePoolV2Digest(candidates = GENESIS_EVENT_STRUCTURE_POOL_V2) {
  const entries = normalizeEventStructurePoolV2(candidates);
  return digest({ policyVersion: GENESIS_EVENT_STRUCTURE_POOL_V2_VERSION, entries });
}

export function sampleEventStructuresV2(candidates, developmentalRange, options) {
  const entries = normalizeEventStructurePoolV2(candidates);
  // Rich cognition intentionally does not receive developmental-range policy labels.
  // Therefore every offered structure must be valid for every age the model may choose
  // within this stratum; overlap-only eligibility would create impossible hidden constraints.
  const coveringEntries = entries.filter((item) => coversDevelopmentalRange(item.structure, developmentalRange));
  const selected = sampleEventStructures(
    coveringEntries.map((item) => item.structure),
    developmentalRange,
    options,
  );
  const selectedIds = new Set(selected.map((item) => item.structureId));
  return Object.freeze(coveringEntries.filter((item) => selectedIds.has(item.structure.structureId)));
}

export function buildPassAInputWithEventStructurePoolV2({
  worldSpec,
  subject,
  developmentalWindow,
  chronologyEndsAt,
  initialRoster,
  priorEpisodes = [],
  previouslyIntroducedParticipants = [],
  eventStructurePoolV2 = GENESIS_EVENT_STRUCTURE_POOL_V2,
  offeredEntries,
}) {
  const pool = normalizeEventStructurePoolV2(eventStructurePoolV2);
  if (!Array.isArray(offeredEntries)) throw new TypeError("offeredEntries must be an EventStructurePool v2 entry array");
  const offered = offeredEntries.map((entryCandidate, index) => normalizeEntry(entryCandidate, index).structure);
  for (const structure of offered) {
    if (!coversDevelopmentalRange(structure, developmentalWindow)) {
      throw new TypeError(`offered rich structure ${structure.structureId} does not cover the entire developmental window`);
    }
  }
  const input = buildPassAInput({
    worldSpec,
    subject,
    developmentalWindow,
    chronologyEndsAt,
    initialRoster,
    priorEpisodes,
    previouslyIntroducedParticipants,
    eventStructurePool: pool.map((item) => item.structure),
    offeredStructures: offered,
  });
  input.policyWitness = {
    ...input.policyWitness,
    policyVersion: GENESIS_PASS_A_RICH_POLICY_VERSION,
    eventStructurePoolDigest: eventStructurePoolV2Digest(pool),
  };
  return assertPassAInputBoundary(input);
}

export function eventStructureV2Metadata(structureId, candidates = GENESIS_EVENT_STRUCTURE_POOL_V2) {
  assertId("structureId", structureId);
  const entry = normalizeEventStructurePoolV2(candidates).find((item) => item.structure.structureId === structureId);
  if (entry === undefined) return null;
  return Object.freeze({ contextKinds: entry.contextKinds, accessModes: entry.accessModes });
}
