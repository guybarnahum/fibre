// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: enforce exact checked-out recovery code before the PR39 closure can reach a provider
// fibre-tool-disposition: retire after PR39; retain the recovery-integrity lesson in milestone history

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { repoFile } from "#repo-root";

const cwd = fileURLToPath(repoFile("."));
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" }).trim();
if (dirty !== "") {
  throw new Error("PR39 closure execution requires a clean Git working tree");
}

await import("./genesis-pr39-closure.mjs");
