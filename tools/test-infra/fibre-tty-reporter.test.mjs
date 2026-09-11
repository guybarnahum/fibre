import assert from "node:assert/strict";
import test from "node:test";

import { fibreTtyReporter } from "./fibre-tty-reporter.mjs";
import { testSuiteCommand } from "./run-test-suite.mjs";

async function collect(events, options) {
  async function* source() {
    for (const event of events) yield event;
  }
  const chunks = [];
  for await (const chunk of fibreTtyReporter(source(), options)) chunks.push(chunk);
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
  ], { isTTY: true });

  assert.match(chunks[0], /^\r\u001b\[2K✓ 1  first success$/u);
  assert.match(chunks[1], /^\r\u001b\[2K✓ 2  second success$/u);
  assert.match(chunks[2], /^\r\u001b\[2K✗ 3  important failure\n/u);
  assert.match(chunks[2], /Error: boom/u);
  assert.ok(chunks[2].endsWith("\n"));
  assert.match(chunks[3], /^\r\u001b\[2K✓ 4  recovery success$/u);
  assert.equal(chunks.at(-1), "\r\u001b[2K✗ 4 tests · 3 passed · 1 failed\n");
});

test("TTY reporter clips transient success to one terminal row without truncating failures", async () => {
  const name = "abcdefghijklmnopqrstuvwxyz";
  const chunks = await collect([
    { type: "test:pass", data: { name, details: { type: "test" } } },
    {
      type: "test:fail",
      data: {
        name,
        details: { type: "test", error: { stack: "Error: boom" } },
      },
    },
  ], { columns: 20, isTTY: true });

  assert.equal(chunks[0], "\r\u001b[2K✓ 1  abcdefghijklm…");
  assert.match(chunks[1], /^\r\u001b\[2K✗ 2  abcdefghijklmnopqrstuvwxyz\n/u);
});

test("non-TTY reporter hides passing names but keeps failures and final counts", async () => {
  const chunks = await collect([
    { type: "test:pass", data: { name: "quiet success", details: { type: "test" } } },
    {
      type: "test:fail",
      data: {
        name: "meaningful failure",
        details: { type: "test", error: { stack: "Error: useful detail" } },
      },
    },
  ], { isTTY: false });

  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /^✗ 2  meaningful failure\n/u);
  assert.match(chunks[0], /Error: useful detail/u);
  assert.equal(chunks[1], "✗ 2 tests · 1 passed · 1 failed\n");
});

test("test-suite command uses compact reporter for TTY or CI and respects explicit reporters", () => {
  const tty = testSuiteCommand(["active"], { isTTY: true, isCI: false });
  assert.ok(tty.command.some((arg) => arg.includes("--test-reporter=") && arg.includes("fibre-tty-reporter.mjs")));

  const ci = testSuiteCommand(["active"], { isTTY: false, isCI: true });
  assert.ok(ci.command.some((arg) => arg.includes("--test-reporter=") && arg.includes("fibre-tty-reporter.mjs")));

  const nonTty = testSuiteCommand(["active"], { isTTY: false, isCI: false });
  assert.equal(nonTty.command.some((arg) => arg.startsWith("--test-reporter=")), false);

  const explicit = testSuiteCommand(["active", "--test-reporter=dot"], { isTTY: false, isCI: true });
  assert.equal(explicit.command.filter((arg) => arg.startsWith("--test-reporter=")).length, 1);
  assert.ok(explicit.command.includes("--test-reporter=dot"));
});