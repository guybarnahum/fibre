import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageUrl = new URL("../../../../package.json", import.meta.url);
const visualServerUrl = new URL("./visual-server.mjs", import.meta.url);

async function text(url) { return readFile(url, "utf8"); }

test("canonical world-kernel command launches visual runtime through remote service boundaries", async () => {
  const pkg = JSON.parse(await text(packageUrl));
  const visualServer = await text(visualServerUrl);

  assert.match(pkg.scripts["world-kernel"], /world-kernel\/local\/visual-server\.mjs/);
  assert.match(visualServer, /createCanonicalVisualRootHttpBoundary/);
  assert.match(visualServer, /createThreadPresentationVisualHttpBoundary/);
  assert.match(visualServer, /FIBRE_ASSET_GENERATOR_URL/);
  assert.match(visualServer, /FIBRE_THREAD_PRESENTATION_URL/);
  assert.match(visualServer, /FIBRE_PRIVATE_TOKEN/);
  assert.match(visualServer, /visualPublicationEnabled: true/);
  assert.doesNotMatch(visualServer, /createCloudflareInfraDriver|ASSET_OBJECTS|ASSET_GENERATION\b/);
});
