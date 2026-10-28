import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  CLOUDFLARE_DEPLOY_ORDER,
  createWranglerDeploymentClient,
  deployCloudflareStack,
  healthBaseUrlForDeployment,
  installWorldSchemaWithRetry,
  missingRequiredSecretNames,
  retryStateHealth,
} from "./deploy-cloudflare.mjs";
import { CLOUDFLARE_SERVICE_CONFIGS, parseJsonc } from "./cloudflare-operator.mjs";
import { progressDetailFromLine } from "./run-with-progress.mjs";

const sourceRoot = resolve(new URL("../..", import.meta.url).pathname);

async function fixtureRepo() {
  const root = await mkdtemp(resolve(tmpdir(), "fibre-cloud-deploy-"));
  const wranglerConfigs = {};
  for (const [serviceId, path] of Object.entries(CLOUDFLARE_SERVICE_CONFIGS)) {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    const source = await readFile(resolve(sourceRoot, path), "utf8");
    await writeFile(target, source);

    const resolved = parseJsonc(source, path);
    resolved.name = `${resolved.name}-staging`;
    resolved.vars ??= {};
    resolved.vars.FIBRE_DEPLOYMENT_GIT_SHA="b".repeat(40);
    for (const binding of resolved.services ?? []) binding.service = `${binding.service}-staging`;
    if (serviceId === "thread-presentation") {
      resolved.vars.VIEWER_ORIGIN = "https://staging.insidefibre.com";
      resolved.routes[0].pattern = "api.staging.insidefibre.com";
    }
    const resolvedPath = `.fibre/cloudflare/staging/wrangler/${serviceId}.jsonc`;
    const resolvedTarget = resolve(root, resolvedPath);
    await mkdir(dirname(resolvedTarget), { recursive: true });
    await writeFile(resolvedTarget, `${JSON.stringify(resolved, null, 2)}\n`);
    wranglerConfigs[serviceId] = resolvedPath;
  }
  return {
    root,
    state: {
      environment: "staging",
      resources: {
        deployManaged: {
          workers: Object.fromEntries(CLOUDFLARE_DEPLOY_ORDER.map((serviceId) => [
            serviceId,
            `fibre-${serviceId}-staging`,
          ])),
        },
      },
      wranglerConfigs,
    },
  };
}

function allSecrets() {
  return new Set([
    "OPENAI_API_KEY",
    "FIBRE_PRIVATE_TOKEN",
    "FIA_ISSUER_JWK",
    "FIA_CREDENTIAL_KEY_BASE64",
  ]);
}

test("state health keeps non-revision diagnostics readable while retrying",async()=>{
  let checks=0;
  const logs=[];
  const reason="health endpoint failed with HTTP 503: "+ "World loading ".repeat(7);
  const state=await retryStateHealth({
    serviceId:"world-kernel",
    baseUrl:"https://world.example",
    expectedSha:"b".repeat(40),
    wait:async()=>{},
    log:line=>logs.push(line),
    client:{
      async checkStateHealth({expectedSha}){
        checks++;
        if(checks<3)throw new Error(reason);
        return {ok:true,stateChecked:true,deploymentGitSha:expectedSha};
      },
    },
  });
  assert.equal(checks,3,"deployment skipped Durable Object revision convergence");
  assert.equal(state.deploymentGitSha,"b".repeat(40));
  assert.equal(logs.length,2,"state retry diagnostics missing");
  for(const line of logs){
    const progress=progressDetailFromLine(line);
    assert.match(progress,/^world-kernel not healthy: /u,"state failure reason missing");
    const shortened=progress.slice("world-kernel not healthy: ".length).split(" (attempt ")[0];
    assert.ok(shortened.length<=60&&shortened.endsWith("…"),"state failure was not shortened");
    assert.ok(!progress.includes("STATE REVISION PENDING"),"progress duplicated its heading");
  }
});

