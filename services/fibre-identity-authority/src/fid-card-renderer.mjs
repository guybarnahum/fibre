import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { assertFidPhotoAdmissionReceipt } from "./fid-photo-admission.mjs";

export const FID_CARD_TEMPLATE_VERSION = "fid-card-template-v0.1";
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

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
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

function drawText(surface, text, x, y, scale, color) {
  let cursor = x;
  for (const raw of String(text).toUpperCase()) {
    const glyph = GLYPHS[raw] ?? GLYPHS["?"];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (glyph[row][col] === "1") rect(surface, cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 6 * scale;
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
  const frontBaseLayer = rgbaSurface(width, height, [238, 236, 226, 255]);
  const frontUpperLayer = rgbaSurface(width, height);
  const back = rgbaSurface(width, height, [29, 34, 35, 255]);

  rect(frontBaseLayer, 0, 0, width, 72, [28, 33, 34, 255]);
  for (let x = -height; x < width; x += 34) {
    for (let y = 0; y < height; y += 1) pixel(frontBaseLayer, x + y, y, [218, 215, 201, 255]);
  }
  rect(frontUpperLayer, 18, 18, width - 36, 2, [52, 58, 58, 170]);
  rect(frontUpperLayer, 18, height - 20, width - 36, 2, [52, 58, 58, 170]);
  drawText(frontUpperLayer, "FIBRE IDENTITY", 42, 24, 4, [238, 236, 226, 255]);

  for (let x = -height; x < width; x += 26) {
    for (let y = 0; y < height; y += 1) pixel(back, x + y, y, [43, 50, 50, 255]);
  }
  drawText(back, "FIBRE", 54, 54, 7, [222, 220, 208, 255]);
  drawText(back, "IDENTITY CREDENTIAL", 58, 126, 3, [170, 174, 166, 255]);

  return Object.freeze({ version, frontBaseLayer, frontUpperLayer, back });
}

export function fidRenderPhotoDigest(photo) {
  const value = requireSurface("FID render photo", photo);
  const dimensions = Buffer.alloc(8);
  dimensions.writeUInt32BE(value.width, 0);
  dimensions.writeUInt32BE(value.height, 4);
  return sha256(Buffer.concat([dimensions, Buffer.from(value.rgba)]));
}

export function renderFidCard({ workflow: candidateWorkflow, photoAdmission: candidateAdmission, photo, template = createFidCardTemplate() }) {
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

  const identitySnapshot = Object.freeze({
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    threadId: workflow.threadId,
    fibreIdentityNumber: workflow.fibreIdentityNumber,
    registrationId: workflow.registrationId,
    civilRegistrationDigest: workflow.civilRegistrationDigest,
    requestedAt: workflow.requestedAt,
  });
  const identitySnapshotDigest = sha256(Buffer.from(JSON.stringify(canonical(identitySnapshot))));
  const materialDigest = sha256(Buffer.from(JSON.stringify(canonical({
    templateVersion: template.version,
    identitySnapshotDigest,
    photoAdmissionId: admission.admissionId,
    photoDigest: admission.candidatePhotoDigest,
  }))));

  const front = clone(template.frontBaseLayer);
  placeCover(front, admittedPhoto, 54, 112, 280, 350);
  drawText(front, "FIN", 382, 140, 3, [42, 47, 47, 255]);
  drawText(front, workflow.fibreIdentityNumber, 382, 174, 5, [24, 29, 29, 255]);
  drawText(front, "REV", 382, 244, 3, [86, 91, 89, 255]);
  drawText(front, String(workflow.proposedRevision), 382, 278, 4, [24, 29, 29, 255]);
  drawText(front, "FID", 382, 334, 3, [86, 91, 89, 255]);
  drawText(front, workflow.proposedCredentialId.slice(-16), 382, 368, 2, [24, 29, 29, 255]);
  fingerprint(front, identitySnapshotDigest, 382, 424, 256, 12, [73, 80, 79, 255]);

  const watermark = rgbaSurface(160, 200);
  placeCover(watermark, admittedPhoto, 0, 0, watermark.width, watermark.height, 0.18);
  blend(front, watermark, 650, 250, 0.32);
  blend(front, template.frontUpperLayer);

  const back = clone(template.back);
  drawText(back, "TEMPLATE", 58, 206, 2, [150, 156, 150, 255]);
  drawText(back, template.version, 58, 232, 2, [222, 220, 208, 255]);
  drawText(back, "PAIR", 58, 288, 2, [150, 156, 150, 255]);
  fingerprint(back, materialDigest, 58, 318, 256, 22, [222, 220, 208, 255]);
  drawText(back, workflow.proposedCredentialId.slice(-20), 58, 382, 2, [176, 181, 173, 255]);

  const frontPng = encodePng(front);
  const backPng = encodePng(back);
  return Object.freeze({
    templateVersion: template.version,
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    identitySnapshotDigest,
    photoAdmissionId: admission.admissionId,
    frontRenderDigest: sha256(frontPng),
    backRenderDigest: sha256(backPng),
    files: Object.freeze({ "front.png": frontPng, "back.png": backPng }),
  });
}
