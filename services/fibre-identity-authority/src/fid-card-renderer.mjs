import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { assertFidPhotoAdmissionReceipt } from "./fid-photo-admission.mjs";

export const FID_CARD_TEMPLATE_VERSION = "fid-card-template-v0.3";
export const FID_CARD_SIZE = Object.freeze({ width: 856, height: 540 });

const GLYPHS = Object.freeze({
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  ":": ["00000","01100","01100","00000","01100","01100","00000"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","10000","11110","00001","00001","11110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  J: ["00001","00001","00001","00001","10001","10001","01110"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
});

const CARD_PALETTE = Object.freeze({
  paper: [240, 238, 229, 255],
  paperWarm: [227, 223, 209, 255],
  weave: [232, 229, 218, 255],
  ink: [24, 29, 29, 255],
  inkSoft: [75, 81, 78, 255],
  graphite: [28, 33, 34, 255],
  graphiteSoft: [43, 50, 50, 255],
  light: [232, 229, 216, 255],
  lightMuted: [166, 172, 164, 255],
  accent: [126, 107, 79, 255],
});

const FRONT_LAYOUT = Object.freeze({
  margin: 46,
  bodyX: 344,
  right: 808,
  headerHeight: 88,
  portraitX: 48,
  portraitY: 118,
  portraitWidth: 248,
  portraitHeight: 340,
});

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function cleanIdentityText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function identitySnapshotFor(workflow, authorizedIdentity) {
  const base = {
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    threadId: workflow.threadId,
    fibreIdentityNumber: workflow.fibreIdentityNumber,
    registrationId: workflow.registrationId,
    civilRegistrationDigest: workflow.civilRegistrationDigest,
    requestedAt: workflow.requestedAt,
  };
  if (authorizedIdentity == null) return Object.freeze(base);
  if (typeof authorizedIdentity !== "object" || Array.isArray(authorizedIdentity)) {
    throw new TypeError("FID authorized identity is invalid");
  }
  if (authorizedIdentity.threadId !== undefined && authorizedIdentity.threadId !== workflow.threadId) {
    throw new TypeError("FID authorized identity belongs to a different Thread");
  }
  if (authorizedIdentity.fibreIdentityNumber != null
    && authorizedIdentity.fibreIdentityNumber !== workflow.fibreIdentityNumber) {
    throw new TypeError("FID authorized identity has a different FIN");
  }
  const displayName = cleanIdentityText(authorizedIdentity.displayName);
  const birthDate = cleanIdentityText(authorizedIdentity.birthDate);
  if (birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new TypeError("FID authorized birth date must be YYYY-MM-DD");
  }
  return Object.freeze({
    ...base,
    displayName,
    dateField: birthDate === null ? null : Object.freeze({ kind: "birth_date", value: birthDate }),
  });
}

function rgbaSurface(width, height, color = [0, 0, 0, 0]) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) rgba.set(color, i);
  return { width, height, rgba };
}

function requireSurface(name, value) {
  if (!value || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height)
    || !(value.rgba instanceof Uint8Array) || value.rgba.length !== value.width * value.height * 4) {
    throw new TypeError(`${name} must be an RGBA surface`);
  }
  return value;
}

function pixel(surface, x, y, color) {
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return;
  surface.rgba.set(color, (y * surface.width + x) * 4);
}

function rect(surface, x, y, width, height, color) {
  for (let py = Math.max(0, y); py < Math.min(surface.height, y + height); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(surface.width, x + width); px += 1) pixel(surface, px, py, color);
  }
}

function textWidth(text, scale, tracking = scale) {
  const length = String(text).length;
  return length === 0 ? 0 : length * 5 * scale + (length - 1) * tracking;
}

