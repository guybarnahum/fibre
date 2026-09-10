import { inspect } from "node:util";

const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const RESET = "\u001b[0m";

function terminalName(data) {
  const name = typeof data?.name === "string" && data.name.trim() !== "" ? data.name : "unnamed test";
  return name.replace(/\s+/gu, " ").trim();
}

function isSuite(data) {
  return data?.details?.type === "suite" || data?.type === "suite";
}

function duration(data) {
  const value = data?.details?.duration_ms;
  return Number.isFinite(value) ? ` (${value}ms)` : "";
}

function errorText(error) {
  if (error === null || error === undefined) return "Unknown test failure";
  if (typeof error.stack === "string" && error.stack.trim() !== "") return error.stack;
  return inspect(error, { depth: 6, colors: false, compact: false });
}

function indent(value, nesting = 0) {
  const prefix = "  ".repeat(Math.max(1, nesting + 1));
  return String(value).split(/\r?\n/u).map((line) => `${prefix}${line}`).join("\n");
}

function paint(text, code, enabled) {
  return enabled ? `${code}${text}${RESET}` : text;
}

function summaryDiagnostic(data) {
  return data?.file === undefined
    && /^(?:tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+\d/u.test(String(data?.message ?? ""));
}

export function renderSpecSummary(summary, { color = false } = {}) {
  const counts = summary?.counts ?? {};
  const tests = counts.tests ?? 0;
  const suites = counts.suites ?? 0;
  const passed = counts.passed ?? 0;
  const failed = counts.failed ?? 0;
  const cancelled = counts.cancelled ?? 0;
  const skipped = counts.skipped ?? 0;
  const todo = counts.todo ?? 0;
  const durationMs = summary?.duration_ms ?? 0;
  const state = (label, value, code) => paint(`${label} ${value}`, code, color && value > 0);
  return `ℹ tests ${tests}, suites ${suites}, ${state("pass", passed, GREEN)}, ${state("fail", failed, RED)}, ${state("cancelled", cancelled, RED)}, ${state("skipped", skipped, YELLOW)}, ${state("todo", todo, YELLOW)}, duration_ms ${durationMs}\n`;
}

export async function* fibreSpecReporter(
  source,
  { color = process.stdout.isTTY === true && process.env.NO_COLOR === undefined } = {},
) {
  let summary = null;

  for await (const event of source) {
    const data = event?.data ?? {};

    if (event.type === "test:summary") {
      summary = data;
      continue;
    }

    if (event.type === "test:pass" && !isSuite(data)) {
      const nesting = Number.isInteger(data.nesting) ? data.nesting : 0;
      const prefix = "  ".repeat(nesting);
      if (data.skip !== undefined && data.skip !== false) {
        yield `${prefix}${paint("﹣", YELLOW, color)} ${terminalName(data)}${duration(data)} # SKIP\n`;
      } else if (data.todo !== undefined && data.todo !== false) {
        yield `${prefix}${paint("﹣", YELLOW, color)} ${terminalName(data)}${duration(data)} # TODO\n`;
      } else {
        yield `${prefix}${paint("✔", GREEN, color)} ${terminalName(data)}${duration(data)}\n`;
      }
      continue;
    }

    if (event.type === "test:fail" && !isSuite(data)) {
      const nesting = Number.isInteger(data.nesting) ? data.nesting : 0;
      const prefix = "  ".repeat(nesting);
      yield `${prefix}${paint("✖", RED, color)} ${terminalName(data)}${duration(data)}\n${indent(errorText(data.details?.error), nesting)}\n`;
      continue;
    }

    if (event.type === "test:cancel" && !isSuite(data)) {
      const nesting = Number.isInteger(data.nesting) ? data.nesting : 0;
      const prefix = "  ".repeat(nesting);
      yield `${prefix}${paint("⊘", RED, color)} ${terminalName(data)}${duration(data)}\n`;
      continue;
    }

    if (event.type === "test:stdout" || event.type === "test:stderr") {
      const message = String(data.message ?? "");
      if (message !== "") yield message.endsWith("\n") ? message : `${message}\n`;
      continue;
    }

    if (event.type === "test:diagnostic" && !summaryDiagnostic(data)) {
      yield `ℹ ${data.message ?? ""}\n`;
    }
  }

  if (summary !== null) yield renderSpecSummary(summary, { color });
}

export default fibreSpecReporter;
