import assert from "node:assert/strict";
import test from "node:test";

import { createThreadDirectoryService } from "../src/thread-directory-service.mjs";

function fixture() {
  let reads = 0;
  const entries = [
    Object.freeze({
      threadId:"thr_mira",
      fibreIdentityNumber:"7K3M-2Q-8W5R",
      displayName:null,
      sex:"female",
      status:"frozen",
      originOrientation:"original",
      birthDate:"2004-03-18",
      birthPlace:"Valparaíso, Chile",
      culture:Object.freeze(["Valparaíso formative context"]),
      languages:Object.freeze(["Spanish", "English"]),
      raisedAs:Object.freeze({
        culturalContext:"Chilean coastal household with strong extended-family traditions",
        languages:Object.freeze(["Spanish", "English"]),
        schoolingOrCommunityContext:"Public school and neighborhood arts community",
      }),
      summary:null,
      version:12,
      stateHash:"sha256:test-mira",
      updatedAt:"2026-09-17T13:00:00Z",
    }),
    Object.freeze({
      threadId:"thr_nilo",
      fibreIdentityNumber:"1ABC-2D-3EFG",
      displayName:"Nilo Serrat",
      sex:"male",
      status:"active",
      originOrientation:"original",
      birthDate:"2003-07-02",
      birthPlace:"Barcelona, Spain",
      culture:Object.freeze(["Barcelona formative context"]),
      languages:Object.freeze(["Catalan", "Spanish"]),
      raisedAs:Object.freeze({
        culturalContext:"Catalan urban family and community context",
        languages:Object.freeze(["Catalan", "Spanish"]),
        schoolingOrCommunityContext:"Neighborhood school and local music community",
      }),
      summary:"Keeps notebooks about tide pools and old songs.",
      version:8,
      stateHash:"sha256:test-nilo",
      updatedAt:"2026-09-17T13:01:00Z",
    }),
  ];

  return {
    directory:createThreadDirectoryService({
      directoryStore:{
        listEntries({ fin = null } = {}) {
          reads += 1;
          return fin === null ? entries : entries.filter((entry) => entry.fibreIdentityNumber === fin);
        },
      },
    }),
    reads:() => reads,
  };
}

test("World Thread Registry exposes bounded cultural naming context in one read", () => {
  const { directory, reads } = fixture();

  const byFin = directory.search({ fin:"7K3M-2Q-8W5R" });
  assert.deepEqual(byFin.threads.map(({ threadId }) => threadId), ["thr_mira"]);
  assert.equal(byFin.threads[0].displayName, null);
  assert.equal(byFin.threads[0].birthPlace, "Valparaíso, Chile");
  assert.equal(byFin.threads[0].raisedAs.culturalContext, "Chilean coastal household with strong extended-family traditions");
  assert.equal(reads(), 1);

  const byCulture = directory.search({ query:"Catalan community" });
  assert.deepEqual(byCulture.threads.map(({ threadId }) => threadId), ["thr_nilo"]);
  assert.equal(reads(), 2);

  assert.equal("genome" in byFin.threads[0], false);
  assert.equal("currentState" in byFin.threads[0], false);
});