test("state revision progress shows short SHAs; final failure preserves full revisions",async()=>{
  const serving="a".repeat(40),expected="b".repeat(40);
  for(const serviceId of ["world-kernel","fibre-identity-authority","birth-center"]){
    const log=[];
    const client=createWranglerDeploymentClient({
      fetchImpl:async()=>Response.json({
        ok:true,service:serviceId,stateChecked:true,deploymentGitSha:serving,
      }),
    });
    await assert.rejects(retryStateHealth({
      client,serviceId,baseUrl:"https://state.example",expectedSha:expected,
      attempts:2,wait:async()=>{},log:line=>log.push(line),
    }),error=>{
      assert.ok(error.message.includes(serving)&&error.message.includes(expected),
        "final revision diagnostic lost full SHAs");
      assert.equal(error.cause?.servingGitSha,serving);
      assert.equal(error.cause?.expectedGitSha,expected);
      return true;
    });
    assert.equal(log.length,2,"state revision retries missing");
    for(const line of log){
      const progress=progressDetailFromLine(line);
      assert.ok(progress.startsWith(`${serviceId} serving aaaaaaa · waiting for bbbbbbb (attempt `),
        "state revision progress lost short SHAs");
      assert.ok(!progress.includes(serving)&&!progress.includes(expected),
        "state revision progress leaked full SHAs");
    }
  }
});

test("cloud deployment accepts the Fibre service stack after shallow and durable state health", async () => {
  const { root, state } = await fixtureRepo();
  const calls = [];
  let birthStateAttempts = 0;
  const client = {
    async assertAuthenticated() { calls.push("auth"); return { ok:true }; },
    async listSecretNames(workerName) { calls.push(`secrets:${workerName}`); return allSecrets(); },
    async deployService({ serviceId }) {
      calls.push(`deploy:${serviceId}`);
      return { output:`Published\nhttps://${serviceId}.account.workers.dev` };
    },
    async checkServiceHealth({ serviceId, baseUrl }) {
      calls.push(`health:${serviceId}:${baseUrl}`);
      return { ok:true, service:serviceId, stateChecked:false, deploymentGitSha:"b".repeat(40) };
    },
    async migrateBirthCenter({ baseUrl }) {
      calls.push(`migrate:birth-center:${baseUrl}`);
      return { fromVersion:0, toVersion:2, applied:[1,2] };
    },
    async migrateWorldOrFid({serviceId,baseUrl}){
      calls.push(`migrate:${serviceId}:${baseUrl}`);
      return {ok:true};
    },
    async checkStateHealth({ serviceId, baseUrl }) {
      calls.push(`state-health:${serviceId}:${baseUrl}`);
      if (serviceId === "birth-center" && birthStateAttempts++ === 0) {
        throw new Error("Durable Object still initializing");
      }
      return { ok:true, service:serviceId, stateChecked:true, deploymentGitSha:"b".repeat(40) };
    },
    async checkBirthCenterRuntime({ baseUrl }) {
      calls.push(`runtime-health:birth-center:${baseUrl}`);
      return { ok:true, route:"development-inspection", status:404 };
    },
    async checkPresentationAcceptance({ baseUrl }) { calls.push(`accept:${baseUrl}`); return { threads:[] }; },
    async checkViewer({ origin }) { calls.push(`viewer:${origin}`); return { ok:true }; },
  };

  const result = await deployCloudflareStack({
    repoRoot:root,
    environment:"staging",
    client,
    validateRepository:async () => calls.push("validate"),
    provision:async () => { calls.push("provision"); return state; },
    wait:async () => {},
    log:()=>{},
  });

  assert.deepEqual(CLOUDFLARE_DEPLOY_ORDER, [
    "asset-generator",
    "thread-presentation",
    "world-kernel",
    "fibre-identity-authority",
    "birth-center",
  ]);
  assert.deepEqual(result.deployments.map((item) => item.serviceId), CLOUDFLARE_DEPLOY_ORDER);
  assert.equal(
    result.deployments.find((item) => item.serviceId === "thread-presentation").baseUrl,
    "https://api.staging.insidefibre.com",
  );
  assert.equal(result.externalViewerOrigin, "https://staging.insidefibre.com");
  assert.deepEqual(calls.slice(0, 3), ["validate", "auth", "provision"]);
  assert.deepEqual(calls.filter((call) => call.startsWith("deploy:")), [
    "deploy:asset-generator",
    "deploy:thread-presentation",
    "deploy:world-kernel",
    "deploy:fibre-identity-authority",
    "deploy:birth-center",
  ]);
  assert.equal(result.deployments.find((item) => item.serviceId === "world-kernel").stateHealth.stateChecked, true);
  assert.equal(calls.filter(call=>call.startsWith("migrate:world-kernel:")).length,1,
    "World schema was not installed during full deployment");
  assert.equal(calls.filter(call=>call.startsWith("migrate:fibre-identity-authority:")).length,1,
    "FID schema was not installed during full deployment");
  assert.equal(result.deployments.find((item) => item.serviceId === "fibre-identity-authority").stateHealth.stateChecked, true);
  const birthDeployment = result.deployments.find((item) => item.serviceId === "birth-center");
  assert.equal(birthDeployment.migration.toVersion, 2);
  assert.equal(birthDeployment.stateHealth.stateChecked, true);
  assert.equal(birthDeployment.runtimeAcceptance.status, 404);
  assert.equal(result.deployments.find((item) => item.serviceId === "asset-generator").stateHealth, null);
  assert.ok(
    calls.indexOf("state-health:birth-center:https://birth-center.account.workers.dev")
      < calls.indexOf("migrate:birth-center:https://birth-center.account.workers.dev"),
  );
  assert.ok(
    calls.indexOf("migrate:birth-center:https://birth-center.account.workers.dev")
      < calls.indexOf("runtime-health:birth-center:https://birth-center.account.workers.dev"),
  );
  assert.equal(calls.at(-2), "accept:https://api.staging.insidefibre.com");
  assert.equal(calls.at(-1), "viewer:https://staging.insidefibre.com");
});

