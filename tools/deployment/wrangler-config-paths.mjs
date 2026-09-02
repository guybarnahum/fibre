import { dirname, relative, resolve, sep } from "node:path";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function portablePath(value) {
  return sep === "/" ? value : value.split(sep).join("/");
}

export function relocateWranglerMain(config, {
  repoRoot,
  sourceConfigPath,
  generatedConfigPath,
} = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("Wrangler config must be an object");
  }
  const root = resolve(nonEmpty("repoRoot", repoRoot));
  const sourceConfig = resolve(root, nonEmpty("sourceConfigPath", sourceConfigPath));
  const generatedConfig = resolve(nonEmpty("generatedConfigPath", generatedConfigPath));
  const sourceMain = resolve(dirname(sourceConfig), nonEmpty("Wrangler main", config.main));
  let relocated = portablePath(relative(dirname(generatedConfig), sourceMain));
  if (relocated === "") relocated = `./${sourceMain.split(/[\\/]/u).at(-1)}`;
  else if (!relocated.startsWith(".")) relocated = `./${relocated}`;
  config.main = relocated;
  return config;
}
