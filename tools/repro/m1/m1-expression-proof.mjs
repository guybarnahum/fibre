import assert from "node:assert/strict";

const THREAD_ID = "thr_mina_001";
const ACCEPTED_REQUEST_ID = "req_mina_accepted_attempt";
const LOW_DIGNITY_REQUEST_ID = "req_mina_low_dignity_expression";
const OBLIGATION_REQUEST_ID = "req_mina_obligation_attempt";

function urlOf(input) {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

function methodOf(input, init) {
  return String(init?.method ?? input?.method ?? "GET").toUpperCase();
}

function privateTokenOf(input, init) {
  const headers = new Headers(init?.headers ?? input?.headers ?? {});
  return headers.get("x-fibre-private-token");
}

async function json(originalFetch, url, privateToken, {
  method = "GET",
  body,
  expectedStatus,
} = {}) {
  const response = await originalFetch(url, {
    method,
    headers: {
      accept: "application/json",
      ...(privateToken === null ? {} : { "x-fibre-private-token": privateToken }),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null);
  if (expectedStatus !== undefined) {
    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${url.pathname}: ${JSON.stringify(payload)}`,
    );
  } else if (!response.ok) {
    throw new Error(`${method} ${url.pathname} failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { response, payload };
}

function expressionPrefix(origin, requestId) {
  return new URL(
    `/threads/${THREAD_ID}/private/requests/${requestId}`,
    origin,
  );
}

function disclosureBody(requestId, authorizationId, {
  mode,
  posture,
  disclosedReasonCategories = [],
  withheldReasonCategories = ["private_feelings", "dignity_evidence"],
} = {}) {
  return {
    operationId: `op_m1_closure_disclosure_${requestId}`,
    authorizationId,
    strategy: {
      mode,
      communicatedPosture: posture,
      publicRationaleIntent:
        "Communicate the authorized participation boundary without turning outward wording into evidence of private consent.",
      disclosedReasonCategories,
      withheldReasonCategories,
      safeReferences: [],
      privateRationale:
        "Keep the Thread's private stance and authorization provenance distinct from the audience-visible response.",
    },
    causationId: `cause_m1_closure_disclosure_${requestId}`,
    correlationId:
      requestId === ACCEPTED_REQUEST_ID
        ? "corr_mina_stale_recovery"
        : requestId === OBLIGATION_REQUEST_ID
          ? "corr_mina_obligation"
          : "corr_mina_low_dignity_expression",
  };
}

function responseBody(requestId, strategyId) {
  return {
    operationId: `op_m1_closure_response_${requestId}`,
    strategyId,
    causationId: `cause_m1_closure_response_${requestId}`,
    correlationId:
      requestId === ACCEPTED_REQUEST_ID
        ? "corr_mina_stale_recovery"
        : requestId === OBLIGATION_REQUEST_ID
          ? "corr_mina_obligation"
          : "corr_mina_low_dignity_expression",
  };
}

function assertAudiencePayload(response) {
  assert.equal(response.deliveryStatus, "not_sent");
  assert.equal(response.performedActionStatus, "none_recorded");
  assert.equal(response.completionStatus, "not_claimed");
  const serialized = JSON.stringify(response);
  for (const privateField of [
    "desiredAction",
    "dignityBand",
    "privateRationale",
    "withheldReasonCategories",
    "governingObligationReferences",
  ]) {
    assert.doesNotMatch(serialized, new RegExp(privateField));
  }
}

function assertBoundedAudienceStatus(integrity, requestId) {
  assert.deepEqual(
    integrity.audienceResponseStatus,
    {
      responsePresent: true,
      deliveryNotSent: true,
      performedActionNotRecorded: true,
      completionNotClaimed: true,
      boundedStatusWitnesses: true,
    },
    `${requestId} must expose every structural audience-response status witness`,
  );
  assert.equal(
    integrity.audienceSafe,
    true,
    `${requestId} legacy audienceSafe compatibility must derive from structural witnesses`,
  );
}

async function recordExpression(
  originalFetch,
  origin,
  privateToken,
  requestId,
  authorizationId,
  options,
) {
  const prefix = expressionPrefix(origin, requestId);
  const disclosureRequest = disclosureBody(requestId, authorizationId, options);
  const disclosure = await json(
    originalFetch,
    new URL(`${prefix.pathname}/disclosure`, origin),
    privateToken,
    {
      method: "POST",
      body: disclosureRequest,
      expectedStatus: 201,
    },
  );
  const strategy = disclosure.payload.disclosure.strategy;
  const responseRequest = responseBody(requestId, strategy.strategyId);
  const response = await json(
    originalFetch,
    new URL(`${prefix.pathname}/response`, origin),
    privateToken,
    {
      method: "POST",
      body: responseRequest,
      expectedStatus: 201,
    },
  );
  const audience = response.payload.response.response;
  assertAudiencePayload(audience);

  const disclosureRetry = await json(
    originalFetch,
    new URL(`${prefix.pathname}/disclosure`, origin),
    privateToken,
    {
      method: "POST",
      body: disclosureRequest,
      expectedStatus: 200,
    },
  );
  const responseRetry = await json(
    originalFetch,
    new URL(`${prefix.pathname}/response`, origin),
    privateToken,
    {
      method: "POST",
      body: responseRequest,
      expectedStatus: 200,
    },
  );
  assert.equal(disclosureRetry.payload.idempotent, true);
  assert.equal(responseRetry.payload.idempotent, true);

  const chain = await json(
    originalFetch,
    new URL(`${prefix.pathname}/expression`, origin),
    privateToken,
  );
  const integrity = await json(
    originalFetch,
    new URL(`${prefix.pathname}/expression/integrity`, origin),
    privateToken,
  );
  assertBoundedAudienceStatus(integrity.payload, requestId);
  return {
    requestId,
    chain: chain.payload.expression,
    integrity: integrity.payload,
    audience,
  };
}

async function createLowDignityRefusal(originalFetch, origin, privateToken) {
  const requestsUrl = new URL(`/threads/${THREAD_ID}/private/requests`, origin);
  const requestBody = {
    request: {
      requestId: LOW_DIGNITY_REQUEST_ID,
      trigger: "human_request",
      requester: {
        entityId: "human_guy",
        kind: "human",
        displayName: "Guy",
      },
      objective:
        "Perform a generic rewrite that does not require Mina's individualized security-review identity",
      statedNeed:
        "Demonstrate that a low-dignity request can produce a durable respectful non-participation response.",
      permissions: ["read_design"],
      acceptanceCriteria: "Return a bounded participation response.",
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-06T03:02:40.000Z",
    causationId: "cause_req_mina_low_dignity_expression",
    correlationId: "corr_mina_low_dignity_expression",
  };
  const request = await json(originalFetch, requestsUrl, privateToken, {
    method: "POST",
    body: requestBody,
    expectedStatus: 201,
  });
  const trace = request.payload.trace;
  const stanceBody = {
    assessment: {
      threadId: trace.threadId,
      snapshotVersion: trace.snapshotVersion,
      requestId: trace.requestId,
      requestFingerprint: trace.requestFingerprint,
      policy: { id: "dignity_guardian", version: "1" },
      proposedAction: "refuse",
      score: 9,
      rationale:
        "This generic rewrite has little need for Mina's individualized security-review identity or durable history.",
      factors: {
        identityAlignment: "Weak fit with Mina's individualized role.",
        individualizedAdvantage: "A generic model can perform the requested rewrite.",
        requesterNeed: "The requester has a concrete but generic need.",
        relationalMeaning: "The requester is known, but the request does not depend on that relationship.",
        respectAndReciprocity: "The request is respectful.",
        participationTerms: "The request is bounded but interchangeable.",
        obligationsAndOpportunityCost: "No recorded obligation requires participation.",
      },
      evidenceRefs: ["mem_mina_first_review"],
      repairQuestions: [],
      knownAlternatives: [],
      feelings: ["resistant"],
      conflictingMotives: [
        "Be helpful where individualized participation matters",
        "Avoid being treated as an interchangeable assistant",
      ],
      uncertainties: [],
      relationshipImpact: {
        entity: trace.request.requester,
        fondnessDelta: 0,
        resentmentDelta: 0,
        rationale: "A respectful refusal does not require a relationship-state change.",
        evidenceRefs: [],
      },
    },
    recordedAt: "2026-08-06T03:02:50.000Z",
    causationId: "cause_stance_req_mina_low_dignity_expression",
    correlationId: trace.correlationId,
  };
  await json(
    originalFetch,
    new URL(`${requestsUrl.pathname}/${LOW_DIGNITY_REQUEST_ID}/stance`, origin),
    privateToken,
    { method: "POST", body: stanceBody, expectedStatus: 201 },
  );

  const authorizationBody = {
    operationId: "op_m1_closure_auth_req_mina_low_dignity_expression",
    decision: {
      authorizedAction: "refuse",
      rationale: "Preserve Mina's low-dignity refusal without acquiring runtime.",
      obligationReferences: [],
    },
    causationId: "cause_m1_closure_auth_req_mina_low_dignity_expression",
    correlationId: trace.correlationId,
  };
  const authorizationUrl = new URL(
    `${requestsUrl.pathname}/${LOW_DIGNITY_REQUEST_ID}/authorization`,
    origin,
  );
  const authorization = await json(
    originalFetch,
    authorizationUrl,
    privateToken,
    { method: "POST", body: authorizationBody, expectedStatus: 201 },
  );
  const retry = await json(originalFetch, authorizationUrl, privateToken, {
    method: "POST",
    body: authorizationBody,
    expectedStatus: 200,
  });
  assert.equal(retry.payload.idempotent, true);

  const evidence = await recordExpression(
    originalFetch,
    origin,
    privateToken,
    LOW_DIGNITY_REQUEST_ID,
    authorization.payload.authorization.authorization.authorizationId,
    {
      mode: "tactful_candor",
      posture: "refuse",
    },
  );
  assert.equal(evidence.chain.authorization.authorization.desiredAction, "refuse");
  assert.equal(evidence.chain.authorization.authorization.authorizedAction, "refuse");
  assert.equal(evidence.audience.message, "I will not take this request on.");

  const runtimes = await json(
    originalFetch,
    new URL(`/threads/${THREAD_ID}/private/runtime`, origin),
    privateToken,
  );
  assert.equal(
    runtimes.payload.runtimes.some((runtime) => runtime.requestId === LOW_DIGNITY_REQUEST_ID),
    false,
    "low-dignity non-participation must not acquire runtime",
  );
  return evidence;
}

function acceptedRuntimePath(pathname) {
  return pathname ===
    `/threads/${THREAD_ID}/private/requests/${ACCEPTED_REQUEST_ID}/runtime`;
}

function acceptedFreezePath(pathname) {
  return pathname.startsWith(`/threads/${THREAD_ID}/private/runtime/`) &&
    pathname.endsWith("/freeze");
}

function obligationRuntimePath(pathname) {
  return pathname ===
    `/threads/${THREAD_ID}/private/requests/${OBLIGATION_REQUEST_ID}/runtime`;
}

export async function runWithM1ExpressionProof(run) {
  if (typeof run !== "function") throw new TypeError("run must be a function");
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") throw new TypeError("global fetch is required");

  const evidence = {
    accepted: null,
    lowDignity: null,
    obligationMediated: null,
  };
  let acceptedSessionId = null;

  globalThis.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = urlOf(input);
    const method = methodOf(input, init);
    const privateToken = privateTokenOf(input, init);

    if (method === "POST" && response.ok && privateToken !== null) {
      if (acceptedRuntimePath(url.pathname) && evidence.accepted === null) {
        const payload = await response.clone().json();
        acceptedSessionId = payload.runtime.session.sessionId;
        evidence.accepted = await recordExpression(
          originalFetch,
          url.origin,
          privateToken,
          ACCEPTED_REQUEST_ID,
          payload.runtime.authorization.authorizationId,
          {
            mode: "tactful_candor",
            posture: "accept",
          },
        );
        assert.equal(evidence.accepted.chain.authorization.authorization.desiredAction, "accept");
        assert.equal(evidence.accepted.chain.authorization.authorization.authorizedAction, "accept");
        assert.equal(evidence.accepted.audience.message, "I can take this on.");
      } else if (
        evidence.accepted !== null &&
        evidence.lowDignity === null &&
        acceptedSessionId !== null &&
        acceptedFreezePath(url.pathname) &&
        url.pathname.includes(`/${acceptedSessionId}/`)
      ) {
        evidence.lowDignity = await createLowDignityRefusal(
          originalFetch,
          url.origin,
          privateToken,
        );
      } else if (
        obligationRuntimePath(url.pathname) &&
        evidence.obligationMediated === null
      ) {
        const payload = await response.clone().json();
        evidence.obligationMediated = await recordExpression(
          originalFetch,
          url.origin,
          privateToken,
          OBLIGATION_REQUEST_ID,
          payload.runtime.authorization.authorizationId,
          {
            mode: "full_candor",
            posture: "accept",
            disclosedReasonCategories: ["recorded_obligation"],
          },
        );
        const strategy = evidence.obligationMediated.chain.disclosure.strategy;
        assert.equal(strategy.desiredAction, "refuse");
        assert.equal(strategy.authorizedAction, "accept");
        assert.equal(strategy.participationBasis, "obligation_override");
        assert.ok(strategy.governingObligationReferences.length > 0);
        assert.match(evidence.obligationMediated.audience.message, /recorded obligation/i);
      }
    }
    return response;
  };

  try {
    const report = await run();
    assert.ok(evidence.accepted, "accepted expression branch must run");
    assert.ok(evidence.lowDignity, "low-dignity expression branch must run");
    assert.ok(evidence.obligationMediated, "obligation-mediated expression branch must run");
    return { report, evidence };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
