import { INFRA_CAPABILITIES } from "#infra";

export const FIBRE_DEPLOYMENT_SCHEMA = "fibre-deployment";

const INFRA_CAPABILITY_SET = new Set(INFRA_CAPABILITIES);

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function allowedKeys(name, value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`${name} contains unsupported key ${key}`);
  }
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote !== null) {
      if (char === quote && line[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "#") return line.slice(0, index);
  }
  return line;
}

function scalar(text, lineNumber) {
  const value = text.trim();
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('"')) {
    if (!value.endsWith('"')) throw new TypeError(`deployment YAML line ${lineNumber} has an unterminated string`);
    return JSON.parse(value);
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new TypeError(`deployment YAML line ${lineNumber} has an unterminated string`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value === "") throw new TypeError(`deployment YAML line ${lineNumber} has an empty scalar`);
  return value;
}

function yamlLines(text) {
  if (typeof text !== "string") throw new TypeError("deployment YAML must be text");
  const lines = [];
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    if (raw.includes("\t")) throw new TypeError(`deployment YAML line ${index + 1} must not contain tabs`);
    const withoutComment = stripComment(raw).replace(/\s+$/u, "");
    if (withoutComment.trim() === "") continue;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    if (indent % 2 !== 0) throw new TypeError(`deployment YAML line ${index + 1} must use two-space indentation`);
    lines.push({ indent, text: withoutComment.trim(), lineNumber: index + 1 });
  }
  if (lines.length === 0) throw new TypeError("deployment YAML must not be empty");
  return lines;
}

function parseBlock(lines, start, indent) {
  const first = lines[start];
  if (!first || first.indent !== indent) throw new TypeError(`deployment YAML indentation is invalid near line ${first?.lineNumber ?? "end"}`);
  const isList = first.text.startsWith("- ");
  const result = isList ? [] : {};
  let index = start;

  while (index < lines.length && lines[index].indent === indent) {
    const current = lines[index];
    if (isList) {
      if (!current.text.startsWith("- ")) throw new TypeError(`deployment YAML line ${current.lineNumber} mixes mapping and sequence entries`);
      const item = current.text.slice(2).trim();
      if (item === "") throw new TypeError(`deployment YAML line ${current.lineNumber} has an empty sequence item`);
      result.push(scalar(item, current.lineNumber));
      index += 1;
      continue;
    }

    if (current.text.startsWith("- ")) throw new TypeError(`deployment YAML line ${current.lineNumber} mixes mapping and sequence entries`);
    const separator = current.text.indexOf(":");
    if (separator <= 0) throw new TypeError(`deployment YAML line ${current.lineNumber} must be key: value`);
    const key = current.text.slice(0, separator).trim();
    if (!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(key)) throw new TypeError(`deployment YAML line ${current.lineNumber} has invalid key ${key}`);
    if (Object.hasOwn(result, key)) throw new TypeError(`deployment YAML duplicates key ${key}`);
    const rest = current.text.slice(separator + 1).trim();
    index += 1;
    if (rest !== "") {
      result[key] = scalar(rest, current.lineNumber);
      continue;
    }
    const next = lines[index];
    if (!next || next.indent !== indent + 2) {
      throw new TypeError(`deployment YAML key ${key} on line ${current.lineNumber} requires a nested value`);
    }
    const [nested, nextIndex] = parseBlock(lines, index, indent + 2);
    result[key] = nested;
    index = nextIndex;
  }

  if (index < lines.length && lines[index].indent > indent) {
    throw new TypeError(`deployment YAML indentation jumps unexpectedly at line ${lines[index].lineNumber}`);
  }
  return [result, index];
}

export function parseDeploymentYaml(text) {
  const lines = yamlLines(text);
  if (lines[0].indent !== 0) throw new TypeError("deployment YAML root must not be indented");
  const [value, nextIndex] = parseBlock(lines, 0, 0);
  if (nextIndex !== lines.length) throw new TypeError(`deployment YAML has unsupported structure near line ${lines[nextIndex].lineNumber}`);
  return value;
}

function stringMap(name, value) {
  if (value === undefined) return Object.freeze({});
  plain(name, value);
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [
    nonEmpty(`${name} key`, key),
    nonEmpty(`${name}.${key}`, item),
  ])));
}

function jsonConfig(name, value) {
  if (value === undefined) return Object.freeze({});
  plain(name, value);
  return Object.freeze(structuredClone(value));
}

