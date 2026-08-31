import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalInfraDriver } from "#infra/providers/local";
import { createStateModelInvocationJournal } from "../../src/model-runtime/durable-invocation-journal.mjs";

export function tempBirthState(t) {
  const root = mkdtempSync(join(tmpdir(), "fibre-birth-state-"));
  const databasePath = join(root, "birth.sqlite");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return Object.freeze({
    root,
    databasePath,
    storage(onWake = () => {}) {
      const infraDriver = createLocalInfraDriver({
        stateScopes: { birth: databasePath },
        schedulerScopes: { birth: { onWake } },
      });
      return Object.freeze({ infraDriver, stateScopeId: "birth" });
    },
    journal(options = {}) {
      return createStateModelInvocationJournal(this.storage(), options);
    },
  });
}
