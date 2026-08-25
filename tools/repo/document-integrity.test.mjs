import assert from "node:assert/strict";
import test from "node:test";

import { validateDocumentIntegrity } from "./document-integrity.mjs";

test("tracked documentation has unique canonical identities and resolvable current paths", () => {
  assert.deepEqual(validateDocumentIntegrity(), []);
});