function drawText(surface, text, x, y, scale, color, { tracking = scale } = {}) {
  let cursor = x;
  for (const raw of String(text).toUpperCase()) {
    const glyph = GLYPHS[raw] ?? GLYPHS["?"];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (glyph[row][col] === "1") rect(surface, cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 5 * scale + tracking;
  }
}

function drawTextRight(surface, text, right, y, scale, color, options = {}) {
  const tracking = options.tracking ?? scale;
  drawText(surface, text, right - textWidth(text, scale, tracking), y, scale, color, options);
}

function outlineRect(surface, x, y, width, height, color, thickness = 1) {
  rect(surface, x, y, width, thickness, color);
  rect(surface, x, y + height - thickness, width, thickness, color);
  rect(surface, x, y, thickness, height, color);
  rect(surface, x + width - thickness, y, thickness, height, color);
}

function drawWeave(surface, color, { spacing = 44, yStart = 0, yEnd = surface.height } = {}) {
  for (let x = -surface.height; x < surface.width + surface.height; x += spacing) {
    for (let y = yStart; y < yEnd; y += 1) pixel(surface, x + y, y, color);
  }
  for (let x = 0; x < surface.width + surface.height; x += spacing * 2) {
    for (let y = yStart; y < yEnd; y += 1) pixel(surface, x - y, y, color);
  }
}

function blend(dst, src, dx = 0, dy = 0, opacity = 1) {
  for (let sy = 0; sy < src.height; sy += 1) {
    const y = sy + dy;
    if (y < 0 || y >= dst.height) continue;
    for (let sx = 0; sx < src.width; sx += 1) {
      const x = sx + dx;
      if (x < 0 || x >= dst.width) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (y * dst.width + x) * 4;
      const alpha = (src.rgba[si + 3] / 255) * opacity;
      if (alpha <= 0) continue;
      for (let c = 0; c < 3; c += 1) dst.rgba[di + c] = Math.round(src.rgba[si + c] * alpha + dst.rgba[di + c] * (1 - alpha));
      dst.rgba[di + 3] = 255;
    }
  }
}

function placeCover(dst, src, x, y, width, height, opacity = 1) {
  const scale = Math.max(width / src.width, height / src.height);
  const visibleWidth = width / scale;
  const visibleHeight = height / scale;
  const originX = (src.width - visibleWidth) / 2;
  const originY = (src.height - visibleHeight) / 2;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const sx = Math.min(src.width - 1, Math.max(0, Math.floor(originX + px / scale)));
      const sy = Math.min(src.height - 1, Math.max(0, Math.floor(originY + py / scale)));
      const si = (sy * src.width + sx) * 4;
      const alpha = (src.rgba[si + 3] / 255) * opacity;
      const di = ((y + py) * dst.width + (x + px)) * 4;
      for (let c = 0; c < 3; c += 1) dst.rgba[di + c] = Math.round(src.rgba[si + c] * alpha + dst.rgba[di + c] * (1 - alpha));
      dst.rgba[di + 3] = 255;
    }
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(surface) {
  const { width, height, rgba } = requireSurface("PNG surface", surface);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    scanlines[offset] = 0;
    scanlines.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), offset + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND"),
  ]);
}

function clone(surface) {
  return { width: surface.width, height: surface.height, rgba: new Uint8Array(surface.rgba) };
}

function fingerprint(surface, digest, x, y, width, height, color) {
  const bits = digest.replace("sha256:", "");
  const columns = Math.min(bits.length * 4, width);
  for (let col = 0; col < columns; col += 1) {
    const nibble = Number.parseInt(bits[Math.floor(col / 4)], 16);
    const on = (nibble >> (3 - (col % 4))) & 1;
    if (on) rect(surface, x + col, y, 1, height, color);
  }
}

