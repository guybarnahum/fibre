// Repository-root URL for data reads.
//
// Subpath imports (`#services/*`, `#fixtures/*`, …) resolve module specifiers
// from the root package.json, so a module does not have to know its own depth.
// They do not apply to `new URL(..., import.meta.url)` data reads, because `#`
// is a URL fragment there. Import `repoRoot` instead and resolve against it.
export const repoRoot = new URL("../../", import.meta.url);

export function repoFile(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    throw new TypeError("repoFile requires a repository-relative path");
  }
  if (relativePath.startsWith("/")) throw new TypeError("repoFile path must be repository-relative");
  return new URL(relativePath, repoRoot);
}
