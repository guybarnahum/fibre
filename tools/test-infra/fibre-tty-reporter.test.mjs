import assert from "node:assert/strict";
import test from "node:test";

import { fibreTtyReporter } from "./fibre-tty-reporter.mjs";
import { testSuiteCommand } from "./run-test-suite.mjs";

async function collect(events) {
  async function* source() {
    for (const event of events) yield event;
  }
  const chunks = [];
  for await (const chunk of fibreTtyReporter(source())) chunks.push(chunk);
  return chunks;
}

test("TTY reporter overwrites successful progress but preserves failures with newline output", async () => {
  const chunks = await collect([
    { type: "test:pass", data: { name: "first success", details: { type: "test" } } },
    { type: "test:pass", data: { name: "second success", details: { type: "test" } } },
    {
      type: "test:fail",
      data: {
        name: "important failure",
        details: { type: "test", error: { stack: "Error: boom\n    at fixture:1:1" } },
      },
    },
    { type: "test:pass", data: { name: "recovery success", details: { type: "test" } } },
  ]);

  assert.match(chunks[0], /^\r\u001b\[2K✓ 1  first success$/u);
  assert.match(chunks[1], /^\r\u001b\[2K✓ 2  second success$/u);
  assert.match(chunks[2], /^\r\u001b\[2K✗ 3  important failure\n/u);
  assert.match(chunks[2], /Error: boom/u);
  assert.ok(chunks[2].endsWith("\n"));
  assert.match(chunks[3], /^\r\u001b\[2K✓ 4  recovery success$/u);
  assert.equal(chunks.at(-1), "\r\u001b[2K✗ 4 tests · 3 passed · 1 failed\n");
});

test("test-suite command adds compact reporter only for TTY and respects explicit reporters", () => {
  const tty = testSuiteCommand(["active"], { isTTY: true });
  assert.ok(tty.command.some((arg) => arg.includes("--test-reporter=") && arg.includes("fibre-tty-reporter.mjs")));

  const nonTty = testSuiteCommand(["active"], { isTTY: false });
  assert.equal(nonTty.command.some((arg) => arg.startsWith("--test-reporter=")), false);

  const explicit = testSuiteCommand(["active", "--test-reporter=dot"], { isTTY: true });
  assert.equal(explicit.command.filter((arg) => arg.startsWith("--test-reporter=")).length, 1);
  assert.ok(explicit.command.includes("--test-reporter=dot"));
});
