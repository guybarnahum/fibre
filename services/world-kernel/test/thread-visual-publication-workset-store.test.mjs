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

test("visual reconciliation retires replay safely and revives work only through explicit repair", () => {
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
    assert.equal(current.store.get("thr_dead").state, "dead_letter", "dead letter must remain inspectable");
    assert.equal(current.store.get("thr_dead").lastError.code, "INVALID_BIRTH_MISSING_CANONICAL_VISUAL_IDENTITY");
    assert.equal(current.store.enqueue("thr_dead"), false, "birth replay must not resurrect dead-letter work");
    assert.equal(current.store.enqueue("thr_done"), false, "birth replay must not resurrect completed work");

    assert.equal(current.store.requeue("thr_dead"), true, "repair must revive dead-letter work");
    assert.equal(current.store.requeue("thr_done"), true, "identity correction must reopen completed visual work");
    assert.equal(current.store.requeue("thr_legacy"), true, "repair must activate a pre-workset Thread");
    assert.deepEqual(current.store.listThreadIds(), ["thr_dead", "thr_done", "thr_legacy"]);
    assert.equal(current.store.get("thr_dead").state, "pending", "recovered Thread must re-enter active work");
  } finally {
    current.close();
  }
});