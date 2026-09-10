import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageUrl = new URL("../../../../package.json", import.meta.url);
const visualServerUrl = new URL("./visual-server.mjs", import.meta.url);

async function text(url) { return readFile(url, "utf8"); }

function assertSourceMatches(source, pattern, label) {
  assert.equal(pattern.test(source), true, `${label}: missing pattern ${pattern}`);
}

function assertSourceDoesNotMatch(source, pattern, label) {
  assert.equal(pattern.test(source), false, `${label}: forbidden pattern ${pattern}`);
}

test("canonical world-kernel command launches visual runtime through remote service boundaries", async () => {
  const pkg = JSON.parse(await text(packageUrl));
  const visualServer = await text(visualServerUrl);
  const label = "world-kernel local visual server";

  assert.match(pkg.scripts["world-kernel"], /world-kernel\/local\/visual-server\.mjs/);
  assertSourceMatches(visualServer, /createCanonicalVisualRootHttpBoundary/, label);
  assertSourceMatches(visualServer, /createThreadPresentationVisualHttpBoundary/, label);
  assertSourceMatches(visualServer, /FIBRE_ASSET_GENERATOR_URL/, label);
  assertSourceMatches(visualServer, /FIBRE_THREAD_PRESENTATION_URL/, label);
  assertSourceMatches(visualServer, /FIBRE_PRIVATE_TOKEN/, label);
  assertSourceMatches(visualServer, /visualPublicationEnabled: true/, label);
  assertSourceDoesNotMatch(visualServer, /createCloudflareInfraDriver|ASSET_OBJECTS|ASSET_GENERATION\b/, label);
});
