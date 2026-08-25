export function trackedSymlinkPaths(indexText) {
  if (typeof indexText !== "string") throw new TypeError("git index text must be a string");
  return indexText.split(/\r?\n/u).flatMap((line) => {
    if (line.trim() === "") return [];
    const separator = line.indexOf("\t");
    if (separator < 0) throw new TypeError(`unexpected git ls-files -s line: ${line}`);
    const metadata = line.slice(0, separator).trim().split(/\s+/u);
    if (metadata.length < 3) throw new TypeError(`unexpected git ls-files -s metadata: ${line}`);
    return metadata[0] === "120000" ? [line.slice(separator + 1)] : [];
  });
}

export function validateTrackedSymlinks(paths, { lstat, realpath }) {
  if (!Array.isArray(paths)) throw new TypeError("tracked symlink paths must be an array");
  if (typeof lstat !== "function" || typeof realpath !== "function") {
    throw new TypeError("tracked symlink validation requires lstat and realpath functions");
  }

  const errors = [];
  for (const path of paths) {
    try {
      if (!lstat(path).isSymbolicLink()) {
        errors.push(`Git records a symlink but the working tree does not: ${path}`);
        continue;
      }
      realpath(path);
    } catch (error) {
      const detail = error?.code ? ` (${error.code})` : "";
      errors.push(`Tracked symlink does not resolve: ${path}${detail}`);
    }
  }
  return errors;
}
