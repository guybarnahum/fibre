import assert from "node:assert/strict";
import test from "node:test";

import { historyDevelopmentUsage } from "./history-bends-judgment-dev-cli.mjs";

test("history development CLI documents shared provider progress", () => {
  const usage = historyDevelopmentUsage();
  assert.match(usage, /npm run history:dev/);
  assert.match(usage, /Provider waits emit a shared elapsed-time heartbeat/);
  assert.match(usage, /never seals a standing cycle/);
});
