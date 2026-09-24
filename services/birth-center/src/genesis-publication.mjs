import {
  buildFibreCivilRegistration,
  mintFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";
import { attachGenesisCanonicalVisualIdentity } from "fibre/world-kernel/genesis-authority-contracts";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  AUTOBIOGRAPHICAL_MEMORY_POLICY,
  assertGenesisCandidatePlaceConsistency,
  canonicalJson,
  eventStructurePoolV3Digest,
  lifeRelationId,
  normalizeAutobiographicalMemory,
  normalizeGenesisManifest,
  normalizeLifeRelation,
  normalizeSeedSnapshot,
  publicationValidatorSetWitness,
  sha256,
  validateThreadSnapshot,
} from "fibre/world-kernel/genesis-publication-contracts";
import { genesisSexForThread } from "./genesis-sex.mjs";
import { buildGenesisCanonicalVisualIdentity } from "./genesis-visual-phenotype.mjs";

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };

function cognitionSurface(adapter, promptHash, schemaHash) {
  if (!adapter || typeof adapter.provider !== "string" || typeof adapter.modelId !== "string") {
    throw new TypeError("Genesis publication cognition requires a configured model adapter");
  }
  return {
    provider: adapter.provider,
    modelId: adapter.modelId,
    promptHash,
    schemaHash,
    sampling: structuredClone(adapter.configuration ?? {}),
  };
}

export function buildGenesisPublicationCognition({
  creativeAdapter,
  repairAdapter,
  passAPromptMaterial,
  passASchemaMaterial,
  passBPromptMaterial,
  passBSchemaMaterial,
  passCPromptMaterial,
  passCSchemaMaterial,
  repairPromptMaterial,
  repairSchemaMaterial,
} = {}) {
  for (const [name, value] of Object.entries({
    passAPromptMaterial,
    passASchemaMaterial,
    passBPromptMaterial,
    passBSchemaMaterial,
    passCPromptMaterial,
    passCSchemaMaterial,
    repairPromptMaterial,
    repairSchemaMaterial,
  })) {
    if (value === undefined) throw new TypeError(`Genesis publication cognition requires ${name}`);
  }
  return Object.freeze({
    passA: cognitionSurface(creativeAdapter, digest(passAPromptMaterial), digest(passASchemaMaterial)),
    passB: cognitionSurface(creativeAdapter, digest(passBPromptMaterial), digest(passBSchemaMaterial)),
    passC: cognitionSurface(creativeAdapter, digest(passCPromptMaterial), digest(passCSchemaMaterial)),
    recordRepair: cognitionSurface(repairAdapter, digest(repairPromptMaterial), digest(repairSchemaMaterial)),
    policyVersion: "genesis-current-v1",
    eventStructurePoolDigest: eventStructurePoolV3Digest(),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  });
}

function modernGenesisIdentity({ threadId, subjectIdentity, worldSpec, bornAt }) {
  if (!subjectIdentity || typeof subjectIdentity !== "object") throw new TypeError("Genesis birth requires subject identity material");
  if (!worldSpec || typeof worldSpec !== "object") throw new TypeError("Genesis birth requires WorldSpec identity context");
  if (!Array.isArray(worldSpec.languages) || worldSpec.languages.length === 0) throw new TypeError("modern Genesis birth requires at least one raised-language World context");
  if (typeof worldSpec.culturalContext !== "string" || worldSpec.culturalContext.trim() === "") throw new TypeError("modern Genesis birth requires WorldSpec cultural context");
  if (typeof subjectIdentity.birthCity !== "string" || subjectIdentity.birthCity.trim() === "") throw new TypeError("modern Genesis birth requires an explicit birth city");
  const sex = subjectIdentity.sex ?? genesisSexForThread({ threadId });
  if (sex !== "female" && sex !== "male") throw new TypeError("modern Genesis birth requires female or male sex");
  const name = sex === "female" ? subjectIdentity.femaleName : subjectIdentity.maleName;
  if (typeof name !== "string" || name.trim() === "" || name === "Fibre Thread") throw new TypeError("modern Genesis birth requires a proper sex-compatible name");
  const birthInstant = new Date(bornAt);
  if (!Number.isFinite(birthInstant.getTime())) throw new TypeError("modern Genesis birth requires a valid bornAt timestamp");
  const languages = Array.isArray(subjectIdentity.languages) && subjectIdentity.languages.length > 0
    ? subjectIdentity.languages
    : worldSpec.languages;
  return Object.freeze({
    name: name.trim(),
    sex,
    birthDate: birthInstant.toISOString().slice(0, 10),
    languages: Object.freeze([...languages]),
    birthCity: subjectIdentity.birthCity.trim(),
    culture: Object.freeze([`${subjectIdentity.birthCity.trim()} formative context`]),
    originOrientation: "original",
    selfDescription: `I am ${name.trim()}.`,
  });
}

