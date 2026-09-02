import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { runWithProgress } from "./run-with-progress.mjs";

function fakeChild({ streams = false } = {}) {
  const child = new EventEmitter();
  if (streams) {
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
  }
  return child;
}

test("cloud operator progress emits line-oriented start, heartbeat, and completion outside a TTY", async () => {
  const child = fakeChild();
  const output = [];
  let spawnCall = null;
  const started = runWithProgress({
    label: "cloud:provision",
    command: "node",
    args: ["worker.mjs", "--env", "staging"],
    intervalMs: 10,
    interactive: false,
    spawnImpl(command, args, options) {
      spawnCall = { command, args, options };
      return child;
    },
    write: (line) => output.push(line),
  });
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
  child.emit("close", 0, null);
  await started;

  assert.equal(spawnCall.command, "node");
  assert.deepEqual(spawnCall.args, ["worker.mjs", "--env", "staging"]);
  assert.equal(spawnCall.options.stdio, "inherit");
  assert.match(output[0], /^PROGRESS cloud:provision started\n$/u);
  assert.equal(output.some((line) => /still working/u.test(line)), true);
  assert.match(output.at(-1), /^PROGRESS cloud:provision completed/u);
});

test("interactive cloud operator progress reuses one transient terminal line and preserves child output", async () => {
  const child = fakeChild({ streams: true });
  const stdout = [];
  const stderr = [];
  let spawnCall = null;
  const started = runWithProgress({
    label: "cloud:configure-secrets",
    command: "node",
    args: ["configure.mjs"],
    intervalMs: 1_000,
    interactive: true,
    spawnImpl(command, args, options) {
      spawnCall = { command, args, options };
      return child;
    },
    write: (text) => stdout.push(text),
    writeError: (text) => stderr.push(text),
  });

  assert.deepEqual(spawnCall.options.stdio, ["inherit", "pipe", "pipe"]);
  assert.equal(stdout[0], "\r\u001b[2KPROGRESS cloud:configure-secrets started");
  assert.equal(stdout[0].includes("\n"), false);

  child.stdout.emit("data", Buffer.from("BOOTSTRAP asset-generator\n"));
  child.stderr.emit("data", Buffer.from("wrangler note\n"));
  child.emit("close", 0, null);
  await started;

  assert.equal(stdout.includes("BOOTSTRAP asset-generator\n"), true);
  assert.equal(stderr.includes("wrangler note\n"), true);
  assert.equal(stdout.some((text) => text === "\r\u001b[2K"), true);
  assert.match(stdout.at(-1), /^PROGRESS cloud:configure-secrets completed/u);
  assert.equal(stdout.at(-1).endsWith("\n"), true);
});

test("cloud operator progress reports child failure and rejects", async () => {
  const child = fakeChild();
  const output = [];
  const started = runWithProgress({
    label: "cloud:deploy",
    command: "node",
    args: ["deploy.mjs"],
    intervalMs: 1_000,
    interactive: false,
    spawnImpl: () => child,
    write: (line) => output.push(line),
  });
  child.emit("close", 7, null);
  await assert.rejects(started, /failed with code=7/u);
  assert.match(output.at(-1), /^PROGRESS cloud:deploy failed/u);
});
