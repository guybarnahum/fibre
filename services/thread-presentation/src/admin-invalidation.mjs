export const ADMIN_INVALIDATION_CHANNEL = "admin";

export function threadPresentationInvalidation(threadId) {
  if (typeof threadId !== "string" || threadId === "") return null;
  return Object.freeze({
    entity:"thread",
    id:threadId,
    aspect:"presentation",
  });
}

export function presentationCompletionInvalidation(completion) {
  if (completion?.handled !== true
    || completion?.duplicate === true
    || completion?.stale === true
    || completion?.scope?.entityKind !== "thread"
    || completion?.publication?.event?.kind !== "media.ready") {
    return null;
  }
  return threadPresentationInvalidation(completion.scope.entityRef);
}

export async function publishAdminInvalidation(realtime, invalidation) {
  if (invalidation === null) return { delivered:null };
  if (!realtime || typeof realtime.publish !== "function") {
    throw new TypeError("Admin invalidation requires infra realtime.publish()");
  }
  return realtime.publish(ADMIN_INVALIDATION_CHANNEL, invalidation);
}
