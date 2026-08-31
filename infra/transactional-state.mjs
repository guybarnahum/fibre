import {
  assertInfraId,
  assertInfraPlainObject,
} from "./internal.mjs";

export const TRANSACTIONAL_STATE_VERSION = "transactional-state-v0.2";

export const FIBRE_WORLD_STATE_REQUIREMENTS = Object.freeze({
  relationalStatements: true,
  atomicWriteTransactions: true,
  serializedWriteTransactions: true,
  durableCommitBeforeAcknowledgement: true,
  transactionalReads: true,
  schemaMigrations: true,
  consistencyScope: "single_named_scope",
});

export const FIBRE_BIRTH_STATE_REQUIREMENTS = FIBRE_WORLD_STATE_REQUIREMENTS;

const SESSION_METHODS = Object.freeze([
  "exec",
  "prepare",
  "transaction",
  "close",
]);

function assertBooleanGuarantee(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
}

export function assertTransactionalStateGuarantees(guarantees) {
  assertInfraPlainObject("transactional state guarantees", guarantees);
  assertBooleanGuarantee("transactional state guarantees.relationalStatements", guarantees.relationalStatements);
  assertBooleanGuarantee("transactional state guarantees.atomicWriteTransactions", guarantees.atomicWriteTransactions);
  assertBooleanGuarantee(
    "transactional state guarantees.serializedWriteTransactions",
    guarantees.serializedWriteTransactions,
  );
  assertBooleanGuarantee(
    "transactional state guarantees.durableCommitBeforeAcknowledgement",
    guarantees.durableCommitBeforeAcknowledgement,
  );
  assertBooleanGuarantee("transactional state guarantees.transactionalReads", guarantees.transactionalReads);
  assertBooleanGuarantee("transactional state guarantees.schemaMigrations", guarantees.schemaMigrations);
  if (guarantees.consistencyScope !== "single_named_scope") {
    throw new TypeError("transactional state guarantees.consistencyScope must be single_named_scope");
  }
  return guarantees;
}

export function assertSynchronousTransactionResult(value) {
  if (value && typeof value.then === "function") {
    throw new TypeError("transactional state transaction callback must be synchronous");
  }
  return value;
}

export function assertTransactionalStateSession(session, {
  scopeId = null,
  readOnly = null,
} = {}) {
  assertInfraPlainObject("transactional state session", session);
  assertInfraId("transactional state session.scopeId", session.scopeId);
  if (scopeId !== null && session.scopeId !== scopeId) {
    throw new TypeError(`transactional state session scope ${session.scopeId} does not match ${scopeId}`);
  }
  if (typeof session.readOnly !== "boolean") {
    throw new TypeError("transactional state session.readOnly must be boolean");
  }
  if (readOnly !== null && session.readOnly !== readOnly) {
    throw new TypeError("transactional state session readOnly mode does not match the requested mode");
  }
  for (const method of SESSION_METHODS) {
    if (typeof session[method] !== "function") {
      throw new TypeError(`infra driver state session.${method} must be a function`);
    }
  }
  return session;
}

export function assertTransactionalStatePort(port) {
  assertInfraPlainObject("infra driver.state", port);
  if (port.stateVersion !== TRANSACTIONAL_STATE_VERSION) {
    throw new TypeError(`unsupported transactional state version ${port.stateVersion}`);
  }
  for (const method of ["open", "guarantees"]) {
    if (typeof port[method] !== "function") {
      throw new TypeError(`infra driver.state.${method} must be a function`);
    }
  }
  return port;
}

export function requireTransactionalStateGuarantees(port, scopeId, requirements) {
  assertTransactionalStatePort(port);
  assertInfraId("transactional state scopeId", scopeId);
  assertInfraPlainObject("transactional state requirements", requirements);
  const guarantees = assertTransactionalStateGuarantees(port.guarantees(scopeId));
  for (const [name, required] of Object.entries(requirements)) {
    if (guarantees[name] !== required) {
      throw new TypeError(
        `transactional state scope ${scopeId} does not satisfy ${name}: required ${String(required)}, got ${String(guarantees[name])}`,
      );
    }
  }
  return guarantees;
}
