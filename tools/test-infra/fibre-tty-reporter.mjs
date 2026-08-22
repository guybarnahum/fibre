import { inspect } from "node:util";

const CLEAR_LINE = "\r\u001b[2K";

function isSuite(data) {
  return data?.details?.type === "suite" || data?.type === "suite";
}

function terminalName(data) {
  const name = typeof data?.name === "string" && data.name.trim() !== "" ? data.name : "unnamed test";
  return name.replace(/\s+/gu, " ").trim();
}

function errorText(error) {
  if (error === null || error === undefined) return "Unknown test failure";
  if (typeof error.stack === "string" && error.stack.trim() !== "") return error.stack;
  return inspect(error, { depth: 6, colors: false, compact: false });
}

function indent(value) {
  return String(value).split(/\r?\n/u).map((line) => `    ${line}`).join("\n");
}

export async function* fibreTtyReporter(source) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let todo = 0;
  let cancelled = 0;

  for await (const event of source) {
    const data = event?.data ?? {};
    if (event.type === "test:pass" && !isSuite(data)) {
      if (data.skip !== undefined && data.skip !== false) skipped += 1;
      else if (data.todo !== undefined && data.todo !== false) todo += 1;
      else passed += 1;
      const done = passed + failed + skipped + todo + cancelled;
      yield `${CLEAR_LINE}✓ ${done}  ${terminalName(data)}`;
      continue;
    }

    if (event.type === "test:fail" && !isSuite(data)) {
      failed += 1;
      const done = passed + failed + skipped + todo + cancelled;
      yield `${CLEAR_LINE}✗ ${done}  ${terminalName(data)}\n${indent(errorText(data.details?.error))}\n`;
      continue;
    }

    if (event.type === "test:cancel" && !isSuite(data)) {
      cancelled += 1;
      const done = passed + failed + skipped + todo + cancelled;
      yield `${CLEAR_LINE}⊘ ${done}  ${terminalName(data)}\n`;
      continue;
    }

    if (event.type === "test:stdout" || event.type === "test:stderr") {
      const message = data.message ?? "";
      if (message !== "") yield `${CLEAR_LINE}${message}${String(message).endsWith("\n") ? "" : "\n"}`;
    }
  }

  const total = passed + failed + skipped + todo + cancelled;
  const parts = [`${total} tests`, `${passed} passed`, `${failed} failed`];
  if (skipped !== 0) parts.push(`${skipped} skipped`);
  if (todo !== 0) parts.push(`${todo} todo`);
  if (cancelled !== 0) parts.push(`${cancelled} cancelled`);
  yield `${CLEAR_LINE}${failed === 0 ? "✓" : "✗"} ${parts.join(" · ")}\n`;
}

export default fibreTtyReporter;
