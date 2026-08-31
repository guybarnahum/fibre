import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { normalizeEmbodimentRightsRevocation } from "./embodiment-rights-revocation.mjs";

export class EmbodimentRightsRevocationConflictError extends Error {}

function digest(record) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_rights_revocation", record }))}`;
}

export class EmbodimentRightsRevocationStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName: "EmbodimentRightsRevocationStore" });
    this.#database.exec(`
      CREATE TRIGGER IF NOT EXISTS embodiment_revoked_rights_no_new_representation
      BEFORE INSERT ON embodiment_records
      WHEN EXISTS (
        SELECT 1
        FROM json_each(json_extract(NEW.record_json, '$.permissionReferences')) permission
        JOIN embodiment_rights_revocations revocation
          ON revocation.authority_id = permission.value
         AND revocation.thread_id = NEW.thread_id
        WHERE NEW.recorded_at >= revocation.recorded_at
      )
      BEGIN SELECT RAISE(ABORT,'embodiment rights authority is no longer available for new representation'); END;
    `);
  }

  close() { this.#database.close(); }

  #evidenceExists(threadId, reference) {
    if (this.#database.prepare("SELECT 1 FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, reference)) return true;
    if (this.#database.prepare("SELECT 1 FROM situated_evidence_witnesses WHERE thread_id=? AND reference=?").get(threadId, reference)) return true;
    if (this.#database.prepare("SELECT 1 FROM identity_assertion_records WHERE thread_id=? AND assertion_id=?").get(threadId, reference)) return true;
    return false;
  }

  record(candidate) {
    const record = normalizeEmbodimentRightsRevocation(candidate);
    for (const reference of record.evidenceReferences) {
      if (!this.#evidenceExists(record.threadId, reference)) {
        throw new EmbodimentRightsRevocationConflictError(`rights revocation reference ${reference} is not durable Thread evidence`);
      }
    }
    try {
      const transactionResult = this.#database.transaction(() => {
        const authority = this.#database.prepare(`
          SELECT authority_kind,recorded_at
          FROM embodiment_rights_authorities
          WHERE authority_id=? AND thread_id=?
        `).get(record.authorityId, record.threadId);
        if (!authority) throw new EmbodimentRightsRevocationConflictError(`rights authority ${record.authorityId} does not exist for Thread ${record.threadId}`);
        if (authority.authority_kind !== "explicit_consent") {
          throw new EmbodimentRightsRevocationConflictError("only explicit consent authority can be revoked by its source");
        }
        if (Date.parse(record.recordedAt) < Date.parse(authority.recorded_at)) {
          throw new EmbodimentRightsRevocationConflictError("rights revocation cannot predate its authority");
        }
        const prior = this.#database.prepare(
          "SELECT record_json,record_digest FROM embodiment_rights_revocations WHERE authority_id=?",
        ).get(record.authorityId);
        if (prior) {
          if (prior.record_json !== canonicalJson(record) || prior.record_digest !== digest(record)) {
            throw new EmbodimentRightsRevocationConflictError(`rights authority ${record.authorityId} already has a different revocation`);
          }

          return record;
        }
        this.#database.prepare(`
          INSERT INTO embodiment_rights_revocations(
            revocation_id,thread_id,authority_id,record_json,record_digest,recorded_at
          ) VALUES (?,?,?,?,?,?)
        `).run(record.revocationId, record.threadId, record.authorityId, canonicalJson(record), digest(record), record.recordedAt);
        return record;
      });
      return transactionResult;
    } catch (error) {
      throw error;
    }
  }
}

export function openEmbodimentRightsRevocationStore(storage) {
  return new EmbodimentRightsRevocationStore(storage);
}
