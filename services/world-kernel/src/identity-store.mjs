import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_DIGEST,
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  identityDomainDefinition,
} from "./identity-domain-registry.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_V2_DIGEST,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
  identityDomainV2Definition,
} from "./identity-domain-registry-definition.mjs";
import {
  IdentityConflictError,
  IdentityHistoryIntegrityError,
  IdentityNotFoundError,
  identityAssertionDigest,
  normalizeIdentityAssertion,
  rehydrateIdentityAssertion,
} from "./identity-provenance-domain.mjs";
import { assertSingleMaterialProposition } from "./identity-claim-discipline.mjs";
import {
  decodeMemoryVisualCompanionRow,
  persistIdentityAssertionRow,
  persistMemoryVisualCompanionRow,
  verifyMemoryVisualCompanion,
} from "./identity-schema.mjs";
import {
  memoryPhotoRequirementSatisfied,
  normalizeMemoryVisualCompanion,
} from "./memory-visual-companion.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";

const CLAIM_ID_PATTERN = /^icl_[0-9a-f]{64}$/;

export const IDENTITY_VIEW_DERIVATION_POLICY = Object.freeze({
  id: "identity_view_transaction_time",
  version: "1",
});

export const IDENTITY_VIEW_DERIVATION_POLICY_V2 = Object.freeze({
  id: "identity_view_transaction_time",
  version: "2",
});

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function definitionForRegistry(domainId, registryVersion) {
  if (registryVersion === IDENTITY_DOMAIN_REGISTRY_V2_VERSION) {
    return identityDomainV2Definition(domainId);
  }
  return identityDomainDefinition(domainId, { registryVersion });
}

function registryDigest(registryVersion) {
  if (registryVersion === IDENTITY_DOMAIN_REGISTRY_V2_VERSION) {
    return IDENTITY_DOMAIN_REGISTRY_V2_DIGEST;
  }
  if (registryVersion === IDENTITY_DOMAIN_REGISTRY_VERSION) {
    return IDENTITY_DOMAIN_REGISTRY_DIGEST;
  }
  throw new IntegrityError(`unknown identity registry version ${registryVersion}`);
}

function registryDomainBinding(registryVersion, domain) {
  const definition = definitionForRegistry(domain, registryVersion);
  return {
    registryVersion,
    domain,
    domainDigest: `sha256:${sha256(canonicalJson({ registryVersion, domain, definition }))}`,
  };
}

function rowToAssertion(row) {
  const registryVersion = row.registry_version;
  let assertion;
  try {
    assertion = rehydrateIdentityAssertion(
      parseJson(`identity assertion ${row.assertion_id}`, row.assertion_json),
      {
        allowAcceptedCausal: true,
        allowEndogenous: true,
        registryVersion,
      },
    );
  } catch (error) {
    throw new IntegrityError(
      `identity assertion ${row.assertion_id} cannot be rehydrated under recorded registry ${registryVersion}: ${error.message}`,
    );
  }
  const digest = identityAssertionDigest(assertion, { registryVersion });
  if (digest !== row.assertion_digest || canonicalJson(assertion) !== row.assertion_json) {
    throw new IntegrityError(`identity assertion ${row.assertion_id} failed digest/canonical JSON verification`);
  }
  const expected = [
    [row.assertion_id, assertion.assertionId, "assertion ID"],
    [row.claim_id, assertion.claimId, "claim ID"],
    [Number(row.revision), assertion.revision, "revision"],
    [row.thread_id, assertion.threadId, "Thread"],
    [row.domain, assertion.domain, "domain"],
    [row.kind, assertion.kind, "kind"],
    [row.provenance_class, assertion.provenanceClass, "provenance"],
    [row.authorship_kind, assertion.authorship.kind, "authorship"],
    [row.visibility, assertion.visibility, "visibility"],
    [row.status, assertion.status, "status"],
    [row.projection_class, assertion.projectionClass, "projection class"],
    [row.behavioral_status, assertion.behavioralStatus, "behavioral status"],
    [row.effective_at, assertion.effectiveAt, "effectiveAt"],
    [row.recorded_at, assertion.recordedAt, "recordedAt"],
    [row.supersedes_assertion_id, assertion.supersedesAssertionId ?? null, "predecessor"],
  ];
  for (const [actual, value, name] of expected) {
    if (actual !== value) {
      throw new IntegrityError(`identity assertion ${assertion.assertionId} ${name} column mismatch`);
    }
  }
  return { assertion, assertionDigest: digest, registryVersion };
}

