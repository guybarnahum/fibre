import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  authorizationEpisodeEvidenceRef,
  currentEpisodeEvidenceRefs,
  currentEpisodeEvidenceRefsFromContext,
  currentEpisodeEvidenceRefsFromRuntime,
  requestEpisodeEvidenceRef,
} from "../src/episode-evidence.mjs";
import {
  FreezeRejectedError,
  buildFreezeOutcome,
} from "../src/freeze-domain.mjs";
import {
  actorOutputDigest,
  auditActorOutput,
  deterministicActorOutput,
} from "../src/runtime-domain.mjs";
import { threadStateHash } from "../src/persistence-common.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const REQUEST_ID = "req_episode_001";
const AUTHORIZATION_ID = "auth_episode_001";
const REQUEST_FINGERPRINT = `sha256:${"1".repeat(64)}`;

function executionContext({ desiredAction = "accept" } = {}) {
  const requester = { entityId: "company_acme", kind: "company", displayName: "Acme" };
  return {
    threadId: fixture.threadId,
    snapshotVersion: fixture.version,
    threadStateHash: threadStateHash(fixture),
    identity: `${fixture.identity.name}: ${fixture.identity.selfDescription}`,
    traits: Object.values(fixture.genome.textualTraits),
    selfModel: fixture.currentState.selfModel,
    needs: [],
    feelings: [],
    requester,
    requestId: REQUEST_ID,
    requestFingerprint: REQUEST_FINGERPRINT,
    objective: "Review the Atlas regional failover plan for rollback viability",
    acceptanceCriteria: "Return a bounded review of the regional failure path.",
    permissions: ["read_architecture_notes"],
    relevantMemories: [],
    excludedMemories: [],
    relevantRelationships: [],
    excludedRelationships: [],
    budgets: { ...fixture.accounts },
    participation: {
      authorizationId: AUTHORIZATION_ID,
      threadId: fixture.threadId,
      snapshotVersion: fixture.version,
      threadStateHash: threadStateHash(fixture),
      requestId: REQUEST_ID,
      requestFingerprint: REQUEST_FINGERPRINT,
      requester,
      appraisalId: "app_episode_001",
      stanceId: "pst_episode_001",
      policy: { id: "dignity_guardian", version: "4-dev" },
      desiredAction,
      authorizedAction: "accept",
      dignityBand: desiredAction === "accept" ? "high" : "contested",
      score: desiredAction === "accept" ? 82 : 55,
      rationale: "Authorized bounded participation.",
      evidenceRefs: [],
      obligationReferences: desiredAction === "accept" ? [] : ["obligation_episode"],
      relationshipImpact: {
        entity: requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "No relationship change.",
        evidenceRefs: [],
      },
      issuedAt: "2026-08-09T04:00:00Z",
      causationId: "cause_episode_authorization",
      correlationId: "corr_episode",
    },
    auditPolicies: ["dignity_guardian", "goal_guardian", "self_examiner_steward"],
  };
}

function syntheticRuntime() {
  const context = executionContext();
  const output = deterministicActorOutput(context);
  return {
    threadId: fixture.threadId,
    snapshotVersion: fixture.version,
    threadStateHash: threadStateHash(fixture),
    requestId: REQUEST_ID,
    authorization: structuredClone(context.participation),
    lease: {
      leaseId: "lease_episode_001",
      status: "active",
      acquiredAt: "2026-08-09T04:00:00Z",
      expiresAt: "2026-08-09T04:10:00Z",
    },
    session: {
      sessionId: "run_episode_001",
      status: "active",
      context,
    },
    actorRun: {
      actorRunId: "act_episode_001",
      output,
      outputDigest: actorOutputDigest(output),
    },
    goalGuardianAudit: {
      auditId: "gga_episode_001",
      auditDigest: `sha256:${"2".repeat(64)}`,
      audit: { decision: "pass" },
    },
  };
}

function freezeRequest({ decision = "accept" } = {}) {
  return {
    operationId: "op_freeze_episode_001",
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision,
      rationale: decision === "accept"
        ? "Retain the bounded evidence-backed episode memory."
        : "Do not retain this proposed episode memory.",
    }],
    causationId: "cause_freeze_episode_001",
    correlationId: "corr_episode",
  };
}

function freezeMetadata() {
  return {
    reportId: "frz_episode_001",
    completedAt: "2026-08-09T04:05:00Z",
  };
}

