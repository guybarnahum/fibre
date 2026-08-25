#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const message = result.stderr.trim() || `git ${args.join(" ")} failed`;
    throw new Error(message);
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function printSection(title, body) {
  console.log(`\n${title}`);
  console.log(body || "(none)");
}

function parseCounts(value) {
  const [left, right] = value.split(/\s+/).map(Number);
  return { behind: left, ahead: right };
}

try {
  const insideRepository = runGit(["rev-parse", "--is-inside-work-tree"]);
  if (insideRepository.stdout !== "true") {
    throw new Error("Run this command from inside a Git repository.");
  }

  console.log("Fetching remote state...");
  runGit(["fetch", "--prune"]);

  const branch = runGit(["branch", "--show-current"]).stdout;
  const status = runGit(["status", "--short", "--branch"]).stdout;
  const recentCommits = runGit([
    "log",
    "--oneline",
    "--decorate",
    "-5",
  ]).stdout;

  printSection("Repository status:", status);
  printSection("Recent commits:", recentCommits);

  const failures = [];

  if (!branch) {
    failures.push("HEAD is detached; check out a named branch.");
  }

  const workingTree = runGit(["status", "--porcelain"]).stdout;
  if (workingTree) {
    failures.push("The working tree has uncommitted changes.");
  }

  const upstreamResult = runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    { allowFailure: true },
  );

  if (!upstreamResult.ok || !upstreamResult.stdout) {
    failures.push("No upstream branch is configured.");
  } else {
    const upstream = upstreamResult.stdout;
    const upstreamCounts = parseCounts(
      runGit(["rev-list", "--left-right", "--count", `${upstream}...HEAD`])
        .stdout,
    );

    printSection(
      "Upstream sync:",
      [
        `Branch:   ${branch}`,
        `Upstream: ${upstream}`,
        `Ahead:    ${upstreamCounts.ahead}`,
        `Behind:   ${upstreamCounts.behind}`,
      ].join("\n"),
    );

    if (upstreamCounts.ahead > 0) {
      failures.push(
        `The branch has ${upstreamCounts.ahead} unpushed commit(s).`,
      );
    }

    if (upstreamCounts.behind > 0) {
      failures.push(
        `The branch is behind its upstream by ${upstreamCounts.behind} commit(s).`,
      );
    }
  }

  const defaultBranchResult = runGit(
    ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
    { allowFailure: true },
  );

  if (defaultBranchResult.ok && defaultBranchResult.stdout) {
    const defaultBranch = defaultBranchResult.stdout;
    const defaultCounts = parseCounts(
      runGit([
        "rev-list",
        "--left-right",
        "--count",
        `${defaultBranch}...HEAD`,
      ]).stdout,
    );

    printSection(
      "Default-branch comparison (informational):",
      [
        `Default: ${defaultBranch}`,
        `Ahead:   ${defaultCounts.ahead}`,
        `Behind:  ${defaultCounts.behind}`,
      ].join("\n"),
    );
  }

  if (failures.length > 0) {
    printSection(
      "Git sync check failed:",
      failures.map((failure) => `- ${failure}`).join("\n"),
    );
    process.exitCode = 1;
  } else {
    console.log("\nGit sync check passed.");
  }
} catch (error) {
  console.error(`\nGit sync check failed: ${error.message}`);
  process.exitCode = 1;
}