const ASSERTION_COLUMNS = `
  assertion_id,claim_id,revision,thread_id,registry_version,domain,kind,provenance_class,
  authorship_kind,visibility,status,projection_class,behavioral_status,
  effective_at,recorded_at,supersedes_assertion_id,assertion_json,assertion_digest
`;

const VISUAL_COLUMNS = `
  companion_id,revision,memory_ref,thread_id,status,representation_kind,
  truth_status,asset_ref,visibility,supersedes_revision,companion_json,
  companion_digest,recorded_at
`;

function sameIdentitySlot(left, right) {
  return left.threadId === right.threadId &&
    left.claimId === right.claimId &&
    left.domain === right.domain &&
    left.kind === right.kind;
}

function samePredicateSlot(left, right) {
  if (left.claimPredicate === undefined && right.claimPredicate === undefined) return true;
  if (left.claimPredicate === undefined || right.claimPredicate === undefined) return false;
  return left.claimPredicate.subject === right.claimPredicate.subject &&
    left.claimPredicate.predicate === right.claimPredicate.predicate;
}

function activeForPassport(assertion) {
  return assertion.status !== "revoked_for_use" && assertion.status !== "historical";
}

function behavioralEscalated(previous, current) {
  return current === "candidate_causal" &&
    previous !== "candidate_causal" &&
    previous !== "accepted_causal";
}