test("current-episode evidence refs bind exactly to request, authorization, and Thread", () => {
  assert.equal(requestEpisodeEvidenceRef(REQUEST_ID), `request:${REQUEST_ID}`);
  assert.equal(
    authorizationEpisodeEvidenceRef(AUTHORIZATION_ID),
    `authorization:${AUTHORIZATION_ID}`,
  );
  assert.deepEqual(
    currentEpisodeEvidenceRefs({
      requestId: REQUEST_ID,
      authorizationId: AUTHORIZATION_ID,
    }),
    [`request:${REQUEST_ID}`, `authorization:${AUTHORIZATION_ID}`],
  );

  const context = executionContext();
  assert.deepEqual(
    currentEpisodeEvidenceRefsFromContext(context),
    [`request:${REQUEST_ID}`, `authorization:${AUTHORIZATION_ID}`],
  );
  const mismatchedContext = structuredClone(context);
  mismatchedContext.participation.requestId = "req_other";
  assert.throws(
    () => currentEpisodeEvidenceRefsFromContext(mismatchedContext),
    /does not match execution context/,
  );
  const wrongThreadContext = structuredClone(context);
  wrongThreadContext.participation.threadId = "thread_other";
  assert.throws(
    () => currentEpisodeEvidenceRefsFromContext(wrongThreadContext),
    /Thread does not match execution context/,
  );

  const runtime = syntheticRuntime();
  assert.deepEqual(
    currentEpisodeEvidenceRefsFromRuntime(runtime),
    [`request:${REQUEST_ID}`, `authorization:${AUTHORIZATION_ID}`],
  );
  const mismatchedRuntime = structuredClone(runtime);
  mismatchedRuntime.session.context.participation.authorizationId = "auth_other";
  assert.throws(
    () => currentEpisodeEvidenceRefsFromRuntime(mismatchedRuntime),
    /authorization does not match runtime/,
  );
  const missingContextRuntime = structuredClone(runtime);
  delete missingContextRuntime.session.context;
  assert.throws(
    () => currentEpisodeEvidenceRefsFromRuntime(missingContextRuntime),
    /must be a plain object/,
  );
  const wrongThreadRuntime = structuredClone(runtime);
  wrongThreadRuntime.authorization.threadId = "thread_other";
  assert.throws(
    () => currentEpisodeEvidenceRefsFromRuntime(wrongThreadRuntime),
    /Thread does not match runtime/,
  );
});

test("willing deterministic Actor proposes a descriptive episode memory and Guardian audits its provenance", () => {
  const context = executionContext();
  const output = deterministicActorOutput(context);
  assert.equal(output.proposedLifeChanges.length, 1);
  const memory = output.proposedLifeChanges[0];
  assert.equal(memory.kind, "memory");
  assert.deepEqual(
    memory.evidenceRefs,
    [`request:${REQUEST_ID}`, `authorization:${AUTHORIZATION_ID}`],
  );
  assert.match(memory.summary, /accepted Acme's request/i);
  assert.match(memory.summary, /Atlas regional failover plan/i);
  assert.match(memory.summary, /authorized acceptance criteria/i);
  assert.doesNotMatch(memory.summary, /next time|always|refuse future/i);
  assert.equal(auditActorOutput(context, output).decision, "pass");

  const forged = structuredClone(output);
  forged.proposedLifeChanges[0].evidenceRefs[0] = "request:req_other";
  const audit = auditActorOutput(context, forged);
  assert.equal(audit.decision, "reject");
  assert.equal(
    audit.checks.find((check) => check.code === "BOUNDED_LIFE_CHANGES").passed,
    false,
  );
});

test("obligation-overridden execution preserves the pre-34.1 no-memory behavior", () => {
  const context = executionContext({ desiredAction: "clarify" });
  const output = deterministicActorOutput(context);
  assert.deepEqual(output.proposedLifeChanges, []);
  assert.equal(auditActorOutput(context, output).decision, "pass");
});

test("freeze independently accepts only episode evidence bound to the active runtime", () => {
  const runtime = syntheticRuntime();
  const accepted = buildFreezeOutcome(
    fixture,
    runtime,
    freezeRequest(),
    freezeMetadata(),
  );
  assert.equal(accepted.report.acceptedLifeChanges.length, 1);
  assert.deepEqual(
    accepted.report.acceptedLifeChanges[0].evidenceRefs,
    [`request:${REQUEST_ID}`, `authorization:${AUTHORIZATION_ID}`],
  );
  assert.ok(
    accepted.nextThread.memoryRefs.includes(
      accepted.report.acceptedLifeChanges[0].memoryId,
    ),
  );

  for (const forgedRef of ["request:req_other", "authorization:auth_other"]) {
    const forged = syntheticRuntime();
    const evidenceRefs = [...forged.actorRun.output.proposedLifeChanges[0].evidenceRefs];
    if (forgedRef.startsWith("request:")) evidenceRefs[0] = forgedRef;
    else evidenceRefs[1] = forgedRef;
    forged.actorRun.output.proposedLifeChanges[0].evidenceRefs = evidenceRefs;
    assert.throws(
      () => buildFreezeOutcome(
        fixture,
        forged,
        freezeRequest(),
        freezeMetadata(),
      ),
      FreezeRejectedError,
      forgedRef,
    );
  }
});

test("rejected freeze life change does not become durable memory", () => {
  const runtime = syntheticRuntime();
  const rejected = buildFreezeOutcome(
    fixture,
    runtime,
    freezeRequest({ decision: "reject" }),
    freezeMetadata(),
  );

  assert.equal(rejected.report.acceptedLifeChanges.length, 0);
  assert.equal(rejected.report.rejectedLifeChanges.length, 1);
  assert.deepEqual(rejected.nextThread.memoryRefs, fixture.memoryRefs);
  assert.equal(
    rejected.nextThread.memoryRefs.some((memoryId) =>
      rejected.report.rejectedLifeChanges.some((change) => change.memoryId === memoryId)),
    false,
  );
});
