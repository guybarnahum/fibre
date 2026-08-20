import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import test from "node:test";

import {
  expressionSummary,
  inspectionCounts,
} from "../apps/thread-editor/editor-model.js";
import { explainExpression } from "../apps/thread-editor/expression-readable.js";
import { openExpressionStore } from "../services/world-kernel/src/expression-store.mjs";
import { runM1ReviewedProof } from "./m1-reviewed-proof.mjs";

function selection({
  desiredAction = "accept",
  authorizedAction = "accept",
  obligationReferences = [],
  strategyObligationReferences = obligationReferences,
  participationBasis = "aligned",
  mode = "tactful_candor",
  message = "I can take this on.",
} = {}) {
  return {
    expression: {
      expression: {
        authorization: {
          authorization: {
            authorizationId: "auth_test",
            desiredAction,
            authorizedAction,
            dignityBand: desiredAction === "accept" ? "high" : "low",
            obligationReferences,
          },
        },
        disclosure: {
          strategy: {
            strategyId: "dsc_test",
            participationBasis,
            mode,
            communicatedPosture: authorizedAction,
            disclosedReasonCategories:
              participationBasis === "obligation_override"
                ? ["recorded_obligation"]
                : [],
            withheldReasonCategories: ["private_feelings"],
            governingObligationReferences: [...strategyObligationReferences],
          },
        },
        response: {
          response: {
            responseId: "rsp_test",
            audience: [{ entityId: "human_guy", displayName: "Guy", kind: "human" }],
            message,
            deliveryStatus: "not_sent",
            performedActionStatus: "none_recorded",
            completionStatus: "not_claimed",
          },
        },
      },
    },
    integrity: {
      authorizationId: "auth_test",
      strategyId: "dsc_test",
      responseId: "rsp_test",
      audienceResponseStatus: {
        responsePresent: true,
        deliveryNotSent: true,
        performedActionNotRecorded: true,
        completionNotClaimed: true,
        boundedStatusWitnesses: true,
      },
    },
  };
}

test("expression summaries preserve the timestamp the kernel actually emits", () => {
  assert.deepEqual(
    expressionSummary({
      requestId: "req_authorization_only",
      authorizationId: "auth_only",
      desiredAction: "accept",
      authorizedAction: "accept",
      dignityBand: "high",
      strategyId: null,
      disclosureMode: null,
      communicatedPosture: null,
      responseId: null,
      issuedAt: "2026-08-06T20:00:00.000Z",
    }),
    {
      requestId: "req_authorization_only",
      authorizationId: "auth_only",
      desiredAction: "accept",
      authorizedAction: "accept",
      dignityBand: "high",
      strategyId: null,
      disclosureMode: null,
      communicatedPosture: null,
      responseId: null,
      recordedAt: "2026-08-06T20:00:00.000Z",
      complete: false,
    },
  );

  const completed = expressionSummary({
    requestId: "req_complete",
    authorizationId: "auth_complete",
    desiredAction: "refuse",
    authorizedAction: "refuse",
    dignityBand: "low",
    strategyId: "dsc_complete",
    strategyRecordedAt: "2026-08-06T20:01:00.000Z",
    disclosureMode: "tactful_candor",
    communicatedPosture: "refuse",
    responseId: "rsp_complete",
    responseRecordedAt: "2026-08-06T20:02:00.000Z",
  });
  assert.equal(completed.complete, true);
  assert.equal(completed.disclosureMode, "tactful_candor");
  assert.equal(completed.recordedAt, "2026-08-06T20:02:00.000Z");
});

test("inspection counts list rows and completed expression chains separately", () => {
  const counts = inspectionCounts({
    thread: {
      memoryRefs: [],
      relationshipRefs: [],
      currentState: { unresolvedIntentions: [] },
    },
    events: [],
    private: {
      requests: [],
      runtimes: [],
      expressions: [
        { strategyId: "dsc_1", responseId: "rsp_1" },
        { strategyId: null, responseId: null },
        { strategyId: "dsc_2", responseId: "rsp_2" },
      ],
    },
  });
  assert.equal(counts.expressions, 3);
  assert.equal(counts.completeExpressions, 2);
});

test("willing acceptance remains distinct from authorization and completion", () => {
  const explanation = explainExpression(selection());
  assert.equal(explanation.title, "Expression boundary");
  assert.match(explanation.summary, /I can take this on/);
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Thread’s own response" && entry.value === "accept",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Kernel-authorized participation" && entry.value === "accept",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Audience" && entry.value === "Guy",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Performed action" && entry.value === "none_recorded",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Response status witnesses" && entry.value === "Verified",
    ),
  );
  assert.ok(explanation.notes.every((note) => !/compelled participation, not consent/i.test(note)));
});

