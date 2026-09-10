import assert from "node:assert/strict";
import test from "node:test";

import { fibreSpecReporter, renderSpecSummary } from "./fibre-spec-reporter.mjs";

async function collect(events, options = {}) {
  async function* source() {
    for (const event of events) yield event;
  }
  const chunks = [];
  for await (const chunk of fibreSpecReporter(source(), options)) chunks.push(chunk);
  return chunks.join("");
}

test("spec reporter keeps test lines and collapses the Node footer to one summary line", async () => {
  const output = await collect([
    { type: "test:pass", data: { name: "R3 regulation reaches cognition", nesting: 0, details: { type: "test", duration_ms: 3.293125 } } },
    { type: "test:pass", data: { name: "R3 regulation differs by Thread", nesting: 0, details: { type: "test", duration_ms: 0.374 } } },
    { type: "test:diagnostic", data: { message: "tests 2" } },
    { type: "test:diagnostic", data: { message: "pass 2" } },
    {
      type: "test:summary",
      data: {
        counts: { tests: 2, suites: 0, passed: 2, failed: 0, cancelled: 0, skipped: 0, todo: 0 },
        duration_ms: 68.9985,
        success: true,
      },
    },
  ], { color: false });

  assert.equal(output, [
    "✔ R3 regulation reaches cognition (3.293125ms)",
    "✔ R3 regulation differs by Thread (0.374ms)",
    "ℹ tests 2, suites 0, pass 2, fail 0, cancelled 0, skipped 0, todo 0, duration_ms 68.9985",
    "",
  ].join("\n"));
});

test("spec summary colors nonzero pass, failure and skipped states", () => {
  const output = renderSpecSummary({
    counts: { tests: 4, suites: 0, passed: 2, failed: 1, cancelled: 0, skipped: 1, todo: 0 },
    duration_ms: 12.5,
  }, { color: true });

  assert.match(output, /\u001b\[32mpass 2\u001b\[0m/u);
  assert.match(output, /\u001b\[31mfail 1\u001b\[0m/u);
  assert.match(output, /\u001b\[33mskipped 1\u001b\[0m/u);
  assert.match(output, /cancelled 0/u);
});

test("spec reporter preserves failure details", async () => {
  const output = await collect([
    {
      type: "test:fail",
      data: {
        name: "R3 failed boundary",
        nesting: 0,
        details: { type: "test", duration_ms: 1.2, error: { stack: "Error: boom\n    at fixture:1:1" } },
      },
    },
    {
      type: "test:summary",
      data: {
        counts: { tests: 1, suites: 0, passed: 0, failed: 1, cancelled: 0, skipped: 0, todo: 0 },
        duration_ms: 5,
        success: false,
      },
    },
  ], { color: false });

  assert.match(output, /^✖ R3 failed boundary \(1\.2ms\)\n  Error: boom/mu);
  assert.match(output, /ℹ tests 1, suites 0, pass 0, fail 1, cancelled 0, skipped 0, todo 0, duration_ms 5\n$/u);
});
