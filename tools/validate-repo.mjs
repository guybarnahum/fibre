import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  expectedContextPacks,
  loadContextManifest,
  resolveProfileSources,
  validateContextManifest,
} from "./context-pack-lib.mjs";

const required = [
  "README.md", "AGENTS.md", "CLAUDE.md",
  "docs/ai-context-manifest.json",
  "docs/vision/constitution.md", "docs/vision/invariants.md",
  "docs/state/current-state.md", "docs/architecture/thread-lifecycle.md",
  "schemas/thread.schema.json", "apps/thread-editor/index.html"
];
const requireGenerated = process.argv.includes("--generated");
let failed = false;

function report(message) {
  console.error(message);
  failed = true;
}

for (const file of required) {
  if (!existsSync(file)) report(`Missing required file: ${file}`);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function parseFrontMatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return {};

  return Object.fromEntries(
    text.slice(4, end).split("\n").flatMap((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) return [];
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      return key ? [[key, value]] : [];
    }),
  );
}

for (const file of walk("docs")) {
  if (!file.endsWith(".md")) continue;
  const text = readFileSync(file, "utf8");
  if (/\bICAN\b/.test(text) && !file.includes("history")) {
    report(`Superseded term ICAN found in canonical docs: ${file}`);
  }
}

for (const file of walk("schemas")) {
  if (!file.endsWith(".json")) continue;
  try {
    JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    report(`Invalid JSON ${file}: ${error.message}`);
  }
}

let manifest;
try {
  manifest = validateContextManifest(loadContextManifest());
} catch (error) {
  report(`Invalid AI context manifest: ${error.message}`);
}

if (manifest) {
  const coverage = manifest.coverage?.acceptedCanonicalConcepts;
  if (!coverage || typeof coverage !== "object") {
    report("AI context manifest must define coverage.acceptedCanonicalConcepts");
  } else {
    const directory = coverage.directory;
    const profileNames = coverage.profiles;
    if (typeof directory !== "string" || !directory.trim()) {
      report("acceptedCanonicalConcepts.directory must be a non-empty string");
    }
    if (!Array.isArray(profileNames) || profileNames.length === 0) {
      report("acceptedCanonicalConcepts.profiles must be a non-empty array");
    } else {
      const coveredSources = new Set();
      for (const profileName of profileNames) {
        if (!Object.hasOwn(manifest.profiles, profileName)) {
          report(`Concept coverage references unknown profile: ${profileName}`);
          continue;
        }
        for (const source of resolveProfileSources(manifest, profileName)) {
          coveredSources.add(source);
        }
      }

      if (typeof directory === "string" && directory.trim()) {
        for (const file of walk(directory)) {
          if (!file.endsWith(".md")) continue;
          const metadata = parseFrontMatter(readFileSync(file, "utf8"));
          if (metadata.status === "accepted" && metadata.canonical === "true") {
            const normalized = file.replaceAll("\\", "/");
            if (!coveredSources.has(normalized)) {
              report(`Accepted canonical concept is absent from AI context profiles: ${normalized}`);
            }
          }
        }
      }
    }
  }

  if (requireGenerated) {
    try {
      for (const [path, expected] of expectedContextPacks(manifest)) {
        if (!existsSync(path)) {
          report(`Missing generated context pack: ${path}`);
        } else if (readFileSync(path, "utf8") !== expected) {
          report(`Generated context pack is stale: ${path}`);
        }
      }
    } catch (error) {
      report(`Unable to validate generated context packs: ${error.message}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`Repository validation passed${requireGenerated ? " with generated context packs" : ""}.`);
