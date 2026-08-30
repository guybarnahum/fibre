const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export class WorldKernelBirthPublicationError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message);
    this.name = "WorldKernelBirthPublicationError";
    this.status = status;
    this.code = code;
  }
}

function baseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username !== "" || url.password !== "") {
    throw new TypeError("local World Kernel birth publisher requires a loopback http URL");
  }
  url.pathname = url.pathname.replace(/\/$/u, "");
  url.search = "";
  url.hash = "";
  return url;
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    throw new WorldKernelBirthPublicationError(
      `World Kernel birth publication returned non-JSON status ${response.status}`,
      { status: response.status },
    );
  }
}

export function createWorldKernelBirthPublisher({
  endpoint = "http://127.0.0.1:8787",
  privateToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  const target = baseUrl(endpoint);
  if (typeof privateToken !== "string" || privateToken === "") {
    throw new TypeError("local World Kernel birth publisher requires privateToken");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("local World Kernel birth publisher requires fetch");

  return Object.freeze({
    async publishBirth(bundle) {
      const response = await fetchImpl(new URL("/internal/genesis/births", target), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fibre-private-token": privateToken,
        },
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