test("deployment fails before deploy when required Fibre secrets are incomplete", async () => {
  const { root, state } = await fixtureRepo();
  let deployCalls = 0;
  const client = {
    async assertAuthenticated() {},
    async listSecretNames(workerName) {
      const present = allSecrets();
      if (workerName === "fibre-asset-generator-staging") present.delete("OPENAI_API_KEY");
      return present;
    },
    async deployService() { deployCalls += 1; },
  };
  await assert.rejects(deployCloudflareStack({
    repoRoot:root,
    environment:"staging",
    client,
    validateRepository:async () => {},
    provision:async () => state,
    log:()=>{},
  }), /asset-generator is missing required Cloudflare secrets: OPENAI_API_KEY/);
  assert.equal(deployCalls, 0);
});

test("Wrangler client verifies secret names, shallow health and deep state health", async () => {
  const calls = [];
  const runner = async (args) => {
    calls.push(args);
    if (args[0] === "whoami") return { stdout:'{"accounts":[{"id":"acct"}]}', stderr:"", exitCode:0 };
    if (args[0] === "secret") return { stdout:'[{"name":"FIBRE_PRIVATE_TOKEN","type":"secret_text"}]', stderr:"", exitCode:0 };
    if (args[0] === "deploy") return { stdout:"https://worker.account.workers.dev", stderr:"", exitCode:0 };
    throw new Error(`unexpected command ${args.join(" ")}`);
  };
  const fetchImpl = async (url, options = {}) => {
    const path = String(url);
    if (path.endsWith("/internal/migrate")) {
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-fibre-private-token"], "deployment-private-token");
      return {
        ok:true,
        status:200,
        async json() {
          return {
            ok:true,
            service:"birth-center",
            migration:{ fromVersion:0, toVersion:2, applied:[1,2] },
          };
        },
      };
    }
    if (path.endsWith("/internal/births/develop/deployment-runtime-probe/inspection")) {
      return {
        ok:false,
        status:404,
        async json() { return { error:{ code:"DEVELOPMENT_NOT_FOUND" } }; },
      };
    }
    return {
      ok:true,
      status:200,
      async json() {
        if (path.endsWith("/internal/health/state")) return { ok:true, service:"world-kernel", stateChecked:true };
        if (path.endsWith("/healthz")) return { ok:true, service:"world-kernel", stateChecked:false };
        return { threads:[] };
      },
    };
  };
  const client = createWranglerDeploymentClient({
    runner,
    cwd:"/repo",
    fetchImpl,
    privateToken:"deployment-private-token",
  });
  await client.assertAuthenticated();
  assert.deepEqual(await client.listSecretNames("fibre-world-kernel-staging"), new Set(["FIBRE_PRIVATE_TOKEN"]));
  await client.deployService({
    configPath:"/repo/.fibre/world.jsonc",
    resolvedConfig:{durable_objects:{bindings:[{name:"WORLD_STATE",class_name:"FibreWorldDurableObject"}]}},
  });
  const deployArgs=calls.at(-1);
  assert.equal(deployArgs[deployArgs.indexOf("--durable-objects-code-update-mode")+1],
    "immediate","stateful deployment left the previous Durable Object code active");
  assert.equal((await client.checkServiceHealth({
    serviceId:"world-kernel",
    baseUrl:"https://world.example",
  })).stateChecked, false);
  assert.equal((await client.checkStateHealth({
    serviceId:"world-kernel",
    baseUrl:"https://world.example",
  })).stateChecked, true);
  await assert.rejects(client.checkStateHealth({
    serviceId:"world-kernel",
    baseUrl:"https://world.example",
    expectedSha:"a".repeat(40),
  }),/deployed revision not ready/u);
  assert.equal((await client.migrateBirthCenter({
    baseUrl:"https://birth.example",
  })).toVersion, 2);
  assert.equal((await client.checkBirthCenterRuntime({
    baseUrl:"https://birth.example",
  })).status, 404);
  assert.deepEqual(
    missingRequiredSecretNames(["FIBRE_PRIVATE_TOKEN", "OTHER"], new Set(["FIBRE_PRIVATE_TOKEN"])),
    ["OTHER"],
  );
  assert.equal(healthBaseUrlForDeployment({
    serviceId:"world-kernel",
    resolvedConfig:{},
    deploymentOutput:"Published https://fibre-world-kernel-staging.account.workers.dev",
  }), "https://fibre-world-kernel-staging.account.workers.dev");
});

