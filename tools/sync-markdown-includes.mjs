import { writeFileSync } from "node:fs";
import { expectedMarkdownIncludeProjections } from "./markdown-includes-lib.mjs";

const checkOnly = process.argv.includes("--check");
const projections = expectedMarkdownIncludeProjections();
const stale = [...projections.entries()].filter(
  ([, projection]) => projection.actual !== projection.expected,
);

if (stale.length === 0) {
  console.log(`Markdown include projections are current (${projections.size} target files).`);
} else if (checkOnly) {
  for (const [path] of stale) {
    console.error(`Stale Markdown include projection: ${path}`);
  }
  console.error("Run npm run includes:sync and commit the updated Markdown files.");
  process.exit(1);
} else {
  for (const [path, projection] of stale) {
    writeFileSync(path, projection.expected);
    console.log(`Updated ${path} from canonical Markdown regions.`);
  }
}
