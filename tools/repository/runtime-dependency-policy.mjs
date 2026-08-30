import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize as normalizePosix } from "node:path/posix";
import { resolve } from "node:path";

const RUNTIME_SOURCE = /\.(?:mjs|js|ts|tsx|jsx)$/u;
const STATIC_MODULE_SPECIFIER = /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gsu;
const DYNAMIC_MODULE_SPECIFIER = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;

export const PRIVATE_SERVICE_MIGRATION_EDGES = Object.freeze([
  "services/thread-presentation/src/civil-identity-projection.mjs::#services/world-kernel/src/thread-presentation-identity-domain.mjs",
  "services/thread-presentation/src/index.mjs::../../world-kernel/src/thread-presentation-domain.mjs",
  "services/thread-presentation/src/index.mjs::../../world-kernel/src/thread-presentation-identity-domain.mjs",
  "services/world-kernel/src/presentation-asset-completion-service.mjs::#services/asset-generator/src/index.mjs",
  "services/world-kernel/src/presentation-asset-demand-service.mjs::#services/asset-generator/src/index.mjs",
  "services/world-kernel/src/presentation-asset-demand.mjs::#services/asset-generator/src/index.mjs",
  "services/world-kernel/src/thread-presentation-asset-planner.mjs::#services/asset-generator/src/index.mjs",
  "services/world-kernel/src/thread-presentation-asset-publisher.mjs::#services/asset-generator/src/index.mjs",
]);

const PRIVATE_SERVICE_MIGRATION_SET = new Set(PRIVATE_SERVICE_MIGRATION_EDGES);
const SERVICE_ALLOWED_INTEGRATION_SPECIFIERS = new Set([
  "#integrations/ai/reasoning/prompt-assets.mjs",
]);