test("deep health failures surface the Fibre state diagnostic", async () => {
  const client = createWranglerDeploymentClient({
    runner:async () => { throw new Error("runner should not be used"); },
    cwd:"/repo",
    fetchImpl:async () => ({
      ok:false,
      status:503,
      async json() { return { error:{ detail:"Birth Center state could not be opened" } }; },
    }),
  });
  await assert.rejects(
    client.checkStateHealth({ serviceId:"birth-center", baseUrl:"https://birth.example" }),
    /HTTP 503: Birth Center state could not be opened/,
  );
});

function schemaGatedStackClient({failInstallAttempts=0}={}){
  const calls=[];
  let attempts=0,installed=false;
  const confirmation=Object.freeze({
    ok:true,deploymentGitSha:"b".repeat(40),installed:true,
  });
  const client={
    async assertAuthenticated(){return {ok:true};},
    async listSecretNames(){return allSecrets();},
    async deployService({serviceId}){
      calls.push("deploy:"+serviceId);
      return {output:"Published https://"+serviceId+".account.workers.dev"};
    },
    async checkServiceHealth({serviceId,expectedSha}){
      calls.push("health:"+serviceId);
      return {ok:true,deploymentGitSha:expectedSha};
    },
    async checkStateHealth({serviceId,expectedSha}){
      calls.push("state:"+serviceId);
      if(serviceId==="world-kernel"&&!installed)
        throw new Error("health endpoint failed with HTTP 503");
      return {ok:true,stateChecked:true,deploymentGitSha:expectedSha};
    },
    async migrateWorldOrFid({serviceId,expectedSha}){
      calls.push("migrate:"+serviceId);
      if(serviceId==="world-kernel"){
        attempts++;
        if(attempts<=failInstallAttempts)
          throw new Error("previous World schema revision still served");
        installed=true;
        return confirmation;
      }
      return {ok:true,deploymentGitSha:expectedSha};
    },
    async migrateBirthCenter(){return {applied:[]};},
    async checkBirthCenterRuntime(){return {ok:true,status:404};},
    async checkPresentationAcceptance(){return {threads:[]};},
    async checkViewer(){return {ok:true};},
  };
  return {client,calls,confirmation};
}

async function deploySchemaGatedStack(gated){
  const {root,state}=await fixtureRepo();
  return deployCloudflareStack({
    repoRoot:root,environment:"staging",client:gated.client,
    validateRepository:async()=>{},provision:async()=>state,
    wait:async()=>{},log:()=>{},
  });
}

test("full-stack World schema installation precedes its first state-health check",async()=>{
  const gated=schemaGatedStackClient();
  const result=await deploySchemaGatedStack(gated);
  const world=result.deployments.find(item=>item.serviceId==="world-kernel");
  assert.deepEqual(world.migration,gated.confirmation,
    "World installed revision was not recorded as migration");
  assert.equal(gated.calls.filter(call=>call==="migrate:world-kernel").length,1,
    "World schema installation was repeated");
  assert.ok(gated.calls.indexOf("migrate:world-kernel")<
    gated.calls.indexOf("state:world-kernel"),
    "state health ran before World schema admission");
});

