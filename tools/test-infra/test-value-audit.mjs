import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TEST_SCOPES = Object.freeze([
  { scope: "domain", directory: "core/test" },
  { scope: "infra", directory: "packages/infra/test" },
  { scope: "asset-generator", directory: "services/asset-generator/test" },
  { scope: "birth-center", directory: "services/birth-center/test" },
  { scope: "thread-presentation", directory: "services/thread-presentation/test" },
  { scope: "thread-presentation-cloudflare", directory: "deployments/cloudflare/thread-presentation/test" },
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

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function normalizedPath(root, path) { return relative(root, path).split("\\").join("/"); }

function walkTests(directory, scope) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkTests(path, scope));
    else if (entry.isFile() && entry.name.endsWith(".test.mjs")) result.push({ scope, path });
  }
  return result;
}

function testFiles(root = DEFAULT_ROOT) {
  return TEST_SCOPES.flatMap(({ scope, directory }) => walkTests(join(root, directory), scope))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function lexicalView(source) {
  const masked = [...source];
  const strings = [];
  const blank = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (masked[index] !== "\n" && masked[index] !== "\r") masked[index] = " ";
    }
  };
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
        if (source[index] === "\\") { index = Math.min(source.length, index + 2); continue; }
        if (quote === "`" && source[index] === "$" && source[index + 1] === "{") interpolated = true;
        if (source[index] === quote) { index += 1; break; }
        index += 1;
      }
      const end = index;
      strings.push({ start, end, quote, interpolated, rawValue: source.slice(start + 1, Math.max(start + 1, end - 1)) });
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
  return masked.slice(Math.max(semicolon, newline) + 1, position).trim();
}

