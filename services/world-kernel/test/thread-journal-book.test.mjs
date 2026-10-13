import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createThreadJournalBook } from "../src/thread-journal-book.mjs";

function withWorldState(run) {
  const directory=mkdtempSync(join(tmpdir(),"fibre-thread-journal-"));
  const infraDriver=createLocalInfraDriver({
    stateScopes:{world:join(directory,"world.sqlite")},
  });
  const storage={infraDriver,stateScopeId:"world"};
  return Promise.resolve().then(()=>run(storage)).finally(()=>
    rmSync(directory,{recursive:true,force:true}));
}

const profile={
  threadId:"thr_journal_owner",
  title:"Margins",
  presentationStyle:"notebook",
  aestheticNote:"Small, quiet pages.",
};

test("Thread Journal retains its chosen profile and Markdown across state reopening", () =>
  withWorldState(async(storage)=>{
    const first=createThreadJournalBook({storage});
    await first.append({
      threadId:profile.threadId,profile,
      writtenAt:"2026-10-13T01:02:00Z",
      entryText:"A first private thought.",
    });
    first.close();

    const reopened=createThreadJournalBook({storage});
    assert.deepEqual(await reopened.getProfile(profile.threadId),profile,
      "journal lost the Thread's chosen book identity");
    await reopened.append({
      threadId:profile.threadId,profile,
      writtenAt:"2026-10-13T02:03:00Z",
      entryText:"A later thought.",
    });
    const book=await reopened.read(profile.threadId);
    assert.ok(book.document.includes("A first private thought."),
      "journal lost its earlier entry");
    assert.ok(book.document.includes("A later thought."),
      "journal did not append new experience");
    assert.ok(book.document.indexOf("A first private thought.")<
      book.document.indexOf("A later thought."),
      "journal order changed");
    assert.equal(await reopened.read("thr_another_person"),null,
      "journal mixed different Threads");
    reopened.close();
  }));

test("legacy Thread Journal imports once and subsequent writes belong to World state", () =>
  withWorldState(async(storage)=>{
    const original=`<!-- fibre-thread-journal-v1
${JSON.stringify(profile)}
-->

# Margins

## 2026-10-12 · 22:00:00Z

Original R2 entry.
`;
    let reads=0;
    const book=createThreadJournalBook({
      storage,
      async legacyReader(key) {
        reads++;
        assert.equal(key,"journals/thr_journal_owner/journal.md");
        return original;
      },
    });
    assert.equal((await book.read(profile.threadId)).document,original,
      "legacy journal was not preserved exactly");
    assert.equal((await book.read(profile.threadId)).document,original);
    assert.equal(reads,1,"imported journal kept reading legacy R2");

    await book.append({
      threadId:profile.threadId,profile,
      writtenAt:"2026-10-13T03:00:00Z",
      entryText:"New World-owned entry.",
    });
    book.close();

    const reopened=createThreadJournalBook({storage});
    const migrated=await reopened.read(profile.threadId);
    assert.ok(migrated.document.startsWith(original.trimEnd()),
      "migration rewrote earlier journal content");
    assert.ok(migrated.document.includes("New World-owned entry."),
      "migration failed to support subsequent appends");
    assert.deepEqual(migrated.profile,profile);
    reopened.close();
  }));