function infraCapabilities(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const normalized = value.map((capability, index) => {
    const item = nonEmpty(`${name}[${index}]`, capability);
    if (!INFRA_CAPABILITY_SET.has(item)) throw new TypeError(`${name}[${index}] is unsupported`);
    return item;
  });
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${name} must be unique`);
  return Object.freeze(normalized);
}

function normalizeRuntime(id, value) {
  plain(`deployment runtime ${id}`, value);
  allowedKeys(`deployment runtime ${id}`, value, ["provider"]);
  return Object.freeze({ provider: nonEmpty(`deployment runtime ${id}.provider`, value.provider) });
}

function normalizeInfra(id, value) {
  plain(`deployment infra ${id}`, value);
  allowedKeys(`deployment infra ${id}`, value, ["provider", "driver", "capabilities"]);
  return Object.freeze({
    provider: nonEmpty(`deployment infra ${id}.provider`, value.provider),
    driver: nonEmpty(`deployment infra ${id}.driver`, value.driver),
    capabilities: infraCapabilities(`deployment infra ${id}.capabilities`, value.capabilities),
  });
}

function normalizeIntegration(id, value) {
  plain(`deployment integration ${id}`, value);
  allowedKeys(`deployment integration ${id}`, value, ["kind", "provider", "config", "environment", "secrets"]);
  return Object.freeze({
    kind: nonEmpty(`deployment integration ${id}.kind`, value.kind),
    provider: nonEmpty(`deployment integration ${id}.provider`, value.provider),
    config: jsonConfig(`deployment integration ${id}.config`, value.config),
    environment: stringMap(`deployment integration ${id}.environment`, value.environment),
    secrets: stringMap(`deployment integration ${id}.secrets`, value.secrets),
  });
}

function normalizeService(id, value, { runtimes, infra, integrations }) {
  plain(`deployment service ${id}`, value);
  allowedKeys(`deployment service ${id}`, value, ["runtime", "infra", "integrations"]);
  const runtime = nonEmpty(`deployment service ${id}.runtime`, value.runtime);
  if (!runtimes[runtime]) throw new TypeError(`deployment service ${id}.runtime references unknown runtime ${runtime}`);
  const infraId = value.infra === undefined ? null : nonEmpty(`deployment service ${id}.infra`, value.infra);
  if (infraId !== null && !infra[infraId]) throw new TypeError(`deployment service ${id}.infra references unknown infra ${infraId}`);
  const selectedIntegrations = stringMap(`deployment service ${id}.integrations`, value.integrations);
  for (const [port, integrationId] of Object.entries(selectedIntegrations)) {
    if (!integrations[integrationId]) {
      throw new TypeError(`deployment service ${id}.integrations.${port} references unknown integration ${integrationId}`);
    }
  }
  return Object.freeze({ runtime, infra: infraId, integrations: selectedIntegrations });
}

function normalizeMap(name, value, normalizer) {
  plain(name, value);
  const entries = Object.entries(value).map(([id, item]) => {
    const normalizedId = nonEmpty(`${name} id`, id);
    return [normalizedId, normalizer(normalizedId, item)];
  });
  if (entries.length === 0) throw new TypeError(`${name} must not be empty`);
  return Object.freeze(Object.fromEntries(entries));
}

export function normalizeDeploymentManifest(value) {
  plain("deployment manifest", value);
  allowedKeys("deployment manifest", value, ["schema", "environment", "runtimes", "infra", "integrations", "services"]);
  if (value.schema !== FIBRE_DEPLOYMENT_SCHEMA) throw new TypeError(`unsupported deployment schema ${String(value.schema)}`);
  const environment = nonEmpty("deployment manifest.environment", value.environment);
  const runtimes = normalizeMap("deployment manifest.runtimes", value.runtimes, normalizeRuntime);
  const infra = normalizeMap("deployment manifest.infra", value.infra, normalizeInfra);
  const integrations = normalizeMap("deployment manifest.integrations", value.integrations, normalizeIntegration);
  plain("deployment manifest.services", value.services);
  const services = Object.freeze(Object.fromEntries(Object.entries(value.services).map(([id, service]) => {
    const normalizedId = nonEmpty("deployment service id", id);
    return [normalizedId, normalizeService(normalizedId, service, { runtimes, infra, integrations })];
  })));
  if (Object.keys(services).length === 0) throw new TypeError("deployment manifest.services must not be empty");
  return Object.freeze({ schema: FIBRE_DEPLOYMENT_SCHEMA, environment, runtimes, infra, integrations, services });
}

export function parseDeploymentManifest(text) {
  return normalizeDeploymentManifest(parseDeploymentYaml(text));
}

export function resolveServiceDeployment(manifestValue, serviceId) {
  const manifest = normalizeDeploymentManifest(manifestValue);
  const id = nonEmpty("serviceId", serviceId);
  const service = manifest.services[id];
  if (!service) throw new TypeError(`deployment manifest has no service ${id}`);
  return Object.freeze({
    serviceId: id,
    environment: manifest.environment,
    runtime: Object.freeze({ runtimeId: service.runtime, ...manifest.runtimes[service.runtime] }),
    infra: service.infra === null ? null : Object.freeze({ infraId: service.infra, ...manifest.infra[service.infra] }),
    integrations: Object.freeze(Object.fromEntries(Object.entries(service.integrations).map(([port, integrationId]) => [
      port,
      Object.freeze({ integrationId, ...manifest.integrations[integrationId] }),
    ]))),
  });
}
