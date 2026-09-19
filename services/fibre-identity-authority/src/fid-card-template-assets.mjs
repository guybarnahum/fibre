import { FID_CARD_SIZE } from "./fid-card-renderer.mjs";
import { decodePngRgba } from "./fid-photo-surface.mjs";
import { createFidTrueTypeFont } from "./fid-card-typography.mjs";

function bytes(name, value) {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
  throw new TypeError(`${name} bytes are required`);
}

function positive(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return value;
}

function box(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} is required`);
  positive(`${name}.x`, value.x);
  positive(`${name}.y`, value.y);
  if (!Number.isSafeInteger(value.width) || value.width < 1) throw new TypeError(`${name}.width must be positive`);
  if (!Number.isSafeInteger(value.height) || value.height < 1) throw new TypeError(`${name}.height must be positive`);
}

function layout(value, version) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("FID card layout is required");
  if (value.templateVersion !== version) throw new TypeError("FID card layout/template version mismatch");
  if (value.canvas?.width !== FID_CARD_SIZE.width || value.canvas?.height !== FID_CARD_SIZE.height) {
    throw new TypeError("FID card layout has unsupported dimensions");
  }
  box("FID front portrait", value.front?.portrait);
  box("FID front verification", value.front?.verification);
  box("FID front watermark", value.front?.watermark);
  if (value.front?.bodyPanel) box("FID front body panel", value.front.bodyPanel);
  box("FID back render pair", value.back?.renderPair);
  if (value.back?.verification) box("FID back verification", value.back.verification);
  for (const [name, field] of [
    ["FID front FIN", value.front?.fin],
    ["FID front name", value.front?.name],
    ["FID front date", value.front?.date],
    ["FID back credential", value.back?.credentialId],
    ["FID back revision", value.back?.revision],
    ["FID back template version", value.back?.templateVersion],
  ]) {
    if (!field || typeof field !== "object" || Array.isArray(field)) throw new TypeError(`${name} placement is required`);
  }
  return structuredClone(value);
}

function loadFonts(candidateLayout, fontAssets) {
  const definitions = candidateLayout.typography?.fonts;
  if (fontAssets == null || definitions == null) return Object.freeze({});

  const fonts = {};
  for (const [role, definition] of Object.entries(definitions)) {
    const asset = definition?.asset;
    if (typeof asset !== "string" || asset === "") throw new TypeError(`FID font ${role} asset is required`);
    if (!Object.hasOwn(fontAssets, asset)) throw new TypeError(`FID font asset ${asset} is required`);
    const fontBytes = bytes(`FID font asset ${asset}`, fontAssets[asset]);
    try {
      fonts[role] = Object.freeze({ asset, font:createFidTrueTypeFont(fontBytes) });
    } catch (cause) {
      throw new TypeError(`FID font asset ${asset} is invalid`, { cause });
    }
  }
  return Object.freeze(fonts);
}

function assertCardSurface(name, surface) {
  if (surface.width !== FID_CARD_SIZE.width || surface.height !== FID_CARD_SIZE.height) {
    throw new TypeError(`${name} must be ${FID_CARD_SIZE.width}x${FID_CARD_SIZE.height}`);
  }
  return surface;
}

export async function createFidCardTemplateFromPngAssets({
  version,
  layout: candidateLayout,
  frontBasePng,
  frontForegroundPng,
  backBasePng,
  fontAssets = null,
} = {}) {
  if (typeof version !== "string" || version.trim() === "") throw new TypeError("FID asset template version is required");
  const normalizedLayout = layout(candidateLayout, version);
  const fonts = loadFonts(normalizedLayout, fontAssets);
  const [frontBaseLayer, frontUpperLayer, back] = await Promise.all([
    decodePngRgba(bytes("FID front base", frontBasePng)),
    decodePngRgba(bytes("FID front foreground", frontForegroundPng)),
    decodePngRgba(bytes("FID back base", backBasePng)),
  ]);
  return Object.freeze({
    version,
    layout:Object.freeze(normalizedLayout),
    fonts,
    frontBaseLayer:assertCardSurface("FID front base", frontBaseLayer),
    frontUpperLayer:assertCardSurface("FID front foreground", frontUpperLayer),
    back:assertCardSurface("FID back base", back),
  });
}
