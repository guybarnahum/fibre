import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  expectedMarkdownIncludeProjections,
  extractMarkdownRegions,
  projectMarkdownIncludes,
} from "./markdown-includes-lib.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fibre-markdown-includes-"));
  mkdirSync(join(root, "docs", "vision"), { recursive: true });
  return root;
}

function write(root, path, content) {
  const absolute = join(root, path);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, content);
}

test("projects a named canonical region into README", () => {
  const root = fixture();
  try {
    write(
      root,
      "docs/vision/source.md",
      `# Source\n\n<!-- fibre:region name="principles" -->\n1. First\n2. Second\n<!-- /fibre:region -->\n`,
    );
    write(
      root,
      "README.md",
      `# README\n\n<!-- fibre:include src="docs/vision/source.md" region="principles" -->\nstale\n<!-- /fibre:include -->\n`,
    );

    const projections = expectedMarkdownIncludeProjections(root);
    const projection = projections.get("README.md");
    assert.match(projection.expected, /1\. First\n2\. Second/);
    assert.doesNotMatch(projection.expected, /stale/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("supports multiple include targets from one canonical source", () => {
  const root = fixture();
  try {
    write(
      root,
      "docs/source.md",
      `<!-- fibre:region name="shared" -->\nShared truth.\n<!-- /fibre:region -->\n`,
    );
    for (const path of ["README.md", "AGENTS.md"]) {
      write(
        root,
        path,
        `<!-- fibre:include src="docs/source.md" region="shared" -->\nold\n<!-- /fibre:include -->\n`,
      );
    }
    const projections = expectedMarkdownIncludeProjections(root);
    assert.equal(projections.size, 2);
    assert.match(projections.get("README.md").expected, /Shared truth\./);
    assert.match(projections.get("AGENTS.md").expected, /Shared truth\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires a unique existing non-empty region", () => {
  assert.throws(
    () => extractMarkdownRegions(
      `<!-- fibre:region name="x" -->a<!-- /fibre:region -->\n<!-- fibre:region name="x" -->b<!-- /fibre:region -->`,
      "duplicate.md",
    ),
    /repeats region x/,
  );
  assert.throws(
    () => extractMarkdownRegions(
      `<!-- fibre:region name="x" -->   <!-- /fibre:region -->`,
      "empty.md",
    ),
    /must not be empty/,
  );
});

test("rejects missing region and malformed include boundaries", () => {
  const root = fixture();
  try {
    write(
      root,
      "docs/source.md",
      `<!-- fibre:region name="present" -->value<!-- /fibre:region -->`,
    );
    write(
      root,
      "README.md",
      `<!-- fibre:include src="docs/source.md" region="missing" -->\nold\n<!-- /fibre:include -->`,
    );
    assert.throws(
      () => expectedMarkdownIncludeProjections(root),
      /has no region missing/,
    );

    write(
      root,
      "README.md",
      `<!-- fibre:include src="docs/source.md" region="present" -->\nold`,
    );
    assert.throws(
      () => expectedMarkdownIncludeProjections(root),
      /unclosed fibre:include/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores include-like examples inside fenced code", () => {
  const text = `\`\`\`md\n<!-- fibre:include src="docs/source.md" region="x" -->\n<!-- /fibre:include -->\n\`\`\`\n`;
  assert.equal(
    projectMarkdownIncludes(text, () => {
      throw new Error("must not resolve fenced example");
    }),
    text,
  );
});

test("rejects traversal and symlinked sources", () => {
  const root = fixture();
  const outside = fixture();
  try {
    write(outside, "secret.md", `<!-- fibre:region name="x" -->secret<!-- /fibre:region -->`);
    write(
      root,
      "README.md",
      `<!-- fibre:include src="../secret.md" region="x" -->\nold\n<!-- /fibre:include -->`,
    );
    assert.throws(
      () => expectedMarkdownIncludeProjections(root),
      /must not escape the repository/,
    );

    const link = join(root, "docs", "linked.md");
    symlinkSync(join(outside, "secret.md"), link, "file");
    write(
      root,
      "README.md",
      `<!-- fibre:include src="docs/linked.md" region="x" -->\nold\n<!-- /fibre:include -->`,
    );
    assert.throws(
      () => expectedMarkdownIncludeProjections(root),
      /symlink/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("rejects nested include directives inside source regions", () => {
  const root = fixture();
  try {
    write(
      root,
      "docs/source.md",
      `<!-- fibre:region name="outer" -->\nBefore\n<!-- fibre:include src="docs/other.md" region="inner" -->\nold\n<!-- /fibre:include -->\n<!-- /fibre:region -->`,
    );
    write(
      root,
      "docs/other.md",
      `<!-- fibre:region name="inner" -->inner<!-- /fibre:region -->`,
    );
    write(
      root,
      "README.md",
      `<!-- fibre:include src="docs/source.md" region="outer" -->\nold\n<!-- /fibre:include -->`,
    );
    assert.throws(
      () => expectedMarkdownIncludeProjections(root),
      /must not contain nested fibre:include/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
