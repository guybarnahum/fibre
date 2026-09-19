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
  for (const container of config.containers ?? []) {
    if (typeof container?.image !== "string" || !container.image.trim().startsWith(".")) continue;
    const sourceImage = resolve(dirname(sourceConfig), container.image);
    let relocatedImage = portablePath(relative(dirname(generatedConfig), sourceImage));
    if (relocatedImage === "") relocatedImage = `./${sourceImage.split(/[\\/]/u).at(-1)}`;
    else if (!relocatedImage.startsWith(".")) relocatedImage = `./${relocatedImage}`;
    container.image = relocatedImage;
    if (typeof container.image_build_context === "string" && container.image_build_context.trim().startsWith(".")) {
      const sourceContext = resolve(dirname(sourceConfig), container.image_build_context);
      let relocatedContext = portablePath(relative(dirname(generatedConfig), sourceContext));
      if (relocatedContext === "") relocatedContext = ".";
      else if (!relocatedContext.startsWith(".")) relocatedContext = `./${relocatedContext}`;
      container.image_build_context = relocatedContext;
    }
  }
  return config;
}
