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
  let persisted = structuredClone(current);
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(persisted) },
    genesisSexEvidence:{ resolve() { throw new Error("name must not read birth sex evidence"); } },
    identityUpdater:{
      update(value, { name }) {
        const next = {
          ...value,
          version:value.version + 1,
          identity:{ ...value.identity, name },
          provenance:{ ...value.provenance, lastEventId:"evt_name" },
        };
        persisted = structuredClone(next);
        return { changed:true, eventId:"evt_name", changes:{ name }, thread:next };
      },
    },
  });

  const result = await service.update(current.threadId, {
    operationKey:"admin_name_1",
    name:"Maya Cohen",
  });
  assert.deepEqual(result.identity, { name:"Maya Cohen", sex:null, birthDate:null, languages:[] });
  assert.equal(result.changed, true);
});

test("birth date is carried through the identity command boundary", async () => {
  const current = thread();
  let persisted = structuredClone(current);
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(persisted) },
    genesisSexEvidence:{ resolve() { throw new Error("birth date must not inspect sex evidence"); } },
    identityUpdater:{
      update(value, { birthDate }) {
        assert.equal(birthDate, "08202004");
        const next = {
          ...value,
          version:value.version + 1,
          identity:{ ...value.identity, birthDate:"2004-08-20" },
          provenance:{ ...value.provenance, lastEventId:"evt_birth_date" },
        };
        persisted = structuredClone(next);
        return { changed:true, eventId:"evt_birth_date", changes:{ birthDate:"2004-08-20" }, thread:next };
      },
    },
  });

  const result = await service.update(current.threadId, {
    operationKey:"admin_birth_date_1",
    birthDate:"08202004",
  });
  assert.equal(result.identity.birthDate, "2004-08-20");
  assert.deepEqual(result.changes, { birthDate:"2004-08-20" });
});

test("language correction crosses the identity command boundary", async () => {
  const current = thread({ languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"] });
  let persisted = structuredClone(current);
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(persisted) },
    genesisSexEvidence:{ resolve() { throw new Error("languages must not inspect sex evidence"); } },
    identityUpdater:{
      update(value, { languages }) {
        assert.deepEqual(languages, ["Hebrew", "Russian", "English"]);
        const next = {
          ...value,
          version:value.version + 1,
          identity:{ ...value.identity, languages },
          provenance:{ ...value.provenance, lastEventId:"evt_languages" },
        };
        persisted = structuredClone(next);
        return { changed:true, eventId:"evt_languages", changes:{ languages }, thread:next };
      },
    },
  });

  const result = await service.update(current.threadId, {
    operationKey:"admin_languages_1",
    languages:["Hebrew", "Russian", "English"],
  });
  assert.deepEqual(result.identity.languages, ["Hebrew", "Russian", "English"]);
  assert.deepEqual(result.changes, { languages:["Hebrew", "Russian", "English"] });
});

test("identity command never acknowledges a language update that is not durably readable", async () => {
  const current = thread({ languages:["Hebrew", "Arabic", "English", "Russian", "Amharic"] });
  const service = createThreadIdentityCommandService({
    worldReader:{ getThread:() => structuredClone(current) },
    genesisSexEvidence:{ resolve() { throw new Error("languages must not inspect sex evidence"); } },
    identityUpdater:{
      update(value, { languages }) {
        return {
          changed:true,
          eventId:"evt_languages_unpersisted",
          changes:{ languages },
          thread:{
            ...value,
            version:value.version + 1,
            identity:{ ...value.identity, languages },
            provenance:{ ...value.provenance, lastEventId:"evt_languages_unpersisted" },
          },
        };
      },
    },
  });

  await assert.rejects(
    service.update(current.threadId, {
      operationKey:"admin_languages_unpersisted_1",
      languages:["Hebrew", "English"],
    }),
    (error) => error?.code === "THREAD_IDENTITY_PERSISTENCE_MISMATCH"
      && /not durably readable/u.test(error.message),
  );
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
