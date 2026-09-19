import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createFidCardTemplateFromPngAssets } from "../../services/fibre-identity-authority/src/fid-card-template-assets.mjs";

const ROOT = new URL("../../services/fibre-identity-authority/assets/fid-card/v0.3-ocean/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("asset-manifest.json", ROOT), "utf8"));

function pngSize(bytes) {
  const signature = [137,80,78,71,13,10,26,10];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) {
    throw new Error("not a PNG");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function assertTtf(name, bytes) {
  if (bytes.length < 12 || bytes.readUInt32BE(0) !== 0x00010000) {
    throw new Error(`${name} is not a TrueType font`);
  }
}

if (manifest.fontLicense?.spdx !== "OFL-1.1" || manifest.fontLicense?.file !== "OFL.txt") {
  throw new Error("FID ocean font license metadata is invalid");
}

const assets = {};

for (const [name, expected] of Object.entries(manifest.assets)) {
  let bytes;
  try {
    bytes = await readFile(new URL(name, ROOT));
  } catch {
    throw new Error(`missing FID template asset ${name}`);
  }
  assets[name] = bytes;
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== expected.sha256) {
    throw new Error(`${name} digest mismatch`);
  }
  if (bytes.length !== expected.bytes) {
    throw new Error(`${name} byte length mismatch`);
  }
  if (name.endsWith(".png")) {
    const size = pngSize(bytes);
    if (size.width !== manifest.canvas.width || size.height !== manifest.canvas.height) {
      throw new Error(`${name} must be ${manifest.canvas.width}x${manifest.canvas.height}`);
    }
  }
  if (name.endsWith(".ttf")) {
    assertTtf(name, bytes);
    if (expected.license !== manifest.fontLicense.spdx) {
      throw new Error(`${name} license metadata mismatch`);
    }
  }
}

const template = await createFidCardTemplateFromPngAssets({
  version:manifest.templateVersion,
  layout:JSON.parse(await readFile(new URL("layout.json", ROOT), "utf8")),
  frontBasePng:assets["front-base.png"],
  frontForegroundPng:assets["front-foreground.png"],
  backBasePng:assets["back-base.png"],
  fontAssets:{
    "NotoSans-SemiCondensed.ttf":assets["NotoSans-SemiCondensed.ttf"],
    "NotoSans-SemiCondensedMedium.ttf":assets["NotoSans-SemiCondensedMedium.ttf"],
  },
});
if (template.fonts.regular?.asset !== "NotoSans-SemiCondensed.ttf"
  || template.fonts.medium?.asset !== "NotoSans-SemiCondensedMedium.ttf") {
  throw new Error("FID ocean typography did not compose");
}

console.log(`FID ocean template assets: OK (${fileURLToPath(ROOT)})`);
