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
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4",
    ],
    ["frozen-boundary-candidate-1.mjs", "frozen-boundary-candidate-4.mjs"],
    [
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1",
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4",
    ],
    ["standing-gate-v1.mjs", "standing-gate-v4.mjs"],
    [
      "./history-bends-judgment-standing-proof.mjs",
      "./history-bends-judgment-standing-proof-v4.mjs",
    ],
    ["History bends judgment standing gate v1", "History bends judgment standing gate v4"],
    ["frozen candidate 1", "frozen candidate 4"],
    ["Frozen history candidate 1", "Frozen history candidate 4"],
  ];

  let transformed = source;
  for (const [from, to] of replacements) {
    assert.equal(
      transformed.includes(from),
      true,
      `history standing gate v4 template marker missing: ${from}`,
    );
    transformed = transformed.replaceAll(from, to);
  }
  return transformed;
}

export function generatedHistoryStandingGateV4Source() {
  const template = readFileSync(
    new URL("./history-bends-judgment-gate.mjs", import.meta.url),
    "utf8",
  );
  return transformTemplate(template);
}

export function runHistoryStandingGateV4(argv = process.argv.slice(2), environment = process.env) {
  const generatedPath = join(
    toolsDir,
    `.history-bends-judgment-gate-v4.generated.${process.pid}.mjs`,
  );
  writeFileSync(generatedPath, generatedHistoryStandingGateV4Source(), "utf8");
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
  const result = runHistoryStandingGateV4();
  if (result.error) throw result.error;
  if (result.signal !== null) {
    process.stderr.write(`History standing gate v4 terminated by ${result.signal}\n`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
