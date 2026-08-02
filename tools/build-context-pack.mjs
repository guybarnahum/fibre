import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const files = [
  "docs/vision/constitution.md",
  "docs/vision/invariants.md",
  "docs/state/current-state.md",
  "docs/concepts/thread.md",
  "docs/concepts/identity-and-genome.md",
  "docs/concepts/task-marketplace.md",
  "docs/concepts/families-couples-and-reproduction.md",
  "docs/concepts/sponsorship-adoption-and-echoes.md",
  "docs/concepts/books-and-intellectual-formation.md",
  "docs/concepts/dual-adversarial-cognition.md",
  "docs/architecture/system-overview.md",
  "docs/architecture/thread-lifecycle.md",
  "docs/validation/prototype-roadmap.md",
  "docs/state/unresolved-decisions.md"
];
const body = files.map((file) => `\n\n---\nSOURCE: ${file}\n---\n\n${readFileSync(file,"utf8")}`).join("");
mkdirSync("artifacts/generated", { recursive:true });
writeFileSync("artifacts/generated/fibre-context-pack.md", `# Fibre context pack\n\nGenerated from canonical repository sources.${body}\n`);
console.log("Wrote artifacts/generated/fibre-context-pack.md");
