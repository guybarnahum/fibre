import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { normalizeGenesisWorldSpec } from "../services/world-kernel/src/genesis-domain.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";

export const WORLD_FAMILIARITY_VERSION = "pr39-slice-g1-world-familiarity-v1";
export const WORLD_FAMILIARITY_SYSTEM_PROMPT = `You are a cold setting-familiarity assessor.
Assess only how much ordinary background knowledge a general language model is likely to have about the kind of everyday setting described.
Do not infer personality, values, likely beliefs, future profession, formative significance, narrative arc, or what kind of person would emerge.
Rate familiarity with ordinary household life, schooling, mobility, institutions, language context, everyday economy, and intellectual access.
A high score means the setting has broad ordinary-world coverage; a low score means the model would need to guess or fabricate basic everyday structure.
Return only the requested structured result.`;

const SCORE = Object.freeze({ type: "integer", minimum: 0, maximum: 4 });

export const WORLD_FAMILIARITY_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["densityScore", "coverage", "comparisonNotes"],
  properties: {
    densityScore: SCORE,
    coverage: {
      type: "object",
      additionalProperties: false,
      required: [
        "household",
        "schooling",
        "mobility",
        "institutions",
        "languageContext",
        "everydayEconomy",
        "intellectualAccess",
      ],
      properties: {
        household: SCORE,
        schooling: SCORE,
        mobility: SCORE,
        institutions: SCORE,
        languageContext: SCORE,
        everydayEconomy: SCORE,
        intellectualAccess: SCORE,
      },
    },
    comparisonNotes: { type: "string" },
  },
});

export const WORLD_FAMILIARITY_POLICY = Object.freeze({
  densityUnderrepresentedAtOrBelow: 1,
  thinCoverageAtOrBelow: 1,
  thinCoverageDomainCountToHold: 2,
});

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

function readValue(argv, index, name) {
  const arg = argv[index];
  if (arg.startsWith(`${name}=`)) return { value: nonEmpty(name, arg.slice(name.length + 1)), consumed: 0 };
  return { value: nonEmpty(name, argv[index + 1]), consumed: 1 };
}

export function parseWorldFamiliarityArgs(argv) {
  const options = { provider: null, model: null, manifest: null, out: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--provider" || arg.startsWith("--provider=")) {
      const parsed = readValue(argv, index, "--provider");
      options.provider = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--model" || arg.startsWith("--model=")) {
      const parsed = readValue(argv, index, "--model");
      options.model = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--manifest" || arg.startsWith("--manifest=")) {
      const parsed = readValue(argv, index, "--manifest");
      options.manifest = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--out" || arg.startsWith("--out=")) {
      const parsed = readValue(argv, index, "--out");
      options.out = parsed.value;
      index += parsed.consumed;
    } else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (options.help) return options;
  if (!["openai", "google"].includes(options.provider)) throw new Error("--provider must be openai or google");
  nonEmpty("--model", options.model);
  nonEmpty("--manifest", options.manifest);
  nonEmpty("--out", options.out);
  return options;
}

export function projectWorldForFamiliarity(worldCandidate) {
  const world = normalizeGenesisWorldSpec(worldCandidate);
  return Object.freeze({
    timeFrame: structuredClone(world.timeFrame),
    places: structuredClone(world.places.map(({ description }) => ({ description }))),
    householdShape: world.householdShape,
    familyRelations: structuredClone(world.familyRelations),
    languages: structuredClone(world.languages),
    materialCircumstances: world.materialCircumstances,
    mobilityPattern: world.mobilityPattern,
    schoolingOrCommunityContext: world.schoolingOrCommunityContext,
    culturalContext: world.culturalContext,
    availableInstitutions: structuredClone(world.availableInstitutions),
    intellectualEnvironment: world.intellectualEnvironment,
    affordedRoles: structuredClone(world.affordedRoles),
  });
}

export function classifyWorldFamiliarity(output) {
  const thinCoverageDomains = Object.entries(output.coverage)
    .filter(([, score]) => score <= WORLD_FAMILIARITY_POLICY.thinCoverageAtOrBelow)
    .map(([name]) => name)
    .sort();
  const materiallyUnderrepresented =
    output.densityScore <= WORLD_FAMILIARITY_POLICY.densityUnderrepresentedAtOrBelow ||
    thinCoverageDomains.length >= WORLD_FAMILIARITY_POLICY.thinCoverageDomainCountToHold;
  return Object.freeze({ materiallyUnderrepresented, thinCoverageDomains });
}

function createAdapter({ provider, model, environment, fetchImpl }) {
  if (provider === "openai") return createOpenAIModelAdapter({ environment, modelId: model, fetchImpl });
  return createGoogleModelAdapter({ environment, modelId: model, fetchImpl });
}

