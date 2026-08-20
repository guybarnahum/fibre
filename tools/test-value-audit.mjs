import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TEST_SCOPES = Object.freeze([
  { scope: "domain", directory: "packages/domain/test" },
  { scope: "world-kernel", directory: "services/world-kernel/test" },
  { scope: "tools", directory: "tools" },
]);

const FAMILY_RULES = Object.freeze([
  ["genesis-memory-meaning", "genesis-memory-meaning"],
  ["genesis-pass-c", "genesis-pass-c"],
  ["genesis-slice-f", "genesis-origin-source-integrity"],
  ["genesis-slice-e", "genesis-rich-life"],
  ["genesis-rich-life", "genesis-rich-life"],
  ["genesis-slice-d", "genesis-memory"],
  ["genesis-slice-c", "genesis-history"],
  ["genesis-life", "genesis-history"],
  ["genesis", "genesis-core"],
  ["autobiographical-memory", "memory"],
  ["memory", "memory"],
  ["identity", "identity-provenance"],
  ["symbolic-genome", "genome"],
  ["genome", "genome"],
  ["causal", "causal-evidence"],
  ["history-bends", "causal-evidence"],
  ["whole-person", "causal-evidence"],
  ["freeze", "runtime-lifecycle"],
  ["runtime", "runtime-lifecycle"],
  ["lifecycle", "runtime-lifecycle"],
  ["expression", "interiority-expression"],
  ["private", "interiority-expression"],
  ["interiority", "interiority-expression"],
  ["obligation", "obligations"],
  ["embodiment", "situated-life"],
  ["situated", "situated-life"],
  ["dignity", "dignity-guardian"],
  ["guardian", "dignity-guardian"],
  ["model-runtime", "model-adapters"],
  ["model-api", "model-adapters"],
  ["persistence", "persistence-replay"],
  ["kernel", "persistence-replay"],
  ["server", "persistence-replay"],
  ["thread-editor", "repo-tooling"],
  ["context-pack", "repo-tooling"],
  ["validate", "repo-tooling"],
  ["markdown", "repo-tooling"],
  ["git-", "repo-tooling"],
  ["inspect-", "repo-tooling"],
  ["thread", "thread-domain"],
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedPath(root, path) {
  return relative(root, path).split("\\").join("/");
}

function testFiles(root = DEFAULT_ROOT) {
  const result = [];
  for (const { scope, directory } of TEST_SCOPES) {
    const absoluteDirectory = join(root, directory);
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".test.mjs")) continue;
      result.push({ scope, path: join(absoluteDirectory, entry.name) });
    }
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

// This audit intentionally avoids a JavaScript-parser dependency. It needs only a
// conservative lexical distinction between executable source and code-shaped text in
// comments/string fixtures. Strings and comments are blanked while newlines/positions
// are preserved; template literals are treated as data in their entirety because Fibre's
// test declarations/imports are not authored inside template interpolations.
function lexicalView(source) {
  const masked = [...source];
  const strings = [];

  function blank(start, end) {
    for (let index = start; index < end; index += 1) {
      if (masked[index] !== "\n" && masked[index] !== "\r") masked[index] = " ";
    }
  }

  let index = 0;
  while (index < source.length) {
    if (source[index] === "/" && source[index + 1] === "/") {
      const start = index;
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      blank(start, index);
      continue;
    }
    if (source[index] === "/" && source[index + 1] === "*") {
      const start = index;
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index = Math.min(source.length, index + 2);
      blank(start, index);
      continue;
    }

    const quote = source[index];
    if (quote === "'" || quote === '"' || quote === "`") {
      const start = index;
      let interpolated = false;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index = Math.min(source.length, index + 2);
          continue;
        }
        if (quote === "`" && source[index] === "$" && source[index + 1] === "{") {
          interpolated = true;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      const end = index;
      strings.push({
        start,
        end,
        quote,
        interpolated,
        rawValue: source.slice(start + 1, Math.max(start + 1, end - 1)),
      });
      blank(start, end);
      continue;
    }
    index += 1;
  }

  return { masked: masked.join(""), strings };
}

function precedingStatement(masked, position) {
  const semicolon = masked.lastIndexOf(";", position - 1);
  const newline = masked.lastIndexOf("\n", position - 1);
  const start = Math.max(semicolon, newline) + 1;
  return masked.slice(start, position).trim();
}

function importedTestFilesFromView(view) {
  const imports = new Set();
  for (const token of view.strings) {
    if (!token.rawValue.endsWith(".test.mjs")) continue;
    const prefix = precedingStatement(view.masked, token.start);
    if (!prefix.startsWith("import")) continue;
    if (/^import\s*\(/.test(prefix)) continue;
    imports.add(token.rawValue);
  }
  return [...imports].sort();
}

function firstLiteralArgument(view, callEnd) {
  for (const token of view.strings) {
    if (token.start < callEnd) continue;
    if (view.masked.slice(callEnd, token.start).trim() !== "") return null;
    if (token.quote === "`" && token.interpolated) return null;
    return token.rawValue;
  }
  return null;
}

function analyzeTestSource(source) {
  const view = lexicalView(source);
  const titles = [];
  let declaredTestCalls = 0;
  const pattern = /\b(?:test|it)(?:\.(?:only|skip|todo))?\s*\(/g;
  for (const match of view.masked.matchAll(pattern)) {
    const preceding = match.index > 0 ? view.masked[match.index - 1] : "";
    if (preceding === "." || /[$\w]/.test(preceding)) continue;
    declaredTestCalls += 1;
    const title = firstLiteralArgument(view, match.index + match[0].length);
    if (title !== null) titles.push(title);
  }
  return {
    declaredTestCalls,
    testTitles: titles,
    importedTestFiles: importedTestFilesFromView(view),
  };
}

function stripComments(source) {
  const { masked, strings } = lexicalView(source);
  if (strings.length === 0) return masked.trim();
  // A string expression is executable source, so comment-only classification must not
  // confuse "all lexical strings were masked" with "the file contained only comments".
  return `${masked}${strings.map((token) => token.rawValue).join("")}`.trim();
}

function familyFor(path) {
  const name = basename(path).toLowerCase();
  for (const [needle, family] of FAMILY_RULES) {
    if (name.includes(needle)) return family;
  }
  return path.startsWith("tools/") ? "experimental-or-repo-tooling" : "other";
}

function summarizeBy(records, key) {
  const groups = new Map();
  for (const record of records) {
    const value = record[key];
    const current = groups.get(value) ?? { files: 0, declaredTestCalls: 0, bytes: 0 };
    current.files += 1;
    current.declaredTestCalls += record.declaredTestCalls;
    current.bytes += record.bytes;
    groups.set(value, current);
  }
  return Object.fromEntries([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function duplicateGroups(records, selector) {
  const groups = new Map();
  for (const record of records) {
    const key = selector(record);
    const current = groups.get(key) ?? [];
    current.push(record.path);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([key, paths]) => ({ key, paths: [...paths].sort() }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function buildTestValueAudit(root = DEFAULT_ROOT) {
  const records = testFiles(root).map(({ scope, path }) => {
    const source = readFileSync(path, "utf8");
    const analysis = analyzeTestSource(source);
    const stripped = stripComments(source);
    return {
      path: normalizedPath(root, path),
      scope,
      family: familyFor(normalizedPath(root, path)),
      bytes: Buffer.byteLength(source, "utf8"),
      sha256: sha256(source),
      declaredTestCalls: analysis.declaredTestCalls,
      testTitles: analysis.testTitles,
      importedTestFiles: analysis.importedTestFiles,
      commentOnly: stripped.length === 0,
      zeroDeclaredTests: analysis.declaredTestCalls === 0,
    };
  });

  const exactDuplicateBodies = duplicateGroups(records, (record) => record.sha256);
  const titleRecords = records.flatMap((record) =>
    record.testTitles.map((title) => ({ path: record.path, title })),
  );
  const titleGroups = new Map();
  for (const record of titleRecords) {
    const paths = titleGroups.get(record.title) ?? [];
    paths.push(record.path);
    titleGroups.set(record.title, paths);
  }
  const duplicateTitles = [...titleGroups.entries()]
    .filter(([, paths]) => new Set(paths).size > 1)
    .map(([title, paths]) => ({ title, paths: [...new Set(paths)].sort() }))
    .sort((left, right) => left.title.localeCompare(right.title));

  const testImportAliases = records.filter((record) => record.importedTestFiles.length > 0);
  const zeroDeclared = records.filter((record) => record.zeroDeclaredTests);
  const commentOnly = records.filter((record) => record.commentOnly);

  return {
    version: "fibre-test-value-audit-v1",
    runnerContract: {
      source: "package.json#scripts.test",
      scopes: TEST_SCOPES.map(({ scope, directory }) => ({ scope, glob: `${directory}/*.test.mjs` })),
      note: "declaredTestCalls is a static source count, not the Node test runner's runtime test total.",
    },
    totals: {
      files: records.length,
      declaredTestCalls: records.reduce((sum, record) => sum + record.declaredTestCalls, 0),
      bytes: records.reduce((sum, record) => sum + record.bytes, 0),
    },
    byScope: summarizeBy(records, "scope"),
    byFamily: summarizeBy(records, "family"),
    hygiene: {
      exactDuplicateBodies,
      duplicateTitles,
      testImportAliases: testImportAliases.map((record) => ({
        path: record.path,
        importedTestFiles: record.importedTestFiles,
        declaredTestCalls: record.declaredTestCalls,
      })),
      zeroDeclaredTests: zeroDeclared.map((record) => ({
        path: record.path,
        commentOnly: record.commentOnly,
        importedTestFiles: record.importedTestFiles,
      })),
      commentOnlyTestFiles: commentOnly.map((record) => record.path),
    },
    records,
  };
}

export function renderTestValueAuditMarkdown(audit) {
  const lines = [
    "# Fibre test-value audit",
    "",
    `Version: \`${audit.version}\``,
    "",
    "## Inventory",
    "",
    `- Test files loaded by the npm test globs: **${audit.totals.files}**`,
    `- Static declared test calls: **${audit.totals.declaredTestCalls}**`,
    `- Test source bytes: **${audit.totals.bytes}**`,
    "- Static declared calls are not the runtime Node test count; generated/table-driven tests can differ.",
    "",
    "### By scope",
    "",
    "| Scope | Files | Declared calls | Bytes |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const [scope, summary] of Object.entries(audit.byScope)) {
    lines.push(`| ${scope} | ${summary.files} | ${summary.declaredTestCalls} | ${summary.bytes} |`);
  }
  lines.push("", "### By invariant family", "", "| Family | Files | Declared calls | Bytes |", "| --- | ---: | ---: | ---: |");
  for (const [family, summary] of Object.entries(audit.byFamily)) {
    lines.push(`| ${family} | ${summary.files} | ${summary.declaredTestCalls} | ${summary.bytes} |`);
  }

  const section = (title, items, formatter) => {
    lines.push("", `## ${title}`, "");
    if (items.length === 0) {
      lines.push("None detected.");
      return;
    }
    for (const item of items) lines.push(`- ${formatter(item)}`);
  };
  section(
    "Exact duplicate test-file bodies",
    audit.hygiene.exactDuplicateBodies,
    (item) => `${item.paths.map((path) => `\`${path}\``).join(", ")}`,
  );
  section(
    "Test files importing other test files",
    audit.hygiene.testImportAliases,
    (item) => `\`${item.path}\` imports ${item.importedTestFiles.map((path) => `\`${path}\``).join(", ")}`,
  );
  section(
    "Zero-declaration test files",
    audit.hygiene.zeroDeclaredTests,
    (item) => `\`${item.path}\` — commentOnly=${item.commentOnly}; importedTests=${item.importedTestFiles.length}`,
  );
  section(
    "Duplicate test titles across files",
    audit.hygiene.duplicateTitles,
    (item) => `\`${item.title}\` — ${item.paths.map((path) => `\`${path}\``).join(", ")}`,
  );
  lines.push(
    "",
    "## Interpretation rule",
    "",
    "Exact duplicate bodies, test-import aliases, and comment-only `*.test.mjs` tombstones are mechanical cleanup candidates.",
    "Duplicate titles are review signals only: domain, store, replay, API, transaction, hostile-mutation, and protocol tests may intentionally exercise the same named invariant at different load-bearing boundaries.",
    "No semantic test should be removed solely to reduce the test count.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function parseArguments(argv) {
  const options = { json: null, markdown: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = argv[++index];
    else if (argument === "--markdown") options.markdown = argv[++index];
    else if (argument === "--check") options.check = true;
    else throw new TypeError(`unknown argument: ${argument}`);
  }
  if (options.json === undefined || options.markdown === undefined) {
    throw new TypeError("--json and --markdown require output paths");
  }
  return options;
}

function blockingMechanicalFindings(audit) {
  return [
    ...audit.hygiene.exactDuplicateBodies.map((item) => `exact duplicate bodies: ${item.paths.join(", ")}`),
    ...audit.hygiene.testImportAliases.map((item) => `test import alias: ${item.path}`),
    ...audit.hygiene.commentOnlyTestFiles.map((path) => `comment-only test tombstone: ${path}`),
  ];
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const audit = buildTestValueAudit();
  const markdown = renderTestValueAuditMarkdown(audit);
  if (options.json) writeFileSync(resolve(options.json), `${JSON.stringify(audit, null, 2)}\n`);
  if (options.markdown) writeFileSync(resolve(options.markdown), markdown);
  if (!options.json && !options.markdown) process.stdout.write(markdown);
  if (options.check) {
    const findings = blockingMechanicalFindings(audit);
    if (findings.length > 0) {
      for (const finding of findings) console.error(`TEST-AUDIT: ${finding}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
