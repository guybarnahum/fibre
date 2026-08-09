import {
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";

export const EPISODE_EVIDENCE_POLICY = Object.freeze({
  id: "current_runtime_episode",
  version: "1",
});

export function requestEpisodeEvidenceRef(requestId) {
  assertId("episode requestId", requestId);
  return `request:${requestId}`;
}

export function authorizationEpisodeEvidenceRef(authorizationId) {
  assertId("episode authorizationId", authorizationId);
  return `authorization:${authorizationId}`;
}

export function currentEpisodeEvidenceRefs({ requestId, authorizationId }) {
  return [
    requestEpisodeEvidenceRef(requestId),
    authorizationEpisodeEvidenceRef(authorizationId),
  ];
}

export function currentEpisodeEvidenceRefsFromContext(context) {
  assertPlainObject("episode execution context", context);
  assertId("episode execution context.threadId", context.threadId);
  assertId("episode execution context.requestId", context.requestId);
  assertPlainObject("episode execution context.participation", context.participation);
  assertId(
    "episode execution context.participation.authorizationId",
    context.participation.authorizationId,
  );
  if (context.participation.threadId !== context.threadId) {
    throw new TypeError("episode participation Thread does not match execution context");
  }
  if (context.participation.requestId !== context.requestId) {
    throw new TypeError("episode participation request does not match execution context");
  }
  return currentEpisodeEvidenceRefs({
    requestId: context.requestId,
    authorizationId: context.participation.authorizationId,
  });
}

export function currentEpisodeEvidenceRefsFromRuntime(runtime) {
  assertPlainObject("episode runtime", runtime);
  assertId("episode runtime.threadId", runtime.threadId);
  assertId("episode runtime.requestId", runtime.requestId);
  assertPlainObject("episode runtime.authorization", runtime.authorization);
  assertId("episode runtime.authorization.authorizationId", runtime.authorization.authorizationId);
  assertPlainObject("episode runtime.session", runtime.session);
  assertPlainObject("episode runtime.session.context", runtime.session.context);

  // Historical M1 runtimes have no participation object inside the execution
  // context. They therefore expose no current-episode evidence at all. This
  // preserves the closed M1 freeze path while ensuring any proposal that tries
  // to cite request:/authorization: refs still fails validation because those
  // refs are absent from the allowed evidence set.
  if (runtime.session.context.participation === undefined) return [];

  assertPlainObject(
    "episode runtime.session.context.participation",
    runtime.session.context.participation,
  );

  if (runtime.authorization.threadId !== runtime.threadId) {
    throw new TypeError("episode authorization Thread does not match runtime");
  }
  if (runtime.authorization.requestId !== runtime.requestId) {
    throw new TypeError("episode authorization request does not match runtime");
  }
  if (runtime.session.context.threadId !== runtime.threadId) {
    throw new TypeError("episode execution context Thread does not match runtime");
  }
  if (runtime.session.context.requestId !== runtime.requestId) {
    throw new TypeError("episode execution context request does not match runtime");
  }
  if (
    runtime.session.context.participation.authorizationId !==
    runtime.authorization.authorizationId
  ) {
    throw new TypeError("episode execution context authorization does not match runtime");
  }
  if (runtime.session.context.participation.requestId !== runtime.requestId) {
    throw new TypeError("episode participation request does not match runtime");
  }
  if (runtime.session.context.participation.threadId !== runtime.threadId) {
    throw new TypeError("episode participation Thread does not match runtime");
  }

  return currentEpisodeEvidenceRefs({
    requestId: runtime.requestId,
    authorizationId: runtime.authorization.authorizationId,
  });
}
