import { RELATIONAL_ACTS,RELATIONSHIP_DOORS,replayRelationalHistory } from "./relationship-doors.mjs";

const list=values=>values.map(value=>`'${value}'`).join(",");

// Relationship doors and the relational ledger are World facts about a pair
// of Threads. The ledger is append-only; the compact current-doors table
// follows it and is never written directly. Neither holds any stance.
export function createRelationshipTables(database){
  const needsBackfill=database.prepare(`
    SELECT 1 FROM sqlite_master WHERE type='table' AND name='relationship_ledger'
  `).get()===undefined;
  database.exec(`
    -- One B-tree write per act: seq orders the acts of one pair's door.
    CREATE TABLE IF NOT EXISTS relationship_ledger (
      thread_a TEXT NOT NULL,
      thread_b TEXT NOT NULL CHECK (thread_a < thread_b),
      door TEXT NOT NULL CHECK (door IN (${list(RELATIONSHIP_DOORS)})),
      seq INTEGER NOT NULL CHECK (seq >= 1),
      kind TEXT NOT NULL CHECK (kind IN (${list(RELATIONAL_ACTS)})),
      actor_thread_id TEXT NOT NULL CHECK (actor_thread_id IN (thread_a,thread_b)),
      occurred_at TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      PRIMARY KEY (thread_a,thread_b,door,seq),
      FOREIGN KEY (thread_a) REFERENCES threads(thread_id),
      FOREIGN KEY (thread_b) REFERENCES threads(thread_id)
    ) STRICT, WITHOUT ROWID;
    CREATE TRIGGER IF NOT EXISTS relationship_ledger_no_update
      BEFORE UPDATE ON relationship_ledger
      BEGIN SELECT RAISE(ABORT,'relationship_ledger is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS relationship_ledger_no_delete
      BEFORE DELETE ON relationship_ledger
      BEGIN SELECT RAISE(ABORT,'relationship_ledger is append-only'); END;

    CREATE TABLE IF NOT EXISTS relationship_doors (
      thread_a TEXT NOT NULL,
      thread_b TEXT NOT NULL,
      door TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      opened_by TEXT NOT NULL,
      opened_seq INTEGER NOT NULL,
      PRIMARY KEY (thread_a,thread_b,door),
      FOREIGN KEY (thread_a,thread_b,door,opened_seq)
        REFERENCES relationship_ledger(thread_a,thread_b,door,seq)
    ) STRICT, WITHOUT ROWID;

    CREATE TRIGGER IF NOT EXISTS relationship_doors_follow_ledger
      AFTER INSERT ON relationship_ledger
      WHEN NEW.kind IN ('opened','closed')
      BEGIN
        INSERT OR IGNORE INTO relationship_doors(
          thread_a,thread_b,door,opened_at,opened_by,opened_seq
        ) SELECT NEW.thread_a,NEW.thread_b,NEW.door,NEW.occurred_at,
          NEW.actor_thread_id,NEW.seq WHERE NEW.kind='opened';
        DELETE FROM relationship_doors WHERE NEW.kind='closed'
          AND thread_a=NEW.thread_a AND thread_b=NEW.thread_b AND door=NEW.door;
      END;
  `);
  // One-time, at installation: doors already opened by recorded history.
  if(needsBackfill)replayRelationalHistory(database);
}