export function createFidCardTemplate({ version = FID_CARD_TEMPLATE_VERSION } = {}) {
  if (typeof version !== "string" || version.trim() === "") throw new TypeError("FID template version is required");
  const { width, height } = FID_CARD_SIZE;
  const frontBaseLayer = rgbaSurface(width, height, CARD_PALETTE.paper);
  const frontUpperLayer = rgbaSurface(width, height);
  const back = rgbaSurface(width, height, CARD_PALETTE.graphite);

  rect(frontBaseLayer, 0, 0, width, FRONT_LAYOUT.headerHeight, CARD_PALETTE.graphite);
  drawWeave(frontBaseLayer, CARD_PALETTE.weave, { spacing: 56, yStart: FRONT_LAYOUT.headerHeight, yEnd: height - 20 });
  rect(frontBaseLayer, FRONT_LAYOUT.margin, FRONT_LAYOUT.headerHeight - 3, width - FRONT_LAYOUT.margin * 2, 3, CARD_PALETTE.accent);

  drawText(frontUpperLayer, "FIBRE", FRONT_LAYOUT.margin, 24, 4, CARD_PALETTE.light);
  drawTextRight(frontUpperLayer, "IDENTITY CREDENTIAL", FRONT_LAYOUT.right, 31, 2, CARD_PALETTE.lightMuted);
  outlineRect(
    frontUpperLayer,
    FRONT_LAYOUT.portraitX - 4,
    FRONT_LAYOUT.portraitY - 4,
    FRONT_LAYOUT.portraitWidth + 8,
    FRONT_LAYOUT.portraitHeight + 8,
    CARD_PALETTE.inkSoft,
    2,
  );
  rect(frontUpperLayer, 320, 118, 2, 340, CARD_PALETTE.paperWarm);
  rect(frontUpperLayer, FRONT_LAYOUT.margin, 499, width - FRONT_LAYOUT.margin * 2, 1, CARD_PALETTE.inkSoft);

  drawWeave(back, CARD_PALETTE.graphiteSoft, { spacing: 38, yStart: 0, yEnd: height });
  rect(back, 48, 48, 4, 132, CARD_PALETTE.accent);
  drawText(back, "FIBRE", 70, 48, 6, CARD_PALETTE.light);
  drawText(back, "IDENTITY CREDENTIAL", 72, 106, 2, CARD_PALETTE.lightMuted);
  drawText(back, "FIBRE IDENTITY AUTHORITY", 72, 142, 2, CARD_PALETTE.lightMuted);
  rect(back, 70, 188, 716, 2, CARD_PALETTE.accent);

  return Object.freeze({ version, frontBaseLayer, frontUpperLayer, back });
}

export function fidRenderPhotoDigest(photo) {
  const value = requireSurface("FID render photo", photo);
  const dimensions = Buffer.alloc(8);
  dimensions.writeUInt32BE(value.width, 0);
  dimensions.writeUInt32BE(value.height, 4);
  return sha256(Buffer.concat([dimensions, Buffer.from(value.rgba)]));
}

