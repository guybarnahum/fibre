import {
  buildFidMachineCredentialPayload,
  sealFidMachineCredential,
} from "./fid-machine-credential.mjs";
import { credentialAndStoreFidCard, storeFidCardWithoutContentCredentials } from "./fid-card-credentialing.mjs";
import { renderFidCard } from "./fid-card-renderer.mjs";
import { finalizeFidCardIssuance } from "./fid-card-verification.mjs";

function requiredMethod(owner, method, label) {
  if (typeof owner?.[method] !== "function") throw new TypeError(`${label} must implement ${method}()`);
  return owner;
}

export function createFidCardIssuanceExecutor({
  authority,
  threadRegistry,
  registry,
  infra,
  contentCredentialSigner = null,
  contentCredentialMode = "c2pa",
  issuerSigner,
  credentialProtector,
  loadPhoto,
  loadTemplate,
  now = () => new Date().toISOString(),
} = {}) {
  requiredMethod(authority, "prepareFidCard", "Fibre Identity Authority");
  requiredMethod(authority, "ensureFidPhoto", "Fibre Identity Authority");
  requiredMethod(threadRegistry, "get", "Thread Registry");
  requiredMethod(registry, "getByCredentialId", "FID registry");
  if (typeof loadPhoto !== "function") throw new TypeError("FID issuance requires loadPhoto()");
  if (typeof loadTemplate !== "function") throw new TypeError("FID issuance requires loadTemplate()");
  if (typeof now !== "function") throw new TypeError("FID issuance now must be a function");
  if (!["c2pa", "disabled"].includes(contentCredentialMode)) {
    throw new TypeError(`unsupported FID content credential mode ${String(contentCredentialMode)}`);
  }
  let templatePromise = null;
  const templateForCut = () => {
    templatePromise ??= Promise.resolve(loadTemplate()).then((template) => {
      if (!template || typeof template.version !== "string") throw new TypeError("FID template loader returned an invalid template");
      return template;
    });
    return templatePromise;
  };

  async function cut(request) {
    const prepared = await authority.prepareFidCard(request);
    const workflow = prepared.workflow;

    const prior = registry.getByCredentialId(workflow.proposedCredentialId, { required: false });
    if (prior !== null) {
      return Object.freeze({
        state: prior.status,
        reused: true,
        workflow,
        identitySnapshot: null,
        credential: prior.credential,
        issuance: registry.getIssuanceByCredentialId(workflow.proposedCredentialId, { required: false })?.record ?? null,
      });
    }

    const identity = await threadRegistry.get(workflow.threadId);
    if (identity === null || identity === undefined) throw new Error(`Thread ${workflow.threadId} is missing from Thread Registry`);
    if (identity.threadId !== workflow.threadId || identity.fibreIdentityNumber !== workflow.fibreIdentityNumber) {
      throw new Error("Thread Registry identity does not match Civil Registry");
    }

    const photoState = await authority.ensureFidPhoto({ workflowId: workflow.workflowId });
    if (!photoState.progressionAllowed) {
      return Object.freeze({
        state: photoState.state,
        reused: false,
        workflow,
        identitySnapshot: null,
        credential: null,
        issuance: null,
        derivation: photoState.derivation ?? null,
      });
    }

    const admission = photoState.admission.receipt;
    const [photo, template] = await Promise.all([
      loadPhoto(admission.candidatePhotoRef),
      templateForCut(),
    ]);
    const issuedAt = now();
    const render = renderFidCard({
      workflow,
      photoAdmission: admission,
      photo,
      authorizedIdentity: identity,
      issuedAt,
      template,
    });
    const payload = buildFidMachineCredentialPayload({
      workflow,
      photoAdmission: admission,
      photo,
      render,
      issuer: issuerSigner.profile,
      issuedAt,
    });
    const machineCredential = await sealFidMachineCredential({
      payload,
      issuerSigner,
      credentialProtector,
    });
    const storedCard = contentCredentialMode === "c2pa"
      ? await credentialAndStoreFidCard({
          infra,
          contentCredentialSigner,
          render,
          machineCredential,
        })
      : await storeFidCardWithoutContentCredentials({
          infra,
          render,
          machineCredential,
        });
    const finalized = await finalizeFidCardIssuance({
      infra,
      registry,
      workflow,
      storedCard,
      machineCredential,
      contentCredentialSigner,
      contentCredentialMode,
      issuerSigner,
      credentialProtector,
      activatedAt: now(),
    });

    return Object.freeze({
      state: finalized.status,
      reused: false,
      workflow,
      identitySnapshot: render.identitySnapshot,
      credential: finalized.credential,
      issuance: finalized.issuance,
    });
  }

  return Object.freeze({ cut });
}
