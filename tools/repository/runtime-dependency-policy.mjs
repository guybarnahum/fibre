import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize as normalizePosix } from "node:path/posix";
import { resolve } from "node:path";

const RUNTIME_SOURCE = /\.(?:mjs|js|ts|tsx|jsx)$/u;
const STATIC_MODULE_SPECIFIER = /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gsu;
const DYNAMIC_MODULE_SPECIFIER = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;

// Exact current sibling-service private runtime edges. These are migration debt,
// not permission for either endpoint to grow another reach-through. Shrink this
// list whenever an edge moves behind a stable public @fibre/... boundary.
//
// Package-private #packages/.../src imports are intentionally not frozen here:
// ADR-0018 already marks the packages -> domain/infra relocation as a separate
// structural migration, and this guard should not turn that temporary layout
// into a permanent accepted baseline.
export const PRIVATE_SERVICE_MIGRATION_EDGES = Object.freeze([
  "services/birth-center/src/runtime.mjs::../../world-kernel/src/model-runtime/durable-invocation-journal.mjs",
  "services/birth-center/src/server.mjs::../../world-kernel/src/http-server.mjs",
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

function normalizeRepoPath(path) {
  return path.replaceAll("\\", "/");
}

function isRuntimeServiceSource(path) {
  return path.startsWith("services/")
    && RUNTIME_SOURCE.test(path)
    && !path.includes("/test/")
    && !path.endsWith(".test.mjs")
    && !path.endsWith(".test.js")
    && !path.endsWith(".test.ts");
}

function serviceOwner(path) {
  const match = /^services\/([^/]+)\//u.exec(path);
  return match?.[1] ?? null;
}

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
    const match = /^#services\/([^/]+)\//u.exec(specifier);
    const targetOwner = match?.[1] ?? null;
    return targetOwner !== null && targetOwner !== sourceOwner ? targetOwner : null;
  }

  if (!specifier.startsWith(".")) return null;
  const resolved = normalizeRepoPath(normalizePosix(join(dirname(sourcePath), specifier)));
  const targetOwner = serviceOwner(resolved);
  return targetOwner !== null && targetOwner !== sourceOwner ? targetOwner : null;
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

export function runtimeDependencyViolationsForSource(path, text) {
  return privateServiceEdgesForSource(path, text)
    .filter((edge) => !PRIVATE_SERVICE_MIGRATION_SET.has(edge.key))
    .map(violationForEdge);
}

function trackedServiceSources(root) {
  return execFileSync("git", ["ls-files", "--", "services"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/u)
    .map((path) => normalizeRepoPath(path.trim()))
    .filter((path) => path && isRuntimeServiceSource(path));
}

export function validateRuntimeDependencyPolicy({ root = process.cwd(), paths = null } = {}) {
  const servicePaths = paths ?? trackedServiceSources(root);
  const errors = [];
  const seenMigrationEdges = new Set();

  for (const path of servicePaths) {
    const text = readFileSync(resolve(root, path), "utf8");
    for (const edge of privateServiceEdgesForSource(path, text)) {
      if (PRIVATE_SERVICE_MIGRATION_SET.has(edge.key)) {
        seenMigrationEdges.add(edge.key);
      } else {
        errors.push(violationForEdge(edge));
      }
    }
  }

  if (paths === null) {
    for (const edge of PRIVATE_SERVICE_MIGRATION_EDGES) {
      if (!seenMigrationEdges.has(edge)) {
        errors.push(`Stale runtime dependency migration edge: ${edge}`);
      }
    }
  }

  return errors;
}
