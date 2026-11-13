// Late expression of urge loci (ADR-0036). When the World begins to use an
// urge family a Thread's Body never expressed, the Thread receives its locus
// once, drawn from its own birth genome's digest, as a recorded World event.
// The genome itself and its digest are never edited.
import {
  boundedThreadScopedId,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import { GENOME_EXPRESSION_PROVENANCE, genomeLociExpression, validateThreadSnapshot } from "./persistence-domain.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

const ACTOR = Object.freeze({ entityId:"fibre.admin.operator", kind:"operator", displayName:"Fibre Admin" });

export class ThreadGenomeExpressionStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName:"ThreadGenomeExpressionStore" });
  }

  close() { this.#database.close(); }

  // The genome a Thread was born with: its first, by World time.
  #birthGenome(threadId) {
    return this.#database.prepare(`
      SELECT genome_id AS genomeId, genome_digest AS genomeDigest FROM symbolic_genomes
      WHERE owner_kind='thread' AND owner_id=? ORDER BY created_at, genome_id LIMIT 1
    `).get(threadId) ?? null;
  }

  // Every Thread that is not retired, with what it would receive now.
  plan() {
    return this.#database.prepare("SELECT state_json FROM threads WHERE status<>'retired' ORDER BY thread_id")
      .all().map(({ state_json: stateJson }) => {
        const thread = JSON.parse(stateJson);
        const genome = this.#birthGenome(thread.threadId);
        const expression = genome === null ? null : genomeLociExpression(thread, genome);
        return Object.freeze({
          threadId:thread.threadId,
          name:thread.identity?.name ?? null,
          genome:genome === null ? "none" : "present",
          expressed:(thread.genome.urgeProjection ?? []).map((item) => item.family),
          receives:expression?.payload.expressed ?? [],
          // Positions a newer library adds to loci already expressed.
          completes:expression?.payload.completed ?? [],
        });
      });
  }

  // Express what is missing for one Thread. A second run finds nothing to
  // express and records nothing.
  express(threadId, { at = new Date().toISOString() } = {}) {
    const row = this.#database.prepare("SELECT state_json FROM threads WHERE thread_id=?").get(threadId);
    if (row === undefined) throw new Error(`Thread ${threadId} was not found`);
    const thread = JSON.parse(row.state_json);
    const genome = this.#birthGenome(threadId);
    if (genome === null) throw new TypeError(`Thread ${threadId} has no genome to express`);
    const expression = genomeLociExpression(thread, genome);
    if (expression === null) return Object.freeze({ threadId, eventId:null, expressed:[], completed:[] });

    const eventId = boundedThreadScopedId({ prefix:"evt", threadId,
      suffix:`genome_expressed_${sha256(canonicalJson(expression.payload)).slice(0, 24)}` });
    const next = { ...thread, version:thread.version + 1, genome:expression.genome,
      provenance:{ ...thread.provenance, lastEventId:eventId } };
    validateThreadSnapshot(next);
    const stateHash = threadStateHash(next);

    this.#database.transaction(() => {
      const sequence = Number(this.#database.prepare(
        "SELECT COALESCE(MAX(sequence),0) AS n FROM thread_events WHERE thread_id=?",
      ).get(threadId).n) + 1;
      this.#database.prepare(`
        INSERT INTO thread_events (
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,'THREAD_GENOME_LOCI_EXPRESSED',NULL,NULL,?,?,?,?,NULL,?,?,1,?)
      `).run(eventId, threadId, sequence, thread.version, next.version, canonicalJson(expression.payload),
        canonicalJson(ACTOR), at, stateHash, thread.provenance.lastEventId, eventId,
        canonicalJson(GENOME_EXPRESSION_PROVENANCE));
      const updated = this.#database.prepare(`
        UPDATE threads SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(next.version, canonicalJson(next), stateHash, eventId, at, threadId, thread.version);
      if (Number(updated.changes) !== 1) throw new Error(`Thread ${threadId} changed during genome expression`);
    });
    return Object.freeze({ threadId, eventId, expressed:expression.payload.expressed,
      completed:expression.payload.completed ?? [] });
  }
}