export function renderFidCard({
  workflow: candidateWorkflow,
  photoAdmission: candidateAdmission,
  photo,
  authorizedIdentity = null,
  template = createFidCardTemplate(),
}) {
  const workflow = normalizeFidIssuanceWorkflowRecord(candidateWorkflow);
  const admission = assertFidPhotoAdmissionReceipt(candidateAdmission);
  if (admission.decision !== "accepted") throw new TypeError("FID renderer requires an accepted photo admission");
  if (admission.workflowId !== workflow.workflowId || admission.threadId !== workflow.threadId) {
    throw new TypeError("FID renderer photo admission belongs to a different issuance");
  }
  const admittedPhoto = requireSurface("FID render photo", photo);
  if (fidRenderPhotoDigest(admittedPhoto) !== admission.candidatePhotoDigest) {
    throw new TypeError("FID renderer photo does not match the admitted photo digest");
  }
  if (!template || typeof template.version !== "string") throw new TypeError("FID renderer requires a versioned template");
  for (const [name, layer] of [["front-base-layer", template.frontBaseLayer], ["front-upper-layer", template.frontUpperLayer], ["back", template.back]]) {
    requireSurface(`FID template ${name}`, layer);
    if (layer.width !== FID_CARD_SIZE.width || layer.height !== FID_CARD_SIZE.height) throw new TypeError(`FID template ${name} has unsupported dimensions`);
  }

  const identitySnapshot = identitySnapshotFor(workflow, authorizedIdentity);
  const identitySnapshotDigest = sha256(Buffer.from(JSON.stringify(canonical(identitySnapshot))));
  const materialDigest = sha256(Buffer.from(JSON.stringify(canonical({
    templateVersion: template.version,
    identitySnapshotDigest,
    photoAdmissionId: admission.admissionId,
    photoDigest: admission.candidatePhotoDigest,
  }))));

  const front = clone(template.frontBaseLayer);
  placeCover(
    front,
    admittedPhoto,
    FRONT_LAYOUT.portraitX,
    FRONT_LAYOUT.portraitY,
    FRONT_LAYOUT.portraitWidth,
    FRONT_LAYOUT.portraitHeight,
  );

  drawText(front, "FIBRE IDENTITY NUMBER", FRONT_LAYOUT.bodyX, 132, 2, CARD_PALETTE.inkSoft);
  drawText(front, workflow.fibreIdentityNumber, FRONT_LAYOUT.bodyX, 164, 5, CARD_PALETTE.ink);
  rect(front, FRONT_LAYOUT.bodyX, 222, FRONT_LAYOUT.right - FRONT_LAYOUT.bodyX, 2, CARD_PALETTE.paperWarm);

  if (identitySnapshot.displayName !== undefined && identitySnapshot.displayName !== null) {
    drawText(front, "NAME", FRONT_LAYOUT.bodyX, 250, 2, CARD_PALETTE.inkSoft);
    drawText(front, identitySnapshot.displayName, FRONT_LAYOUT.bodyX, 278, 2, CARD_PALETTE.ink);
  }
  if (identitySnapshot.dateField !== undefined && identitySnapshot.dateField !== null) {
    drawText(front, identitySnapshot.dateField.kind === "birth_date" ? "BIRTH DATE" : "ENTRY DATE", FRONT_LAYOUT.bodyX, 330, 2, CARD_PALETTE.inkSoft);
    drawText(front, identitySnapshot.dateField.value, FRONT_LAYOUT.bodyX, 358, 3, CARD_PALETTE.ink);
  }
  drawText(front, "VERIFY IDENTITY SNAPSHOT", FRONT_LAYOUT.bodyX, 418, 2, CARD_PALETTE.inkSoft);
  fingerprint(front, identitySnapshotDigest, FRONT_LAYOUT.bodyX, 452, 304, 14, CARD_PALETTE.inkSoft);

  placeCover(front, admittedPhoto, 646, 270, 158, 198, 0.055);
  blend(front, template.frontUpperLayer);

  const back = clone(template.back);
  drawText(back, "CREDENTIAL", 72, 232, 2, CARD_PALETTE.lightMuted);
  drawText(back, workflow.proposedCredentialId.slice(-20), 72, 260, 2, CARD_PALETTE.light);
  drawText(back, "REVISION", 584, 232, 2, CARD_PALETTE.lightMuted);
  drawText(back, String(workflow.proposedRevision).padStart(2, "0"), 584, 260, 3, CARD_PALETTE.light);

  drawText(back, "TEMPLATE", 72, 324, 2, CARD_PALETTE.lightMuted);
  drawText(back, template.version, 72, 352, 2, CARD_PALETTE.light);
  drawText(back, "VERIFY RENDER PAIR", 72, 408, 2, CARD_PALETTE.lightMuted);
  fingerprint(back, materialDigest, 72, 440, 336, 22, CARD_PALETTE.light);
  drawTextRight(back, identitySnapshotDigest.slice(-16), 786, 444, 2, CARD_PALETTE.lightMuted);
  rect(back, 70, 498, 716, 1, CARD_PALETTE.lightMuted);

  const frontPng = encodePng(front);
  const backPng = encodePng(back);
  return Object.freeze({
    templateVersion: template.version,
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    identitySnapshot,
    identitySnapshotDigest,
    photoAdmissionId: admission.admissionId,
    frontRenderDigest: sha256(frontPng),
    backRenderDigest: sha256(backPng),
    files: Object.freeze({ "front.png": frontPng, "back.png": backPng }),
  });
}