test("full-stack deployment records the confirmation after transient prior World revision",async()=>{
  const gated=schemaGatedStackClient({failInstallAttempts:2});
  const result=await deploySchemaGatedStack(gated);
  const world=result.deployments.find(item=>item.serviceId==="world-kernel");
  assert.equal(gated.calls.filter(call=>call==="migrate:world-kernel").length,3,
    "World installation was not retried after prior revision");
  assert.deepEqual(world.migration,gated.confirmation,
    "retry confirmation was replaced by a later migration");
  assert.ok(gated.calls.indexOf("migrate:world-kernel")<
    gated.calls.indexOf("state:world-kernel"),
    "World health acceptance preceded successful installation");
});

test("World schema confirmation can arrive after the former retry limit",async()=>{
  const gated=schemaGatedStackClient({failInstallAttempts:16});
  const result=await deploySchemaGatedStack(gated);
  assert.equal(gated.calls.filter(call=>call==="migrate:world-kernel").length,17,
    "late World revision was abandoned");
  assert.equal(result.deployments.find(item=>item.serviceId==="world-kernel").migration,
    gated.confirmation,"late World schema confirmation lost");
});

test("World schema timeout is bounded by elapsed time and names the serving revision",async()=>{
  const target="b".repeat(40),stale="a".repeat(40);
  let clock=0,attempts=0;
  const waits=[],logs=[];
  await assert.rejects(installWorldSchemaWithRetry({
    client:{async migrateWorldOrFid(){
      attempts++;
      const error=new Error("prior World revision still served");
      error.deploymentGitSha=stale;
      throw error;
    }},
    serviceId:"world-kernel",baseUrl:"https://world.example",
    expectedSha:target,now:()=>clock,
    wait:async ms=>{waits.push(ms);clock+=ms;},
    log:line=>logs.push(line),
  }),error=>{
    assert.match(error.message,/not installed for bbbbbbb.*serving aaaaaaa/u,
      "World timeout lost revision identity");
    assert.match(error.message,/last: prior World revision still served/u,
      "World timeout lost the last reason");
    return true;
  });
  assert.equal(clock,600_000,"World retry exceeded ten-minute budget");
  assert.ok(attempts>16,"World retained a fixed retry-count limit");
  assert.ok(waits.every(ms=>ms<=15_000),"World retry exceeded its backoff cap");
  assert.equal(logs.length,attempts,"World retry lost attempt progress");
});

 
test("World deployment waits through revision refusal without accepting stale installation",async()=>{
  const target="b".repeat(40);
  const stale="a".repeat(40);
  const requested=[];
  const logs=[];
  const waits=[];
  const client=createWranglerDeploymentClient({
    privateToken:"operator-secret",
    fetchImpl:async(url,options)=>{
      assert.equal(String(url),"https://world.example/internal/world-schema/migrate");
      assert.equal(options.method,"POST");
      assert.equal(options.headers["x-fibre-private-token"],"operator-secret");
      requested.push(JSON.parse(options.body).expectedGitSha);
      if(requested.length<=2)
        return Response.json({
          ok:false,code:"WORLD_REVISION_NOT_SERVING",deploymentGitSha:stale,
        },{status:409});
      return Response.json({
        ok:true,deploymentGitSha:target,installed:true,already:false,
      },{headers:{
        "x-fibre-state-rows-read":"50321",
        "x-fibre-state-rows-written":"17",
      }});
    },
  });
  const result=await installWorldSchemaWithRetry({
    client,serviceId:"world-kernel",baseUrl:"https://world.example",
    expectedSha:target,wait:async(ms)=>waits.push(ms),log:line=>logs.push(line),
  });
  assert.deepEqual(requested,[target,target,target],"deploy sent the wrong source revision");
  assert.deepEqual(waits,[1500,3000],"old revision did not defer schema installation");
  assert.equal(result.deploymentGitSha,target);
  assert.equal(result.rowsRead,50321);
  assert.equal(result.rowsWritten,17);
  assert.equal(logs.length,3,"schema retry diagnostics missing");
  assert.ok(logs.slice(0,-1).every(line=>/^World serving aaaaaaa · waiting for bbbbbbb \(attempt \d+, \d+s\)$/u
    .test(progressDetailFromLine(line)??"")),"schema retry progress lost revision identity");
  assert.equal(progressDetailFromLine(logs.at(-1)),null,
    "schema installation outcome became progress");
  assert.match(logs.at(-1),/STATE SCHEMA INSTALLED world-kernel after \d+s \(rows read 50321, written 17\)/u,
    "deployment hid the actual schema installation cost");
});
