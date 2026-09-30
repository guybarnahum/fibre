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

export function fidPresentationInvalidation(threadId, result) {
  if (result?.complete !== true || result?.presentation?.changed !== true) return null;
  return threadPresentationInvalidation(threadId);
}
