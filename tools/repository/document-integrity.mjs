import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { CONTEXT_MANIFEST_PATH } from "./context-pack-lib.mjs";

const CURRENT_AUTHORITY_ROOTS = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/state/",
  "docs/architecture/",
  "docs/decisions/",
  "services/",
];

const REPO_PATH_PREFIXES = [
  "apps/",
  "artifacts/",
  "config/",
  "docs/",
  "fixtures/",
  "packages/",
  "schemas/",
  "services/",
  "tools/",
];

const FILE_SUFFIX = /\.(?:md|json|jsonc|mjs|js|ts|tsx|jsx|sql|yaml|yml|html|css|sh)$/u;

function normalize(path) {
  return path.replaceAll("\\", "/");
}

export function parseDocumentFrontMatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return {};
  return Object.fromEntries(
    text.slice(4, end).split("\n").flatMap((line) => {
      const separator = line.indexOf(":");
      if (separator < 0) return [];
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, "");
      return key ? [[key, value]] : [];
    }),
  );
}

function stripFencedCode(text) {
  let fenced = false;
  return text.split(/\r?\n/u).map((line) => {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : line;
  }).join("\n");
}

function isExternal(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target);
}

function cleanTarget(raw) {
  let target = raw.trim();
  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
  target = target.split(/\s+["']/u, 1)[0];
  target = target.split("#", 1)[0];
  try {
    target = decodeURIComponent(target);
  } catch {
    // Keep the original text so the eventual missing-path diagnostic is readable.
  }
  return target;
}

function resolveDocumentPath(documentPath, target, root) {
  if (REPO_PATH_PREFIXES.some((prefix) => target.startsWith(prefix))) {
    return resolve(root, target);
  }
  return resolve(root, dirname(documentPath), target);
}

export function markdownLinkTargets(text) {
  const withoutFences = stripFencedCode(text);
  const targets = [];
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
    const target = cleanTarget(match[1]);
    if (target && !isExternal(target)) targets.push(target);
  }
  return targets;
}

function shouldCheckBackticks(documentPath, metadata) {
  if (CURRENT_AUTHORITY_ROOTS.some((prefix) => documentPath === prefix || documentPath.startsWith(prefix))) {
    if (documentPath.startsWith("docs/") && metadata.status && metadata.status !== "accepted") return false;
    return true;
  }
  return false;
}

export function backtickedRepoPaths(text) {
  const withoutFences = stripFencedCode(text);
  const paths = [];
  for (const match of withoutFences.matchAll(/`([^`\r\n]+)`/gu)) {
    let candidate = match[1].trim().replace(/[),.;]+$/u, "");
    candidate = candidate.replace(/:\d+(?:-\d+)?$/u, "");
    if (!REPO_PATH_PREFIXES.some((prefix) => candidate.startsWith(prefix))) continue;
    if (/[\s*?{}<>$]/u.test(candidate)) continue;
    const withoutAnchor = candidate.split("#", 1)[0];
    if (!FILE_SUFFIX.test(withoutAnchor)) continue;
    paths.push(withoutAnchor);
  }
  return paths;
}

function trackedMarkdown(root) {
  return execFileSync("git", ["ls-files", "--", "*.md"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((path) => normalize(path.trim()))
    .filter(Boolean);
}

function declaredGeneratedArtifactPaths(root, errors) {
  const manifestPath = resolve(root, CONTEXT_MANIFEST_PATH);
  if (!existsSync(manifestPath)) return new Set();

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`Invalid ${CONTEXT_MANIFEST_PATH}: ${error.message}`);
    return new Set();
  }

  const declared = new Set();
  for (const profile of Object.values(manifest.profiles ?? {})) {
    if (!profile || typeof profile !== "object") continue;
    const aliases = Array.isArray(profile.aliases) ? profile.aliases : [];
    for (const raw of [profile.output, ...aliases]) {
      if (typeof raw !== "string") continue;
      const target = normalize(raw.trim());
      if (!target.startsWith("artifacts/generated/") || target.includes("../")) continue;
      if (!FILE_SUFFIX.test(target)) continue;
      declared.add(target);
    }
  }
  return declared;
}

export function validateDocumentIntegrity({ root = process.cwd(), markdownPaths = null } = {}) {
  const errors = [];
  const paths = markdownPaths ?? trackedMarkdown(root);
  const canonicalIds = new Map();
  const generatedArtifacts = declaredGeneratedArtifactPaths(root, errors);

  for (const documentPath of paths) {
    const absolute = resolve(root, documentPath);
    if (!existsSync(absolute)) {
      errors.push(`Tracked Markdown document is missing: ${documentPath}`);
      continue;
    }
    const text = readFileSync(absolute, "utf8");
    const metadata = parseDocumentFrontMatter(text);

    const identityBearing = metadata.canonical === "true" ||
      (documentPath.startsWith("docs/decisions/") && metadata.status === "accepted");
    if (identityBearing && metadata.id) {
      const previous = canonicalIds.get(metadata.id);
      if (previous) errors.push(`Duplicate canonical document id ${metadata.id}: ${previous} and ${documentPath}`);
      else canonicalIds.set(metadata.id, documentPath);
    }

    for (const target of markdownLinkTargets(text)) {
      if (!existsSync(resolveDocumentPath(documentPath, target, root)) && !generatedArtifacts.has(normalize(target))) {
        errors.push(`Broken Markdown link in ${documentPath}: ${target}`);
      }
    }

    if (shouldCheckBackticks(documentPath, metadata)) {
      for (const target of backtickedRepoPaths(text)) {
        if (!existsSync(resolve(root, target)) && !generatedArtifacts.has(normalize(target))) {
          errors.push(`Missing documented repository path in ${documentPath}: ${target}`);
        }
      }
    }
  }

  return errors;
}
