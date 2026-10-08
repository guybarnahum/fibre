import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { openContactStore } from "../src/contact-store.mjs";

test("Person contact capability is explicit, revocable, and re-grantable", () => {
  const directory=mkdtempSync(join(tmpdir(),"fibre-contact-capability-"));
  const storage={
    infraDriver:createSqliteStateInfraDriver({scopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const store=openContactStore(storage);
  try{
    const first=store.registerPersonCapability({
      partyId:"person_guy",
      displayName:"Guy",
      registeredAt:"2026-10-07T18:00:00.000Z",
    });
    assert.equal(store.getPersonCapability("person_guy").active,true,
      "explicit Person contact grant was not routable");

    store.revokePersonCapability({
      partyId:"person_guy",
      revokedAt:"2026-10-07T18:05:00.000Z",
      reason:"Person disabled Fibre contact.",
    });
    assert.equal(store.getPersonCapability("person_guy").active,false,
      "revoked Person contact route remained active");

    const second=store.registerPersonCapability({
      partyId:"person_guy",
      displayName:"Guy",
      registeredAt:"2026-10-07T18:10:00.000Z",
    });
    assert.notEqual(second.capabilityId,first.capabilityId,
      "re-grant reused a revoked routing authority");
    assert.equal(store.getPersonCapability("person_guy").capabilityId,second.capabilityId,
      "latest Person contact grant did not become routing authority");
    assert.equal(store.getPersonCapability("person_guy").active,true,
      "explicit Person contact re-grant was not routable");
  }finally{
    store.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
