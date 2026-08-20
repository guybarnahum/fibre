import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

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

function isTestCallee(expression) {
  if (ts.isIdentifier(expression)) return expression.text === "test" || expression.text === "it";
  if (!ts.isPropertyAccessExpression(expression)) return false;
  if (!ts.isIdentifier(expression.expression)) return false;
  if (!new Set(["test", "it"]).has(expression.expression.text)) return false;
  return new Set(["only", "skip", "todo"]).has(expression.name.text);
}

function analyzeTestSource(source, path) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  let declaredTestCalls = 0;
  const titles = [];
  const imports = new Set();

  function visit(node) {
    if (
      ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.moduleSpecifier.text.endsWith(".test.mjs")
    ) {
      imports.add(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      declaredTestCalls += 1;
      const [firstArgument] = node.arguments;
      if (
        firstArgument !== undefined
        && (ts.isStringLiteral(firstArgument) || ts.isNoSubstitutionTemplateLiteral(firstArgument))
      ) {
        titles.push(firstArgument.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return {
    declaredTestCalls,
    testTitles: titles,
    importedTestFiles: [...imports].sort(),
    commentOnly: sourceFile.statements.length === 0,
  };
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
    const analysis = analyzeTestSource(source, normalizedPath(root, path));
    return {
      path: normalizedPath(root, path),
      scope,
      family: familyFor(normalizedPath(root, path)),
      bytes: Buffer.byteLength(source, "utf8"),
      sha256: sha256(source),
      declaredTestCalls: analysis.declaredTestCalls,
      testTitles: analysis.testTitles,
      importedTestFiles: analysis.importedTestFiles,
      commentOnly: analysis.commentOnly,
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
      note: "declaredTestCalls is an AST-based static source count, not the Node test runner's runtime test total.",
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
