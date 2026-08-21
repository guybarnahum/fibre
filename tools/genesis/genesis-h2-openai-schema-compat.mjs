import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  passBResponseSchemaHash,
} from "../services/world-kernel/src/genesis-pass-b-prompts.mjs";

export const H2_OPENAI_SCHEMA_COMPAT_VERSION = "pr39-h2-openai-pass-b-schema-compat-v1";
export const H2_STRIPPED_JSON_SCHEMA_KEYWORDS = Object.freeze(["uniqueItems", "maxLength", "maxItems"]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const codePointLength = (value) => [...value].length;

function cloneProjected(value, path, removed) {
  if (Array.isArray(value)) return value.map((item, index) => cloneProjected(item, `${path}[${index}]`, removed));
  if (value === null || typeof value !== "object") return value;
  const projected = {};
  for (const [key, item] of Object.entries(value)) {
    if (H2_STRIPPED_JSON_SCHEMA_KEYWORDS.includes(key)) {
      removed.push({ path: `${path}.${key}`, keyword: key, value: structuredClone(item) });
      continue;
    }
    projected[key] = cloneProjected(item, `${path}.${key}`, removed);
  }
  return projected;
}

export function projectPassBResponseSchemaForOpenAI(schema = GENESIS_PASS_B_RESPONSE_SCHEMA) {
  const canonicalSchemaHash = digest(schema);
  if (canonicalSchemaHash !== passBResponseSchemaHash()) {
    throw new TypeError("H-v2 compatibility projection accepts only the canonical frozen Pass-B schema");
  }
  const removedConstraints = [];
  const transportSchema = cloneProjected(schema, "$", removedConstraints);
  const expectedPaths = [
    "$.properties.episodeRefs.uniqueItems",
    "$.properties.rememberedContent.maxLength",
    "$.properties.uncertainty.maxItems",
    "$.properties.uncertainty.items.maxLength",
  ];
  const actualPaths = removedConstraints.map(({ path }) => path).sort();
  if (canonicalJson(actualPaths) !== canonicalJson([...expectedPaths].sort())) {
    throw new TypeError(`unexpected H-v2 Pass-B transport projection: ${actualPaths.join(", ")}`);
  }
  return Object.freeze({
    version: H2_OPENAI_SCHEMA_COMPAT_VERSION,
    canonicalSchemaHash,
    transportSchema: Object.freeze(transportSchema),
    transportSchemaHash: digest(transportSchema),
    removedConstraints: Object.freeze(removedConstraints.map((item) => Object.freeze(item))),
  });
}

export function assertPassBOutputSatisfiesProjectedCanonicalConstraints(output) {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new TypeError("H-v2 Pass-B structured output must be an object");
  }
  if (!Array.isArray(output.episodeRefs)) throw new TypeError("H-v2 Pass-B episodeRefs must be an array");
  if (new Set(output.episodeRefs).size !== output.episodeRefs.length) {
    throw new TypeError("H-v2 Pass-B episodeRefs violate canonical uniqueItems=true");
  }
  if (typeof output.rememberedContent === "string" && codePointLength(output.rememberedContent) > 600) {
    throw new TypeError("H-v2 Pass-B rememberedContent violates canonical maxLength=600");
  }
  if (!Array.isArray(output.uncertainty)) throw new TypeError("H-v2 Pass-B uncertainty must be an array");
  if (output.uncertainty.length > 8) throw new TypeError("H-v2 Pass-B uncertainty violates canonical maxItems=8");
  for (const [index, item] of output.uncertainty.entries()) {
    if (typeof item === "string" && codePointLength(item) > 120) {
      throw new TypeError(`H-v2 Pass-B uncertainty[${index}] violates canonical maxLength=120`);
    }
  }
  return output;
}

function extractOutputText(body) {
  if (typeof body?.output_text === "string" && body.output_text.trim() !== "") return body.output_text;
  const texts = [];
  for (const item of body?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
}

function parseRequestBody(init) {
  if (typeof init?.body !== "string") return null;
  try { return JSON.parse(init.body); }
  catch { return null; }
}

export function createH2OpenAICompatibilityFetch({ fetchImpl = globalThis.fetch, onProjection = () => {} } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (typeof onProjection !== "function") throw new TypeError("onProjection must be a function");
  const projection = projectPassBResponseSchemaForOpenAI();

  return async function h2OpenAICompatibilityFetch(input, init) {
    const request = parseRequestBody(init);
    const schema = request?.text?.format?.schema ?? null;
    if (schema === null || digest(schema) !== projection.canonicalSchemaHash) {
      return fetchImpl(input, init);
    }

    const nextRequest = structuredClone(request);
    nextRequest.text.format.schema = projection.transportSchema;
    onProjection({
      version: projection.version,
      canonicalSchemaHash: projection.canonicalSchemaHash,
      transportSchemaHash: projection.transportSchemaHash,
      removedConstraints: projection.removedConstraints,
    });

    const response = await fetchImpl(input, { ...init, body: JSON.stringify(nextRequest) });
    if (!response?.ok || typeof response.clone !== "function") return response;

    try {
      const body = await response.clone().json();
      const text = extractOutputText(body);
      if (text.trim() !== "") assertPassBOutputSatisfiesProjectedCanonicalConstraints(JSON.parse(text));
    } catch (error) {
      if (error instanceof SyntaxError) return response; // canonical adapter owns malformed-JSON classification
      throw error;
    }
    return response;
  };
}
