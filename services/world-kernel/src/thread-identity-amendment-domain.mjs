import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
import { assertExactKeys, assertNonEmpty, assertId } from "./persistence-common.mjs";

function base(thread, event, ErrorType) {
  if (thread === null) throw new ErrorType(`identity event ${event.eventId} appears before a seed event`);
  if (event.commandId !== null || event.commandDigest !== null) throw new ErrorType(`identity event ${event.eventId} must not carry command metadata`);
  if (event.threadId !== thread.threadId) throw new ErrorType(`identity event ${event.eventId} belongs to another Thread`);
  if (thread.version !== event.expectedVersion) throw new ErrorType(`identity event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);
  if (event.provenance?.source !== "admin_operator" || event.provenance?.notThreadLifeEvent !== true) {
    throw new ErrorType(`identity event ${event.eventId} lacks Admin amendment provenance`);
  }
  assertNonEmpty(`identity event ${event.eventId} operationKey`, event.provenance.operationKey);
}

function finish(thread, event, identity, validateStoredThread, ErrorType) {
  const replayed = {
    ...thread,
    version:thread.version + 1,
    identity,
    provenance:{ ...thread.provenance, lastEventId:event.eventId },
  };
  validateStoredThread(event.threadId, replayed);
  if (replayed.version !== event.resultingVersion) throw new ErrorType(`identity event ${event.eventId} has an invalid resulting version`);
  return replayed;
}

export function applyThreadIdentityAmendmentEvent(thread, event, { validateStoredThread, ErrorType }) {
  base(thread, event, ErrorType);

  if (event.eventType === "LEGACY_SEX_ASSIGNED") {
    assertExactKeys(`identity event ${event.eventId} payload`, event.payload, ["sex","operationKey"]);
    if (thread.identity.sex !== undefined) throw new ErrorType(`identity event ${event.eventId} attempts to replace existing sex`);
    if (event.payload.operationKey !== event.provenance.operationKey) throw new ErrorType(`identity event ${event.eventId} operation provenance mismatch`);
    const sex = normalizeGenesisSex(event.payload.sex);
    return finish(thread, event, { ...thread.identity, sex }, validateStoredThread, ErrorType);
  }

  if (event.eventType === "THREAD_NAME_CHANGED") {
    assertExactKeys(`identity event ${event.eventId} payload`, event.payload, ["from","to","operationKey"]);
    assertNonEmpty(`identity event ${event.eventId} from`, event.payload.from);
    assertNonEmpty(`identity event ${event.eventId} to`, event.payload.to);
    if (event.payload.from !== thread.identity.name) throw new ErrorType(`identity event ${event.eventId} previous name does not match replay`);
    if (event.payload.operationKey !== event.provenance.operationKey) throw new ErrorType(`identity event ${event.eventId} operation provenance mismatch`);
    return finish(thread, event, { ...thread.identity, name:event.payload.to }, validateStoredThread, ErrorType);
  }

  throw new ErrorType(`unsupported identity amendment event ${event.eventType}`);
}
