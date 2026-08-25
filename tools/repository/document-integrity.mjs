import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

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
const RETIRED_TEST_ARTIFACT_FILE = /\bartifacts\/test-results\/[A-Za-z0-9._/-]+\.(?:md|json|jsonc|mjs|js|ts|tsx|jsx|sql|yaml|yml|html|css|sh)\b/gu;

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

function repoRelativePath(root, absolutePath) {
  return normalize(relative(root, absolutePath));
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

export function retiredTestArtifactPaths(text) {
  return [...new Set([...text.matchAll(RETIRED_TEST_ARTIFACT_FILE)].map((match) => match[0]))];
}

export function declaredGeneratedRepoPaths({ root = process.cwd() } = {}) {
  const manifestPath = resolve(root, "docs/ai-context-manifest.json");
  if (!existsSync(manifestPath)) return new Set();

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const paths = [];
    for (const profile of Object.values(manifest.profiles ?? {})) {
      if (typeof profile?.output === "string") paths.push(normalize(profile.output));
      if (!Array.isArray(profile?.aliases)) continue;
      for (const alias of profile.aliases) {
        if (typeof alias === "string") paths.push(normalize(alias));
      }
    }
    return new Set(paths);
  } catch {
    return new Set();
  }
}

function trackedMarkdown(root) {
  return execFileSync("git", ["ls-files", "--", "*.md"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((path) => normalize(path.trim()))
    .filter(Boolean);
}

export function validateDocumentIntegrity({ root = process.cwd(), markdownPaths = null } = {}) {
  const errors = [];
  const paths = markdownPaths ?? trackedMarkdown(root);
  const canonicalIds = new Map();
  const generatedPaths = declaredGeneratedRepoPaths({ root });

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
      const resolvedTarget = resolveDocumentPath(documentPath, target, root);
      if (!existsSync(resolvedTarget) && !generatedPaths.has(repoRelativePath(root, resolvedTarget))) {
        errors.push(`Broken Markdown link in ${documentPath}: ${target}`);
      }
    }

    if (!documentPath.startsWith("docs/history/")) {
      for (const target of retiredTestArtifactPaths(text)) {
        errors.push(`Retired test artifact path referenced in ${documentPath}: ${target}`);
      }
    }

    if (shouldCheckBackticks(documentPath, metadata)) {
      for (const target of backtickedRepoPaths(text)) {
        const resolvedTarget = resolve(root, target);
        if (!existsSync(resolvedTarget) && !generatedPaths.has(repoRelativePath(root, resolvedTarget))) {
          errors.push(`Missing documented repository path in ${documentPath}: ${target}`);
        }
      }
    }
  }

  return errors;
}
