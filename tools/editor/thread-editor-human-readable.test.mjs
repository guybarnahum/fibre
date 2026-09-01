import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { repoFile } from "#repo-root";
import {
  assertSourceContains,
  assertSourceOmits,
} from "#tools/test-infra/source-invariant.mjs";

import {
  explainIntegrity,
  explainInspection,
  explainPreview,
  explainRequest,
  explainRuntime,
  formatHumanValue,
  humanizeLabel,
  integrityBadgeModel,
  integrityVerdict,
} from "#apps/thread-editor/human-readable.js";

test("technical field names and values become readable", () => {
  assert.equal(humanizeLabel("goalGuardianAudit"), "Goal Guardian Audit");
  assert.equal(humanizeLabel("request_id"), "Request ID");
  assert.equal(formatHumanValue(true), "Yes");
  assert.equal(formatHumanValue("high_dignity"), "high dignity");
  assert.equal(
    formatHumanValue("2026-08-06T20:00:00.000Z"),
    "2026-08-06 20:00:00 UTC",
  );
});

test("Thread overview explains life state without requiring JSON knowledge", () => {
  const explanation = explainInspection({
    kernel: { kernelTime: "2026-08-06T20:00:00.000Z" },
    thread: {
      threadId: "thr_mina_001",
      version: 8,
      status: "frozen",
      identity: { name: "Mina Park" },
      currentState: {
        selfModel: "I am a careful infrastructure reviewer.",
        feelings: ["quiet confidence"],
        needs: ["Build security expertise"],
        unresolvedIntentions: ["Read an identity failure case study"],
      },
      memoryRefs: ["mem_1", "mem_2"],
      relationshipRefs: ["rel_1"],
    },
    events: [{}, {}, {}],
    private: { requests: [{}], runtimes: [{}, {}] },
  });

  assert.match(explanation.title, /Mina Park/);
  assert.match(explanation.summary, /frozen at version 8/);
  assert.ok(explanation.notes.some((note) => /inspection-only/i.test(note)));
  assert.ok(explanation.facts.some((entry) => entry.label === "Public life events" && entry.value === "3"));
});

test("transient and dormant Thread statuses have meaningful explanations", () => {
  for (const status of ["thawing", "freezing", "dormant"]) {
    const explanation = explainInspection({
      thread: {
        threadId: "thr_test",
        version: 1,
        status,
        currentState: {},
      },
    });
    assert.ok(explanation.notes.some((note) => !/shown exactly as recorded/i.test(note)), status);
  }
});

test("integrity explanation calls out failed checks and explains the state fingerprint", () => {
  const report = {
    version: 4,
    eventCount: 4,
    stateHash: "123456789012345678901234567890",
    verification: { eventChain: true, projection: false },
  };
  const explanation = explainIntegrity(report);

  assert.equal(integrityVerdict(report).kind, "failed");
  assert.match(explanation.title, /failure/i);
  assert.match(explanation.summary, /1 failed check/);
  assert.ok(explanation.notes.some((note) => /projection/i.test(note)));
  assert.ok(explanation.facts.some((entry) => entry.label === "State fingerprint" && /…/.test(entry.value)));
});

test("integrity badge is structural, tri-state, and independent of prose", () => {
  for (const report of [undefined, null, {}, { unexpected: true }, { verification: {} }]) {
    assert.deepEqual(integrityBadgeModel(report), {
      label: "Integrity unknown",
      state: "unknown",
    });
  }

  assert.deepEqual(integrityBadgeModel({
    threadId: "thr_test",
    version: 1,
    eventCount: 1,
    stateHash: "sha256:test",
  }), {
    label: "No failure reported",
    state: "reported",
  });

  assert.deepEqual(integrityBadgeModel({
    threadId: "thr_test",
    verification: { projection: false },
  }), {
    label: "Review needed",
    state: "error",
  });
});

test("request explanation defines dignity as individualized participation fit", () => {
  const explanation = explainRequest({
    detail: {
      request: {
        requestId: "req_1",
        objective: "Review the authentication design",
        requester: { displayName: "Guy" },
        desiredAction: "clarify",
        dignityBand: "high",
        snapshotVersion: 7,
      },
    },
    integrity: { verification: { ok: true } },
  });

  assert.match(explanation.title, /Guy asked/);
  assert.match(explanation.summary, /clarify.*high dignity/i);
  assert.ok(explanation.facts.some((entry) => entry.label === "Thread's own response"));
  assert.ok(explanation.notes.some((note) => /individualized identity/i.test(note)));
  assert.ok(explanation.notes.some((note) => /resistance, or refusal/i.test(note)));
});

