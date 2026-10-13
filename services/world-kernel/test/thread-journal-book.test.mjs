import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createThreadJournalBook } from "../src/thread-journal-book.mjs";

const profile={
  threadId:"thr_journal_owner",
  title:"Margins",
  presentationStyle:"notebook",
  aestheticNote:"Small, quiet pages.",
};

test("a Thread's chosen Journal survives restart and renders new World reflections without rewrites",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"fibre-journal-"));
  const storage={
    infraDriver:createLocalInfraDriver({stateScopes:{world:join(directory,"world.sqlite")}}),
    stateScopeId:"world",
  };
  const entries=[{
    journalEntryId:"journal_first",
    writtenAt:"2026-10-13T01:02:00Z",
    entryText:"A first private thought.",
  }];
  const experienceStore={
    listThreadJournalEntries(threadId){
      assert.equal(threadId,profile.threadId);
      return entries;
    },
  };
  let profileCalls=0;
  const modelAdapter={
    async invoke(){
      profileCalls++;
      return {output:{
        title:profile.title,
        presentationStyle:profile.presentationStyle,
        aestheticNote:profile.aestheticNote,
      }};
    },
  };
  try{
    const book=createThreadJournalBook({storage,experienceStore});
    assert.equal(await book.read(profile.threadId),null,
      "Journal appeared without a chosen profile");
    await book.ensureProfile({thread:{threadId:profile.threadId},modelAdapter});
    const first=await book.read(profile.threadId);
    assert.deepEqual(first.profile,profile,"Journal did not preserve its chosen identity");
    assert.ok(first.document.includes("A first private thought."),
      "Journal omitted an admitted reflection");
    book.close();

    entries.push({
      journalEntryId:"journal_second",
      writtenAt:"2026-10-13T02:03:00Z",
      entryText:"A later thought.",
    });

    const reopened=createThreadJournalBook({storage,experienceStore});
    await reopened.ensureProfile({thread:{threadId:profile.threadId},modelAdapter});
    const rendered=await reopened.read(profile.threadId);
    assert.deepEqual(rendered.profile,profile,"Journal profile changed after restart");
    assert.ok(rendered.document.indexOf("A first private thought.")<
      rendered.document.indexOf("A later thought."),
      "Journal lost the sequence of admitted reflections");
    assert.equal((rendered.document.match(/## /gu)??[]).length,2,
      "Journal duplicated or omitted a reflection");
    assert.equal(profileCalls,1,
      "Journal reading or later entries resampled the Thread's aesthetic");
    reopened.close();
  }finally{
    rmSync(directory,{recursive:true,force:true});
  }
});
