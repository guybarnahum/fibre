import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { ThreadVisualPublicationWorksetStore } from "../src/thread-visual-publication-workset-store.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fibre-visual-workset-"));
  const infraDriver = createSqliteStateInfraDriver({ scopes:{ world:join(root, "world.sqlite") } });
  const store = new ThreadVisualPublicationWorksetStore({ infraDriver, stateScopeId:"world" });
  return {
    store,
    close() {
      store.close();
      rmSync(root, { recursive:true, force:true });
    },
  };
}

test("visual reconciliation work survives replay without resurrecting retired Threads", () => {
  const current = fixture();
  try {
    current.store.enqueue("thr_dead");
    current.store.enqueue("thr_done");
    current.store.deadLetter("thr_dead", {
      code:"INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY",
      message:"missing canonical visual identity",
      retryable:false,
    });
    current.store.complete("thr_done");

    assert.deepEqual(current.store.listThreadIds(), [], "retired Threads must leave active work");
    assert.equal(current.store.enqueue("thr_dead"), false, "birth replay must not resurrect dead-letter work");
    assert.equal(current.store.enqueue("thr_done"), false, "birth replay must not resurrect completed work");
    assert.deepEqual(current.store.listThreadIds(), []);

    assert.equal(current.store.requeue("thr_dead"), true, "explicit repair must be able to revive dead-letter work");
    assert.deepEqual(current.store.listThreadIds(), ["thr_dead"]);
  } finally {
    current.close();
  }
});