export function assertModernGenesisThreadIdentity(thread) {
  const identity = thread?.identity;
  if (!identity || identity.name === "Fibre Thread" || typeof identity.name !== "string" || identity.name.trim() === "") fail("modern Genesis Thread lacks a proper name");
  if (identity.sex !== "female" && identity.sex !== "male") fail("modern Genesis Thread lacks authoritative sex");
  if (typeof identity.birthDate !== "string" || identity.birthDate.trim() === "") fail("modern Genesis Thread lacks birth date");
  if (!Array.isArray(identity.languages) || identity.languages.length === 0) fail("modern Genesis Thread lacks language context");
  if (typeof identity.birthCity !== "string" || identity.birthCity.trim() === "") fail("modern Genesis Thread lacks birth place");
  if (!Array.isArray(identity.culture) || identity.culture.length === 0) fail("modern Genesis Thread lacks cultural context");
  if (typeof identity.selfDescription !== "string" || identity.selfDescription === "I am a Fibre Thread.") fail("modern Genesis Thread retains generic self-description");
  return true;
}

export function buildNeutralGenesisThreadSeed({
  threadId,
  createdAt,
  subjectIdentity,
  worldSpec,
  bornAt,
  runtimeBaselines,
}) {
  const identity = modernGenesisIdentity({ threadId, subjectIdentity, worldSpec, bornAt });
  const thread = {
    threadId,
    version: 1,
    status: "frozen",
    identity,
    genome: { textualTraits: {}, runtimeBaselines: structuredClone(runtimeBaselines) },
    currentState: {
      needs: [],
      feelings: [],
      selfModel: `I am ${identity.name}.`,
      unresolvedIntentions: [],
    },
    accounts: { fibreCredits: 0, usdAvailable: 0, modelTokensAvailable: 0 },
    relationshipRefs: [],
    memoryRefs: [],
    provenance: { createdAt, createdBy: "fibre.genesis" },
  };
  validateThreadSnapshot(thread);
  assertModernGenesisThreadIdentity(thread);
  return thread;
}

function durableMeaning(output) {
  return output.outcome === "durable_meaning" || output.outcome === "revised";
}

function memoryRevision({ candidate, memory, output, revision, asOf, publicationAt, supportingEvidenceRefs = [] }) {
  const hasMeaning = durableMeaning(output);
  return normalizeAutobiographicalMemory({
    recordFormat: AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
    memoryId: memory.memoryRef,
    revision,
    threadId: candidate.threadId,
    subject: { originEventRef: memory.origin.eventId, slot: memory.slot },
    subjectPeriod: {
      startAt: memory.cited[0].episode.occurredAt,
      endAt: memory.cited[memory.cited.length - 1].episode.occurredAt,
    },
    eventRefs: [...memory.eventRefs],
    rememberedContent: memory.rememberedContent,
    rememberedMeaning: hasMeaning ? output.summary : null,
    meaningOutcome: hasMeaning ? "durable_meaning" : "no_durable_meaning",
    meaningParts: hasMeaning ? structuredClone(output.parts) : [],
    asOf,
    confidence: 0.5,
    uncertainty: [...memory.uncertainty],
    salience: 0.5,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { ...AUTOBIOGRAPHICAL_MEMORY_POLICY },
    },
    supportingEvidenceRefs: [...supportingEvidenceRefs],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: revision === 1 ? "current" : "corrected",
    recordedAt: publicationAt,
    ...(revision === 1 ? {} : { supersedesRevision: revision - 1 }),
  });
}