function importedTestFilesFromView(view) {
  const imports = new Set();
  for (const token of view.strings) {
    if (!token.rawValue.endsWith(".test.mjs")) continue;
    const prefix = precedingStatement(view.masked, token.start);
    if (!/^import(?:$|\s|\{|\*|["'])/.test(prefix)) continue;
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
  return { declaredTestCalls, testTitles: titles, importedTestFiles: importedTestFilesFromView(view) };
}

function stripComments(source) {
  const { masked, strings } = lexicalView(source);
  if (strings.length === 0) return masked.trim();
  return `${masked}${strings.map((token) => token.rawValue).join("")}`.trim();
}

function familyFor(path) {
  const name = basename(path).toLowerCase();
  for (const [needle, family] of FAMILY_RULES) if (name.includes(needle)) return family;
  return path.startsWith("tools/") ? "experimental-or-repo-tooling" : "other";
}

function summarizeBy(records, key) {
  const groups = new Map();
  for (const record of records) {
    const value = record[key];
    const current = groups.get(value) ?? { files: 0, declaredTestCalls: 0, bytes: 0 };
    current.files += 1; current.declaredTestCalls += record.declaredTestCalls; current.bytes += record.bytes;
    groups.set(value, current);
  }
  return Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function duplicateGroups(records, selector) {
  const groups = new Map();
  for (const record of records) {
    const key = selector(record);
    const current = groups.get(key) ?? [];
    current.push(record.path); groups.set(key, current);
  }
  return [...groups.entries()].filter(([, paths]) => paths.length > 1)
    .map(([key, paths]) => ({ key, paths: [...paths].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function buildTestValueAudit(root = DEFAULT_ROOT) {
  const records = testFiles(root).map(({ scope, path }) => {
    const source = readFileSync(path, "utf8");
    const analysis = analyzeTestSource(source);
    const normalized = normalizedPath(root, path);
    return {
      path: normalized,
      scope,
      family: familyFor(normalized),
      bytes: Buffer.byteLength(source, "utf8"),
      sha256: sha256(source),
      declaredTestCalls: analysis.declaredTestCalls,
      testTitles: analysis.testTitles,
      importedTestFiles: analysis.importedTestFiles,
      commentOnly: stripComments(source).length === 0,
      zeroDeclaredTests: analysis.declaredTestCalls === 0,
    };
  });
  const exactDuplicateBodies = duplicateGroups(records, (record) => record.sha256);
  const titleGroups = new Map();
  for (const record of records) for (const title of record.testTitles) {
    const paths = titleGroups.get(title) ?? new Set(); paths.add(record.path); titleGroups.set(title, paths);
  }
  const duplicateTitles = [...titleGroups.entries()].filter(([, paths]) => paths.size > 1)
    .map(([title, paths]) => ({ title, paths: [...paths].sort() })).sort((a, b) => a.title.localeCompare(b.title));
  const testImportAliases = records.filter((record) => record.importedTestFiles.length > 0)
    .map((record) => ({ path: record.path, importedTestFiles: record.importedTestFiles, declaredTestCalls: record.declaredTestCalls }));
  const zeroDeclaredTests = records.filter((record) => record.zeroDeclaredTests).map((record) => record.path);
  const commentOnlyTestFiles = records.filter((record) => record.commentOnly).map((record) => record.path);
  return {
    version: "fibre-test-value-audit-v2",
    totals: { files: records.length, declaredTestCalls: records.reduce((s, r) => s + r.declaredTestCalls, 0), bytes: records.reduce((s, r) => s + r.bytes, 0) },
    byScope: summarizeBy(records, "scope"),
    byFamily: summarizeBy(records, "family"),
    records,
    hygiene: { exactDuplicateBodies, testImportAliases, zeroDeclaredTests, commentOnlyTestFiles, duplicateTitles },
  };
}

function renderTable(summary) {
  const rows = [
    ["Scope", "Files", "Declared calls", "Bytes"],
    ...Object.entries(summary).map(([scope, values]) => [
      scope,
      String(values.files),
      String(values.declaredTestCalls),
      String(values.bytes),
    ]),
  ];
  const widths = rows[0].map((_, column) => Math.max(
    column === 0 ? 3 : 4,
    ...rows.map((row) => row[column].length),
  ));
  const renderRow = (row) => `| ${row.map((cell, column) =>
    column === 0 ? cell.padEnd(widths[column]) : cell.padStart(widths[column])
  ).join(" | ")} |`;
  const separator = `| ${widths.map((width, column) =>
    column === 0 ? "-".repeat(width) : `${"-".repeat(width - 1)}:`
  ).join(" | ")} |`;
  return [renderRow(rows[0]), separator, ...rows.slice(1).map(renderRow)].join("\n");
}

function renderAudit(audit) {
  const lines = [
    "# Fibre test-value audit", "", `Version: \`${audit.version}\``, "", "## Inventory", "",
    `- Test files loaded by the recursive npm test scopes: **${audit.totals.files}**`,
    `- Static declared test calls: **${audit.totals.declaredTestCalls}**`,
    `- Test source bytes: **${audit.totals.bytes}**`,
    "- Static declared calls are not the runtime Node test count; generated/table-driven tests can differ.", "",
    "### By scope", "", renderTable(audit.byScope), "", "### By invariant family", "", renderTable(audit.byFamily), "",
    "## Exact duplicate test-file bodies", "",
  ];
  if (audit.hygiene.exactDuplicateBodies.length === 0) lines.push("None detected.");
  else for (const group of audit.hygiene.exactDuplicateBodies) lines.push(`- \`${group.paths.join("` = `")}\``);
  lines.push("", "## Test files importing other test files", "");
  if (audit.hygiene.testImportAliases.length === 0) lines.push("None detected.");
  else for (const record of audit.hygiene.testImportAliases) lines.push(`- \`${record.path}\` imports ${record.importedTestFiles.map((path) => `\`${path}\``).join(", ")}`);
  lines.push("", "## Zero-declaration test files", "");
  if (audit.hygiene.zeroDeclaredTests.length === 0) lines.push("None detected.");
  else for (const path of audit.hygiene.zeroDeclaredTests) lines.push(`- \`${path}\``);
  lines.push("", "## Duplicate test titles across files", "");
  if (audit.hygiene.duplicateTitles.length === 0) lines.push("None detected.");
  else for (const record of audit.hygiene.duplicateTitles) lines.push(`- \`${record.title}\`: ${record.paths.map((path) => `\`${path}\``).join(", ")}`);
  lines.push("", "## Interpretation rule", "", "Exact duplicate bodies, test-import aliases, and comment-only `*.test.mjs` tombstones are mechanical cleanup candidates.", "Duplicate titles are review signals only; distinct load-bearing boundaries may intentionally share language.", "No semantic test should be removed solely to reduce the test count.");
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const args = { check: false, json: null, markdown: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") args.check = true;
    else if (arg === "--json") args.json = argv[++index];
    else if (arg === "--markdown") args.markdown = argv[++index];
    else throw new TypeError(`unknown test-value audit option: ${arg}`);
  }
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const audit = buildTestValueAudit();
  if (args.json) writeFileSync(args.json, JSON.stringify(audit, null, 2));
  if (args.markdown) writeFileSync(args.markdown, renderAudit(audit));
  if (!args.json && !args.markdown) process.stdout.write(renderAudit(audit));
  const blockers = [];
  for (const group of audit.hygiene.exactDuplicateBodies) blockers.push(`exact duplicate test bodies: ${group.paths.join(", ")}`);
  for (const record of audit.hygiene.testImportAliases) blockers.push(`test import alias: ${record.path}`);
  for (const path of audit.hygiene.commentOnlyTestFiles) blockers.push(`comment-only test tombstone: ${path}`);
  if (args.check && blockers.length > 0) {
    for (const blocker of blockers) process.stderr.write(`TEST-AUDIT: ${blocker}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();