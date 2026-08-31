import assert from "node:assert/strict";
import test from "node:test";

import {
  DIRECT_FILE_PERSISTENCE_MIGRATION_PATHS,
  productionPersistenceViolationsForSource,
  validateProductionPersistencePolicy,
} from "./production-persistence-policy.mjs";

test("current service runtime has no unregistered production-persistence bypasses", () => {
  assert.deepEqual(validateProductionPersistencePolicy(), []);
});

test("new services cannot create a direct SQLite authority", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/future-economy/src/store.mjs",
      'import { DatabaseSync } from "node:sqlite";\nexport const db = new DatabaseSync("world.sqlite");\n',
    ),
    [
      "Production persistence bypass: services/future-economy/src/store.mjs imports SQLite directly; new service state must use a semantic store over InfraDriver",
    ],
  );
});

test("authoritative World stores cannot bypass InfraDriver.state with direct SQLite", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/world-kernel/src/example-current-store.mjs",
      'import { DatabaseSync } from "node:sqlite";\n',
    ),
    [
      "Production persistence bypass: services/world-kernel/src/example-current-store.mjs imports SQLite directly; new service state must use a semantic store over InfraDriver",
    ],
  );
});

test("new service runtime cannot persist durable files directly", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/future-social/src/journal.mjs",
      'import { writeFileSync } from "node:fs";\nwriteFileSync("state.json", "{}");\n',
    ),
    [
      "Production persistence bypass: services/future-social/src/journal.mjs writes durable files directly; service persistence must use an InfraDriver capability",
    ],
  );
});

test("Birth Center has no direct-file production persistence exception after InfraDriver.state migration", () => {
  assert.deepEqual(DIRECT_FILE_PERSISTENCE_MIGRATION_PATHS, []);
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/birth-center/src/model-runtime/durable-invocation-journal.mjs",
      'import { writeFileSync } from "node:fs";\nwriteFileSync("journal.json", "{}");\n',
    ),
    [
      "Production persistence bypass: services/birth-center/src/model-runtime/durable-invocation-journal.mjs writes durable files directly; service persistence must use an InfraDriver capability",
    ],
  );
});

test("service semantic code cannot import cloud storage/database SDKs directly", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/future-assets/src/store.mjs",
      'import { S3Client } from "@aws-sdk/client-s3";\nexport const client = new S3Client({});\n',
    ),
    [
      "Production persistence bypass: services/future-assets/src/store.mjs imports a cloud storage/database SDK directly; provider persistence belongs behind InfraDriver",
    ],
  );
});

test("read-only local filesystem access and InfraDriver use are not persistence bypasses", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/example/src/runtime.mjs",
      [
        'import { readFileSync } from "node:fs";',
        'import { requireInfraCapabilities } from "#infra";',
        "export function createService(infra) { requireInfraCapabilities(infra, 'objects'); return infra.objects; }",
      ].join("\n"),
    ),
    [],
  );
});

test("tests and tools under services are not production runtime policy targets", () => {
  assert.deepEqual(
    productionPersistenceViolationsForSource(
      "services/example/test/store.test.mjs",
      'import { DatabaseSync } from "node:sqlite";\n',
    ),
    [],
  );
});
