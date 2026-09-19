import { FID_CARD_SIZE } from "./fid-card-renderer.mjs";
import { decodePngRgba } from "./fid-photo-surface.mjs";

function bytes(name, value) {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
  throw new TypeError(`${name} PNG bytes are required`);
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
} = {}) {
  if (typeof version !== "string" || version.trim() === "") throw new TypeError("FID asset template version is required");
  const normalizedLayout = layout(candidateLayout, version);
  const [frontBaseLayer, frontUpperLayer, back] = await Promise.all([
    decodePngRgba(bytes("FID front base", frontBasePng)),
    decodePngRgba(bytes("FID front foreground", frontForegroundPng)),
    decodePngRgba(bytes("FID back base", backBasePng)),
  ]);
  return Object.freeze({
    version,
    layout:Object.freeze(normalizedLayout),
    frontBaseLayer:assertCardSurface("FID front base", frontBaseLayer),
    frontUpperLayer:assertCardSurface("FID front foreground", frontUpperLayer),
    back:assertCardSurface("FID back base", back),
  });
}
