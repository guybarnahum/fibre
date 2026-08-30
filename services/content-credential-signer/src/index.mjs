import {
  bearerAuth,
  createService,
  readJsonRequest,
} from "#infra/service";

function assertSigner(signer) {
  if (!signer || typeof signer !== "object" || Array.isArray(signer)) {
    throw new TypeError("content credential signer adapter is required");
  }
  if (typeof signer.embed !== "function" || typeof signer.verify !== "function") {
    throw new TypeError("content credential signer adapter must expose embed() and verify()");
  }
  if (typeof signer.signerId !== "string" || signer.signerId.trim() === "") {
    throw new TypeError("content credential signer adapter.signerId is required");
  }
  if (typeof signer.format !== "string" || signer.format.trim() === "") {
    throw new TypeError("content credential signer adapter.format is required");
  }
  return signer;
}

export function createContentCredentialSignerService({
  signer,
  serviceToken = null,
} = {}) {
  const adapter = assertSigner(signer);
  if (serviceToken !== null && (typeof serviceToken !== "string" || serviceToken.trim() === "")) {
    throw new TypeError("content credential signer serviceToken must be null or a non-empty string");
  }
  const routeAuth = serviceToken === null ? null : bearerAuth(serviceToken);

  return createService({
    serviceName: "content-credential-signer",
    health: {
      format: adapter.format,
      signerId: adapter.signerId,
      trustPolicy: adapter.trustPolicy ?? null,
    },
    routes: [
      {
        method: "POST",
        path: "/embed",
        auth: routeAuth,
        handler: async ({ request }) => adapter.embed(await readJsonRequest(request)),
      },
      {
        method: "POST",
        path: "/verify",
        auth: routeAuth,
        handler: async ({ request }) => adapter.verify(await readJsonRequest(request)),
      },
    ],
  });
}
