import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";

const REGION_TOKEN =
  /<!--\s*fibre:region\s+name="([A-Za-z0-9._-]+)"\s*-->|<!--\s*\/fibre:region\s*-->/g;
const INCLUDE_TOKEN =
  /<!--\s*fibre:include\s+([^>\n]*?)\s*-->|<!--\s*\/fibre:include\s*-->/g;
const INCLUDE_START = /^<!--\s*fibre:include\b/;

export const MARKDOWN_INCLUDE_ROOTS = ["README.md", "AGENTS.md", "CLAUDE.md", "docs"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedRepoPath(value, label) {
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

function isWithin(root, target) {
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

function safeRepositoryFile(root, repoPath, label) {
  const normalized = normalizedRepoPath(repoPath, label);
  const absolute = resolve(root, normalized);
  assert(isWithin(root, absolute), `${label} must remain inside the repository: ${repoPath}`);
  assert(existsSync(absolute), `${label} does not exist: ${normalized}`);

  let current = root;
  for (const component of relative(root, absolute).split(sep).filter(Boolean)) {
    current = join(current, component);
    assert(
      !lstatSync(current).isSymbolicLink(),
      `${label} must not traverse a symlink: ${normalized}`,
    );
  }

  const real = realpathSync(absolute);
  assert(isWithin(root, real), `${label} resolves outside the repository: ${normalized}`);
  assert(real === absolute, `${label} must not resolve through a symlink: ${normalized}`);
  assert(lstatSync(absolute).isFile(), `${label} must be a file: ${normalized}`);
  return { normalized, absolute };
}

function fencedMask(text) {
  const lines = text.match(/.*(?:\n|$)/g) ?? [];
  let inFence = false;
  let fenceCharacter = "";
  let fenceLength = 0;

  return lines
    .map((line) => {
      const withoutNewline = line.endsWith("\n") ? line.slice(0, -1) : line;
      const newline = line.endsWith("\n") ? "\n" : "";
      const match = withoutNewline.match(/^ {0,3}([`~]{3,})/);
      let mask = inFence;

      if (!inFence && match) {
        inFence = true;
        fenceCharacter = match[1][0];
        fenceLength = match[1].length;
        mask = true;
      } else if (inFence && match) {
        const candidate = match[1];
        if (candidate[0] === fenceCharacter && candidate.length >= fenceLength) {
          inFence = false;
        }
        mask = true;
      }

      return mask ? `${" ".repeat(withoutNewline.length)}${newline}` : line;
    })
    .join("");
}

function parseAttributes(raw, label) {
  const attributes = new Map();
  const pattern = /([A-Za-z][A-Za-z0-9_-]*)="([^"]*)"/g;
  let match;
  let consumed = "";
  while ((match = pattern.exec(raw)) !== null) {
    assert(!attributes.has(match[1]), `${label} repeats attribute ${match[1]}`);
    attributes.set(match[1], match[2]);
    consumed += match[0];
  }
  const compactRaw = raw.replace(/\s+/g, "");
  const compactConsumed = consumed.replace(/\s+/g, "");
  assert(compactRaw === compactConsumed, `${label} has invalid attributes: ${raw.trim()}`);
  assert(attributes.has("src"), `${label} requires src`);
  assert(attributes.has("region"), `${label} requires region`);
  assert(attributes.size === 2, `${label} supports only src and region`);
  return {
    src: attributes.get("src"),
    region: attributes.get("region"),
  };
}

export function extractMarkdownRegions(sourceText, label = "Markdown source") {
  const masked = fencedMask(sourceText);
  const regions = new Map();
  let open = null;
  let match;
  REGION_TOKEN.lastIndex = 0;

  while ((match = REGION_TOKEN.exec(masked)) !== null) {
    if (match[1] !== undefined) {
      assert(open === null, `${label} contains nested fibre:region directives`);
      assert(!regions.has(match[1]), `${label} repeats region ${match[1]}`);
      open = { name: match[1], contentStart: REGION_TOKEN.lastIndex };
    } else {
      assert(open !== null, `${label} contains /fibre:region without a start`);
      const content = sourceText.slice(open.contentStart, match.index).trim();
      assert(content, `${label} region ${open.name} must not be empty`);
      const activeContent = fencedMask(content);
      assert(
        !INCLUDE_START.test(activeContent.trim()),
        `${label} region ${open.name} must not contain nested fibre:include directives`,
      );
      regions.set(open.name, content);
      open = null;
    }
  }

  assert(open === null, `${label} has an unclosed fibre:region directive`);
  return regions;
}

function parseIncludeBlocks(targetText, label) {
  const masked = fencedMask(targetText);
  const blocks = [];
  let open = null;
  let match;
  INCLUDE_TOKEN.lastIndex = 0;

  while ((match = INCLUDE_TOKEN.exec(masked)) !== null) {
    if (match[1] !== undefined) {
      assert(open === null, `${label} contains nested fibre:include directives`);
      const attributes = parseAttributes(match[1], `${label} fibre:include`);
      open = {
        ...attributes,
        markerStart: match.index,
        contentStart: INCLUDE_TOKEN.lastIndex,
        startMarker: targetText.slice(match.index, INCLUDE_TOKEN.lastIndex),
      };
    } else {
      assert(open !== null, `${label} contains /fibre:include without a start`);
      blocks.push({
        ...open,
        contentEnd: match.index,
        markerEnd: INCLUDE_TOKEN.lastIndex,
        endMarker: targetText.slice(match.index, INCLUDE_TOKEN.lastIndex),
      });
      open = null;
    }
  }

  assert(open === null, `${label} has an unclosed fibre:include directive`);
  return blocks;
}

export function projectMarkdownIncludes(
  targetText,
  resolveRegion,
  label = "Markdown target",
) {
  const blocks = parseIncludeBlocks(targetText, label);
  let projected = targetText;

  for (const block of [...blocks].reverse()) {
    const content = resolveRegion(block.src, block.region);
    assert(typeof content === "string" && content.trim(), `${label} include is empty`);
    const replacement = `${block.startMarker}\n${content.trim()}\n${block.endMarker}`;
    projected = `${projected.slice(0, block.markerStart)}${replacement}${projected.slice(
      block.markerEnd,
    )}`;
  }

  return projected;
}

function walkMarkdown(path, root, files) {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  assert(!stat.isSymbolicLink(), `Markdown include scan must not follow symlink: ${relative(root, path)}`);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      walkMarkdown(join(path, name), root, files);
    }
  } else if (stat.isFile() && path.endsWith(".md")) {
    files.push(path);
  }
}

export function markdownIncludeFiles(rootPath = ".") {
  const root = realpathSync(rootPath);
  const files = [];
  for (const entry of MARKDOWN_INCLUDE_ROOTS) {
    walkMarkdown(resolve(root, entry), root, files);
  }
  return [...new Set(files)].sort();
}

export function expectedMarkdownIncludeProjections(rootPath = ".") {
  const root = realpathSync(rootPath);
  const files = markdownIncludeFiles(root);
  const sourceCache = new Map();
  const projections = new Map();

  function sourceRegions(src) {
    const source = safeRepositoryFile(root, src, "Markdown include source");
    if (!source.normalized.endsWith(".md")) {
      throw new Error(`Markdown include source must be Markdown: ${source.normalized}`);
    }
    if (!sourceCache.has(source.normalized)) {
      sourceCache.set(
        source.normalized,
        extractMarkdownRegions(
          readFileSync(source.absolute, "utf8"),
          source.normalized,
        ),
      );
    }
    return sourceCache.get(source.normalized);
  }

  for (const absolute of files) {
    const repoPath = relative(root, absolute).replaceAll("\\", "/");
    const actual = readFileSync(absolute, "utf8");

    // Validate region structure even when this file is not currently included.
    extractMarkdownRegions(actual, repoPath);

    const expected = projectMarkdownIncludes(
      actual,
      (src, region) => {
        const regions = sourceRegions(src);
        assert(regions.has(region), `Markdown include source ${src} has no region ${region}`);
        return regions.get(region);
      },
      repoPath,
    );

    if (actual !== expected || parseIncludeBlocks(actual, repoPath).length > 0) {
      projections.set(repoPath, { actual, expected });
    }
  }

  return projections;
}