export class IdentityStore {
  #database;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    try {
      if (readOnly) {
        this.#database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      } else {
        this.#database.exec(
          "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
        );
        migrateDatabase(this.#database);
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  queryOnly() {
    return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1;
  }

  #requireThread(threadId) {
    assertId("threadId", threadId);
    const row = this.#database.prepare(
      "SELECT state_json,created_at,updated_at FROM threads WHERE thread_id=?",
    ).get(threadId);
    if (row === undefined) throw new IdentityNotFoundError(`Thread ${threadId} was not found`);
    return {
      thread: parseJson(`Thread ${threadId}`, row.state_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  #historyRows(threadId, claimId) {
    return this.#database.prepare(`
      SELECT ${ASSERTION_COLUMNS}
      FROM identity_assertion_records
      WHERE thread_id=? AND claim_id=?
      ORDER BY revision
    `).all(threadId, claimId);
  }

  #validatedHistory(threadId, claimId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#historyRows(threadId, claimId);
    if (rows.length === 0) {
      const foreign = this.#database.prepare(
        "SELECT thread_id FROM identity_assertion_records WHERE claim_id=? LIMIT 1",
      ).get(claimId);
      if (required || foreign !== undefined) {
        throw new IdentityNotFoundError(
          `identity claim ${claimId} was not found for Thread ${threadId}`,
        );
      }
      return [];
    }
    const history = rows.map(rowToAssertion);
    const first = history[0].assertion;
    const claimRegistryVersion = history[0].registryVersion;
    if (first.revision !== 1 || first.supersedesAssertionId !== undefined) {
      throw new IdentityHistoryIntegrityError(`identity claim ${claimId} does not begin at revision 1`);
    }
    for (let index = 0; index < history.length; index += 1) {
      const current = history[index].assertion;
      const expectedRevision = index + 1;
      if (history[index].registryVersion !== claimRegistryVersion) {
        throw new IdentityHistoryIntegrityError(
          `identity claim ${claimId} changes registry version from ${claimRegistryVersion} to ${history[index].registryVersion}`,
        );
      }
      if (current.revision !== expectedRevision) {
        throw new IdentityHistoryIntegrityError(
          `identity claim ${claimId} is not contiguous at revision ${expectedRevision}`,
        );
      }
      if (!sameIdentitySlot(current, first)) {
        throw new IdentityHistoryIntegrityError(`identity claim ${claimId} changes identity slot`);
      }
      if (index === 0) continue;
      const previous = history[index - 1].assertion;
      if (current.supersedesAssertionId !== previous.assertionId) {
        throw new IdentityHistoryIntegrityError(
          `identity claim ${claimId} revision ${current.revision} does not supersede its immediate predecessor`,
        );
      }
      if (Date.parse(current.recordedAt) < Date.parse(previous.recordedAt)) {
        throw new IdentityHistoryIntegrityError(`identity claim ${claimId} recordedAt moves backwards`);
      }
    }
    return history.map((record, index) => ({
      ...record,
      isCurrentRevision: index === history.length - 1,
    }));
  }

  #memoryRefExists(threadId, memoryRef) {
    const { thread } = this.#requireThread(threadId);
    if (Array.isArray(thread.memoryRefs) && thread.memoryRefs.includes(memoryRef)) return true;
    return this.#database.prepare(
      "SELECT 1 AS present FROM thread_memories WHERE thread_id=? AND memory_id=?",
    ).get(threadId, memoryRef) !== undefined;
  }

  getAssertion(threadId, assertionId, { required = true } = {}) {
    this.#requireThread(threadId);
    const row = this.#database.prepare(`
      SELECT claim_id
      FROM identity_assertion_records
      WHERE thread_id=? AND assertion_id=?
    `).get(threadId, assertionId);
    if (row === undefined) {
      const foreign = this.#database.prepare(
        "SELECT thread_id FROM identity_assertion_records WHERE assertion_id=? LIMIT 1",
      ).get(assertionId);
      if (required || foreign !== undefined) {
        throw new IdentityNotFoundError(
          `identity assertion ${assertionId} was not found for Thread ${threadId}`,
        );
      }
      return null;
    }
    const record = this.#validatedHistory(threadId, row.claim_id)
      .find(({ assertion }) => assertion.assertionId === assertionId);
    if (record === undefined) {
      throw new IdentityHistoryIntegrityError(`identity assertion ${assertionId} disappeared from its claim history`);
    }
    return record;
  }

  listClaimHistory(threadId, claimId) {
    assertId("claimId", claimId);
    return this.#validatedHistory(threadId, claimId, { required: false });
  }

  listAllAssertions(threadId) {
    this.#requireThread(threadId);
    const claimRows = this.#database.prepare(`
      SELECT DISTINCT claim_id FROM identity_assertion_records
      WHERE thread_id=? ORDER BY claim_id
    `).all(threadId);
    return claimRows.flatMap(({ claim_id: claimId }) =>
      this.#validatedHistory(threadId, claimId));
  }

  getIdentityViewAsOf(threadId, asOf) {
    assertIsoTimestamp("asOf", asOf);
    this.#requireThread(threadId);
    const claimRows = this.#database.prepare(`
      SELECT DISTINCT claim_id
      FROM identity_assertion_records
      WHERE thread_id=? AND recorded_at<=?
      ORDER BY claim_id
    `).all(threadId, asOf);
    const assertions = [];
    for (const { claim_id: claimId } of claimRows) {
      const history = this.#validatedHistory(threadId, claimId);
      const eligible = history.filter(({ assertion }) => Date.parse(assertion.recordedAt) <= Date.parse(asOf));
      if (eligible.length !== 0) assertions.push(eligible.at(-1));
    }
    return this.#buildView(threadId, assertions, asOf);
  }

  getCurrentIdentityView(threadId) {
    const { updatedAt } = this.#requireThread(threadId);
    const assertions = [];
    const claimRows = this.#database.prepare(`
      SELECT DISTINCT claim_id
      FROM identity_assertion_records WHERE thread_id=? ORDER BY claim_id
    `).all(threadId);
    for (const { claim_id: claimId } of claimRows) {
      const history = this.#validatedHistory(threadId, claimId);
      assertions.push(history.at(-1));
    }
    const latestIdentity = assertions.reduce(
      (latest, item) => Date.parse(item.assertion.recordedAt) > Date.parse(latest)
        ? item.assertion.recordedAt
        : latest,
      updatedAt,
    );
    return this.#buildView(threadId, assertions, latestIdentity);
  }

  #buildView(threadId, records, asOf) {
    const items = records.map(({ assertion, assertionDigest, registryVersion }) => ({
      assertionId: assertion.assertionId,
      claimId: assertion.claimId,
      threadId: assertion.threadId,
      revision: assertion.revision,
      registryVersion,
      isCurrentRevision: true,
      domain: assertion.domain,
      kind: assertion.kind,
      ...(assertion.claimPredicate === undefined ? {} : { claimPredicate: assertion.claimPredicate }),
      meaning: assertion.meaning,
      provenanceClass: assertion.provenanceClass,
      authorship: assertion.authorship,
      sourceReferences: assertion.sourceReferences,
      effectiveAt: assertion.effectiveAt,
      recordedAt: assertion.recordedAt,
      visibility: assertion.visibility,
      status: assertion.status,
      projectionClass: assertion.projectionClass,
      behavioralStatus: assertion.behavioralStatus,
      admission: assertion.admission,
      assertionDigest,
    }));
    const registryVersions = [...new Set(records.map(({ registryVersion }) => registryVersion))].sort();
    const pureV1 = registryVersions.length <= 1 &&
      (registryVersions.length === 0 || registryVersions[0] === IDENTITY_DOMAIN_REGISTRY_VERSION);
    if (pureV1) {
      const view = {
        threadId,
        asOf,
        derivationPolicy: IDENTITY_VIEW_DERIVATION_POLICY,
        registry: {
          version: IDENTITY_DOMAIN_REGISTRY_VERSION,
          digest: IDENTITY_DOMAIN_REGISTRY_DIGEST,
        },
        assertions: items,
      };
      return {
        ...view,
        viewDigest: `sha256:${sha256(canonicalJson(view))}`,
      };
    }
    const bindingMap = new Map();
    for (const { assertion, registryVersion } of records) {
      const key = `${registryVersion}:${assertion.domain}`;
      if (!bindingMap.has(key)) {
        bindingMap.set(key, registryDomainBinding(registryVersion, assertion.domain));
      }
    }
    const registryBindings = [...bindingMap.values()].sort((left, right) =>
      `${left.registryVersion}:${left.domain}`.localeCompare(`${right.registryVersion}:${right.domain}`));
    const view = {
      threadId,
      asOf,
      derivationPolicy: IDENTITY_VIEW_DERIVATION_POLICY_V2,
      registryBindings,
      assertions: items,
    };
    return {
      ...view,
      viewDigest: `sha256:${sha256(canonicalJson(view))}`,
    };
  }

  getPassport(threadId) {
    const { createdAt } = this.#requireThread(threadId);
    const view = this.getCurrentIdentityView(threadId);
    const active = view.assertions.filter(activeForPassport);
    const by = (domain, kind) => active.filter(
      (assertion) => assertion.domain === domain && assertion.kind === kind,
    );
    const names = this.listAllAssertions(threadId)
      .map(({ assertion }) => assertion)
      .filter((assertion) => assertion.domain === "passport_name" && assertion.kind === "canonical_name");
    const canonical = by("passport_name", "canonical_name").at(-1) ?? null;
    const origin = by("passport_origin", "origin_orientation").at(-1) ?? null;
    const birthPlace = by("geography", "birth_place").at(-1) ?? null;
    const selfDescription = active
      .filter((assertion) =>
        assertion.domain === "self_authored_identity" &&
        assertion.kind === "self_description" &&
        assertion.visibility === "public")
      .at(-1) ?? null;
    if (canonical === null) {
      throw new IntegrityError(`Thread ${threadId} identity ledger has no current canonical_name assertion`);
    }
    if (origin === null) {
      throw new IntegrityError(`Thread ${threadId} identity ledger has no current origin_orientation assertion`);
    }
    const priorNames = names
      .filter((assertion) => canonical === null || assertion.assertionId !== canonical.assertionId)
      .map((assertion) => ({
        meaning: assertion.meaning,
        assertionId: assertion.assertionId,
        effectiveAt: assertion.effectiveAt,
        recordedAt: assertion.recordedAt,
      }));
    const common = {
      threadId,
      canonicalName: canonical.meaning,
      canonicalNameAssertionId: canonical.assertionId,
      priorNames,
      originOrientation: origin.meaning,
      originAssertionId: origin.assertionId,
      createdAt,
      birthPlace: birthPlace?.meaning ?? null,
      birthPlaceAssertionId: birthPlace?.assertionId ?? null,
      publicSelfDescription: selfDescription?.meaning ?? null,
      publicSelfDescriptionAssertionId: selfDescription?.assertionId ?? null,
      currentIdentityViewDigest: view.viewDigest,
      derivationPolicy: view.derivationPolicy,
    };
    const passport = view.derivationPolicy.version === "1"
      ? {
          ...common,
          registryVersion: IDENTITY_DOMAIN_REGISTRY_VERSION,
          registryDigest: IDENTITY_DOMAIN_REGISTRY_DIGEST,
        }
      : {
          ...common,
          registryBindings: view.registryBindings,
        };
    return {
      ...passport,
      passportDigest: `sha256:${sha256(canonicalJson(passport))}`,
    };
  }

  getMemoryVisualCompanionHistory(threadId, memoryRef, { required = true } = {}) {
    assertId("memoryRef", memoryRef);
    this.#requireThread(threadId);
    const rows = this.#database.prepare(`
      SELECT ${VISUAL_COLUMNS}
      FROM memory_visual_companion_records
      WHERE thread_id=? AND memory_ref=? ORDER BY revision
    `).all(threadId, memoryRef);
    if (rows.length === 0) {
      if (required) throw new IdentityNotFoundError(`memory ${memoryRef} has no visual companion for Thread ${threadId}`);
      return [];
    }
    const history = rows.map(decodeMemoryVisualCompanionRow);
    for (let index = 0; index < history.length; index += 1) {
      const companion = history[index].companion;
      if (companion.revision !== index + 1) {
        throw new IntegrityError(`memory visual companion ${companion.companionId} has non-contiguous revisions`);
      }
      if (index > 0) {
        const prior = history[index - 1].companion;
        if (
          companion.companionId !== prior.companionId ||
          companion.threadId !== prior.threadId ||
          companion.memoryRef !== prior.memoryRef ||
          companion.supersedesRevision !== prior.revision ||
          Date.parse(companion.recordedAt) < Date.parse(prior.recordedAt)
        ) {
          throw new IntegrityError(`memory visual companion ${companion.companionId} history is incoherent`);
        }
      }
    }
    return history;
  }

  listMemoryVisualCompanions(threadId) {
    const { thread } = this.#requireThread(threadId);
    const refs = new Set(Array.isArray(thread.memoryRefs) ? thread.memoryRefs : []);
    for (const row of this.#database.prepare(
      "SELECT memory_id FROM thread_memories WHERE thread_id=?",
    ).all(threadId)) refs.add(row.memory_id);
    return [...refs].sort().map((memoryRef) =>
      this.getMemoryVisualCompanionHistory(threadId, memoryRef).at(-1));
  }

  recordAssertion(candidate) {
    if (this.#readOnly) throw new IdentityConflictError("read-only identity store cannot record assertions");
    if (candidate?.admission?.policy?.id === "legacy_projection_drift_migration") {
      throw new IdentityConflictError("legacy migration observation policy is not a public identity authoring surface");
    }
    if (typeof candidate?.claimId !== "string" || !CLAIM_ID_PATTERN.test(candidate.claimId)) {
      throw new TypeError("identity assertion.claimId must be icl_ followed by 64 lowercase hex characters");
    }
    assertSingleMaterialProposition(candidate?.meaning);

    const existingClaimRegistry = this.#database.prepare(`
      SELECT registry_version FROM identity_assertion_records
      WHERE claim_id=? ORDER BY revision LIMIT 1
    `).get(candidate.claimId)?.registry_version;
    const registryVersion = existingClaimRegistry ?? IDENTITY_DOMAIN_REGISTRY_V2_VERSION;
    const assertion = normalizeIdentityAssertion(candidate, { registryVersion });
    const { createdAt } = this.#requireThread(assertion.threadId);
    if (Date.parse(assertion.recordedAt) < Date.parse(createdAt)) {
      throw new IdentityConflictError("identity assertion cannot be recorded before Thread creation");
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const priorById = this.#database.prepare(`
        SELECT ${ASSERTION_COLUMNS} FROM identity_assertion_records WHERE assertion_id=?
      `).get(assertion.assertionId);
      if (priorById !== undefined) {
        const prior = rowToAssertion(priorById);
        if (prior.registryVersion !== registryVersion || canonicalJson(prior.assertion) !== canonicalJson(assertion)) {
          throw new IdentityConflictError(
            `identity assertion ${assertion.assertionId} already exists with different content or registry semantics`,
          );
        }
        this.#database.exec("COMMIT");
        return { ...prior, isCurrentRevision: true, idempotent: true };
      }

      const history = this.#validatedHistory(assertion.threadId, assertion.claimId, {
        required: false,
      });
      if (assertion.revision === 1) {
        if (history.length !== 0) {
          throw new IdentityConflictError(`identity claim ${assertion.claimId} already exists`);
        }
        const definition = definitionForRegistry(assertion.domain, registryVersion);
        if (definition.authoringStatus === "superseded") {
          throw new IdentityConflictError(
            `identity domain ${assertion.domain} is superseded for new authoring by ${definition.supersededBy.join(", ")}`,
          );
        }
        if (definition.singletonKinds.includes(assertion.kind)) {
          const other = this.#database.prepare(`
            SELECT claim_id FROM identity_assertion_records
            WHERE thread_id=? AND domain=? AND kind=? AND claim_id<>?
            LIMIT 1
          `).get(
            assertion.threadId,
            assertion.domain,
            assertion.kind,
            assertion.claimId,
          );
          if (other !== undefined) {
            throw new IdentityConflictError(
              `identity slot ${assertion.domain}/${assertion.kind} must revise existing claim ${other.claim_id}`,
            );
          }
        }
      } else {
        if (history.length !== assertion.revision - 1) {
          throw new IdentityConflictError(
            `identity claim ${assertion.claimId} expected revision ${history.length + 1}, got ${assertion.revision}`,
          );
        }
        const previous = history.at(-1);
        if (previous.registryVersion !== registryVersion) {
          throw new IdentityConflictError(
            `identity claim ${assertion.claimId} cannot change registry version`,
          );
        }
        if (!sameIdentitySlot(assertion, previous.assertion)) {
          throw new IdentityConflictError(`identity claim ${assertion.claimId} changes identity slot`);
        }
        if (!samePredicateSlot(assertion, previous.assertion)) {
          throw new IdentityConflictError(`identity claim ${assertion.claimId} changes claim predicate subject/predicate`);
        }
        if (assertion.supersedesAssertionId !== previous.assertion.assertionId) {
          throw new IdentityConflictError(
            `identity claim ${assertion.claimId} must supersede ${previous.assertion.assertionId}`,
          );
        }
        if (Date.parse(assertion.recordedAt) < Date.parse(previous.assertion.recordedAt)) {
          throw new IdentityConflictError(`identity claim ${assertion.claimId} recordedAt moves backwards`);
        }
        if (behavioralEscalated(previous.assertion.behavioralStatus, assertion.behavioralStatus)) {
          const previousRefs = new Set(previous.assertion.sourceReferences);
          const hasEvidenceDelta = assertion.sourceReferences.some((reference) => !previousRefs.has(reference));
          if (assertion.meaning === previous.assertion.meaning || !hasEvidenceDelta) {
            throw new IdentityConflictError(
              `identity claim ${assertion.claimId} behavioral escalation requires changed meaning and new evidence`,
            );
          }
        }
      }

      const stored = persistIdentityAssertionRow(this.#database, assertion, { registryVersion });
      this.#database.exec("COMMIT");
      return { ...stored, isCurrentRevision: true, idempotent: false };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  recordMemoryVisualCompanion(candidate) {
    if (this.#readOnly) throw new IdentityConflictError("read-only identity store cannot record memory visuals");
    const companion = normalizeMemoryVisualCompanion(candidate);
    const { createdAt } = this.#requireThread(companion.threadId);
    if (!this.#memoryRefExists(companion.threadId, companion.memoryRef)) {
      throw new IdentityNotFoundError(
        `memory ${companion.memoryRef} is not part of Thread ${companion.threadId}`,
      );
    }
    if (Date.parse(companion.recordedAt) < Date.parse(createdAt)) {
      throw new IdentityConflictError("memory visual cannot be recorded before Thread creation");
    }
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const existingRow = this.#database.prepare(`
        SELECT ${VISUAL_COLUMNS}
        FROM memory_visual_companion_records
        WHERE companion_id=? AND revision=?
      `).get(companion.companionId, companion.revision);
      if (existingRow !== undefined) {
        const existing = decodeMemoryVisualCompanionRow(existingRow);
        if (canonicalJson(existing.companion) !== canonicalJson(companion)) {
          throw new IdentityConflictError(
            `memory visual ${companion.companionId} revision ${companion.revision} already exists with different content`,
          );
        }
        this.#database.exec("COMMIT");
        return { ...existing, idempotent: true };
      }
      const history = this.getMemoryVisualCompanionHistory(
        companion.threadId,
        companion.memoryRef,
        { required: false },
      );
      if (history.length !== companion.revision - 1) {
        throw new IdentityConflictError(
          `memory visual ${companion.companionId} expected revision ${history.length + 1}, got ${companion.revision}`,
        );
      }
      if (history.length > 0) {
        const prior = history.at(-1).companion;
        if (companion.representationKind !== prior.representationKind) {
          throw new IdentityConflictError(
            `memory visual ${companion.companionId} cannot change representation kind; captured evidence and synthetic reconstruction are different lineages`,
          );
        }
        if (companion.supersedesRevision !== prior.revision) {
          throw new IdentityConflictError(`memory visual ${companion.companionId} must supersede revision ${prior.revision}`);
        }
        if (Date.parse(companion.recordedAt) < Date.parse(prior.recordedAt)) {
          throw new IdentityConflictError(`memory visual ${companion.companionId} recordedAt moves backwards`);
        }
      }
      const stored = persistMemoryVisualCompanionRow(this.#database, companion);
      this.#database.exec("COMMIT");
      return { ...stored, idempotent: false };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
  }

  verifyThreadIdentityIntegrity(threadId) {
    const { thread } = this.#requireThread(threadId);
    const claims = this.#database.prepare(`
      SELECT DISTINCT claim_id FROM identity_assertion_records
      WHERE thread_id=? ORDER BY claim_id
    `).all(threadId);
    let assertions = 0;
    let acceptedCausal = 0;
    let endogenous = 0;
    const registryVersions = new Set();
    for (const { claim_id: claimId } of claims) {
      const history = this.#validatedHistory(threadId, claimId);
      assertions += history.length;
      history.forEach(({ registryVersion }) => registryVersions.add(registryVersion));
      acceptedCausal += history.filter(
        ({ assertion }) => assertion.behavioralStatus === "accepted_causal",
      ).length;
      endogenous += history.filter(
        ({ assertion }) => assertion.admission.evidenceClassification === "endogenous",
      ).length;
    }

    const memoryRefs = new Set(Array.isArray(thread.memoryRefs) ? thread.memoryRefs : []);
    const storedMemories = this.#database.prepare(
      "SELECT memory_id FROM thread_memories WHERE thread_id=?",
    ).all(threadId);
    for (const row of storedMemories) memoryRefs.add(row.memory_id);
    const visualCompanions = [];
    const memoriesMissingPhoto = [];
    for (const memoryRef of [...memoryRefs].sort()) {
      const visual = verifyMemoryVisualCompanion(this.#database, threadId, memoryRef);
      this.getMemoryVisualCompanionHistory(threadId, memoryRef);
      if (!memoryPhotoRequirementSatisfied(visual.companion)) {
        memoriesMissingPhoto.push(memoryRef);
      }
      visualCompanions.push({
        memoryRef,
        companionId: visual.companion.companionId,
        revision: visual.companion.revision,
        status: visual.companion.status,
        truthStatus: visual.companion.truthStatus,
        photoRequirementSatisfied: memoryPhotoRequirementSatisfied(visual.companion),
      });
    }

    const passport = this.getPassport(threadId);
    const admittedRegistryVersions = [...registryVersions].sort();
    const singleRegistryVersion = admittedRegistryVersions.length === 1
      ? admittedRegistryVersions[0]
      : null;
    return {
      ok: true,
      threadId,
      registryVersion: singleRegistryVersion,
      registryDigest: singleRegistryVersion === null ? null : registryDigest(singleRegistryVersion),
      admittedRegistryVersions,
      admittedRegistries: admittedRegistryVersions.map((version) => ({
        version,
        digest: registryDigest(version),
      })),
      derivationPolicy: passport.derivationPolicy,
      claimCount: claims.length,
      assertionCount: assertions,
      acceptedCausalAssertions: acceptedCausal,
      endogenousEvidenceAssertions: endogenous,
      memoryVisualCompanionCount: visualCompanions.length,
      memoryVisualCompanions: visualCompanions,
      memoryPhotoRequirementSatisfied: memoriesMissingPhoto.length === 0,
      memoriesMissingPhotoCount: memoriesMissingPhoto.length,
      memoriesMissingPhoto,
      passportDigest: passport.passportDigest,
      identityViewDigest: passport.currentIdentityViewDigest,
    };
  }

  listThreadIds() {
    return this.#database.prepare("SELECT thread_id FROM threads ORDER BY thread_id")
      .all().map((row) => row.thread_id);
  }
}

export function openIdentityStore(databasePath) {
  return new IdentityStore(databasePath);
}

export function openIdentityInspectionStore(databasePath) {
  return new IdentityStore(databasePath, { readOnly: true });
}
