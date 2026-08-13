import { DatabaseSync } from "node:sqlite";
import { canonicalJson } from "./persistence-common.mjs";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";
import {
  embodimentSubjectDigest,
  normalizeEmbodimentRepresentation,
} from "./embodiment-domain.mjs";
import { normalizeEmbodimentRightsAuthority } from "./embodiment-rights-domain.mjs";
import {
  EmbodimentConflictError,
  EmbodimentNotFoundError,
  EmbodimentStore as IntegrityEmbodimentStore,
} from "./embodiment-store-personhood-v2.mjs";

export { EmbodimentConflictError, EmbodimentNotFoundError };

const VISIBILITY_RANK = Object.freeze({ private: 0, restricted: 1, public: 2 });
const RIGHTS_GROUNDED_BASES = new Set(["explicit_consent", "public_domain_source"]);

function isSuperset(next, prior) {
  const set = new Set(next);
  return prior.every((item) => set.has(item));
}

function rightsGrounded(record) {
  return RIGHTS_GROUNDED_BASES.has(record.rightsBasis);
}

export class EmbodimentStore {
  #databasePath;
  #inner;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#databasePath = normalizeDatabasePath(databasePath);
    this.#readOnly = readOnly;
    this.#inner = new IntegrityEmbodimentStore(databasePath, { readOnly });
  }

  close() { return this.#inner.close(); }
  queryOnly() { return this.#inner.queryOnly(); }
  recordRightsAuthority(...args) { return this.#inner.recordRightsAuthority(...args); }

  #withReadDatabase(run) {
    const database = new DatabaseSync(this.#databasePath, { readOnly: true, enableForeignKeyConstraints: true });
    try { return run(database); } finally { database.close(); }
  }

  #originEvent(threadId) {
    return this.#withReadDatabase((database) => {
      const row = database.prepare(
        "SELECT event_id FROM thread_events WHERE thread_id=? ORDER BY sequence ASC LIMIT 1",
      ).get(threadId);
      if (!row) throw new EmbodimentNotFoundError(`Thread ${threadId} has no durable origin event`);
      return row.event_id;
    });
  }

  #evidenceExists(threadId, reference) {
    return this.#withReadDatabase((database) => Boolean(
      database.prepare("SELECT 1 FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, reference) ||
      database.prepare("SELECT 1 FROM situated_evidence_witnesses WHERE thread_id=? AND reference=?").get(threadId, reference) ||
      database.prepare("SELECT 1 FROM identity_assertion_records WHERE thread_id=? AND assertion_id=?").get(threadId, reference)
    ));
  }

  #authority(reference, record) {
    return this.#withReadDatabase((database) => {
      const row = database.prepare(
        "SELECT record_json FROM embodiment_rights_authorities WHERE authority_id=? AND thread_id=?",
      ).get(reference, record.threadId);
      if (!row) throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not exist for Thread ${record.threadId}`);
      const authority = normalizeEmbodimentRightsAuthority(JSON.parse(row.record_json));
      if (canonicalJson(authority) !== row.record_json) throw new EmbodimentConflictError(`embodiment rights authority ${reference} is not canonical`);
      if (authority.authorityKind !== record.rightsBasis) throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not establish ${record.rightsBasis}`);
      if (!authority.permittedKinds.includes(record.kind)) throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not permit ${record.kind}`);
      if (authority.sourcePartyId !== record.specification.subject.partyId) {
        throw new EmbodimentConflictError(`embodiment rights authority ${reference} is for a different depicted subject`);
      }
      return authority;
    });
  }

  #validateTransition(record, history) {
    if (history.length === 0) {
      if (record.respecification !== null) throw new EmbodimentConflictError("first embodiment revision cannot be a respecification");
      return;
    }
    const first = history[0];
    const prior = history.at(-1);
    if (record.specification.subject.partyId !== first.specification.subject.partyId) {
      throw new EmbodimentConflictError("embodiment lineage cannot change who it depicts");
    }

    const subjectChanged = embodimentSubjectDigest(record.specification) !== embodimentSubjectDigest(prior.specification);
    if (subjectChanged) {
      if (record.respecification === null) throw new EmbodimentConflictError("depicted subject change requires witnessed respecification");
      if (record.respecification.priorSpecificationDigest !== prior.specificationDigest) {
        throw new EmbodimentConflictError("respecification must bind the immediate prior specification digest");
      }
      for (const reference of record.respecification.evidenceReferences) {
        if (!this.#evidenceExists(record.threadId, reference)) {
          throw new EmbodimentConflictError(`embodiment respecification reference ${reference} is not durable Thread evidence`);
        }
      }
    } else if (record.respecification !== null) {
      throw new EmbodimentConflictError("respecification is only valid when the depicted subject changes");
    }

    if (rightsGrounded(record)) {
      if (!isSuperset(record.sourceReferences, prior.sourceReferences)) {
        throw new EmbodimentConflictError("rights-grounded embodiment cannot discard prior source evidence");
      }
      if (!isSuperset(record.permissionReferences, prior.permissionReferences)) {
        throw new EmbodimentConflictError("rights-grounded embodiment cannot discard prior permission authority");
      }
      const authorities = record.permissionReferences.map((reference) => this.#authority(reference, record));
      const sourcePartyIds = new Set(authorities.map((authority) => authority.sourcePartyId));
      if (sourcePartyIds.size !== 1) throw new EmbodimentConflictError("rights-grounded embodiment must resolve to one depicted source identity");
      if (VISIBILITY_RANK[record.visibility] > VISIBILITY_RANK[prior.visibility]) {
        const newRefs = record.permissionReferences.filter((reference) => !prior.permissionReferences.includes(reference));
        if (newRefs.length === 0) throw new EmbodimentConflictError("widening rights-grounded embodiment visibility requires new rights authority");
        const newAuthorities = newRefs.map((reference) => this.#authority(reference, record));
        if (!newAuthorities.some((authority) => VISIBILITY_RANK[authority.maxVisibility] >= VISIBILITY_RANK[record.visibility])) {
          throw new EmbodimentConflictError("new rights authority does not permit widened embodiment visibility");
        }
      }
    }
  }

  history(threadId, embodimentId, options) {
    const records = this.#inner.history(threadId, embodimentId, options);
    for (let index = 1; index < records.length; index += 1) {
      this.#validateTransition(records[index], records.slice(0, index));
    }
    return records;
  }

  listCurrent(threadId) {
    const current = this.#inner.listCurrent(threadId);
    for (const record of current) this.history(threadId, record.embodimentId);
    return current;
  }

  record(candidate) {
    if (this.#readOnly) throw new EmbodimentConflictError("read-only embodiment store cannot write");
    const groundedCandidate = candidate?.representationKind === "synthetic_generation"
      ? { ...candidate, sourceReferences: [this.#originEvent(candidate.threadId)] }
      : candidate;
    const record = normalizeEmbodimentRepresentation(groundedCandidate);
    if (rightsGrounded(record)) {
      const authorities = record.permissionReferences.map((reference) => this.#authority(reference, record));
      if (!authorities.some((authority) => VISIBILITY_RANK[authority.maxVisibility] >= VISIBILITY_RANK[record.visibility])) {
        throw new EmbodimentConflictError(`no embodiment rights authority permits ${record.visibility} visibility`);
      }
    }
    const history = this.#inner.history(record.threadId, record.embodimentId, { required: false });
    this.#validateTransition(record, history);
    return this.#inner.record(record);
  }

  inspectThread(threadId) {
    return { threadId, embodiment: this.listCurrent(threadId) };
  }
}

export function openEmbodimentStore(databasePath) {
  return new EmbodimentStore(databasePath);
}

export function openEmbodimentInspectionStore(databasePath) {
  return new EmbodimentStore(databasePath, { readOnly: true });
}
