export class WorldKernelBirthPublicationError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message);
    this.name = "WorldKernelBirthPublicationError";
    this.status = status;
    this.code = code;
  }
}

const ACTIVITY_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function activityRequestId(activityContext) {
  const value = activityContext?.requestId;
  return typeof value === "string" && ACTIVITY_REQUEST_ID_PATTERN.test(value) ? value : null;
}

async function responseJson(response) {
  try { return await response.json(); }
  catch {
    throw new WorldKernelBirthPublicationError(
      `World Kernel birth publication returned non-JSON status ${response.status}`,
      { status: response.status },
    );
  }
}

export function createWorldKernelBirthPublisher({
  baseUrl,
  privateToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  const target = new URL(nonEmpty("World Kernel birth publisher baseUrl", baseUrl));
  const token = nonEmpty("World Kernel birth publisher privateToken", privateToken);
  if (typeof fetchImpl !== "function") throw new TypeError("World Kernel birth publisher requires fetch");
  target.pathname = "/internal/genesis/births";
  target.search = "";
  target.hash = "";

  return Object.freeze({
    async publishBirth(bundle, { activityContext = {} } = {}) {
      const headers = {
        "content-type": "application/json",
        "x-fibre-private-token": token,
      };
      const correlation = activityRequestId(activityContext);
      if (correlation !== null) headers["x-fibre-activity-request-id"] = correlation;
      const response = await fetchImpl(target, {
        method: "POST",
        headers,
        body: JSON.stringify(bundle),
      });
      const body = await responseJson(response);
      if (!response.ok) {
        throw new WorldKernelBirthPublicationError(
          body?.error?.message ?? `World Kernel birth publication failed with status ${response.status}`,
          { status: response.status, code: body?.error?.code ?? null },
        );
      }
      return body;
    },
  });
}