function normalizeRepoPath(path) { return path.replaceAll("\\", "/"); }
function isTestSource(path) {
  return path.includes("/test/") || path.endsWith(".test.mjs") || path.endsWith(".test.js") || path.endsWith(".test.ts");
}
function isGuardedRuntimeSource(path) {
  return RUNTIME_SOURCE.test(path)
    && !isTestSource(path)
    && (path.startsWith("services/") || path.startsWith("infra/deployments/") || path.startsWith("tools/deployment/") || path.startsWith("tools/presentation/"));
}
function isRuntimeServiceSource(path) { return path.startsWith("services/") && isGuardedRuntimeSource(path); }
function serviceOwner(path) { return /^services\/([^/]+)\//u.exec(path)?.[1] ?? null; }

function moduleSpecifiers(text) {
  const specifiers = [];
  for (const match of text.matchAll(STATIC_MODULE_SPECIFIER)) specifiers.push(match[1]);
  for (const match of text.matchAll(DYNAMIC_MODULE_SPECIFIER)) specifiers.push(match[1]);
  return [...new Set(specifiers)];
}

function targetOwnerForSpecifier(sourcePath, specifier) {
  const sourceOwner = serviceOwner(sourcePath);
  if (sourceOwner === null) return null;
  if (specifier.startsWith("#services/")) {
    const targetOwner = /^#services\/([^/]+)\//u.exec(specifier)?.[1] ?? null;
    return targetOwner !== null && targetOwner !== sourceOwner ? targetOwner : null;
  }
  if (!specifier.startsWith(".")) return null;
  const resolved = normalizeRepoPath(normalizePosix(join(dirname(sourcePath), specifier)));
  const targetOwner = serviceOwner(resolved);
  return targetOwner !== null && targetOwner !== sourceOwner ? targetOwner : null;
}

function isLegacyInfraSpecifier(specifier) {
  return specifier === "@fibre/infra" || specifier.startsWith("@fibre/infra/") || specifier === "#packages/infra" || specifier.startsWith("#packages/infra/");
}

function resolvesToPrivateInfraSource(sourcePath, specifier) {
  if (isLegacyInfraSpecifier(specifier)) return true;
  if (!specifier.startsWith(".")) return false;
  const resolved = normalizeRepoPath(normalizePosix(join(dirname(sourcePath), specifier)));
  if (sourcePath.startsWith("infra/deployments/") && resolved.startsWith("infra/deployments/")) return false;
  return resolved === "infra" || resolved.startsWith("infra/");
}

export function privateServiceEdgesForSource(path, text) {
  const normalizedPath = normalizeRepoPath(path);
  if (!isRuntimeServiceSource(normalizedPath)) return [];
  const edges = [];
  for (const specifier of moduleSpecifiers(text)) {
    const targetOwner = targetOwnerForSpecifier(normalizedPath, specifier);
    if (targetOwner === null) continue;
    edges.push(Object.freeze({
      key: `${normalizedPath}::${specifier}`,
      sourcePath: normalizedPath,
      sourceOwner: serviceOwner(normalizedPath),
      targetOwner,
      specifier,
    }));
  }
  return edges;
}

function violationForEdge(edge) {
  return `Runtime dependency boundary: ${edge.sourcePath} reaches into ${edge.targetOwner} through private cross-owner specifier ${edge.specifier}; use a stable public @fibre/... boundary`;
}

function privateInfraViolationsForSource(path, text) {
  const normalizedPath = normalizeRepoPath(path);
  if (!isGuardedRuntimeSource(normalizedPath)) return [];
  return moduleSpecifiers(text)
    .filter((specifier) => resolvesToPrivateInfraSource(normalizedPath, specifier))
    .map((specifier) => `Runtime dependency boundary: ${normalizedPath} reaches Infra through non-public specifier ${specifier}; use a public #infra entry point`);
}

function serviceProviderSelectionViolationsForSource(path, text) {
  const normalizedPath = normalizeRepoPath(path);
  if (!isRuntimeServiceSource(normalizedPath)) return [];
  const errors = [];
  for (const specifier of moduleSpecifiers(text)) {
    if (specifier.startsWith("#infra/providers/")) {
      errors.push(`Runtime dependency boundary: ${normalizedPath} selects concrete infrastructure provider ${specifier}; provider selection belongs in infra/deployments`);
    }
    if (specifier.startsWith("#integrations/") && !SERVICE_ALLOWED_INTEGRATION_SPECIFIERS.has(specifier)) {
      errors.push(`Runtime dependency boundary: ${normalizedPath} selects concrete integration ${specifier}; integration selection belongs in infra/deployments`);
    }
  }
  return errors;
}

export function runtimeDependencyViolationsForSource(path, text) {
  return [
    ...privateServiceEdgesForSource(path, text).filter((edge) => !PRIVATE_SERVICE_MIGRATION_SET.has(edge.key)).map(violationForEdge),
    ...privateInfraViolationsForSource(path, text),
    ...serviceProviderSelectionViolationsForSource(path, text),
  ];
}

function trackedRuntimeSources(root) {
  return execFileSync("git", ["ls-files", "--", "services", "infra/deployments", "tools/deployment", "tools/presentation"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((path) => normalizeRepoPath(path.trim()))
    .filter((path) => path && isGuardedRuntimeSource(path));
}

export function validateRuntimeDependencyPolicy({ root = process.cwd(), paths = null } = {}) {
  const runtimePaths = paths ?? trackedRuntimeSources(root);
  const errors = [];
  const seenMigrationEdges = new Set();
  for (const path of runtimePaths) {
    const text = readFileSync(resolve(root, path), "utf8");
    for (const edge of privateServiceEdgesForSource(path, text)) {
      if (PRIVATE_SERVICE_MIGRATION_SET.has(edge.key)) seenMigrationEdges.add(edge.key);
      else errors.push(violationForEdge(edge));
    }
    errors.push(...privateInfraViolationsForSource(path, text));
    errors.push(...serviceProviderSelectionViolationsForSource(path, text));
  }
  if (paths === null) {
    for (const edge of PRIVATE_SERVICE_MIGRATION_EDGES) {
      if (!seenMigrationEdges.has(edge)) errors.push(`Stale runtime dependency migration edge: ${edge}`);
    }
  }
  return errors;
}
