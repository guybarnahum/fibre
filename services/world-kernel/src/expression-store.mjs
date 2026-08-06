import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import { createExpressionTables } from "./expression-schema.mjs";
import {
  ExpressionConflictError,
  ExpressionNotFoundError,
  ExpressionRejectedError,
  ParticipationAuthorizationNotFoundError,
  audienceResponseDigest,
  disclosureOperationDigest,
  disclosureStrategyDigest,
  nonExecutionAuthorizationOperationDigest,
  responseOperationDigest,
  validateAudienceResponse,
  validateDisclosureStrategy,
  validateParticipationAuthorization,
} from "./expression-domain.mjs";
import {
  authorizationDigest,
  runtimeAcquireOperationDigest,
} from "./runtime-domain.mjs";

const IDS = {
  auth: /^auth_[0-9a-f]{64}$/,
  dsc: /^dsc_[0-9a-f]{64}$/,
  rsp: /^rsp_[0-9a-f]{64}$/,
};
const HASH = /^sha256:[0-9a-f]{64}$/;

function json(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function same(name, left, right) {
  if (left !== right) {
    throw new IntegrityError(`${name} does not match its witness`);
  }
}

function opaque(name, value, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new IntegrityError(`${name} is invalid`);
  }
}

function digest(name, value) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new IntegrityError(`${name} is invalid`);
  }
}

function time(name, value) {
  try {
    assertIsoTimestamp(name, value);
  } catch (error) {
    throw new IntegrityError(`${name} is invalid: ${error.message}`);
  }
}

