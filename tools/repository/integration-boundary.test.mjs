import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";

const repoRoot = new URL("../../", import.meta.url);
const servicesRoot = new URL("services/", repoRoot);
const infraProvidersRoot = new URL("infra/providers/", repoRoot);
const integrationsRoot = new URL("integrations/", repoRoot);
const integrationSelectionUrl = new URL("infra/deployments/integration-selection.mjs", repoRoot);
const localDeploymentUrl = new URL("infra/deployments/environments/local.yaml", repoRoot);
const cloudflareDeploymentUrl = new URL("infra/deployments/environments/cloudflare.yaml", repoRoot);

const integrationImplementations = Object.freeze([
  new URL("ai/reasoning/openai.mjs", integrationsRoot),
  new URL("ai/reasoning/google.mjs", integrationsRoot),
  new URL("ai/image/openai.mjs", integrationsRoot),
  new URL("ai/image/bfl.mjs", integrationsRoot),
  new URL("content-credentials/c2pa-http-signer.mjs", integrationsRoot),
  new URL("content-credentials/c2pa-node/signer.mjs", integrationsRoot),
]);

const retiredSelectionPaths = Object.freeze([
  new URL("config/models.yaml", repoRoot),
  new URL("services/world-kernel/src/model-runtime/model-runtime.mjs", repoRoot),
  new URL("services/world-kernel/src/server.mjs", repoRoot),
  new URL("services/birth-center/src/server.mjs", repoRoot),
  new URL("services/c2pa-local/server.mjs", repoRoot),
  new URL("infra/deployments/asset-generator/image-provider-selection.mjs", repoRoot),
]);

const serviceConcreteSelectionPattern = new RegExp([
  "#infra/providers/",
  "#integrations/ai/reasoning/(?:openai|google)\\.mjs",
  "#integrations/ai/image/",
  "#integrations/content-credentials/",
  "@contentauth/c2pa-node",
  "createOpenAIModelAdapter",
  "createGoogleModelAdapter",
  "createOpenAIImageProvider",
  "createBflFluxImageProvider",
  "createHttpContentCredentialSigner",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "BFL_API_KEY",
  "C2PA_SIGNER_URL",
  "api\\.openai\\.com",
  "generativelanguage\\.googleapis\\.com",
  "api\\.bfl\\.ai",
].join("|"), "u");

async function text(url) {
  return readFile(url, "utf8");
}

function assertSourceMatches(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

function assertSourceOmits(source, pattern, message) {
  assert.ok(!pattern.test(source), message);
}

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) {
      if (entry.name === "test" || entry.name === "node_modules") continue;
      result.push(...await sourceFiles(url));
    } else if (/\.(?:mjs|js|ts)$/.test(entry.name)) {
      result.push(url);
    }
  }
  return result;
}

test("services declare ports but never select concrete infrastructure or integrations", async () => {
  for (const url of await sourceFiles(servicesRoot)) {
    const source = await text(url);
    assertSourceOmits(
      source,
      serviceConcreteSelectionPattern,
      `service source selected a concrete provider/integration: ${url.pathname}`,
    );
  }
});

test("deployment composition is the one place that maps stable selections to concrete factories", async () => {
  const source = await text(integrationSelectionUrl);
  assertSourceMatches(source, /#integrations\/ai\/reasoning\/openai\.mjs/, "deployment selector must map OpenAI reasoning");
  assertSourceMatches(source, /#integrations\/ai\/reasoning\/google\.mjs/, "deployment selector must map Google reasoning");
  assertSourceMatches(source, /#integrations\/ai\/image\/openai\.mjs/, "deployment selector must map OpenAI images");
  assertSourceMatches(source, /#integrations\/ai\/image\/bfl\.mjs/, "deployment selector must map BFL images");
  assertSourceMatches(source, /#integrations\/content-credentials\/c2pa-http-signer\.mjs/, "deployment selector must map C2PA HTTP signing");

  const [local, cloudflare] = await Promise.all([text(localDeploymentUrl), text(cloudflareDeploymentUrl)]);
  assertSourceMatches(local, /provider: openai/, "local deployment must select integrations explicitly");
  assertSourceMatches(local, /dignityGuardian: guardian-openai/, "World Kernel reasoning must be selected by deployment");
  assertSourceMatches(cloudflare, /provider: bfl/, "Cloudflare deployment must name image integration choices");
  assertSourceOmits(local, /(?:sk-|Bearer\s+[A-Za-z0-9])/, "deployment YAML must not contain secret values");
  assertSourceOmits(cloudflare, /(?:sk-|Bearer\s+[A-Za-z0-9])/, "deployment YAML must not contain secret values");
});

test("third-party integration implementations remain infrastructure- and topology-agnostic", async () => {
  for (const url of integrationImplementations) {
    const source = await text(url);
    assertSourceOmits(
      source,
      /infra\/deployments\/|#infra\/providers\/|createCloudflareInfraDriver|WorkflowEntrypoint/,
      `integration selected infrastructure/deployment behavior: ${url.pathname}`,
    );
    assertSourceOmits(
      source,
      /#services\/(?!world-kernel\/src\/guardian-model-adapter\.mjs)/,
      `integration imported service topology beyond its narrow contract bridge: ${url.pathname}`,
    );
  }
});

test("infrastructure providers remain service- and integration-unaware", async () => {
  for (const url of await sourceFiles(infraProvidersRoot)) {
    const source = await text(url);
    assertSourceOmits(source, /#services\/|\/services\//, `infra provider imported service topology: ${url.pathname}`);
    assertSourceOmits(source, /#integrations\/|\/integrations\//, `infra provider imported integration topology: ${url.pathname}`);
  }
});

test("content credential signer service owns HTTP semantics but not the C2PA SDK", async () => {
  const source = await text(new URL("services/content-credential-signer/src/index.mjs", repoRoot));
  assertSourceMatches(source, /path: "\/embed"/, "signer service must expose /embed");
  assertSourceMatches(source, /path: "\/verify"/, "signer service must expose /verify");
  assertSourceOmits(source, /@contentauth\/c2pa-node|LocalSigner|Reader|Builder/, "signer service must not own C2PA implementation");

  const native = await text(new URL("integrations/content-credentials/c2pa-node/signer.mjs", repoRoot));
  assertSourceMatches(native, /@contentauth\/c2pa-node/, "native integration must own the C2PA SDK");
  assertSourceOmits(native, /#infra\/|#services\//, "native integration must not host Fibre services");
});

test("retired service-local selection and host paths stay removed", async () => {
  for (const url of retiredSelectionPaths) {
    await assert.rejects(
      () => stat(url),
      (error) => error?.code === "ENOENT",
      `retired architecture path must stay removed: ${url.pathname}`,
    );
  }
});
