import assert from "node:assert/strict";
import test from "node:test";

import { createThreadIdentityCommandService } from "../src/thread-identity-command-service.mjs";

function thread(overrides = {}) {
  return {
    threadId:"thr_identity_command_001",
    version:4,
    identity:{ name:"Fibre Thread", ...overrides },
    provenance:{ lastEventId:"evt_previous" },
  };
}

test("naming a Thread does not inspect unrelated birth evidence", async () => {
  const current = thread();
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(current) },
    genesisSexEvidence:{ resolve() { throw new Error("name must not read birth sex evidence"); } },
    identityUpdater:{
      update(value, { name }) {
        return {
          changed:true,
          eventId:"evt_name",
          changes:{ name },
          thread:{ ...value, version:value.version + 1, identity:{ ...value.identity, name } },
        };
      },
    },
  });

  const result = await service.update(current.threadId, {
    operationKey:"admin_name_1",
    name:"Maya Cohen",
  });
  assert.deepEqual(result.identity, { name:"Maya Cohen", sex:null });
  assert.equal(result.changed, true);
});

test("preserved Genesis sex evidence cannot be replaced by an operator guess", async () => {
  const current = thread();
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(current) },
    genesisSexEvidence:{ resolve:() => ({ genesisId:"gen_001", sex:"female", source:"birth_bundle" }) },
    identityUpdater:{ update() { throw new Error("operator sex must not overwrite Genesis evidence"); } },
  });

  await assert.rejects(
    service.update(current.threadId, { operationKey:"admin_sex_1", sex:"male" }),
    /use genesis_sex_v1 migration/u,
  );
});
