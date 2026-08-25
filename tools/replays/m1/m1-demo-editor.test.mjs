import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInteractiveM1Summary,
  launchInteractiveM1,
  parseInteractiveArguments,
} from "./m1-demo-editor.mjs";

const proofReport = {
  milestone: "M1 Persistent Thread Round Trip",
  threadId: "thr_mina_001",
  threadName: "Mina Park",
  databasePath: "/tmp/fibre-proof/world.sqlite",
  final: {
    version: 4,
    freezeCreatedMemoryCount: 2,
    activeRuntimeCount: 0,
  },
};

test("interactive M1 launches the retained world on free loopback ports", async () => {
  const calls = [];
  const tokens = ["private-token", "admin-token", "editor-token"];
  const interactive = await launchInteractiveM1(
    {},
    {
      runProof: async (options) => {
        assert.deepEqual(options, { keepDatabase: true });
        return proofReport;
      },
      tokenFactory: () => tokens.shift(),
      startKernel: async (environment) => {
        calls.push(["start-kernel", environment]);
        return {
          address: { host: "127.0.0.1", port: 48101 },
          close: async () => calls.push(["close-kernel"]),
        };
      },
      startEditor: async (environment) => {
        calls.push(["start-editor", environment]);
        return {
          address: { host: "127.0.0.1", port: 48102 },
          accessToken: environment.FIBRE_EDITOR_ACCESS_TOKEN,
          close: async () => calls.push(["close-editor"]),
        };
      },
    },
  );

  assert.equal(interactive.summary.databasePath, proofReport.databasePath);
  assert.equal(interactive.summary.worldKernelUrl, "http://127.0.0.1:48101");
  assert.equal(
    interactive.summary.editorUrl,
    "http://127.0.0.1:48102/#access_token=editor-token",
  );
  assert.deepEqual(calls[0][1], {
    FIBRE_WORLD_DATABASE: proofReport.databasePath,
    FIBRE_WORLD_HOST: "127.0.0.1",
    FIBRE_WORLD_PORT: "0",
    FIBRE_PRIVATE_TOKEN: "private-token",
    FIBRE_ADMIN_TOKEN: "admin-token",
  });
  assert.deepEqual(calls[1][1], {
    FIBRE_EDITOR_HOST: "127.0.0.1",
    FIBRE_EDITOR_PORT: "0",
    FIBRE_WORLD_URL: "http://127.0.0.1:48101",
    FIBRE_PRIVATE_TOKEN: "private-token",
    FIBRE_EDITOR_ACCESS_TOKEN: "editor-token",
  });

  const text = formatInteractiveM1Summary(interactive.summary);
  assert.match(text, /M1 proof passed/);
  assert.match(text, /npm run inspect:db/);
  assert.match(text, /npm run --silent inspect:db .* --json/);
  assert.match(text, /thr_mina_001/);

  await interactive.close();
  assert.deepEqual(calls.slice(-2), [["close-editor"], ["close-kernel"]]);
});

test("interactive M1 can delete its retained temporary world on close", async () => {
  const removed = [];
  const interactive = await launchInteractiveM1(
    { deleteDatabaseOnClose: true },
    {
      runProof: async () => proofReport,
      tokenFactory: () => "0123456789abcdef0123456789abcdef",
      startKernel: async () => ({
        address: { host: "127.0.0.1", port: 1 },
        close: async () => {},
      }),
      startEditor: async () => ({
        address: { host: "127.0.0.1", port: 2 },
        accessToken: "0123456789abcdef0123456789abcdef",
        close: async () => {},
      }),
      removeDirectory: (path) => removed.push(path),
    },
  );
  await interactive.close();
  assert.deepEqual(removed, ["/tmp/fibre-proof"]);
});

test("interactive M1 options are deliberately small", () => {
  assert.deepEqual(parseInteractiveArguments([]), {
    help: false,
    deleteDatabaseOnClose: false,
  });
  assert.deepEqual(parseInteractiveArguments(["--delete-on-exit"]), {
    help: false,
    deleteDatabaseOnClose: true,
  });
  assert.throws(() => parseInteractiveArguments(["--port=4173"]), /unknown option/);
});
