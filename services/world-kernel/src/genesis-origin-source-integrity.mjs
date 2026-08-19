import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  GENESIS_INTELLECTUAL_ENCOUNTER_KINDS,
  GENESIS_INTELLECTUAL_SUBJECT_KINDS,
  genesisIntellectualSubjectRef,
} from "./genesis-intellectual-encounter.mjs";
import { normalizeRichPassAEpisode } from "./genesis-rich-life-episode.mjs";

export const GENESIS_SOURCE_ORIGIN_KINDS = Object.freeze([
  "thread_parent",
  "echo",
  "homage",
  "fork",
]);

export const GENESIS_SOURCE_SUBJECT_STATUSES = Object.freeze([
  "living",
  "deceased",
  "fictional",
]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function assertUnique(name, values) {
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must not contain duplicates`);
}

function normalizeThreadParent(candidate) {
  assertPlainObject("originFixture.threadParent", candidate);
  assertExactKeys("originFixture.threadParent", candidate, [
    "parentThreadRefs",
    "inheritanceWitnessRefs",
    "retrospectiveSharedHistoryRefs",
  ]);
  assertStringArray("originFixture.threadParent.parentThreadRefs", candidate.parentThreadRefs);
  assertStringArray("originFixture.threadParent.inheritanceWitnessRefs", candidate.inheritanceWitnessRefs);
  assertStringArray("originFixture.threadParent.retrospectiveSharedHistoryRefs", candidate.retrospectiveSharedHistoryRefs);
  if (candidate.parentThreadRefs.length === 0) throw new TypeError("thread-parent origin requires at least one parent Thread");
  assertUnique("originFixture.threadParent.parentThreadRefs", candidate.parentThreadRefs);
  if (candidate.retrospectiveSharedHistoryRefs.length !== 0) {
    throw new TypeError("thread-parent origin cannot fabricate retrospective shared childhood history");
  }
  return Object.freeze({
    parentThreadRefs: Object.freeze([...candidate.parentThreadRefs]),
    inheritanceWitnessRefs: Object.freeze([...candidate.inheritanceWitnessRefs]),
    retrospectiveSharedHistoryRefs: Object.freeze([]),
  });
}

function normalizeApprovedMaterial(candidate, index) {
  const name = `originFixture.sourceBundle.approvedMaterials[${index}]`;
  assertPlainObject(name, candidate);
  assertExactKeys(name, candidate, ["kind", "subjectKind", "subjectLabel"]);
  assertEnum(`${name}.kind`, candidate.kind, GENESIS_INTELLECTUAL_ENCOUNTER_KINDS);
  assertEnum(`${name}.subjectKind`, candidate.subjectKind, GENESIS_INTELLECTUAL_SUBJECT_KINDS);
  if (candidate.subjectKind === "person") {
    throw new TypeError(`${name}.subjectKind cannot be person; source-person identity is not an intellectual-material shortcut`);
  }
  if (typeof candidate.subjectLabel !== "string" || candidate.subjectLabel.trim() === "") {
    throw new TypeError(`${name}.subjectLabel is required`);
  }
  const subjectRef = genesisIntellectualSubjectRef({
    subjectKind: candidate.subjectKind,
    subjectLabel: candidate.subjectLabel,
    participantRef: null,
  });
  return Object.freeze({
    kind: candidate.kind,
    subjectKind: candidate.subjectKind,
    subjectLabel: candidate.subjectLabel,
    subjectRef,
  });
}

function normalizeSourceBundle(candidate, originKind) {
  assertPlainObject("originFixture.sourceBundle", candidate);
  assertExactKeys("originFixture.sourceBundle", candidate, [
    "sourcePartyId",
    "subjectStatus",
    "consentAuthorityRef",
    "subjectStatusAttestationRef",
    "publicSourceRefs",
    "protectedBiographyFacts",
    "approvedMaterials",
  ]);
  assertId("originFixture.sourceBundle.sourcePartyId", candidate.sourcePartyId);
  assertEnum("originFixture.sourceBundle.subjectStatus", candidate.subjectStatus, GENESIS_SOURCE_SUBJECT_STATUSES);
  assertStringArray("originFixture.sourceBundle.publicSourceRefs", candidate.publicSourceRefs);
  assertStringArray("originFixture.sourceBundle.protectedBiographyFacts", candidate.protectedBiographyFacts);
  if (!Array.isArray(candidate.approvedMaterials)) throw new TypeError("originFixture.sourceBundle.approvedMaterials must be an array");
  const approvedMaterials = candidate.approvedMaterials.map(normalizeApprovedMaterial);
  assertUnique("originFixture.sourceBundle.approvedMaterials.subjectRef", approvedMaterials.map((item) => item.subjectRef));

  if (originKind === "echo") {
    if (candidate.subjectStatus !== "living") throw new TypeError("Echo requires subjectStatus=living");
    assertId("originFixture.sourceBundle.consentAuthorityRef", candidate.consentAuthorityRef);
    if (candidate.subjectStatusAttestationRef !== null) {
      throw new TypeError("Echo does not use a Homage subject-status attestation");
    }
  } else if (originKind === "homage") {
    if (!["deceased", "fictional"].includes(candidate.subjectStatus)) {
      throw new TypeError("Homage requires attested deceased or fictional subject status");
    }
    if (candidate.consentAuthorityRef !== null) {
      throw new TypeError("Homage cannot masquerade as an Echo consent path");
    }
    assertId("originFixture.sourceBundle.subjectStatusAttestationRef", candidate.subjectStatusAttestationRef);
  } else {
    throw new TypeError(`source bundle is not valid for origin ${originKind}`);
  }

  return Object.freeze({
    sourcePartyId: candidate.sourcePartyId,
    subjectStatus: candidate.subjectStatus,
    consentAuthorityRef: candidate.consentAuthorityRef,
    subjectStatusAttestationRef: candidate.subjectStatusAttestationRef,
    publicSourceRefs: Object.freeze([...candidate.publicSourceRefs]),
    protectedBiographyFacts: Object.freeze([...candidate.protectedBiographyFacts]),
    approvedMaterials: Object.freeze(approvedMaterials),
  });
}

function normalizeFork(candidate) {
  assertPlainObject("originFixture.fork", candidate);
  assertExactKeys("originFixture.fork", candidate, [
    "sourceThreadRef",
    "divergenceEventRef",
    "divergenceSequence",
    "inheritedHistoryEventRefs",
    "postForkImportedEventRefs",
  ]);
  assertId("originFixture.fork.sourceThreadRef", candidate.sourceThreadRef);
  assertId("originFixture.fork.divergenceEventRef", candidate.divergenceEventRef);
  assertFiniteNumber("originFixture.fork.divergenceSequence", candidate.divergenceSequence, { integer: true, minimum: 1 });
  assertStringArray("originFixture.fork.inheritedHistoryEventRefs", candidate.inheritedHistoryEventRefs);
  assertStringArray("originFixture.fork.postForkImportedEventRefs", candidate.postForkImportedEventRefs);
  if (candidate.inheritedHistoryEventRefs.length === 0) throw new TypeError("fork requires inherited history through its divergence boundary");
  if (candidate.inheritedHistoryEventRefs.at(-1) !== candidate.divergenceEventRef) {
    throw new TypeError("fork inherited history must end exactly at divergenceEventRef");
  }
  if (candidate.postForkImportedEventRefs.length !== 0) {
    throw new TypeError("fork cannot import source-Thread facts after the divergence boundary");
  }
  assertUnique("originFixture.fork.inheritedHistoryEventRefs", candidate.inheritedHistoryEventRefs);
  return Object.freeze({
    sourceThreadRef: candidate.sourceThreadRef,
    divergenceEventRef: candidate.divergenceEventRef,
    divergenceSequence: candidate.divergenceSequence,
    inheritedHistoryEventRefs: Object.freeze([...candidate.inheritedHistoryEventRefs]),
    postForkImportedEventRefs: Object.freeze([]),
  });
}

export function normalizeGenesisOriginIntegrityFixture(candidate) {
  assertPlainObject("originFixture", candidate);
  assertExactKeys("originFixture", candidate, [
    "fixtureId",
    "threadId",
    "originKind",
    "threadParent",
    "sourceBundle",
    "fork",
  ]);
  assertId("originFixture.fixtureId", candidate.fixtureId);
  assertId("originFixture.threadId", candidate.threadId);
  assertEnum("originFixture.originKind", candidate.originKind, GENESIS_SOURCE_ORIGIN_KINDS);

  let threadParent = null;
  let sourceBundle = null;
  let fork = null;
  if (candidate.originKind === "thread_parent") {
    if (candidate.sourceBundle !== null || candidate.fork !== null) throw new TypeError("thread-parent origin cannot carry sourceBundle or fork authority");
    threadParent = normalizeThreadParent(candidate.threadParent);
  } else if (["echo", "homage"].includes(candidate.originKind)) {
    if (candidate.threadParent !== null || candidate.fork !== null) throw new TypeError(`${candidate.originKind} origin cannot carry thread-parent or fork authority`);
    sourceBundle = normalizeSourceBundle(candidate.sourceBundle, candidate.originKind);
  } else if (candidate.originKind === "fork") {
    if (candidate.threadParent !== null || candidate.sourceBundle !== null) throw new TypeError("fork origin cannot carry thread-parent or human-source authority");
    fork = normalizeFork(candidate.fork);
  }

  return Object.freeze({
    fixtureId: candidate.fixtureId,
    threadId: candidate.threadId,
    originKind: candidate.originKind,
    threadParent,
    sourceBundle,
    fork,
  });
}

export function genesisOriginIntegrityFixtureDigest(candidate) {
  return `sha256:${sha256(canonicalJson(normalizeGenesisOriginIntegrityFixture(candidate)))}`;
}

export function projectOriginSourceForThreadLife(candidate) {
  const fixture = normalizeGenesisOriginIntegrityFixture(candidate);
  if (fixture.originKind === "thread_parent") {
    return Object.freeze({
      fixtureId: fixture.fixtureId,
      threadId: fixture.threadId,
      originKind: fixture.originKind,
      parentThreadRefs: fixture.threadParent.parentThreadRefs,
      inheritanceWitnessRefs: fixture.threadParent.inheritanceWitnessRefs,
    });
  }
  if (fixture.originKind === "fork") {
    return Object.freeze({
      fixtureId: fixture.fixtureId,
      threadId: fixture.threadId,
      originKind: fixture.originKind,
      sourceThreadRef: fixture.fork.sourceThreadRef,
      divergenceEventRef: fixture.fork.divergenceEventRef,
      divergenceSequence: fixture.fork.divergenceSequence,
      inheritedHistoryEventRefs: fixture.fork.inheritedHistoryEventRefs,
    });
  }
  return Object.freeze({
    fixtureId: fixture.fixtureId,
    threadId: fixture.threadId,
    originKind: fixture.originKind,
    sourceDisclosure: Object.freeze({
      sourcePartyId: fixture.sourceBundle.sourcePartyId,
      subjectStatus: fixture.sourceBundle.subjectStatus,
      consentAuthorityRef: fixture.sourceBundle.consentAuthorityRef,
      subjectStatusAttestationRef: fixture.sourceBundle.subjectStatusAttestationRef,
    }),
    approvedMaterials: Object.freeze(fixture.sourceBundle.approvedMaterials.map((material) => Object.freeze({
      kind: material.kind,
      subjectKind: material.subjectKind,
      subjectLabel: material.subjectLabel,
      subjectRef: material.subjectRef,
    }))),
  });
}

export function assertSourceMaterialEncounteredByThread({
  originFixture,
  sourceMaterialRef,
  encounterEpisodeRef,
  episodes,
}) {
  const fixture = normalizeGenesisOriginIntegrityFixture(originFixture);
  if (!["echo", "homage"].includes(fixture.originKind)) {
    throw new TypeError("source-material encounter proof requires Echo or Homage origin");
  }
  assertId("sourceMaterialRef", sourceMaterialRef);
  assertId("encounterEpisodeRef", encounterEpisodeRef);
  if (!Array.isArray(episodes)) throw new TypeError("episodes must be an array");
  const material = fixture.sourceBundle.approvedMaterials.find((item) => item.subjectRef === sourceMaterialRef);
  if (material === undefined) throw new TypeError(`source material ${sourceMaterialRef} is not approved by the origin fixture`);
  const episodeCandidate = episodes.find((item) => item?.episodeId === encounterEpisodeRef);
  if (episodeCandidate === undefined) throw new TypeError(`encounter episode ${encounterEpisodeRef} is not present in Thread history`);
  const episode = normalizeRichPassAEpisode(episodeCandidate, { enforceObservableForm: false });
  if (!episode.participantRefs.includes(fixture.threadId)) throw new TypeError("source-material encounter episode does not involve the origin Thread");
  if (episode.intellectualEncounter === undefined || episode.intellectualEncounter === null) {
    throw new TypeError("source material cannot become Thread formation without an intellectual encounter");
  }
  if (episode.intellectualEncounter.subjectRef !== material.subjectRef) {
    throw new TypeError("Thread encounter does not match the approved source material");
  }
  return Object.freeze({
    fixtureId: fixture.fixtureId,
    threadId: fixture.threadId,
    sourceMaterialRef: material.subjectRef,
    encounterEpisodeRef: episode.episodeId,
  });
}
