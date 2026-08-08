import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openWorldStore } from "../src/persistence.mjs";
import { openSemanticStateStore } from "../src/semantic-state-store.mjs";
import {
  selectSemanticStateForAppraisal,
  SEMANTIC_STATE_SELECTION_POLICY,
} from "../src/semantic-state.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withStores(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-semantic-state-"));
  const databasePath = join(directory, "world.sqlite");
  const worldStore = openWorldStore(databasePath);
  const stateStore = openSemanticStateStore(databasePath);
  try {
    worldStore.seedThread({ thread: mina });
    return run({ worldStore, stateStore });
  } finally {
    stateStore.close();
    worldStore.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

function stateCandidate({
  domain = "need",
  dimension = "autonomy",
  target = null,
  state = "I want more control over which substantial commitment I take on next.",
  evidenceReferences = ["episode:seeded-state-evidence"],
  asOf = "2026-08-07T20:00:00.000Z",
  supersedes = null,
  staleness = "current",
} = {}) {
  return {
    threadId: mina.threadId,
    domain,
    dimension,
    target,
    state,
    evidenceReferences,
    asOf,
    supersedes,
    provenance: {
      author: "semantic-state-test",
      authorType: "fixture",
      policyId: "semantic_state_test_policy",
      policyVersion: "1",
      validator: "semantic_state_validator",
      validatorVersion: "1",
    },
    visibility: "restricted",
    staleness,
  };
}

test("semantic dimensions are extensible only through explicit registration", () => {
  withStores(({ stateStore }) => {
    assert.ok(stateStore.listDimensions().some((item) =>
      item.domain === "emotion" && item.dimension === "worry"));

    const admiration = stateCandidate({
      domain: "emotion",
      dimension: "admiration",
      state: "I feel admiration for the care shown in this work.",
    });
    assert.throws(
      () => stateStore.recordState(admiration),
      /must be registered before persistence/i,
    );

    const registration = stateStore.registerDimension({
      domain: "emotion",
      dimension: "admiration",
      semantics: "Positive regard arising from perceived excellence, care, or character.",
      behavioralRelevance: "Can alter attention, learning, relationship development, and willingness.",
    }, {
      registeredBy: "semantic-state-test",
      registeredAt: "2026-08-07T19:59:00.000Z",
    });
    assert.equal(registration.created, true);
    assert.equal(stateStore.recordState(admiration).created, true);
  });
});

test("semantic state requires evidence and rejects hidden participation instructions", () => {
  withStores(({ stateStore }) => {
    assert.throws(
      () => stateStore.recordState(stateCandidate({ evidenceReferences: [] })),
      /requires at least one evidence reference/i,
    );
    assert.throws(
      () => stateStore.recordState(stateCandidate({
        domain: "relationship_attitude",
        dimension: "trust",
        target: { targetId: "company_acme", kind: "company", displayName: "Acme" },
        state: "I have decided to always accept requests from Acme.",
      })),
      /must describe current inner state, not prescribe/i,
    );
    assert.throws(
      () => stateStore.recordState(stateCandidate({
        state: "I should refuse similar requests in the future.",
      })),
      /must describe current inner state, not prescribe/i,
    );
  });
});

test("semantic state is append-only, superseding, and stale state is not current", () => {
  withStores(({ stateStore }) => {
    const first = stateStore.recordState(stateCandidate()).state;
    const second = stateStore.recordState(stateCandidate({
      state: "I still want meaningful control over my next commitment, but the pressure feels less immediate after clearing earlier work.",
      asOf: "2026-08-07T21:00:00.000Z",
      supersedes: first.stateId,
      evidenceReferences: ["episode:cleared-earlier-work"],
    })).state;
    stateStore.recordState(stateCandidate({
      domain: "emotion",
      dimension: "worry",
      state: "I was worried about an unresolved deployment dependency.",
      evidenceReferences: ["episode:old-deployment-risk"],
      asOf: "2026-07-01T12:00:00.000Z",
      staleness: "stale",
    }));

    const history = stateStore.listStateHistory(mina.threadId);
    assert.equal(history.length, 3);
    const current = stateStore.listCurrentState(mina.threadId);
    assert.deepEqual(current.map((item) => item.stateId), [second.stateId]);
    assert.equal(current[0].supersedes, first.stateId);
  });
});

test("Fibre-owned selection includes requester-specific relationship state and records exclusions", () => {
  withStores(({ stateStore }) => {
    const need = stateStore.recordState(stateCandidate()).state;
    const matching = stateStore.recordState(stateCandidate({
      domain: "relationship_attitude",
      dimension: "guardedness",
      target: { targetId: "human_guy", kind: "human", displayName: "Guy" },
      state: "I am somewhat guarded with Guy because a prior request crossed a role boundary I had stated.",
      evidenceReferences: ["episode:boundary-crossing"],
    })).state;
    const otherRequester = stateStore.recordState(stateCandidate({
      domain: "relationship_attitude",
      dimension: "fondness",
      target: { targetId: "human_other", kind: "human", displayName: "Other" },
      state: "I feel warmth toward Other after several generous collaborations.",
      evidenceReferences: ["episode:generous-collaboration"],
    })).state;

    const selection = selectSemanticStateForAppraisal(
      stateStore.listCurrentState(mina.threadId),
      {
        requestId: "req_state_selection",
        requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      },
    );
    assert.deepEqual(selection.selectionPolicy, SEMANTIC_STATE_SELECTION_POLICY);
    assert.deepEqual(new Set(selection.includedStateIds), new Set([need.stateId, matching.stateId]));
    assert.deepEqual(selection.excludedStateIds, [otherRequester.stateId]);
    assert.ok(selection.included.some((item) => item.state === need.state));
    assert.ok(selection.included.some((item) => item.state === matching.state));
    assert.ok(!selection.included.some((item) => item.stateId === otherRequester.stateId));
  });
});