test("runtime explanation distinguishes temporary cognition from durable life", () => {
  const explanation = explainRuntime({
    runtime: {
      runtime: {
        session: {
          sessionId: "run_1",
          requestId: "req_1",
          status: "active",
          startedAt: "2026-08-06T20:00:00.000Z",
        },
        lease: {
          status: "active",
          expiresAt: "2026-08-06T20:05:00.000Z",
        },
        authorization: {
          desiredAction: "accept",
          authorizedAction: "accept",
          dignityBand: "high",
          obligationReferences: [],
        },
        goalGuardianAudit: { audit: { decision: "pass" } },
      },
    },
    kernelTime: "2026-08-06T20:01:00.000Z",
    outcome: {
      label: "Active",
      detail: "Runtime remains active at the freshly observed kernel time.",
    },
  });

  assert.equal(explanation.title, "Active");
  assert.match(explanation.summary, /remains active/);
  assert.ok(explanation.notes.some((note) => /temporary cognition/i.test(note)));
  assert.ok(explanation.notes.some((note) => /accepted freeze event/i.test(note)));
});

test("runtime explanation names compelled participation without converting it to consent", () => {
  const explanation = explainRuntime({
    runtime: {
      runtime: {
        session: { sessionId: "run_compelled", requestId: "req_compelled", status: "completed" },
        lease: { status: "released" },
        authorization: {
          desiredAction: "refuse",
          authorizedAction: "accept",
          dignityBand: "low",
          obligationReferences: ["Finish the security review promised to Daniel"],
        },
        goalGuardianAudit: { audit: { decision: "pass" } },
      },
    },
    outcome: {
      label: "Frozen",
      detail: "Authorization consumed and accepted life changes persisted.",
    },
  });

  assert.match(explanation.summary, /own recorded response was refuse/i);
  assert.match(explanation.summary, /authorized accept/i);
  assert.match(explanation.summary, /compelled participation, not consent/i);
  assert.match(explanation.summary, /Finish the security review promised to Daniel/);
  assert.ok(explanation.facts.some((entry) => entry.label === "Thread's own response" && entry.value === "refuse"));
  assert.ok(explanation.facts.some((entry) => entry.label === "Dignity match" && entry.value === "low"));
  const authorized = explanation.facts.find((entry) => entry.label === "Authorized action");
  assert.equal(authorized.value, "accept");
  assert.match(authorized.help, /may differ from the Thread's own recorded response/i);
  assert.doesNotMatch(authorized.help, /participation response recorded by the Thread/i);
  assert.ok(explanation.facts.some((entry) => entry.label === "Obligation override" && /security review/.test(entry.value)));
  assert.ok(explanation.notes.some((note) => /did not convert compulsion into consent/i.test(note)));
});

test("preview explanation makes non-persistence unambiguous", () => {
  const explanation = explainPreview({
    command: {
      type: "UPDATE_SELF_MODEL",
      expectedVersion: 8,
      occurredAt: "2026-08-06T20:00:00.000Z",
      actor: { displayName: "Thread Editor preview" },
      payload: { selfModel: "I am becoming a stronger security reviewer." },
    },
    preview: { resultingVersion: 9 },
    receipt: {
      previewIdRedacted: true,
      commandAcceptanceRequiresAdminToken: true,
    },
  });

  assert.equal(explanation.title, "Nothing was written to the Thread");
  assert.match(explanation.summary, /not accepted or persisted/i);
  assert.ok(explanation.notes.some((note) => /not consent, authorization/i.test(note)));
});

test("Thread-authored markup remains text-only at the DOM boundary", () => {
  const hostile = '<script>alert("x")</script></dd>"';
  const explanation = explainInspection({
    thread: {
      threadId: "thr_hostile",
      version: 1,
      status: "frozen",
      identity: { name: hostile },
      currentState: { selfModel: hostile },
    },
  });
  assert.match(explanation.title, /<script>/);
  assert.match(explanation.summary, /<\/dd>/);

  const appSource = readFileSync(repoFile("apps/thread-editor/app.js"), "utf8");
  assertSourceOmits(
    appSource,
    /innerHTML|insertAdjacentHTML/u,
    "Thread Editor app must never inject Thread-authored markup as HTML",
  );
  assertSourceContains(
    appSource,
    /\.textContent\s*=/u,
    "Thread Editor app must render untrusted Thread-authored values through textContent",
  );
});
