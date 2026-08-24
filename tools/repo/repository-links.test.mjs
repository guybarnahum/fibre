import assert from "node:assert/strict";
import test from "node:test";

import { trackedSymlinkPaths, validateTrackedSymlinks } from "./repository-links.mjs";

test("trackedSymlinkPaths extracts only Git mode 120000 entries", () => {
  const indexText = [
    "100644 aaaaa 0\tREADME.md",
    "120000 bbbbb 0\ttools/services",
    "120000 ccccc 0\ttools/repro/apps",
    "",
  ].join("\n");
  assert.deepEqual(trackedSymlinkPaths(indexText), ["tools/services", "tools/repro/apps"]);
});

test("validateTrackedSymlinks rejects dangling and non-symlink working-tree edges", () => {
  const errors = validateTrackedSymlinks(
    ["good", "dangling", "not-link"],
    {
      lstat(path) {
        return { isSymbolicLink: () => path !== "not-link" };
      },
      realpath(path) {
        if (path === "dangling") {
          const error = new Error("missing target");
          error.code = "ENOENT";
          throw error;
        }
        return `/resolved/${path}`;
      },
    },
  );
  assert.deepEqual(errors, [
    "Tracked symlink does not resolve: dangling (ENOENT)",
    "Git records a symlink but the working tree does not: not-link",
  ]);
});
