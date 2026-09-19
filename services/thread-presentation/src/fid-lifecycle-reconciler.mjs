function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function lifecycleMode(value) {
  if (!["ensure","reissue"].includes(value)) throw new TypeError("FID lifecycle mode must be ensure or reissue");
  return value;
}

export function createFidLifecycleReconciler({
  fidAuthority,
  presentationProjection,
  now = () => new Date().toISOString(),
} = {}) {
  if (!fidAuthority || typeof fidAuthority.getActive !== "function" || typeof fidAuthority.cut !== "function") {
    throw new TypeError("FID lifecycle reconciler requires Fibre Identity Authority boundary");
  }
  if (!presentationProjection || typeof presentationProjection.reconcile !== "function") {
    throw new TypeError("FID lifecycle reconciler requires presentation projection service");
  }
  if (typeof now !== "function") throw new TypeError("FID lifecycle reconciler now must be a function");

  return Object.freeze({
    async reconcile({
      threadId:candidateThreadId,
      idempotencyKey:candidateKey,
      mode:candidateMode = "ensure",
    } = {}) {
      const threadId = nonEmpty("threadId", candidateThreadId);
      const idempotencyKey = nonEmpty("FID lifecycle idempotencyKey", candidateKey);
      const mode = lifecycleMode(candidateMode);
      let active = await fidAuthority.getActive(threadId);

      if (mode === "reissue" || active === null) {
        const cut = await fidAuthority.cut({ threadId, idempotencyKey });
        if (cut.result.state !== "active" || cut.active === null) {
          return Object.freeze({
            complete:false,
            state:cut.result.state,
            credential:null,
            derivation:cut.result.derivation ?? null,
            presentation:null,
          });
        }
        active = cut.active;
      }

      const credential = Object.freeze({
        credentialId:active.credentialId,
        revision:active.revision,
        supersedesCredentialId:active.supersedesCredentialId,
      });
      const presentation = await presentationProjection.reconcile({
        threadId,
        activeFid:active,
        projectedAt:now(),
        visibility:"public",
      });
      if (presentation?.reason === "presentation_missing") {
        return Object.freeze({
          complete:false,
          state:"presentation_missing",
          credential,
          derivation:null,
          presentation,
        });
      }
      return Object.freeze({
        complete:true,
        state:"active",
        credential,
        derivation:null,
        presentation,
      });
    },
  });
}