export function materializeGenesisMemoryRecords(candidate, publicationAt) {
  const initialByMemory = new Map(candidate.passCInitial.map((item) => [item.memoryRef, item.output]));
  const records = [];
  for (const memory of candidate.memories) {
    const initial = initialByMemory.get(memory.memoryRef);
    if (!initial) fail(`candidate memory ${memory.memoryRef} lacks its initial Pass-C result`);
    let revision = 1;
    const supportingEvidenceRefs = [];
    records.push(memoryRevision({
      candidate,
      memory,
      output: initial,
      revision,
      asOf: memory.initialMeaningFormedAt,
      publicationAt,
    }));
    for (const interpretation of memory.reinterpretations ?? []) {
      if (interpretation.outcome !== "revised") continue;
      revision += 1;
      if (!supportingEvidenceRefs.includes(interpretation.supportingEventRef)) {
        supportingEvidenceRefs.push(interpretation.supportingEventRef);
      }
      records.push(memoryRevision({
        candidate,
        memory,
        output: interpretation.output,
        revision,
        asOf: interpretation.asOf,
        publicationAt,
        supportingEvidenceRefs,
      }));
    }
  }
  return Object.freeze(records);
}

function buildSyntheticLineageRelations({ candidate, slotPlan, thread, publicationAt }) {
  if (candidate.originMode !== "synthetic_lineage") return [];
  const owners = slotPlan.genome.header.sourceEligibility?.sourceOwners ?? [];
  const seedEventId = normalizeSeedSnapshot(thread).provenance.lastEventId;
  return owners.map((owner) => normalizeLifeRelation({
    relationId: lifeRelationId({
      threadId: candidate.threadId,
      relatedPartyId: owner.ownerId,
      relationKind: "biological_parent",
      geneticContributionRole: "parent_genome_source",
    }),
    revision: 1,
    threadId: candidate.threadId,
    relatedParty: { partyId: owner.ownerId, kind: "synthetic_ancestor", displayName: owner.ownerId },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: [seedEventId],
    validFrom: slotPlan.bornAt,
    validTo: null,
    visibility: "private",
    status: "current",
    provenance: "genesis_created",
    recordedAt: publicationAt,
  }));
}

function buildManifest({ candidate, slotPlan, thread, memories, cognition, publicationAt }) {
  const parentOrAncestorRefs = candidate.originMode === "synthetic_lineage"
    ? slotPlan.genome.header.sourceEligibility.sourceOwners.map((owner) => owner.ownerId)
    : [];
  return normalizeGenesisManifest({
    genesisId: candidate.genesisId,
    threadId: candidate.threadId,
    originMode: candidate.originMode,
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: slotPlan.chronologyEndsAt,
      justification: "Fibre admits a bounded prior life through age 21.9999 before young-adult entry.",
      policyRef: "genesis-young-adult-entry-v1",
    },
    worldSpecRef: candidate.worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs,
    genomeRef: slotPlan.genome.header.genomeId,
    ...(Array.isArray(slotPlan.subjectIdentity?.raisedLanguages)
      ? { raisedLanguages:Object.freeze([...slotPlan.subjectIdentity.raisedLanguages]) }
      : {}),
    cognition,
    publication: {
      status: "published",
      publishedAt: publicationAt,
      resultingThreadVersion: thread.version + candidate.episodes.length + memories.length,
    },
    createdAt: candidate.attemptStartedAt,
  });
}

function assertCandidateMatchesPlan(candidate, slotPlan) {
  if (candidate.threadId !== slotPlan.threadId || candidate.genesisId !== slotPlan.genesisId) fail("candidate identity does not match current Genesis plan");
  if (candidate.originMode !== slotPlan.originMode) fail("candidate origin mode does not match current Genesis plan");
  if (candidate.worldSpecDigest !== slotPlan.worldSpecDigest || candidate.genomeDigest !== slotPlan.genomeDigest) fail("candidate World/genome binding does not match current Genesis plan");
  if (candidate.envelopePlanDigest !== slotPlan.envelopePlan.digest) fail("candidate historical envelope plan does not match current Genesis plan");
  assertGenesisCandidatePlaceConsistency({ candidate, slotPlan, ErrorType: Error });
}

