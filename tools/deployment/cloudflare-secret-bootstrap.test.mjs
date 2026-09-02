import assert from "node:assert/strict";
import test from "node:test";

import { WranglerCommandError } from "./cloudflare-operator.mjs";
import { createWranglerSecretWriter } from "./configure-cloudflare-secrets.mjs";

const WORKER = "fibre-asset-generator-staging";
const VALUES = Object.freeze({
  OPENAI_API_KEY: "secret-openai",
  BFL_API_KEY: "secret-bfl",
  FIBRE_PRIVATE_TOKEN: "secret-private",
});

test("secret writer keeps existing Workers on the non-deploying version-secret path", async () => {
  const calls = [];
  const bootstraps = [];
  const writer = createWranglerSecretWriter({
    cwd: "/repo",
    runner: async (args, options) => {
      calls.push({ args, options });
      return { stdout: "", stderr: "", exitCode: 0 };
    },
    onBootstrap: (event) => bootstraps.push(event),
  });

  await writer({ serviceId: "asset-generator", workerName: WORKER, values: VALUES });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, [
    "versions", "secret", "bulk", "--name", WORKER,
    "--message", "Fibre operator secret configuration",
  ]);
  assert.equal(calls[0].options.input, JSON.stringify(VALUES));
  assert.deepEqual(bootstraps, []);
  assert.equal(calls[0].args.join(" ").includes("secret-openai"), false);
});

test("secret writer bootstraps a draft Worker only when version-secret upload reports Worker not found", async () => {
  const calls = [];
  const bootstraps = [];
  const writer = createWranglerSecretWriter({
    cwd: "/repo",
    runner: async (args, options) => {
      calls.push({ args, options });
      if (args[0] === "versions") {
        throw new WranglerCommandError(args, {
          exitCode: 1,
          stderr: "This Worker does not exist on your account. [code: 10007]",
        });
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    },
    onBootstrap: (event) => bootstraps.push(event),
  });

  await writer({ serviceId: "asset-generator", workerName: WORKER, values: VALUES });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, ["secret", "bulk", "--name", WORKER]);
  assert.equal(calls[1].options.input, JSON.stringify(VALUES));
  assert.deepEqual(bootstraps, [{ serviceId: "asset-generator", workerName: WORKER }]);
  assert.equal(calls.flatMap((call) => call.args).some((arg) => Object.values(VALUES).includes(arg)), false);
});

test("secret writer does not hide authorization or other non-not-found failures", async () => {
  const denied = new WranglerCommandError(["versions", "secret", "bulk"], {
    exitCode: 1,
    stderr: "Authentication error [code: 10000]",
  });
  const writer = createWranglerSecretWriter({
    runner: async () => { throw denied; },
  });
  await assert.rejects(
    writer({ serviceId: "world-kernel", workerName: "fibre-world-kernel-staging", values: { FIBRE_PRIVATE_TOKEN: "secret" } }),
    (error) => error === denied,
  );
});
