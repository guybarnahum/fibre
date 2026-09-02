import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PROGRESS_INTERVAL_MS = 5_000;
const MIN_PROGRESS_INTERVAL_MS = 100;
const MAX_PROGRESS_INTERVAL_MS = 60_000;
const CLEAR_LINE = "\r\u001b[2K";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function progressInterval(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_PROGRESS_INTERVAL_MS;
  const interval = Number(value);
  if (!Number.isSafeInteger(interval) || interval < MIN_PROGRESS_INTERVAL_MS || interval > MAX_PROGRESS_INTERVAL_MS) {
    throw new TypeError(
      `FIBRE_PROGRESS_INTERVAL_MS must be an integer from ${MIN_PROGRESS_INTERVAL_MS} through ${MAX_PROGRESS_INTERVAL_MS}`,
    );
  }
  return interval;
}

function elapsedLabel(milliseconds) {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

export async function runWithProgress({
  label,
  command,
  args = [],
  intervalMs = progressInterval(process.env.FIBRE_PROGRESS_INTERVAL_MS),
  spawnImpl = spawn,
  now = Date.now,
  interactive = process.stdout.isTTY === true,
  write = (text) => process.stdout.write(text),
  writeError = (text) => process.stderr.write(text),
} = {}) {
  const step = nonEmpty("progress label", label);
  const executable = nonEmpty("progress command", command);
  if (!Array.isArray(args)) throw new TypeError("progress command args must be an array");
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) {
    throw new TypeError("progress interval must be a positive integer");
  }
  if (typeof spawnImpl !== "function") throw new TypeError("spawnImpl must be a function");
  if (typeof now !== "function") throw new TypeError("now must be a function");
  if (typeof interactive !== "boolean") throw new TypeError("interactive must be a boolean");
  if (typeof write !== "function") throw new TypeError("write must be a function");
  if (typeof writeError !== "function") throw new TypeError("writeError must be a function");

  const startedAt = now();

  return await new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let transientVisible = false;
    let atLineBoundary = true;
    let currentStatus = `PROGRESS ${step} started`;

    const clearTransient = () => {
      if (!interactive || !transientVisible) return;
      write(CLEAR_LINE);
      transientVisible = false;
    };
    const renderTransient = () => {
      if (!interactive) {
        write(`${currentStatus}\n`);
        return;
      }
      if (!atLineBoundary) return;
      write(`${CLEAR_LINE}${currentStatus}`);
      transientVisible = true;
    };
    const forward = (target) => (chunk) => {
      clearTransient();
      const text = chunk.toString();
      target(text);
      atLineBoundary = /(?:\r?\n)$/u.test(text);
      if (!settled && atLineBoundary) renderTransient();
    };

    renderTransient();
    const child = spawnImpl(executable, args, {
      env: process.env,
      stdio: interactive ? ["inherit", "pipe", "pipe"] : "inherit",
    });
    if (interactive) {
      child.stdout?.on("data", forward(write));
      child.stderr?.on("data", forward(writeError));
    }

    const timer = setInterval(() => {
      currentStatus = `PROGRESS ${step} still working (${elapsedLabel(now() - startedAt)})`;
      renderTransient();
    }, intervalMs);
    timer.unref?.();

    const finish = (error, code = null, signal = null) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      clearTransient();
      if (interactive && !atLineBoundary) write("\n");
      const elapsed = elapsedLabel(now() - startedAt);
      if (error === null && code === 0) {
        write(`PROGRESS ${step} completed (${elapsed})\n`);
        resolvePromise();
        return;
      }
      write(`PROGRESS ${step} failed (${elapsed})\n`);
      rejectPromise(
        error ?? new Error(`${executable} ${args.join(" ")} failed with code=${String(code)} signal=${String(signal)}`),
      );
    };

    child.once("error", (error) => finish(error));
    child.once("close", (code, signal) => finish(null, code, signal));
  });
}

async function main(argv) {
  if (argv.length < 2) {
    throw new TypeError("usage: run-with-progress.mjs <label> <command> [args...]");
  }
  const [label, command, ...args] = argv;
  await runWithProgress({ label, command, args });
}

if (
  process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