export function buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt } = {}) {
  if (!candidate || !slotPlan || !cognition) throw new TypeError("Genesis birth bundle requires candidate, slotPlan and cognition");
  if (typeof publicationAt !== "string" || !Number.isFinite(Date.parse(publicationAt))) throw new TypeError("Genesis birth bundle publicationAt is required");
  assertCandidateMatchesPlan(candidate, slotPlan);
  if (!Array.isArray(slotPlan.roster?.participants) || slotPlan.roster.participants.length === 0) fail("current Genesis birth requires the authoritative initial roster");
  if (!candidate.lifeContinuity || candidate.episodes.length === 0) fail("current Genesis birth requires admitted history plus derived life continuity");

  const seedThread = buildNeutralGenesisThreadSeed({
    threadId: candidate.threadId,
    createdAt: candidate.attemptStartedAt,
    subjectIdentity: slotPlan.subjectIdentity,
    worldSpec: slotPlan.worldSpec,
    bornAt: slotPlan.bornAt,
    runtimeBaselines:slotPlan.genome.runtimeBaselines,
  });
  const parentIds = (slotPlan.genome.header.sourceEligibility?.sourceOwners ?? []).map((owner) => owner.ownerId);
  const thread = attachGenesisCanonicalVisualIdentity(
    { thread: seedThread },
    buildGenesisCanonicalVisualIdentity({
      threadId: candidate.threadId,
      sex: seedThread.identity.sex,
      originMode: candidate.originMode,
      parentIds,
      birthCity: slotPlan.subjectIdentity?.birthCity ?? null,
      heritage: slotPlan.subjectIdentity?.heritage ?? null,
      appearanceContext: slotPlan.subjectIdentity?.appearanceContext ?? null,
    }),
  ).thread;
  validateThreadSnapshot(thread);
  assertModernGenesisThreadIdentity(thread);
  const memories = materializeGenesisMemoryRecords(candidate, publicationAt);
  const manifest = buildManifest({ candidate, slotPlan, thread, memories, cognition, publicationAt });
  const lifeRelations = buildSyntheticLineageRelations({ candidate, slotPlan, thread, publicationAt });
  return Object.freeze({
    manifest,
    thread,
    episodes: structuredClone(candidate.episodes),
    memories,
    lifeRelations: Object.freeze(lifeRelations),
    initialRoster: structuredClone(slotPlan.roster.participants),
    lifeContinuity: structuredClone(candidate.lifeContinuity),
    historicalEnvelopePlan: structuredClone(slotPlan.envelopePlan),
    originFixture: null,
  });
}

export function buildGenesisAdmissionPackage({
  candidate,
  slotPlan,
  cognition,
  publicationAt,
  randomIntFn,
} = {}) {
  const birth = buildGenesisBirthBundle({ candidate, slotPlan, cognition, publicationAt });
  const fibreIdentityNumber = mintFibreIdentityNumber({ randomIntFn });
  const civilRegistration = buildFibreCivilRegistration({
    threadId: birth.manifest.threadId,
    fibreIdentityNumber,
    registeredAt: birth.manifest.publication.publishedAt,
    birthEventRef: normalizeSeedSnapshot(birth.thread).provenance.lastEventId,
    worldRef: birth.manifest.worldSpecRef,
  });
  const manifest = normalizeGenesisManifest({
    ...birth.manifest,
    publication: {
      ...birth.manifest.publication,
      civilRegistration,
    },
  });
  return Object.freeze({
    ...birth,
    manifest,
    civilRegistration,
    worldSpec: structuredClone(slotPlan.worldSpec),
    symbolicGenomes: Object.freeze([
      ...(slotPlan.parentGenomes ?? []).map((parent) => structuredClone(parent.bundle)),
      structuredClone(slotPlan.genome),
    ]),
  });
}