test("compelled acceptance preserves private refusal and explicitly denies consent inference", () => {
  const obligation = "Complete the security review promised to Daniel";
  const explanation = explainExpression(selection({
    desiredAction: "refuse",
    authorizedAction: "accept",
    obligationReferences: [obligation],
    participationBasis: "obligation_override",
    mode: "full_candor",
    message: "I can proceed with this request because I have a recorded obligation to do so.",
  }));

  assert.match(explanation.title, /compelled participation/i);
  assert.ok(explanation.notes.some((note) => /compelled participation, not consent/i.test(note)));
  assert.ok(explanation.notes.some((note) => note.includes(obligation)));
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Thread’s own response" && entry.value === "refuse",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Kernel-authorized participation" && entry.value === "accept",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Exact outward message" && /recorded obligation/.test(entry.value),
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Delivery" && entry.value === "not_sent",
    ),
  );
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Completion" && entry.value === "not_claimed",
    ),
  );
});

test("persisted obligation_override keeps the compelled banner if authorization terms are projected away", () => {
  const obligation = "Complete the security review promised to Daniel";
  const explanation = explainExpression(selection({
    desiredAction: "refuse",
    authorizedAction: "accept",
    obligationReferences: [],
    strategyObligationReferences: [obligation],
    participationBasis: "obligation_override",
    mode: "full_candor",
    message: "I can proceed with this request because I have a recorded obligation to do so.",
  }));
  assert.match(explanation.title, /compelled participation/i);
  assert.ok(explanation.notes.some((note) => /compelled participation, not consent/i.test(note)));
});

test("readable expression consumes a kernel-produced audience array and persisted basis", async () => {
  const proof = await runM1ReviewedProof({ keepDatabase: true });
  const store = openExpressionStore(proof.databasePath);
  try {
    const requestId = "req_mina_obligation_attempt";
    const chain = store.getExpressionChain("thr_mina_001", requestId);
    const integrity = store.verifyExpressionIntegrity("thr_mina_001", requestId);
    const explanation = explainExpression({
      expression: { expression: chain },
      integrity,
    });
    assert.match(explanation.title, /compelled participation/i);
    assert.ok(
      explanation.facts.some(
        (entry) => entry.label === "Audience" && entry.value === "Guy",
      ),
    );
    assert.ok(
      explanation.facts.some(
        (entry) => entry.label === "Response status witnesses" && entry.value === "Verified",
      ),
    );
  } finally {
    store.close();
    rmSync(dirname(proof.databasePath), { recursive: true, force: true });
  }
});

test("Thread-authored expression text remains data, never HTML", () => {
  const hostile = '<img src=x onerror=alert(1)>"</dd><script>x</script>';
  const explanation = explainExpression(selection({
    message: hostile,
  }));
  assert.match(explanation.summary, /<img/);
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Exact outward message" && entry.value === hostile,
    ),
  );

  const readableSource = readFileSync(
    new URL("../apps/thread-editor/expression-readable.js", import.meta.url),
    "utf8",
  );
  const appSource = readFileSync(
    new URL("../apps/thread-editor/app.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(readableSource, /innerHTML|insertAdjacentHTML|document\.createElement/);
  assert.doesNotMatch(appSource, /innerHTML|insertAdjacentHTML/);
  assert.match(appSource, /textContent = entry\.value/);
});

test("canonical structured authorization alone renders compelled participation truthfully", () => {
  const obligationId = `obl_${"d".repeat(64)}`;
  const explanation = explainExpression({
    expression: {
      expression: {
        authorization: {
          authorization: {
            authorizationId: "auth_structured",
            desiredAction: "clarify",
            authorizedAction: "accept",
            dignityBand: "contested",
            participationBasis: "obligation_override",
            obligationReferences: [],
            applicability: { obligationId },
          },
        },
        disclosure: null,
        response: null,
      },
    },
    integrity: null,
  });
  assert.match(explanation.title, /compelled participation/i);
  assert.ok(explanation.notes.some((note) => /compelled participation, not consent/i.test(note)));
  assert.ok(explanation.notes.some((note) => note.includes(obligationId)));
  assert.ok(
    explanation.facts.some(
      (entry) => entry.label === "Participation basis" && entry.value === "obligation_override",
    ),
  );
});
