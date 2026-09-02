import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { runWithProgress } from "./run-with-progress.mjs";

function fakeChild() {
  return new EventEmitter();
}

test("cloud operator progress emits start, heartbeat, and completion without changing child stdio", async () => {
  const child = fakeChild();
  const output = [];
  let spawnCall = null;
  const started = runWithProgress({
    label: "cloud:provision",
    command: "node",
    args: ["worker.mjs", "--env", "staging"],
    intervalMs: 10,
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
  assert.match(output[0], /^PROGRESS cloud:provision started/u);
  assert.equal(output.some((line) => /still working/u.test(line)), true);
  assert.match(output.at(-1), /^PROGRESS cloud:provision completed/u);
});

test("cloud operator progress reports child failure and rejects", async () => {
  const child = fakeChild();
  const output = [];
  const started = runWithProgress({
    label: "cloud:deploy",
    command: "node",
    args: ["deploy.mjs"],
    intervalMs: 1_000,
    spawnImpl: () => child,
    write: (line) => output.push(line),
  });
  child.emit("close", 7, null);
  await assert.rejects(started, /failed with code=7/u);
  assert.match(output.at(-1), /^PROGRESS cloud:deploy failed/u);
});
