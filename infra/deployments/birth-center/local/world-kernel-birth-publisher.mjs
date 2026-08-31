import {
  WorldKernelBirthPublicationError,
  createWorldKernelBirthPublisher as createPublisher,
} from "../world-kernel-boundary.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export { WorldKernelBirthPublicationError };

export function createWorldKernelBirthPublisher({
  endpoint = "http://127.0.0.1:8787",
  privateToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username !== "" || url.password !== "") {
    throw new TypeError("local World Kernel birth publisher requires a loopback http URL");
  }
  return createPublisher({ baseUrl: url.href, privateToken, fetchImpl });
}
