import { readFile } from "node:fs/promises";

import { createFidCardTemplateFromPngAssets } from "../src/fid-card-template-assets.mjs";

export const OCEAN_FID_TEMPLATE_VERSION = "fid-card-template-v0.3-ocean";
const ROOT = new URL("../assets/fid-card/v0.3-ocean/", import.meta.url);

const assetsPromise = Promise.all([
  readFile(new URL("layout.json", ROOT), "utf8"),
  readFile(new URL("front-base.png", ROOT)),
  readFile(new URL("front-foreground.png", ROOT)),
  readFile(new URL("back-base.png", ROOT)),
  readFile(new URL("NotoSans-SemiCondensed.ttf", ROOT)),
  readFile(new URL("NotoSans-SemiCondensedMedium.ttf", ROOT)),
]);

export async function oceanFidTemplate({ version = OCEAN_FID_TEMPLATE_VERSION, mutateLayout = null } = {}) {
  const [layoutText, frontBasePng, frontForegroundPng, backBasePng, regular, medium] = await assetsPromise;
  const layout = JSON.parse(layoutText);
  layout.templateVersion = version;
  mutateLayout?.(layout);
  return createFidCardTemplateFromPngAssets({
    version,
    layout,
    frontBasePng,
    frontForegroundPng,
    backBasePng,
    fontAssets:{
      "NotoSans-SemiCondensed.ttf":regular,
      "NotoSans-SemiCondensedMedium.ttf":medium,
    },
  });
}