function sameEntity(left, right) {
  return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

function authorizationOperationDigest(threadId, requestId, operation) {
  if (operation?.kind === "non_execution_participation_authorization") {
    const { kind: _kind, ...request } = operation;
    return nonExecutionAuthorizationOperationDigest(threadId, requestId, request);
  }
  return runtimeAcquireOperationDigest(threadId, requestId, operation);
}

function translateExpressionStorageError(error) {
  if (/authorization obligation was already discharged/i.test(error?.message ?? "")) {
    return new ExpressionRejectedError(error.message);
  }
  return translateStorageError(error);
}

export class ExpressionStore {
  #db;

  constructor(databasePath) {
    this.#db = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    try {
      migrateDatabase(this.#db);
      createExpressionTables(this.#db);
    } catch (error) {
      this.#db.close();
      throw error;
    }
  }

  close() {
    this.#db.close();
  }

  storageMetadata() {
    return {
      schemaVersion: Number(this.#db.prepare("PRAGMA user_version").get().user_version),
      expressionSchemaVersion: 1,
      busyTimeoutMs: Number(this.#db.prepare("PRAGMA busy_timeout").get().timeout),
    };
  }

  #authRow(threadId, authorizationId) {
    return this.#db.prepare(`
      SELECT a.*,r.request_fingerprint AS request_witness,
        p.appraisal_id AS appraisal_witness,
        s.stance_id AS stance_witness,s.thread_state_hash AS stance_state,
        s.request_fingerprint AS stance_request,
        s.policy_id AS stance_policy_id,s.policy_version AS stance_policy_version,
        s.stance_json,s.stance_digest
      FROM participation_authorizations a
      JOIN activation_requests r
        ON r.thread_id=a.thread_id AND r.request_id=a.request_id
      JOIN request_appraisals p
        ON p.thread_id=a.thread_id AND p.request_id=a.request_id
      JOIN private_participation_stances s ON s.appraisal_id=p.appraisal_id
      WHERE a.thread_id=? AND a.authorization_id=?
    `).get(threadId, authorizationId);
  }

  #decodeAuth(row) {
    if (!row) return null;
    opaque("authorizationId", row.authorization_id, IDS.auth);
    for (const [name, value] of [
      ["operation digest", row.operation_digest],
      ["state hash", row.thread_state_hash],
      ["request fingerprint", row.request_fingerprint],
      ["authorization digest", row.authorization_digest],
      ["stance digest", row.stance_digest],
    ]) {
      digest(name, value);
    }
    time("authorization issuedAt", row.issued_at);

    const authorization = json(
      `authorization ${row.authorization_id}`,
      row.authorization_json,
    );
    const operation = json(
      `authorization operation ${row.operation_id}`,
      row.operation_json,
    );
    const stance = json(`private stance ${row.stance_id}`, row.stance_json);
    validateParticipationAuthorization(authorization);

    same("authorization ID", authorization.authorizationId, row.authorization_id);
    same("authorization thread", authorization.threadId, row.thread_id);
    same("authorization request", authorization.requestId, row.request_id);
    same("authorization appraisal", authorization.appraisalId, row.appraisal_id);
    same("authorization stance", authorization.stanceId, row.stance_id);
    same("authorization state", authorization.threadStateHash, row.thread_state_hash);
    same(
      "authorization request fingerprint",
      authorization.requestFingerprint,
      row.request_fingerprint,
    );
    same(
      "authorization digest",
      authorizationDigest(authorization),
      row.authorization_digest,
    );
    same(
      "authorization operation",
      authorizationOperationDigest(row.thread_id, row.request_id, operation),
      row.operation_digest,
    );
    same("request witness", row.request_fingerprint, row.request_witness);
    same("appraisal witness", row.appraisal_id, row.appraisal_witness);
    same("stance witness", row.stance_id, row.stance_witness);
    same("stance state", row.thread_state_hash, row.stance_state);
    same("stance request", row.request_fingerprint, row.stance_request);
    same("stance desired action", authorization.desiredAction, stance.desiredAction);
    same("stance dignity band", authorization.dignityBand, stance.dignityBand);
    same("stance score", authorization.score, stance.score);
    same("stance policy id", authorization.policy.id, row.stance_policy_id);
    same("stance policy version", authorization.policy.version, row.stance_policy_version);
    if (!sameEntity(authorization.requester, stance.relationshipImpact?.entity)) {
      throw new IntegrityError(
        "authorization requester does not match private stance relationship target",
      );
    }
    if (
      operation.decision?.authorizedAction !== authorization.authorizedAction ||
      operation.decision?.rationale !== authorization.rationale ||
      canonicalJson(operation.decision?.obligationReferences ?? []) !==
        canonicalJson(authorization.obligationReferences)
    ) {
      throw new IntegrityError(
        "authorization decision does not match operation witness",
      );
    }
    return {
      authorization,
      authorizationDigest: row.authorization_digest,
      operationId: row.operation_id,
      operation,
      operationDigest: row.operation_digest,
      appraisalId: row.appraisal_id,
      stanceId: row.stance_id,
      stanceDigest: row.stance_digest,
    };
  }

  getAuthorization(threadId, authorizationId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("authorizationId", authorizationId);
    const value = this.#decodeAuth(this.#authRow(threadId, authorizationId));
    if (!value && required) {
      throw new ParticipationAuthorizationNotFoundError(
        `Participation authorization ${authorizationId} was not found for Thread ${threadId}`,
      );
    }
    return value;
  }

  getAuthorizationForRequest(threadId, requestId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const row = this.#db.prepare(
      "SELECT authorization_id FROM participation_authorizations WHERE thread_id=? AND request_id=?",
    ).get(threadId, requestId);
    if (!row) {
      if (!required) return null;
      throw new ParticipationAuthorizationNotFoundError(
        `No participation authorization was found for request ${requestId}`,
      );
    }
    return this.getAuthorization(threadId, row.authorization_id);
  }

  getAuthorizationByOperation(operationId, expectedDigest, { required = false } = {}) {
    assertId("authorization operationId", operationId);
    digest("expected authorization operation digest", expectedDigest);
    const row = this.#db.prepare(
      "SELECT thread_id,authorization_id,operation_digest FROM participation_authorizations WHERE operation_id=?",
    ).get(operationId);
    if (!row) {
      if (required) {
        throw new ParticipationAuthorizationNotFoundError(
          `Participation authorization operation ${operationId} was not found`,
        );
      }
      return null;
    }
    if (row.operation_digest !== expectedDigest) {
      throw new ExpressionConflictError(
        `Operation ${operationId} was already used with different authorization content`,
      );
    }
    return this.getAuthorization(row.thread_id, row.authorization_id);
  }

  recordNonExecutionAuthorization(record) {
    const prior = this.getAuthorizationByOperation(
      record.operationId,
      record.operationDigest,
    );
    if (prior) return { authorization: prior, idempotent: true };
    if (record.authorization.authorizedAction === "accept") {
      throw new IntegrityError(
        "non-execution authorization cannot persist accepted execution authority",
      );
    }

    try {
      this.#db.exec("BEGIN IMMEDIATE");
      const thread = this.#db.prepare(
        "SELECT version,status,state_json,state_hash FROM threads WHERE thread_id=?",
      ).get(record.threadId);
      if (!thread) {
        throw new ParticipationAuthorizationNotFoundError(
          `Thread ${record.threadId} was not found`,
        );
      }
      if (
        Number(thread.version) !== record.snapshotVersion ||
        thread.state_hash !== record.threadStateHash ||
        !["frozen", "dormant"].includes(thread.status)
      ) {
        throw new ExpressionConflictError(
          `Thread ${record.threadId} changed before participation authorization`,
        );
      }
      if (
        threadStateHash(json(`Thread ${record.threadId}`, thread.state_json)) !==
        record.threadStateHash
      ) {
        throw new IntegrityError(
          `Thread ${record.threadId} state hash failed during authorization`,
        );
      }

      const trace = this.#db.prepare(`
        SELECT p.appraisal_id,s.stance_id,s.thread_state_hash,
          s.request_fingerprint,s.stance_digest
        FROM request_appraisals p
        JOIN private_participation_stances s ON s.appraisal_id=p.appraisal_id
        WHERE p.thread_id=? AND p.request_id=?
      `).get(record.threadId, record.requestId);
      if (
        !trace ||
        trace.appraisal_id !== record.appraisalId ||
        trace.stance_id !== record.stanceId ||
        trace.thread_state_hash !== record.threadStateHash ||
        trace.request_fingerprint !== record.requestFingerprint ||
        trace.stance_digest !== record.stanceDigest
      ) {
        throw new ExpressionConflictError(
          `Request ${record.requestId} changed before participation authorization`,
        );
      }

      const raced = this.#db.prepare(`
        SELECT authorization_id,operation_id,operation_digest
        FROM participation_authorizations
        WHERE operation_id=? OR stance_id=?
      `).get(record.operationId, record.stanceId);
      if (raced) {
        if (
          raced.operation_id !== record.operationId ||
          raced.operation_digest !== record.operationDigest
        ) {
          throw new ExpressionConflictError(
            `Private stance ${record.stanceId} already has different participation authority`,
          );
        }
        this.#db.exec("COMMIT");
        return {
          authorization: this.getAuthorization(
            record.threadId,
            raced.authorization_id,
          ),
          idempotent: true,
        };
      }

      this.#db.prepare(
        "INSERT INTO participation_authorizations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        record.authorization.authorizationId,
        record.operationId,
        canonicalJson(record.operation),
        record.operationDigest,
        record.threadId,
        record.requestId,
        record.appraisalId,
        record.stanceId,
        record.snapshotVersion,
        record.threadStateHash,
        record.requestFingerprint,
        canonicalJson(record.authorization),
        record.authorizationDigest,
        record.authorization.issuedAt,
        record.authorization.causationId,
        record.authorization.correlationId,
      );
      this.#db.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#db);
      throw translateExpressionStorageError(error);
    }
    return {
      authorization: this.getAuthorization(
        record.threadId,
        record.authorization.authorizationId,
      ),
      idempotent: false,
    };
  }

  #strategyRow(threadId, requestId) {
    return this.#db.prepare(
      "SELECT * FROM disclosure_strategies WHERE thread_id=? AND request_id=?",
    ).get(threadId, requestId);
  }

  #decodeStrategy(row) {
    if (!row) return null;
    opaque("strategyId", row.strategy_id, IDS.dsc);
    for (const [name, value] of [
      ["operation digest", row.operation_digest],
      ["state hash", row.thread_state_hash],
      ["request fingerprint", row.request_fingerprint],
      ["strategy digest", row.strategy_digest],
    ]) {
      digest(name, value);
    }
    time("strategy recordedAt", row.recorded_at);
    const strategy = json(`disclosure strategy ${row.strategy_id}`, row.strategy_json);
    const operation = json(`disclosure operation ${row.operation_id}`, row.operation_json);
    validateDisclosureStrategy(strategy);
    same("strategy ID", strategy.strategyId, row.strategy_id);
    same("strategy thread", strategy.threadId, row.thread_id);
    same("strategy request", strategy.requestId, row.request_id);
    same("strategy snapshot", strategy.snapshotVersion, Number(row.snapshot_version));
    same("strategy state", strategy.threadStateHash, row.thread_state_hash);
    same(
      "strategy request fingerprint",
      strategy.requestFingerprint,
      row.request_fingerprint,
    );
    same("strategy appraisal", strategy.appraisalId, row.appraisal_id);
    same("strategy stance", strategy.stanceId, row.stance_id);
    same("strategy authorization", strategy.authorizationId, row.authorization_id);
    same(
      "strategy digest",
      disclosureStrategyDigest(strategy),
      row.strategy_digest,
    );
    same(
      "strategy operation",
      disclosureOperationDigest(row.thread_id, row.request_id, operation),
      row.operation_digest,
    );
    const authorization = this.getAuthorization(
      row.thread_id,
      row.authorization_id,
    ).authorization;
    same("strategy desired action", strategy.desiredAction, authorization.desiredAction);
    same(
      "strategy authorized action",
      strategy.authorizedAction,
      authorization.authorizedAction,
    );
    same("strategy dignity", strategy.dignityBand, authorization.dignityBand);
    if (!sameEntity(strategy.requester, authorization.requester)) {
      throw new IntegrityError("strategy requester does not match authorization");
    }
    if (
      canonicalJson(strategy.governingObligationReferences) !==
      canonicalJson(authorization.obligationReferences)
    ) {
      throw new IntegrityError(
        "strategy obligation witness does not match authorization",
      );
    }
    return {
      strategy,
      strategyDigest: row.strategy_digest,
      operationId: row.operation_id,
      operation,
      operationDigest: row.operation_digest,
    };
  }

  getDisclosureStrategy(threadId, requestId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const value = this.#decodeStrategy(this.#strategyRow(threadId, requestId));
    if (!value && required) {
      throw new ExpressionNotFoundError(
        `No disclosure strategy was found for request ${requestId}`,
      );
    }
    return value;
  }

  getDisclosureByOperation(operationId, expectedDigest) {
    assertId("disclosure operationId", operationId);
    const row = this.#db.prepare(
      "SELECT thread_id,request_id,operation_digest FROM disclosure_strategies WHERE operation_id=?",
    ).get(operationId);
    if (!row) return null;
    if (row.operation_digest !== expectedDigest) {
      throw new ExpressionConflictError(
        `Operation ${operationId} was already used with different disclosure content`,
      );
    }
    return this.getDisclosureStrategy(row.thread_id, row.request_id);
  }

  recordDisclosure(record) {
    const prior = this.getDisclosureByOperation(
      record.operationId,
      record.operationDigest,
    );
    if (prior) return { disclosure: prior, idempotent: true };
    try {
      this.#db.exec("BEGIN IMMEDIATE");
      const authorization = this.getAuthorization(
        record.threadId,
        record.authorizationId,
      );
      if (
        authorization.authorizationDigest !== record.authorizationDigest ||
        authorization.appraisalId !== record.appraisalId ||
        authorization.stanceId !== record.stanceId ||
        authorization.authorization.threadStateHash !== record.threadStateHash ||
        authorization.authorization.requestFingerprint !== record.requestFingerprint
      ) {
        throw new ExpressionConflictError(
          "Participation authority changed before disclosure persistence",
        );
      }
      const existing = this.#strategyRow(record.threadId, record.requestId);
      if (existing) {
        if (
          existing.operation_id !== record.operationId ||
          existing.operation_digest !== record.operationDigest
        ) {
          throw new ExpressionConflictError(
            `Request ${record.requestId} already has a different disclosure strategy`,
          );
        }
        this.#db.exec("COMMIT");
        return { disclosure: this.#decodeStrategy(existing), idempotent: true };
      }
      this.#db.prepare(`
        INSERT INTO disclosure_strategies(
          strategy_id,operation_id,operation_json,operation_digest,thread_id,request_id,
          snapshot_version,thread_state_hash,request_fingerprint,appraisal_id,stance_id,
          authorization_id,strategy_json,strategy_digest,recorded_at,causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.strategy.strategyId,
        record.operationId,
        canonicalJson(record.operation),
        record.operationDigest,
        record.threadId,
        record.requestId,
        record.snapshotVersion,
        record.threadStateHash,
        record.requestFingerprint,
        record.appraisalId,
        record.stanceId,
        record.authorizationId,
        canonicalJson(record.strategy),
        record.strategyDigest,
        record.strategy.recordedAt,
        record.strategy.causationId,
        record.strategy.correlationId,
      );
      this.#db.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#db);
      throw translateStorageError(error);
    }
    return {
      disclosure: this.getDisclosureStrategy(record.threadId, record.requestId),
      idempotent: false,
    };
  }

  #responseRow(threadId, requestId) {
    return this.#db.prepare(
      "SELECT * FROM audience_participation_responses WHERE thread_id=? AND request_id=?",
    ).get(threadId, requestId);
  }

  #decodeResponse(row) {
    if (!row) return null;
    opaque("responseId", row.response_id, IDS.rsp);
    digest("response operation digest", row.operation_digest);
    digest("response digest", row.response_digest);
    time("response recordedAt", row.recorded_at);
    const response = json(`audience response ${row.response_id}`, row.response_json);
    const operation = json(`response operation ${row.operation_id}`, row.operation_json);
    validateAudienceResponse(response);
    same("response ID", response.responseId, row.response_id);
    same("response thread", response.threadId, row.thread_id);
    same("response request", response.requestId, row.request_id);
    same("response strategy", response.strategyId, row.strategy_id);
    same("response authorization", response.authorizationId, row.authorization_id);
    same("response digest", audienceResponseDigest(response), row.response_digest);
    same(
      "response operation",
      responseOperationDigest(row.thread_id, row.request_id, operation),
      row.operation_digest,
    );
    const disclosure = this.getDisclosureStrategy(
      row.thread_id,
      row.request_id,
    ).strategy;
    same("response strategy binding", response.strategyId, disclosure.strategyId);
    same(
      "response authorization binding",
      response.authorizationId,
      disclosure.authorizationId,
    );
    same(
      "response posture binding",
      response.communicatedPosture,
      disclosure.communicatedPosture,
    );
    if (canonicalJson(response.audience) !== canonicalJson(disclosure.audience)) {
      throw new IntegrityError("response audience does not match disclosure audience");
    }
    return {
      response,
      responseDigest: row.response_digest,
      operationId: row.operation_id,
      operation,
      operationDigest: row.operation_digest,
    };
  }

  getAudienceResponse(threadId, requestId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const value = this.#decodeResponse(this.#responseRow(threadId, requestId));
    if (!value && required) {
      throw new ExpressionNotFoundError(
        `No audience-visible response was found for request ${requestId}`,
      );
    }
    return value;
  }

  getResponseByOperation(operationId, expectedDigest) {
    assertId("response operationId", operationId);
    const row = this.#db.prepare(
      "SELECT thread_id,request_id,operation_digest FROM audience_participation_responses WHERE operation_id=?",
    ).get(operationId);
    if (!row) return null;
    if (row.operation_digest !== expectedDigest) {
      throw new ExpressionConflictError(
        `Operation ${operationId} was already used with different response content`,
      );
    }
    return this.getAudienceResponse(row.thread_id, row.request_id);
  }

  recordAudienceResponse(record) {
    const prior = this.getResponseByOperation(
      record.operationId,
      record.operationDigest,
    );
    if (prior) return { response: prior, idempotent: true };
    try {
      this.#db.exec("BEGIN IMMEDIATE");
      const disclosure = this.getDisclosureStrategy(
        record.threadId,
        record.requestId,
      );
      if (
        disclosure.strategy.strategyId !== record.strategyId ||
        disclosure.strategyDigest !== record.strategyDigest ||
        disclosure.strategy.authorizationId !== record.authorizationId
      ) {
        throw new ExpressionConflictError(
          "Disclosure strategy changed before audience response persistence",
        );
      }
      const existing = this.#responseRow(record.threadId, record.requestId);
      if (existing) {
        if (
          existing.operation_id !== record.operationId ||
          existing.operation_digest !== record.operationDigest
        ) {
          throw new ExpressionConflictError(
            `Request ${record.requestId} already has a different audience response`,
          );
        }
        this.#db.exec("COMMIT");
        return { response: this.#decodeResponse(existing), idempotent: true };
      }
      this.#db.prepare(`
        INSERT INTO audience_participation_responses(
          response_id,operation_id,operation_json,operation_digest,strategy_id,
          authorization_id,thread_id,request_id,response_json,response_digest,
          recorded_at,causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.response.responseId,
        record.operationId,
        canonicalJson(record.operation),
        record.operationDigest,
        record.strategyId,
        record.authorizationId,
        record.threadId,
        record.requestId,
        canonicalJson(record.response),
        record.responseDigest,
        record.response.recordedAt,
        record.response.causationId,
        record.response.correlationId,
      );
      this.#db.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#db);
      throw translateStorageError(error);
    }
    return {
      response: this.getAudienceResponse(record.threadId, record.requestId),
      idempotent: false,
    };
  }

  getExpressionChain(threadId, requestId) {
    return {
      authorization: this.getAuthorizationForRequest(threadId, requestId, {
        required: false,
      }),
      disclosure: this.getDisclosureStrategy(threadId, requestId, {
        required: false,
      }),
      response: this.getAudienceResponse(threadId, requestId, { required: false }),
    };
  }

  listExpressionSummaries(threadId) {
    assertId("threadId", threadId);
    return this.#db.prepare(`
      SELECT a.request_id,a.authorization_id,a.issued_at,
        json_extract(a.authorization_json,'$.desiredAction') desired_action,
        json_extract(a.authorization_json,'$.authorizedAction') authorized_action,
        json_extract(a.authorization_json,'$.dignityBand') dignity_band,
        d.strategy_id,json_extract(d.strategy_json,'$.mode') disclosure_mode,
        json_extract(d.strategy_json,'$.communicatedPosture') communicated_posture,
        r.response_id
      FROM participation_authorizations a
      LEFT JOIN disclosure_strategies d ON d.authorization_id=a.authorization_id
      LEFT JOIN audience_participation_responses r ON r.strategy_id=d.strategy_id
      WHERE a.thread_id=?
      ORDER BY a.issued_at,a.authorization_id
    `).all(threadId).map((row) => ({
      threadId,
      requestId: row.request_id,
      authorizationId: row.authorization_id,
      issuedAt: row.issued_at,
      desiredAction: row.desired_action,
      authorizedAction: row.authorized_action,
      dignityBand: row.dignity_band,
      strategyId: row.strategy_id,
      disclosureMode: row.disclosure_mode,
      communicatedPosture: row.communicated_posture,
      responseId: row.response_id,
    }));
  }

  verifyExpressionIntegrity(threadId, requestId) {
    const chain = this.getExpressionChain(threadId, requestId);
    return {
      threadId,
      requestId,
      authorizationId: chain.authorization?.authorization.authorizationId ?? null,
      authorizationDigest: chain.authorization?.authorizationDigest ?? null,
      strategyId: chain.disclosure?.strategy.strategyId ?? null,
      strategyDigest: chain.disclosure?.strategyDigest ?? null,
      responseId: chain.response?.response.responseId ?? null,
      responseDigest: chain.response?.responseDigest ?? null,
      audienceSafe:
        chain.response === null ||
        (chain.response.response.deliveryStatus === "not_sent" &&
          chain.response.response.performedActionStatus === "none_recorded" &&
          chain.response.response.completionStatus === "not_claimed"),
    };
  }
}

export function openExpressionStore(databasePath) {
  return new ExpressionStore(databasePath);
}
