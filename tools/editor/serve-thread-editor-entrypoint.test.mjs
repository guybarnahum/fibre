import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { repoFile } from "#repo-root";

const relocatedEditorPath = fileURLToPath(repoFile("tools/editor/serve-thread-editor.mjs"));

async function waitForEvent(child, expectedEvent, stderr, timeoutMs = 10_000) {
  return await new Promise((resolvePromise, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => finish(new Error(`Timed out waiting for ${expectedEvent}: ${stderr()}`)), timeoutMs);
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      while (buffer.includes("\n")) {
        const index = buffer.indexOf("\n");
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        try {
          const value = JSON.parse(line);
          if (value.event === expectedEvent) return finish(null, value);
        } catch {}
      }
    };
    const onExit = (code, signal) => finish(new Error(`Process exited before ${expectedEvent}: code=${code} signal=${signal} ${stderr()}`));
    const finish = (error, value) => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      if (error) reject(error);
      else resolvePromise(value);
    };
    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function stopProcess(child, stderr) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Thread editor did not stop: ${stderr()}`)), 10_000);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 || signal === "SIGTERM") resolvePromise();
      else reject(new Error(`Thread editor exited ${code}/${signal}: ${stderr()}`));
    });
  });
  child.kill("SIGTERM");
  await exited;
}

test("modern Thread Editor entrypoint starts with server-side Fibre private access", async () => {
  let stderrText = "";
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", relocatedEditorPath], {
    env: {
      ...process.env,
      FIBRE_EDITOR_HOST: "127.0.0.1",
      FIBRE_EDITOR_PORT: "0",
      FIBRE_WORLD_URL: "http://127.0.0.1:1",
      FIBRE_PRIVATE_TOKEN: "entrypoint-private-token-123456",
      FIBRE_EDITOR_ACCESS_TOKEN: "entrypoint-regression-test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => { stderrText += chunk.toString("utf8"); });

  try {
    const ready = await waitForEvent(child, "thread-editor-listening", () => stderrText);
    assert.equal(ready.event, "thread-editor-listening");
    assert.equal(ready.host, "127.0.0.1");
    assert.equal(ready.mode, "modern-thread-inspection");
    assert.equal(ready.worldInspection, true);
    assert.ok(Number.isSafeInteger(ready.port) && ready.port > 0);
    assert.equal(JSON.stringify(ready).includes("entrypoint-private-token"), false);
  } finally {
    await stopProcess(child, () => stderrText);
  }
});
