import test from "node:test";
import assert from "node:assert/strict";

import {
  InfraIdempotencyConflictError,
  InfraSequenceConflictError,
} from "../src/infra-driver.mjs";
import {
  createCloudflareCatalogPort,
  createCloudflareInfraDriver,
  createCloudflareRealtimePort,
  createCloudflareStreamPort,
} from "../src/cloudflare-v1.mjs";

function fakePresentationNamespace() {
  const channels = new Map();
  function state(name) {
    if (!channels.has(name)) {
      channels.set(name, { sequence: 0, entries: [], idempotency: new Map(), snapshot: null, published: [] });
    }
    return channels.get(name);
  }
  function stub(name) {
    const current = state(name);
    return {
      async getHead() {
        return { sequence: current.sequence, snapshotPointer: current.snapshot?.pointer ?? null };
      },
      async append({ valueJson, idempotencyKey, expectedSequence }) {
        const prior = current.idempotency.get(idempotencyKey);
        if (prior) {
          if (prior.valueJson !== valueJson) return { ok: false, error: "idempotency_conflict" };
          return { ok: true, sequence: prior.sequence, valueJson: prior.valueJson, duplicate: true };
        }
        if (expectedSequence !== null && expectedSequence !== current.sequence) {
          return {
            ok: false,
            error: "sequence_conflict",
            expectedSequence,
            currentSequence: current.sequence,
          };
        }
        const sequence = current.sequence + 1;
        current.sequence = sequence;
        current.entries.push({ sequence, valueJson });
        current.idempotency.set(idempotencyKey, { sequence, valueJson });
        return { ok: true, sequence, valueJson, duplicate: false };
      },
      async readAfter({ sequence, limit }) {
        return current.entries.filter((entry) => entry.sequence > sequence).slice(0, limit);
      },
      async publishSnapshot({ snapshotPointerJson, expectedSequence }) {
        if (expectedSequence !== null && expectedSequence !== current.sequence) {
          return {
            ok: false,
            error: "sequence_conflict",
            expectedSequence,
            currentSequence: current.sequence,
          };
        }
        current.snapshot = { pointer: JSON.parse(snapshotPointerJson), sequence: current.sequence };
        return { ok: true, snapshotPointerJson, sequence: current.sequence };
      },
      async getSnapshotPointer() {
        if (current.snapshot === null) return null;
        return {
          snapshotPointerJson: JSON.stringify(current.snapshot.pointer),
          sequence: current.snapshot.sequence,
        };
      },
      async publish({ valueJson }) {
        current.published.push(JSON.parse(valueJson));
        return { delivered: 2 };
      },
    };
  }
  return {
    channels,
    getByName(name) { return stub(name); },
  };
}

function fakeD1() {
  const values = new Map();
  return {
    values,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();
      return {
        bind(...args) {
          return {
            async run() {
              if (normalized.startsWith("INSERT INTO FIBRE_CATALOG")) {
                values.set(args[0], args[1]);
                return { success: true, meta: { changes: 1 } };
              }
              if (normalized.startsWith("DELETE FROM FIBRE_CATALOG")) {
                const existed = values.delete(args[0]);
                return { success: true, meta: { changes: existed ? 1 : 0 } };
              }
              throw new Error(`unsupported fake D1 run: ${normalized}`);
            },
            async first() {
              if (!normalized.startsWith("SELECT VALUE_JSON FROM FIBRE_CATALOG")) {
                throw new Error(`unsupported fake D1 first: ${normalized}`);
              }
              return values.has(args[0]) ? { value_json: values.get(args[0]) } : null;
            },
          };
        },
      };
    },
  };
}

test("Cloudflare stream port preserves ordering replay idempotency and expected-sequence conflicts", async () => {
  const namespace = fakePresentationNamespace();
  const streams = createCloudflareStreamPort(namespace);
  const first = await streams.append("channel_1", { eventId: "event_1", value: "a" }, {
    idempotencyKey: "event_1",
    expectedSequence: 0,
  });
  assert.equal(first.sequence, 1);
  assert.equal(first.duplicate, false);

  const duplicate = await streams.append("channel_1", { value: "a", eventId: "event_1" }, {
    idempotencyKey: "event_1",
    expectedSequence: 999,
  });
  assert.equal(duplicate.sequence, 1);
  assert.equal(duplicate.duplicate, true, "idempotent retry wins before stale expected-sequence check");

  await assert.rejects(
    () => streams.append("channel_1", { eventId: "event_1", value: "different" }, { idempotencyKey: "event_1" }),
    InfraIdempotencyConflictError,
  );
  await assert.rejects(
    () => streams.append("channel_1", { eventId: "event_2" }, { idempotencyKey: "event_2", expectedSequence: 0 }),
    InfraSequenceConflictError,
  );

  const replay = await streams.readAfter("channel_1", 0, 10);
  assert.deepEqual(replay, [{ sequence: 1, value: { eventId: "event_1", value: "a" } }]);
  assert.deepEqual(await streams.getHead("channel_1"), { sequence: 1, snapshotPointer: null });
});

test("Cloudflare snapshot and realtime ports keep durable stream position separate from fanout", async () => {
  const namespace = fakePresentationNamespace();
  const streams = createCloudflareStreamPort(namespace);
  const realtime = createCloudflareRealtimePort(namespace);
  await streams.append("channel_2", { eventId: "event_1" }, { idempotencyKey: "event_1", expectedSequence: 0 });
  const pointer = await streams.publishSnapshot("channel_2", {
    objectRef: "snapshot_object_1",
    snapshotVersion: "v1",
    snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  }, { expectedSequence: 1 });
  assert.equal(pointer.sequence, 1);
  assert.equal((await streams.getSnapshotPointer("channel_2")).objectRef, "snapshot_object_1");

  const published = await realtime.publish("channel_2", { sequence: 1, kind: "media.ready" });
  assert.equal(published.delivered, 2);
  assert.equal(namespace.channels.get("channel_2").sequence, 1, "fanout must not allocate stream sequence");
  assert.deepEqual(namespace.channels.get("channel_2").published, [{ kind: "media.ready", sequence: 1 }]);
});

test("Cloudflare D1 catalog port is a replaceable JSON mirror", async () => {
  const database = fakeD1();
  const catalog = createCloudflareCatalogPort(database);
  const value = { threadId: "thr_1", latestSnapshotVersion: "v1", fixture: true };
  assert.deepEqual(await catalog.upsert("channel_1", value), value);
  assert.deepEqual(await catalog.get("channel_1"), value);
  assert.equal(await catalog.remove("channel_1"), true);
  assert.equal(await catalog.get("channel_1"), null);
  assert.equal(await catalog.remove("channel_1"), false);
});

test("cloudflare-v1 composes presentation ports without changing driver identity", () => {
  const namespace = fakePresentationNamespace();
  const database = fakeD1();
  const driver = createCloudflareInfraDriver({ presentationChannels: namespace, catalogDatabase: database });
  assert.equal(driver.driverId, "cloudflare-v1");
  assert.deepEqual(new Set(driver.capabilities), new Set(["streams", "realtime", "catalog"]));
  assert.equal(typeof driver.streams.append, "function");
  assert.equal(typeof driver.realtime.publish, "function");
  assert.equal(typeof driver.catalog.upsert, "function");
});
