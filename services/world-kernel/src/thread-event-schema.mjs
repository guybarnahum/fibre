// Shared event-table definition for creation, portable rebuild and recovery.

// Every kind of Thread event, and whether a command authors it. The kinds are
// rows of their own table, guarded on insert, so a new kind is one row and
// never a rebuild of the event history: on November 9, 2026, rebuilding the
// table for one new kind read about 16 million rows on staging and exhausted
// the day's storage quota. A kind is never removed or changed once admitted.
export const THREAD_EVENT_TYPES=Object.freeze({
  THREAD_SEEDED:false,
  THREAD_LIFE_EPISODE_RECORDED:false,
  SELF_MODEL_UPDATED:true,
  THREAD_FROZEN:true,
  COMPELLED_EPISODE_INTERRUPTED:true,
  AUTOBIOGRAPHICAL_MEMORY_RECORDED:true,
  GENESIS_SEX_MIGRATED:false,
  THREAD_IDENTITY_UPDATED:false,
  THREAD_PHYSICAL_GENOME_MIGRATED:false,
  THREAD_GENOME_LOCI_EXPRESSED:false,
});

export const THREAD_EVENT_COLUMNS=[
  "event_id","thread_id","sequence","expected_version","resulting_version",
  "event_type","command_id","command_digest","payload_json","actor_json",
  "occurred_at","state_hash","authorization_id","causation_id",
  "correlation_id","payload_schema_version","provenance_json",
].join(",");

export function createThreadEventsTable(database,name="thread_events"){
  database.exec(`
    CREATE TABLE IF NOT EXISTS "${name}" (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence >= 1),
      expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
      resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
      event_type TEXT NOT NULL,
      command_id TEXT,
      command_digest TEXT,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      actor_json TEXT NOT NULL CHECK (json_valid(actor_json)),
      occurred_at TEXT NOT NULL,
      state_hash TEXT NOT NULL CHECK (state_hash LIKE 'sha256:%'),
      authorization_id TEXT,
      causation_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      payload_schema_version INTEGER NOT NULL CHECK (payload_schema_version >= 1),
      provenance_json TEXT NOT NULL CHECK (json_valid(provenance_json)),
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      UNIQUE (thread_id, sequence),
      CHECK ((command_id IS NULL) = (command_digest IS NULL))
    ) STRICT;
  `);
}

// A table defined with the kinds listed inline must be rebuilt once.
export function threadEventTableListsKinds(sql){
  return typeof sql==="string"&&sql.includes("event_type IN (");
}

function registerThreadEventTypes(database){
  database.exec(`
    CREATE TABLE IF NOT EXISTS thread_event_types (
      event_type TEXT PRIMARY KEY,
      commanded INTEGER NOT NULL CHECK (commanded IN (0,1))
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS thread_event_types_no_update
      BEFORE UPDATE ON thread_event_types
      BEGIN SELECT RAISE(ABORT, 'thread_event_types is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_event_types_no_delete
      BEFORE DELETE ON thread_event_types
      BEGIN SELECT RAISE(ABORT, 'thread_event_types is append-only'); END;
  `);
  const insert=database.prepare("INSERT OR IGNORE INTO thread_event_types(event_type,commanded) VALUES (?,?)");
  for(const [kind,commanded] of Object.entries(THREAD_EVENT_TYPES))insert.run(kind,commanded?1:0);
  for(const row of database.prepare("SELECT event_type,commanded FROM thread_event_types").all()){
    if(Object.hasOwn(THREAD_EVENT_TYPES,row.event_type)&&THREAD_EVENT_TYPES[row.event_type]!==(Number(row.commanded)===1)){
      throw new TypeError(`Thread event kind ${row.event_type} changed whether a command authors it`);
    }
  }
}

// Every column that refers to a Thread event is indexed. Without an index,
// SQLite scans the referring table once per event whenever events are
// dropped or re-inserted, which made one rebuild quadratic in history.
export function indexThreadEventReferences(database){
  const tables=database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'thread_events%' AND instr(lower(sql),'thread_events')>0
  `).all().map(row=>row.name);
  for(const table of tables){
    const quoted=`"${table.replaceAll('"','""')}"`;
    const references=new Map();
    for(const key of database.prepare(`PRAGMA foreign_key_list(${quoted})`).all()){
      if(key.table!=="thread_events")continue;
      references.set(key.id,[...(references.get(key.id)??[]),{seq:key.seq,from:key.from}]);
    }
    const leading=new Set(database.prepare(`PRAGMA index_list(${quoted})`).all().map(index=>
      database.prepare(`PRAGMA index_info("${index.name.replaceAll('"','""')}")`).all()
        .sort((a,b)=>a.seqno-b.seqno).map(column=>column.name).join(",")));
    for(const columns of references.values()){
      const names=columns.sort((a,b)=>a.seq-b.seq).map(column=>column.from);
      if([...leading].some(index=>(index+",").startsWith(names.join(",")+",")))continue;
      database.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_${names.join("_")}_event_ref"
        ON ${quoted}(${names.map(name=>`"${name}"`).join(",")})`);
    }
  }
}

export function installThreadEventGuards(database){
  registerThreadEventTypes(database);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS thread_events_known_kind
      BEFORE INSERT ON thread_events
      WHEN NOT EXISTS (
        SELECT 1 FROM thread_event_types kind
        WHERE kind.event_type=NEW.event_type
          AND kind.commanded=(NEW.command_id IS NOT NULL)
      )
      BEGIN SELECT RAISE(ABORT, 'thread event kind or its command metadata is invalid'); END;
    CREATE INDEX IF NOT EXISTS idx_thread_events_thread_sequence
      ON thread_events(thread_id, sequence);
    CREATE TRIGGER IF NOT EXISTS thread_events_no_update
      BEFORE UPDATE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS thread_events_no_delete
      BEFORE DELETE ON thread_events
      BEGIN SELECT RAISE(ABORT, 'thread_events is append-only'); END;
  `);
}
