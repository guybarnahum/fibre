import { parse as parseOpenType } from "opentype.js";

import { FID_CARD_SIZE } from "./fid-card-renderer.mjs";
import { decodePngRgba } from "./fid-photo-surface.mjs";

function assetBytes(name, value) {
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

const TEXT_ALIGNMENTS = new Set(["left", "center", "right"]);
const TEXT_TRANSFORMS = new Set(["none", "uppercase"]);

function object(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} is required`);
  return value;
}

function text(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function finite(name, value, { positive = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || (positive && value <= 0)) {
    throw new TypeError(`${name} must be ${positive ? "a positive" : "a finite"} number`);
  }
  return value;
}

function typography(value) {
  if (value === undefined || value === null) return null;
  const candidate = object("FID typography", value);
  const fontDefinitions = object("FID typography fonts", candidate.fonts);
  const styleDefinitions = object("FID typography styles", candidate.styles);
  if (Object.keys(fontDefinitions).length === 0) throw new TypeError("FID typography must declare at least one font");
  if (Object.keys(styleDefinitions).length === 0) throw new TypeError("FID typography must declare at least one style");

  const fonts = {};
  for (const [role, definition] of Object.entries(fontDefinitions)) {
    const normalizedRole = text("FID font role", role);
    const normalizedDefinition = object(`FID font ${normalizedRole}`, definition);
    fonts[normalizedRole] = { asset:text(`FID font ${normalizedRole} asset`, normalizedDefinition.asset) };
  }

  const styles = {};
  for (const [name, definition] of Object.entries(styleDefinitions)) {
    const normalizedName = text("FID typography style name", name);
    const normalizedDefinition = object(`FID typography style ${normalizedName}`, definition);
    const font = text(`FID typography style ${normalizedName} font`, normalizedDefinition.font);
    if (!Object.hasOwn(fonts, font)) {
      throw new TypeError(`FID typography style ${normalizedName} references undeclared font ${font}`);
    }
    const align = normalizedDefinition.align ?? "left";
    const textTransform = normalizedDefinition.textTransform ?? "none";
    if (!TEXT_ALIGNMENTS.has(align)) throw new TypeError(`FID typography style ${normalizedName} alignment is invalid`);
    if (!TEXT_TRANSFORMS.has(textTransform)) throw new TypeError(`FID typography style ${normalizedName} text transform is invalid`);
    styles[normalizedName] = {
      font,
      sizePx:finite(`FID typography style ${normalizedName} sizePx`, normalizedDefinition.sizePx, { positive:true }),
      letterSpacingPx:finite(`FID typography style ${normalizedName} letterSpacingPx`, normalizedDefinition.letterSpacingPx ?? 0),
      align,
      textTransform,
    };
  }
  return { fonts, styles };
}

function requireStyleReferences(name, field, required, styles) {
  const refs = object(`${name} typography`, field?.typography);
  for (const key of required) {
    const style = text(`${name} typography ${key}`, refs[key]);
    if (!Object.hasOwn(styles, style)) throw new TypeError(`${name} typography ${key} references unknown style ${style}`);
  }
}

function exactArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value.slice(0);
  const view = value instanceof Uint8Array
    ? value
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

function hydrateFonts(candidateTypography, fontAssets) {
  if (candidateTypography === null || fontAssets === null || fontAssets === undefined) return Object.freeze({});
  const assets = object("FID font assets", fontAssets);
  const expectedAssets = new Set(Object.values(candidateTypography.fonts).map((definition) => definition.asset));
  for (const assetName of Object.keys(assets)) {
    if (!expectedAssets.has(assetName)) throw new TypeError(`FID font asset ${assetName} is not declared by the template`);
  }

  const fonts = {};
  for (const [role, definition] of Object.entries(candidateTypography.fonts)) {
    if (!Object.hasOwn(assets, definition.asset)) {
      throw new TypeError(`FID font asset ${definition.asset} for role ${role} is required`);
    }
    const raw = assetBytes(`FID font asset ${definition.asset}`, assets[definition.asset]);
    let font;
    try {
      font = parseOpenType(exactArrayBuffer(raw));
    } catch (cause) {
      throw new TypeError(`FID font asset ${definition.asset} for role ${role} is invalid`, { cause });
    }
    fonts[role] = Object.freeze({ role, asset:definition.asset, font });
  }
  return Object.freeze(fonts);
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
  const normalized = structuredClone(value);
  const normalizedTypography = typography(value.typography);
  if (normalizedTypography !== null) {
    normalized.typography = normalizedTypography;
    const styles = normalizedTypography.styles;
    requireStyleReferences("FID front FIN", value.front.fin, ["label", "value"], styles);
    requireStyleReferences("FID front name", value.front.name, ["label", "value"], styles);
    requireStyleReferences("FID front date", value.front.date, ["label", "value"], styles);
    requireStyleReferences("FID front verification", value.front.verification, ["label"], styles);
    requireStyleReferences("FID back credential", value.back.credentialId, ["value"], styles);
    requireStyleReferences("FID back revision", value.back.revision, ["value"], styles);
    requireStyleReferences("FID back template version", value.back.templateVersion, ["value"], styles);
    if (value.back.issuer) requireStyleReferences("FID back issuer", value.back.issuer, ["value"], styles);
  }
  return normalized;
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
  const fonts = hydrateFonts(normalizedLayout.typography ?? null, fontAssets);
  const [frontBaseLayer, frontUpperLayer, back] = await Promise.all([
    decodePngRgba(assetBytes("FID front base", frontBasePng)),
    decodePngRgba(assetBytes("FID front foreground", frontForegroundPng)),
    decodePngRgba(assetBytes("FID back base", backBasePng)),
  ]);
  return Object.freeze({
    version,
    layout:Object.freeze(normalizedLayout),
    typography:normalizedLayout.typography === undefined ? null : Object.freeze(normalizedLayout.typography),
    fonts,
    frontBaseLayer:assertCardSurface("FID front base", frontBaseLayer),
    frontUpperLayer:assertCardSurface("FID front foreground", frontUpperLayer),
    back:assertCardSurface("FID back base", back),
  });
}
