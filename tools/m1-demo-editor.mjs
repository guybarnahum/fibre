import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runM1ReviewedProof } from "./m1-reviewed-proof.mjs";
import {
  startWorldKernelFromEnvironment,
} from "../services/world-kernel/src/server.mjs";
import {
  startThreadEditorFromEnvironment,
} from "./serve-thread-editor.mjs";

function localToken() {
  return randomBytes(32).toString("hex");
}

export function buildInteractiveM1Summary({ report, worldKernel, editor }) {
  const accessUrl = `http://${editor.address.host}:${editor.address.port}/#access_token=${encodeURIComponent(editor.accessToken)}`;
  return {
    milestone: report.milestone,
    threadId: report.threadId,
    threadName: report.threadName,
    databasePath: report.databasePath,
    worldKernelUrl: `http://${worldKernel.address.host}:${worldKernel.address.port}`,
    editorUrl: accessUrl,
    final: report.final,
  };
}

export async function launchInteractiveM1(
  { deleteDatabaseOnClose = false } = {},
  dependencies = {},
) {
  const runProof = dependencies.runProof ?? runM1ReviewedProof;
  const startKernel = dependencies.startKernel ?? startWorldKernelFromEnvironment;
  const startEditor = dependencies.startEditor ?? startThreadEditorFromEnvironment;
  const tokenFactory = dependencies.tokenFactory ?? localToken;
  const removeDirectory = dependencies.removeDirectory
    ?? ((path) => rmSync(path, { recursive: true, force: true }));

  const report = await runProof({ keepDatabase: true });
  if (report.databasePath === null) {
    throw new Error("interactive M1 requires a retained database path");
  }

  const privateToken = tokenFactory();
  const adminToken = tokenFactory();
  const editorAccessToken = tokenFactory();
  let worldKernel = null;
  let editor = null;
  let closed = false;

  try {
    worldKernel = await startKernel({
      FIBRE_WORLD_DATABASE: report.databasePath,
      FIBRE_WORLD_HOST: "127.0.0.1",
      FIBRE_WORLD_PORT: "0",
      FIBRE_PRIVATE_TOKEN: privateToken,
      FIBRE_ADMIN_TOKEN: adminToken,
    });
    const worldKernelUrl = `http://${worldKernel.address.host}:${worldKernel.address.port}`;
    editor = await startEditor({
      FIBRE_EDITOR_HOST: "127.0.0.1",
      FIBRE_EDITOR_PORT: "0",
      FIBRE_WORLD_URL: worldKernelUrl,
      FIBRE_PRIVATE_TOKEN: privateToken,
      FIBRE_EDITOR_ACCESS_TOKEN: editorAccessToken,
    });

    const summary = buildInteractiveM1Summary({ report, worldKernel, editor });
    return {
      report,
      summary,
      async close() {
        if (closed) return;
        closed = true;
        try {
          await editor.close();
        } finally {
          await worldKernel.close();
          if (deleteDatabaseOnClose) removeDirectory(dirname(report.databasePath));
        }
      },
    };
  } catch (error) {
    try {
      await editor?.close();
    } finally {
      await worldKernel?.close();
      if (deleteDatabaseOnClose) removeDirectory(dirname(report.databasePath));
    }
    throw error;
  }
}

export function formatInteractiveM1Summary(summary, { deleteDatabaseOnClose = false } = {}) {
  return [
    "M1 proof passed. The completed Mina world is now live in the Thread Editor.",
    "",
    "Open this exact URL:",
    summary.editorUrl,
    "",
    `Thread ID: ${summary.threadId}`,
    `Database: ${summary.databasePath}`,
    `World Kernel: ${summary.worldKernelUrl}`,
    `Final state: version ${summary.final.version}, memories ${summary.final.freezeCreatedMemoryCount}, active runtimes ${summary.final.activeRuntimeCount}`,
    "",
    `In the editor, load ${summary.threadId} and explore:`,
    "  Overview → current projection and state hash",
    "  Events → the four-event public life history",
    "  Requests → stale recovery, accepted, refused, and obligation-mediated attempts",
    "  Runtime → Guardian pass/reject, abandonment, timeout, reclaim, and freeze",
    "  Integrity / Raw → replay, memory, authorization, and database-backed witnesses",
    "",
    `Raw database summary: npm run inspect:db -- "${summary.databasePath}"`,
    `JSON summary: npm run inspect:db -- "${summary.databasePath}" --json`,
    "",
    "Press Ctrl-C when finished.",
    deleteDatabaseOnClose
      ? "The retained database will be deleted on exit."
      : "The retained database will remain available after exit.",
    "",
  ].join("\n");
}

export function parseInteractiveArguments(arguments_) {
  let deleteDatabaseOnClose = false;
  for (const argument of arguments_) {
    if (argument === "--delete-on-exit") {
      deleteDatabaseOnClose = true;
    } else if (argument === "--help" || argument === "-h") {
      return { help: true, deleteDatabaseOnClose };
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }
  return { help: false, deleteDatabaseOnClose };
}

function usage() {
  return [
    "Usage: npm run demo:m1:editor -- [--delete-on-exit]",
    "",
    "Runs the reviewed M1 proof, retains the resulting SQLite world, then starts",
    "the normal loopback World Kernel and credentialed Thread Editor on free ports.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseInteractiveArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const interactive = await launchInteractiveM1({
    deleteDatabaseOnClose: options.deleteDatabaseOnClose,
  });
  process.stdout.write(
    formatInteractiveM1Summary(interactive.summary, {
      deleteDatabaseOnClose: options.deleteDatabaseOnClose,
    }),
  );

  const signal = await new Promise((resolveSignal) => {
    process.once("SIGINT", () => resolveSignal("SIGINT"));
    process.once("SIGTERM", () => resolveSignal("SIGTERM"));
  });
  await interactive.close();
  process.stdout.write(`Interactive M1 stopped (${signal}).\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
