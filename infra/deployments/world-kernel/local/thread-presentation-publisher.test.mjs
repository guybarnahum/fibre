import assert from "node:assert/strict";
import test from "node:test";

import { createThreadPresentationPublisher } from "./thread-presentation-publisher.mjs";

test("World Kernel deployment publisher crosses the private Thread Presentation HTTP boundary", async () => {
  const calls = [];
  const publisher = createThreadPresentationPublisher({
    baseUrl: "http://127.0.0.1:8788",
    privateToken: "private-token",
    async fetchImpl(url, options) {
      calls.push({ url: String(url), options });
      return Response.json({ ok: true, reused: false, presentationId: "presentation_gen_1" }, { status: 201 });
    },
  });

  const result = await publisher.publishGenesisPresentation({
    genesisId: "gen_1",
    publicationDigest: `sha256:${"a".repeat(64)}`,
    bundle: { presentation: "fixture" },
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:8788/internal/genesis/presentations");
  assert.equal(calls[0].options.headers["x-fibre-private-token"], "private-token");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    genesisId: "gen_1",
    publicationDigest: `sha256:${"a".repeat(64)}`,
    bundle: { presentation: "fixture" },
  });
});

test("deployment publisher turns a rejected private write into a retryable delivery error", async () => {
  const publisher = createThreadPresentationPublisher({
    baseUrl: "http://127.0.0.1:8788",
    privateToken: "private-token",
    async fetchImpl() {
      return Response.json({ error: "presentation_conflict" }, { status: 409 });
    },
  });

  await assert.rejects(
    () => publisher.publishGenesisPresentation({
      genesisId: "gen_1",
      publicationDigest: `sha256:${"a".repeat(64)}`,
      bundle: {},
    }),
    (error) => error.code === "THREAD_PRESENTATION_PUBLICATION_FAILED" && error.httpStatus === 409,
  );
});
