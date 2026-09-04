import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareDurableObjectServiceRouter } from "../cloudflare-do-service-router.mjs";

function router() {
  return createCloudflareDurableObjectServiceRouter({
    service: "fixture-service",
    bindingName: "FIXTURE_STATE",
    stateScopeId: "fixture",
  });
}

test("healthz is answered without resolving or invoking Durable Object binding", async () => {
  let getByNameCalls = 0;
  const response = await router().fetch(new Request("https://fixture.example/healthz"), {
    FIXTURE_STATE: {
      getByName() {
        getByNameCalls += 1;
        throw new Error("health must not resolve Durable Object");
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(getByNameCalls, 0);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "fixture-service",
    provider: "cloudflare",
    stateScopeId: "fixture",
    stateChecked: false,
  });
});

test("healthz remains available even when Durable Object binding is absent", async () => {
  const response = await router().fetch(new Request("https://fixture.example/healthz"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).stateChecked, false);
});

test("non-health requests resolve exactly one named Durable Object and forward", async () => {
  const calls = [];
  const request = new Request("https://fixture.example/internal/health/state");
  const response = await router().fetch(request, {
    FIXTURE_STATE: {
      getByName(name) {
        calls.push(["getByName", name]);
        return {
          async fetch(forwarded) {
            calls.push(["fetch", new URL(forwarded.url).pathname]);
            return new Response("deep-ok");
          },
        };
      },
    },
  });
  assert.equal(await response.text(), "deep-ok");
  assert.deepEqual(calls, [
    ["getByName", "fixture"],
    ["fetch", "/internal/health/state"],
  ]);
});

test("deep state health converts Durable Object call failures into bounded diagnostics", async () => {
  const response = await router().fetch(new Request("https://fixture.example/internal/health/state"), {
    FIXTURE_STATE: {
      getByName() {
        return {
          async fetch() {
            const error = new Error("fixture Durable Object failed during activation");
            error.retryable = true;
            throw error;
          },
        };
      },
    },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    service: "fixture-service",
    provider: "cloudflare",
    stateScopeId: "fixture",
    stateChecked: false,
    error: {
      code: "DURABLE_OBJECT_STATE_HEALTH_FAILED",
      name: "Error",
      detail: "fixture Durable Object failed during activation",
      retryable: true,
      overloaded: false,
    },
  });
});

test("ordinary non-health Durable Object failures still propagate", async () => {
  await assert.rejects(
    () => router().fetch(new Request("https://fixture.example/internal/value"), {
      FIXTURE_STATE: {
        getByName() {
          return { async fetch() { throw new Error("ordinary failure"); } };
        },
      },
    }),
    /ordinary failure/,
  );
});

test("non-health requests fail closed when Durable Object binding is absent", async () => {
  await assert.rejects(
    () => router().fetch(new Request("https://fixture.example/internal/value"), {}),
    /FIXTURE_STATE Durable Object binding/,
  );
});
