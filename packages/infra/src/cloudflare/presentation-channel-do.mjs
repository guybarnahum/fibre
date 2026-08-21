import { DurableObject } from "cloudflare:workers";

const STREAM_TAG = "presentation-stream";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function sequenceOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative safe integer or null`);
  return value;
}

function positiveLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000) throw new TypeError("limit must be an integer from 1 to 1000");
  return value;
}

function parseJson(name, value) {
  nonEmpty(name, value);
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw new TypeError(`${name} must contain valid JSON`); }
  return parsed;
}

function rowOne(cursor, name) {
  const rows = cursor.toArray();
  if (rows.length !== 1) throw new Error(`${name} expected exactly one row`);
  return rows[0];
}

function frame(sequence, value) {
  return JSON.stringify({ type: "stream.event", sequence, value });
}

export class FibrePresentationChannelDurableObject extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const sql = this.ctx.storage.sql;
      sql.exec(`
        CREATE TABLE IF NOT EXISTS stream_meta (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          current_sequence INTEGER NOT NULL,
          snapshot_pointer_json TEXT
        )
      `);
      sql.exec(`
        CREATE TABLE IF NOT EXISTS stream_events (
          sequence INTEGER PRIMARY KEY,
          idempotency_key TEXT NOT NULL UNIQUE,
          value_json TEXT NOT NULL
        )
      `);
      sql.exec("CREATE INDEX IF NOT EXISTS stream_events_idempotency ON stream_events(idempotency_key)");
      sql.exec(`
        INSERT INTO stream_meta (id, current_sequence, snapshot_pointer_json)
        VALUES (1, 0, NULL)
        ON CONFLICT(id) DO NOTHING
      `);
    });
  }

  #meta() {
    return rowOne(
      this.ctx.storage.sql.exec(
        "SELECT current_sequence, snapshot_pointer_json FROM stream_meta WHERE id = 1",
      ),
      "stream_meta",
    );
  }

  async getHead() {
    const meta = this.#meta();
    return {
      sequence: meta.current_sequence,
      snapshotPointer: meta.snapshot_pointer_json === null ? null : JSON.parse(meta.snapshot_pointer_json),
    };
  }

  async append({ valueJson, idempotencyKey, expectedSequence }) {
    parseJson("valueJson", valueJson);
    nonEmpty("idempotencyKey", idempotencyKey);
    sequenceOrNull("expectedSequence", expectedSequence);

    return this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql;
      const prior = sql.exec(
        "SELECT sequence, value_json FROM stream_events WHERE idempotency_key = ? LIMIT 1",
        idempotencyKey,
      ).toArray()[0];
      if (prior) {
        if (prior.value_json !== valueJson) return { ok: false, error: "idempotency_conflict" };
        return {
          ok: true,
          sequence: prior.sequence,
          valueJson: prior.value_json,
          duplicate: true,
        };
      }

      const current = this.#meta().current_sequence;
      if (expectedSequence !== null && expectedSequence !== current) {
        return {
          ok: false,
          error: "sequence_conflict",
          expectedSequence,
          currentSequence: current,
        };
      }

      const sequence = current + 1;
      sql.exec(
        "INSERT INTO stream_events (sequence, idempotency_key, value_json) VALUES (?, ?, ?)",
        sequence,
        idempotencyKey,
        valueJson,
      );
      sql.exec("UPDATE stream_meta SET current_sequence = ? WHERE id = 1", sequence);
      return { ok: true, sequence, valueJson, duplicate: false };
    });
  }

  async readAfter({ sequence, limit }) {
    sequenceOrNull("sequence", sequence);
    positiveLimit(limit);
    return this.ctx.storage.sql.exec(
      `SELECT sequence, value_json
       FROM stream_events
       WHERE sequence > ?
       ORDER BY sequence ASC
       LIMIT ?`,
      sequence,
      limit,
    ).toArray();
  }

  async publishSnapshot({ snapshotPointerJson, expectedSequence }) {
    const pointer = parseJson("snapshotPointerJson", snapshotPointerJson);
    if (pointer === null || typeof pointer !== "object" || Array.isArray(pointer)) {
      throw new TypeError("snapshotPointerJson must describe an object");
    }
    sequenceOrNull("expectedSequence", expectedSequence);

    return this.ctx.storage.transactionSync(() => {
      const current = this.#meta().current_sequence;
      if (expectedSequence !== null && expectedSequence !== current) {
        return {
          ok: false,
          error: "sequence_conflict",
          expectedSequence,
          currentSequence: current,
        };
      }
      const storedPointer = { ...pointer, sequence: current };
      const storedJson = JSON.stringify(storedPointer);
      this.ctx.storage.sql.exec(
        "UPDATE stream_meta SET snapshot_pointer_json = ? WHERE id = 1",
        storedJson,
      );
      return { ok: true, snapshotPointerJson: storedJson, sequence: current };
    });
  }

  async getSnapshotPointer() {
    const meta = this.#meta();
    if (meta.snapshot_pointer_json === null) return null;
    return {
      snapshotPointerJson: meta.snapshot_pointer_json,
      sequence: JSON.parse(meta.snapshot_pointer_json).sequence,
    };
  }

  async publish({ valueJson }) {
    const value = parseJson("valueJson", valueJson);
    if (!Number.isSafeInteger(value?.sequence) || value.sequence < 1) {
      throw new TypeError("realtime presentation value must carry a positive sequence");
    }
    const message = frame(value.sequence, value);
    let delivered = 0;
    for (const ws of this.ctx.getWebSockets(STREAM_TAG)) {
      try {
        ws.send(message);
        delivered += 1;
      } catch {
        try { ws.close(1011, "presentation stream send failed"); } catch {}
      }
    }
    return { delivered };
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const url = new URL(request.url);
    const rawAfter = url.searchParams.get("after") ?? "0";
    if (!/^\d+$/.test(rawAfter)) return Response.json({ error: "invalid_cursor" }, { status: 400 });
    const after = Number(rawAfter);
    if (!Number.isSafeInteger(after) || after < 0) return Response.json({ error: "invalid_cursor" }, { status: 400 });

    const meta = this.#meta();
    const oldestRow = this.ctx.storage.sql.exec(
      "SELECT MIN(sequence) AS oldest_sequence FROM stream_events",
    ).toArray()[0];
    const oldest = oldestRow?.oldest_sequence ?? null;
    if (after > meta.current_sequence || (oldest !== null && after < oldest - 1)) {
      return Response.json({
        error: "snapshot_required",
        currentSequence: meta.current_sequence,
        snapshotPointer: meta.snapshot_pointer_json === null ? null : JSON.parse(meta.snapshot_pointer_json),
      }, { status: 409 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [STREAM_TAG]);
    server.serializeAttachment({ after });

    const replay = this.ctx.storage.sql.exec(
      `SELECT sequence, value_json
       FROM stream_events
       WHERE sequence > ?
       ORDER BY sequence ASC`,
      after,
    ).toArray();
    for (const row of replay) server.send(frame(row.sequence, JSON.parse(row.value_json)));
    server.send(JSON.stringify({
      type: "stream.ready",
      cursor: meta.current_sequence,
      snapshotPointer: meta.snapshot_pointer_json === null ? null : JSON.parse(meta.snapshot_pointer_json),
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws) {
    try { ws.close(1008, "presentation stream is read-only"); } catch {}
  }

  async webSocketClose() {}

  async webSocketError() {}
}
