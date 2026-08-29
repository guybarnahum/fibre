import { readFile } from "node:fs/promises";
import { INFRA_CAPABILITIES } from "#infra";

export const FIBRE_DEPLOYMENT_VERSION = "fibre-deployment-v0.1";

const INFRA_CAPABILITY_SET = new Set(INFRA_CAPABILITIES);

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function exactKeys(name, value, keys) {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${name} must contain exactly ${expected.join(", ")}`);
  }
}

function infraCapabilities(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const normalized = value.map((capability, index) => {
    nonEmpty(`${name}[${index}]`, capability);
    if (!INFRA_CAPABILITY_SET.has(capability)) throw new TypeError(`${name}[${index}] is unsupported`);
    return capability;
  });
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${name} must be unique`);
  return Object.freeze([...normalized]);
}

function normalizeProvider(name, value) {
  plain(name, value);
  exactKeys(name, value, ["platform", "infraDriver", "capabilities"]);
  return Object.freeze({
    platform: nonEmpty(`${name}.platform`, value.platform),
    infraDriver: nonEmpty(`${name}.infraDriver`, value.infraDriver),
    capabilities: infraCapabilities(`${name}.capabilities`, value.capabilities),
  });
}

function normalizeService(name, value, providers) {
  plain(name, value);
  exactKeys(name, value, ["runtime", "infra", "requires"]);
  const runtime = nonEmpty(`${name}.runtime`, value.runtime);
  const infra = nonEmpty(`${name}.infra`, value.infra);
  if (!providers[runtime]) throw new TypeError(`${name}.runtime references unknown provider ${runtime}`);
  if (!providers[infra]) throw new TypeError(`${name}.infra references unknown provider ${infra}`);
  const requires = infraCapabilities(`${name}.requires`, value.requires);
  const available = new Set(providers[infra].capabilities);
  for (const capability of requires) {
    if (!available.has(capability)) {
      throw new TypeError(`${name} requires ${capability} but provider ${infra} does not advertise it`);
    }
  }
  return Object.freeze({ runtime, infra, requires });
}

export function normalizeDeploymentManifest(value) {
  plain("deployment manifest", value);
  exactKeys("deployment manifest", value, ["deploymentVersion", "environment", "providers", "services"]);
  if (value.deploymentVersion !== FIBRE_DEPLOYMENT_VERSION) {
    throw new TypeError(`unsupported deployment manifest version ${value.deploymentVersion}`);
  }
  const environment = nonEmpty("deployment manifest.environment", value.environment);
  plain("deployment manifest.providers", value.providers);
  plain("deployment manifest.services", value.services);

  const providers = Object.fromEntries(Object.entries(value.providers).map(([providerId, provider]) => {
    nonEmpty("deployment provider id", providerId);
    return [providerId, normalizeProvider(`deployment provider ${providerId}`, provider)];
  }));
  if (Object.keys(providers).length === 0) throw new TypeError("deployment manifest.providers must not be empty");

  const services = Object.fromEntries(Object.entries(value.services).map(([serviceId, service]) => {
    nonEmpty("deployment service id", serviceId);
    return [serviceId, normalizeService(`deployment service ${serviceId}`, service, providers)];
  }));
  if (Object.keys(services).length === 0) throw new TypeError("deployment manifest.services must not be empty");

  return Object.freeze({
    deploymentVersion: FIBRE_DEPLOYMENT_VERSION,
    environment,
    providers: Object.freeze(providers),
    services: Object.freeze(services),
  });
}

export async function loadDeploymentManifest(path) {
  nonEmpty("deployment manifest path", path);
  return normalizeDeploymentManifest(JSON.parse(await readFile(path, "utf8")));
}

export function resolveServiceDeployment(manifestValue, serviceId) {
  const manifest = normalizeDeploymentManifest(manifestValue);
  nonEmpty("serviceId", serviceId);
  const service = manifest.services[serviceId];
  if (!service) throw new TypeError(`deployment manifest has no service ${serviceId}`);
  return Object.freeze({
    serviceId,
    environment: manifest.environment,
    runtime: Object.freeze({
      providerId: service.runtime,
      ...manifest.providers[service.runtime],
    }),
    infra: Object.freeze({
      providerId: service.infra,
      ...manifest.providers[service.infra],
    }),
    requires: service.requires,
  });
}