function ensureWritableNewFile(path) {
  if (existsSync(path)) throw new Error(`refusing to overwrite frozen artifact: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  ensureWritableNewFile(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function validateManifest(manifest) {
  if (manifest?.protocolVersion !== "pr39-slice-g1-world-candidate-freeze-v1") {
    throw new Error("unexpected G1 candidate manifest version");
  }
  if (!Array.isArray(manifest.candidateWorlds) || manifest.candidateWorlds.length !== 5) {
    throw new Error("G1 candidate manifest must contain exactly five candidate worlds");
  }
  if (manifest.familiarityPolicy?.version !== WORLD_FAMILIARITY_VERSION) {
    throw new Error("manifest familiarity policy does not match the probe implementation");
  }
  return manifest;
}

export async function runWorldFamiliarityProbe({
  provider,
  model,
  manifestPath,
  outPath,
  environment = process.env,
  fetchImpl = globalThis.fetch,
  adapter = null,
  now = () => new Date().toISOString(),
} = {}) {
  const manifest = validateManifest(readJson(manifestPath));
  ensureWritableNewFile(outPath);
  if (manifest.familiarityPolicy.provider !== provider || manifest.familiarityPolicy.model !== model) {
    throw new Error("provider/model must exactly match the frozen G1 familiarity policy");
  }

  const worker = adapter ?? createAdapter({ provider, model, environment, fetchImpl });
  const promptHash = digest(WORLD_FAMILIARITY_SYSTEM_PROMPT);
  const schemaHash = digest(WORLD_FAMILIARITY_RESPONSE_SCHEMA);
  const results = [];

  for (const candidate of manifest.candidateWorlds) {
    const raw = readJson(candidate.path);
    const world = normalizeGenesisWorldSpec(raw);
    const candidateDigest = digest(world);
    if (candidateDigest !== candidate.candidateDigest) {
      throw new Error(`candidate digest mismatch for ${candidate.worldSpecId}`);
    }
    if (world.worldAuthorship.familiarityProbe !== null) {
      throw new Error(`candidate ${candidate.worldSpecId} already contains familiarity output`);
    }

    const invocation = await worker.invoke({
      systemPrompt: WORLD_FAMILIARITY_SYSTEM_PROMPT,
      input: { setting: projectWorldForFamiliarity(world) },
      responseSchema: WORLD_FAMILIARITY_RESPONSE_SCHEMA,
      clientRequestId: `pr39:g1:familiarity:${candidate.slot}:${candidateDigest}`,
    });
    const classification = classifyWorldFamiliarity(invocation.output);
    const probedAt = now();
    results.push({
      slot: candidate.slot,
      worldSpecId: candidate.worldSpecId,
      candidatePath: candidate.path,
      candidateDigest,
      finalPath: candidate.finalPath,
      probedAt,
      provider,
      model,
      promptHash,
      schemaHash,
      densityScore: invocation.output.densityScore,
      coverage: invocation.output.coverage,
      comparisonNotes: invocation.output.comparisonNotes,
      ...classification,
      usage: invocation.provenance?.usage ?? null,
      transport: invocation.provenance?.transport ?? null,
    });
  }

  const allAccepted = results.every((item) => !item.materiallyUnderrepresented);
  const artifact = {
    evidenceVersion: "pr39-slice-g1-world-familiarity-result-v1",
    protocolVersion: WORLD_FAMILIARITY_VERSION,
    candidateManifest: manifestPath,
    provider,
    model,
    promptHash,
    schemaHash,
    policy: WORLD_FAMILIARITY_POLICY,
    allAccepted,
    results,
    finalWorlds: [],
  };

  if (allAccepted) {
    for (const candidate of manifest.candidateWorlds) ensureWritableNewFile(candidate.finalPath);
    for (const result of results) {
      const candidate = manifest.candidateWorlds.find(({ slot }) => slot === result.slot);
      const world = normalizeGenesisWorldSpec(readJson(candidate.path));
      const finalWorld = normalizeGenesisWorldSpec({
        ...world,
        worldAuthorship: {
          ...world.worldAuthorship,
          familiarityProbe: {
            probedAt: result.probedAt,
            model: `${provider}/${model}`,
            densityScore: result.densityScore,
            comparisonNotes: result.comparisonNotes,
          },
        },
      });
      writeJson(candidate.finalPath, finalWorld);
      artifact.finalWorlds.push({
        slot: result.slot,
        worldSpecId: finalWorld.worldSpecId,
        path: candidate.finalPath,
        finalDigest: digest(finalWorld),
      });
    }
  }

  writeJson(outPath, artifact);
  return artifact;
}

function usage() {
  return `Slice G1 cold world-familiarity probe

Usage:
  npm run genesis:world-familiarity -- \\
    --provider openai \\
    --model gpt-5.1-2025-11-13 \\
    --manifest artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v1.json \\
    --out artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v1.json

This performs exactly one stateless model call per frozen candidate world. The worker sees only an anonymized ordinary-setting projection, not Fibre/Genesis context, world IDs, genomes, personalities, future roles, or downstream diagnostics.

If any candidate is materially under-represented, the result artifact is still written but no final WorldSpec files are emitted.
`;
}

async function main() {
  const options = parseWorldFamiliarityArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await runWorldFamiliarityProbe({
    provider: options.provider,
    model: options.model,
    manifestPath: options.manifest,
    outPath: options.out,
  });
  process.stdout.write(`SLICE G1 WORLD FAMILIARITY: ${result.allAccepted ? "ALL ACCEPTED" : "HOLD"}\n`);
  for (const item of result.results) {
    process.stdout.write(
      `${item.slot}. ${item.worldSpecId}: density=${item.densityScore}/4` +
      `${item.thinCoverageDomains.length ? ` thin=${item.thinCoverageDomains.join(",")}` : ""}` +
      `${item.materiallyUnderrepresented ? " UNDER-REPRESENTED" : ""}\n`,
    );
  }
  if (!result.allAccepted) process.exitCode = 2;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`SLICE G1 WORLD FAMILIARITY: FAILED\n${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
