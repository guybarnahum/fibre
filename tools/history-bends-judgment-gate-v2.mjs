import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));

function transformTemplate(source) {
  const replacements = [
    [
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1",
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2",
    ],
    ["frozen-boundary-candidate-1.mjs", "frozen-boundary-candidate-2.mjs"],
    [
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1",
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V2",
    ],
    ["standing-gate-v1.mjs", "standing-gate-v2.mjs"],
    [
      "./history-bends-judgment-standing-proof.mjs",
      "./history-bends-judgment-standing-proof-v2.mjs",
    ],
    ["History bends judgment standing gate v1", "History bends judgment standing gate v2"],
    ["frozen candidate 1", "frozen candidate 2"],
    ["Frozen history candidate 1", "Frozen history candidate 2"],
    ["candidate 1", "candidate 2"],
  ];

  let transformed = source;
  for (const [from, to] of replacements) {
    assert.equal(
      transformed.includes(from),
      true,
      `history standing gate v2 template marker missing: ${from}`,
    );
    transformed = transformed.replaceAll(from, to);
  }
  return transformed;
}

export function generatedHistoryStandingGateV2Source() {
  const template = readFileSync(
    new URL("./history-bends-judgment-gate.mjs", import.meta.url),
    "utf8",
  );
  return transformTemplate(template);
}

export function runHistoryStandingGateV2(argv = process.argv.slice(2), environment = process.env) {
  const generatedPath = join(
    toolsDir,
    `.history-bends-judgment-gate-v2.generated.${process.pid}.mjs`,
  );
  writeFileSync(generatedPath, generatedHistoryStandingGateV2Source(), "utf8");
  try {
    return spawnSync(process.execPath, [generatedPath, ...argv], {
      cwd: resolve(toolsDir, ".."),
      env: environment,
      stdio: "inherit",
    });
  } finally {
    rmSync(generatedPath, { force: true });
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = runHistoryStandingGateV2();
  if (result.error) throw result.error;
  if (result.signal !== null) {
    process.stderr.write(`History standing gate v2 terminated by ${result.signal}\n`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
