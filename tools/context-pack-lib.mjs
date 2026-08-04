import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, normalize, resolve, sep } from "node:path";

export const CONTEXT_MANIFEST_PATH = "docs/ai-context-manifest.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRepoPath(value, label) {
  assert(typeof value === "string" && value.trim(), `${label} must be a non-empty string`);
  const portable = value.replaceAll("\\", "/");
  assert(!isAbsolute(portable), `${label} must be repository-relative: ${value}`);

  const normalized = normalize(portable).replaceAll("\\", "/");
  assert(
    normalized !== ".." && !normalized.startsWith("../"),
    `${label} must not escape the repository: ${value}`,
  );
  return normalized;
}

function assertGeneratedOutputPath(path, label) {
  const generatedRoot = resolve("artifacts/generated");
  const absolute = resolve(path);
  assert(
    absolute === generatedRoot || absolute.startsWith(`${generatedRoot}${sep}`),
    `${label} must remain under artifacts/generated/: ${path}`,
  );
  assert(path.endsWith(".md"), `${label} must be a Markdown file: ${path}`);
}

function requireStringArray(value, label) {
  if (value === undefined) return [];
  assert(Array.isArray(value), `${label} must be an array`);
  return value.map((item, index) =>
    normalizeRepoPath(item, `${label}[${index}]`),
  );
}

export function loadContextManifest() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(CONTEXT_MANIFEST_PATH, "utf8"));
  } catch (error) {
    throw new Error(`Unable to load ${CONTEXT_MANIFEST_PATH}: ${error.message}`);
  }
  return manifest;
}

export function resolveProfileSources(manifest, profileName, stack = []) {
  const profile = manifest.profiles?.[profileName];
  assert(profile, `Unknown context profile: ${profileName}`);
  assert(!stack.includes(profileName), `Context profile cycle: ${[...stack, profileName].join(" -> ")}`);

  const nextStack = [...stack, profileName];
  const sources = [];
  for (const includedProfile of profile.includes ?? []) {
    sources.push(...resolveProfileSources(manifest, includedProfile, nextStack));
  }
  sources.push(...(profile.sources ?? []));
  return [...new Set(sources)];
}

export function profileOutputs(profile, profileName) {
  const output = normalizeRepoPath(profile.output, `profiles.${profileName}.output`);
  const aliases = requireStringArray(
    profile.aliases,
    `profiles.${profileName}.aliases`,
  );
  profile.output = output;
  profile.aliases = aliases;
  return [output, ...aliases];
}

export function validateContextManifest(manifest) {
  assert(manifest && typeof manifest === "object", "Context manifest must be an object");
  assert(Number.isInteger(manifest.version) && manifest.version > 0, "Context manifest version must be a positive integer");
  assert(manifest.canonical === true, "Context manifest must declare canonical: true");
  assert(
    manifest.profiles && typeof manifest.profiles === "object" && !Array.isArray(manifest.profiles),
    "Context manifest profiles must be an object",
  );

  const profileNames = Object.keys(manifest.profiles);
  assert(profileNames.length > 0, "Context manifest must define at least one profile");

  const claimedOutputs = new Set();
  for (const profileName of profileNames) {
    const profile = manifest.profiles[profileName];
    assert(profile && typeof profile === "object", `Profile ${profileName} must be an object`);
    assert(typeof profile.title === "string" && profile.title.trim(), `Profile ${profileName} needs a title`);
    assert(
      typeof profile.description === "string" && profile.description.trim(),
      `Profile ${profileName} needs a description`,
    );

    const includes = requireStringArray(profile.includes, `profiles.${profileName}.includes`);
    const sources = requireStringArray(profile.sources, `profiles.${profileName}.sources`);
    profile.includes = includes;
    profile.sources = sources;

    for (const includedProfile of includes) {
      assert(
        Object.hasOwn(manifest.profiles, includedProfile),
        `Profile ${profileName} includes unknown profile ${includedProfile}`,
      );
    }

    for (const source of sources) {
      assert(existsSync(source), `Context source does not exist: ${source}`);
    }

    for (const output of profileOutputs(profile, profileName)) {
      assertGeneratedOutputPath(output, `profiles.${profileName}.output`);
      assert(!claimedOutputs.has(output), `Context output is claimed more than once: ${output}`);
      claimedOutputs.add(output);
    }
  }

  for (const profileName of profileNames) {
    resolveProfileSources(manifest, profileName);
  }

  return manifest;
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function repositoryRevision() {
  const sha = process.env.GITHUB_SHA?.trim() || runGit(["rev-parse", "HEAD"]) || "unknown";
  const dirty = runGit(["status", "--porcelain", "--untracked-files=no"]);
  return dirty ? `${sha}+dirty` : sha;
}

export function renderContextPack(manifest, profileName, revision = repositoryRevision()) {
  validateContextManifest(manifest);
  const profile = manifest.profiles[profileName];
  const sources = resolveProfileSources(manifest, profileName);
  const sourceRecords = sources.map((path) => ({
    path,
    content: readFileSync(path, "utf8"),
  }));
  const digest = createHash("sha256")
    .update(JSON.stringify({
      manifestVersion: manifest.version,
      profileName,
      profile,
      sources: sourceRecords,
    }))
    .digest("hex");

  const sourceList = sources.map((path) => `- \`${path}\``).join("\n");
  const sourceBody = sourceRecords
    .map(({ path, content }) => `\n\n---\nSOURCE: ${path}\n---\n\n${content.trimEnd()}\n`)
    .join("");

  return `# Fibre context pack: ${profile.title}\n\n> Generated artifact. Do not edit this file directly; update canonical sources or \`${CONTEXT_MANIFEST_PATH}\` and regenerate.\n\n- Profile: \`${profileName}\`\n- Revision: \`${revision}\`\n- Manifest: \`${CONTEXT_MANIFEST_PATH}\`\n- Manifest version: \`${manifest.version}\`\n- Content digest: \`sha256:${digest}\`\n\n## Purpose\n\n${profile.description}\n\n## Sources\n\n${sourceList}${sourceBody}`;
}

export function expectedContextPacks(manifest, revision = repositoryRevision()) {
  validateContextManifest(manifest);
  const outputs = new Map();
  for (const [profileName, profile] of Object.entries(manifest.profiles)) {
    const content = renderContextPack(manifest, profileName, revision);
    for (const output of profileOutputs(profile, profileName)) {
      outputs.set(output, content);
    }
  }
  return outputs;
}

export function writeContextPacks(manifest, revision = repositoryRevision()) {
  const outputs = expectedContextPacks(manifest, revision);
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return [...outputs.keys()];
}
