import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
  createLocalArtifactInfraDriver,
  InfraImmutableObjectConflictError,
} from "./driver.mjs";

test("local artifact InfraDriver persists immutable objects and catalog entries",async()=>{
  const root=await mkdtemp(join(tmpdir(),"fibre-artifacts-"));
  try{
    const first=createLocalArtifactInfraDriver({root});
    const bytes=new TextEncoder().encode("hello");
    const digest="sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    await first.objects.putImmutable("population-lab:experiment:exp_1:report",bytes,digest,{mediaType:"text/plain"});
    await first.catalog.upsert("population-lab:experiment:exp_1",{experimentId:"exp_1",status:"completed"});

    const second=createLocalArtifactInfraDriver({root});
    const object=await second.objects.get("population-lab:experiment:exp_1:report");
    assert.equal(new TextDecoder().decode(object.bytes),"hello","artifact bytes did not persist");
    assert.equal(object.digest,digest,"artifact digest did not persist");
    assert.equal((await second.catalog.get("population-lab:experiment:exp_1")).status,"completed","catalog entry did not persist");

    const page=await second.catalog.list({prefix:"population-lab:experiment:"});
    assert.deepEqual(page.entries.map(entry=>entry.key),["population-lab:experiment:exp_1"],"catalog prefix listing lost experiment");
    assert.equal(await second.objects.remove("population-lab:experiment:exp_1:report"),true,"artifact cleanup did not remove stored bytes");
    assert.equal(await second.objects.get("population-lab:experiment:exp_1:report"),null,"deleted artifact remained readable");
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});

test("local artifact InfraDriver rejects immutable rewrites",async()=>{
  const root=await mkdtemp(join(tmpdir(),"fibre-artifacts-"));
  try{
    const infra=createLocalArtifactInfraDriver({root});
    await infra.objects.putImmutable("object:1","a","sha256:a",{kind:"test"});
    await assert.rejects(
      ()=>infra.objects.putImmutable("object:1","b","sha256:b",{kind:"test"}),
      InfraImmutableObjectConflictError,
      "immutable object rewrite was accepted",
    );
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});
