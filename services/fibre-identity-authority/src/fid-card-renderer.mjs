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

const LEGACY_LAYOUT = Object.freeze({
  canvas: FID_CARD_SIZE,
  front: Object.freeze({
    portrait: Object.freeze({ x:48, y:118, width:248, height:340 }),
    fin: Object.freeze({ labelX:344, labelY:132, valueX:344, valueY:164, valueScale:5 }),
    divider: Object.freeze({ x:344, y:222, width:464, height:2 }),
    name: Object.freeze({ labelX:344, labelY:250, valueX:344, valueY:278, valueScale:2 }),
    date: Object.freeze({ labelX:344, labelY:330, valueX:344, valueY:358, valueScale:3 }),
    verification: Object.freeze({ labelX:344, labelY:418, x:344, y:452, width:304, height:14 }),
    watermark: Object.freeze({ x:646, y:270, width:158, height:198, opacity:0.055 }),
  }),
  back: Object.freeze({
    drawLabels:true,
    credentialId:Object.freeze({ label:"CREDENTIAL", labelX:72, labelY:232, x:72, y:260, scale:2 }),
    revision:Object.freeze({ label:"REVISION", labelX:584, labelY:232, x:584, y:260, scale:3 }),
    templateVersion:Object.freeze({ label:"TEMPLATE", labelX:72, labelY:324, x:72, y:352, scale:2 }),
    renderPair:Object.freeze({
      label:"VERIFY RENDER PAIR", labelX:72, labelY:408,
      x:72, y:440, width:336, height:22,
      digestRight:786, digestY:444, digestScale:2,
    }),
    footerLine:Object.freeze({ x:70, y:498, width:716, height:1 }),
  }),
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

function blendRect(surface, box, color = [248, 249, 246, 255]) {
  const opacity = typeof box?.opacity === "number" ? box.opacity : 1;
  const xStart = Math.max(0, box.x);
  const yStart = Math.max(0, box.y);
  const xEnd = Math.min(surface.width, box.x + box.width);
  const yEnd = Math.min(surface.height, box.y + box.height);
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const i = (y * surface.width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        surface.rgba[i + c] = Math.round(color[c] * opacity + surface.rgba[i + c] * (1 - opacity));
      }
      surface.rgba[i + 3] = 255;
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

function grayscale(surface) {
  const result = clone(surface);
  for (let i = 0; i < result.rgba.length; i += 4) {
    const value = Math.round(
      result.rgba[i] * 0.2126
      + result.rgba[i + 1] * 0.7152
      + result.rgba[i + 2] * 0.0722
    );
    result.rgba[i] = value;
    result.rgba[i + 1] = value;
    result.rgba[i + 2] = value;
  }
  return result;
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

function fingerprintGrid(surface, digest, box, color) {
  const bits = [...digest.replace("sha256:", "")]
    .flatMap((value) => Number.parseInt(value, 16).toString(2).padStart(4, "0").split(""));
  const cell = Math.max(1, Math.floor(Math.min(box.width, box.height) / 16));
  const width = cell * 16;
  const height = cell * 16;
  const originX = box.x + Math.floor((box.width - width) / 2);
  const originY = box.y + Math.floor((box.height - height) / 2);
  for (let index = 0; index < Math.min(bits.length, 256); index += 1) {
    if (bits[index] !== "1") continue;
    rect(surface, originX + (index % 16) * cell, originY + Math.floor(index / 16) * cell, cell, cell, color);
  }
}

function layoutFor(template) {
  const layout = template.layout ?? LEGACY_LAYOUT;
  if (layout?.canvas?.width !== FID_CARD_SIZE.width || layout?.canvas?.height !== FID_CARD_SIZE.height
    || !layout.front?.portrait || !layout.front?.fin || !layout.front?.verification || !layout.front?.watermark
    || !layout.back?.credentialId || !layout.back?.revision || !layout.back?.templateVersion || !layout.back?.renderPair) {
    throw new TypeError("FID template layout is invalid");
  }
  return layout;
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

  return Object.freeze({ version, frontBaseLayer, frontUpperLayer, back, layout:LEGACY_LAYOUT });
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
  const presentationPhoto = grayscale(admittedPhoto);
  if (!template || typeof template.version !== "string") throw new TypeError("FID renderer requires a versioned template");
  for (const [name, layer] of [["front-base-layer", template.frontBaseLayer], ["front-upper-layer", template.frontUpperLayer], ["back", template.back]]) {
    requireSurface(`FID template ${name}`, layer);
    if (layer.width !== FID_CARD_SIZE.width || layer.height !== FID_CARD_SIZE.height) throw new TypeError(`FID template ${name} has unsupported dimensions`);
  }
  const layout = layoutFor(template);

  const identitySnapshot = identitySnapshotFor(workflow, authorizedIdentity);
  const identitySnapshotDigest = sha256(Buffer.from(JSON.stringify(canonical(identitySnapshot))));
  const materialDigest = sha256(Buffer.from(JSON.stringify(canonical({
    templateVersion: template.version,
    identitySnapshotDigest,
    photoAdmissionId: admission.admissionId,
    photoDigest: admission.candidatePhotoDigest,
  }))));

  const frontLayout = layout.front;
  const backLayout = layout.back;
  const front = clone(template.frontBaseLayer);
  if (frontLayout.bodyPanel) blendRect(front, frontLayout.bodyPanel);
  placeCover(
    front,
    presentationPhoto,
    frontLayout.portrait.x,
    frontLayout.portrait.y,
    frontLayout.portrait.width,
    frontLayout.portrait.height,
  );

  drawText(front, "FIBRE IDENTITY NUMBER", frontLayout.fin.labelX, frontLayout.fin.labelY, frontLayout.fin.labelScale ?? 2, CARD_PALETTE.inkSoft);
  drawText(front, workflow.fibreIdentityNumber, frontLayout.fin.valueX, frontLayout.fin.valueY, frontLayout.fin.valueScale, CARD_PALETTE.ink);
  if (frontLayout.divider) rect(front, frontLayout.divider.x, frontLayout.divider.y, frontLayout.divider.width, frontLayout.divider.height, CARD_PALETTE.paperWarm);

  if (identitySnapshot.displayName !== undefined && identitySnapshot.displayName !== null && frontLayout.name) {
    drawText(front, "NAME", frontLayout.name.labelX, frontLayout.name.labelY, frontLayout.name.labelScale ?? 2, CARD_PALETTE.inkSoft);
    drawText(front, identitySnapshot.displayName, frontLayout.name.valueX, frontLayout.name.valueY, frontLayout.name.valueScale, CARD_PALETTE.ink);
  }
  if (identitySnapshot.dateField !== undefined && identitySnapshot.dateField !== null && frontLayout.date) {
    drawText(front, identitySnapshot.dateField.kind === "birth_date" ? "BIRTH DATE" : "ENTRY DATE", frontLayout.date.labelX, frontLayout.date.labelY, frontLayout.date.labelScale ?? 2, CARD_PALETTE.inkSoft);
    drawText(front, identitySnapshot.dateField.value, frontLayout.date.valueX, frontLayout.date.valueY, frontLayout.date.valueScale, CARD_PALETTE.ink);
  }
  drawText(
    front,
    "VERIFY IDENTITY SNAPSHOT",
    frontLayout.verification.labelX ?? frontLayout.verification.x,
    frontLayout.verification.labelY ?? frontLayout.verification.y - 28,
    frontLayout.verification.labelScale ?? 2,
    CARD_PALETTE.inkSoft,
  );
  fingerprint(front, identitySnapshotDigest, frontLayout.verification.x, frontLayout.verification.y, frontLayout.verification.width, frontLayout.verification.height, CARD_PALETTE.inkSoft);

  placeCover(
    front,
    presentationPhoto,
    frontLayout.watermark.x,
    frontLayout.watermark.y,
    frontLayout.watermark.width,
    frontLayout.watermark.height,
    frontLayout.watermark.opacity,
  );
  blend(front, template.frontUpperLayer);

  const back = clone(template.back);
  if (backLayout.verification) fingerprintGrid(back, identitySnapshotDigest, backLayout.verification, CARD_PALETTE.inkSoft);

  const drawBackField = (field, fallbackLabel, value, color = CARD_PALETTE.ink) => {
    if (backLayout.drawLabels !== false) {
      drawText(back, field.label ?? fallbackLabel, field.labelX ?? field.x, field.labelY ?? field.y - 28, field.labelScale ?? 2, CARD_PALETTE.lightMuted);
    }
    drawText(back, value, field.x, field.y, field.scale, color);
  };
  drawBackField(backLayout.credentialId, "CREDENTIAL", workflow.proposedCredentialId.slice(-20), backLayout.drawLabels === false ? CARD_PALETTE.ink : CARD_PALETTE.light);
  drawBackField(backLayout.revision, "REVISION", String(workflow.proposedRevision).padStart(2, "0"), backLayout.drawLabels === false ? CARD_PALETTE.ink : CARD_PALETTE.light);
  drawBackField(backLayout.templateVersion, "TEMPLATE", template.version, backLayout.drawLabels === false ? CARD_PALETTE.ink : CARD_PALETTE.light);
  if (backLayout.issuer) drawBackField(backLayout.issuer, "ISSUER", "FIBRE IDENTITY AUTHORITY", CARD_PALETTE.ink);

  if (backLayout.drawLabels !== false) {
    drawText(back, backLayout.renderPair.label ?? "VERIFY RENDER PAIR", backLayout.renderPair.labelX ?? backLayout.renderPair.x, backLayout.renderPair.labelY ?? backLayout.renderPair.y - 28, backLayout.renderPair.labelScale ?? 2, CARD_PALETTE.lightMuted);
  }
  fingerprint(back, materialDigest, backLayout.renderPair.x, backLayout.renderPair.y, backLayout.renderPair.width, backLayout.renderPair.height, backLayout.drawLabels === false ? CARD_PALETTE.inkSoft : CARD_PALETTE.light);
  if (backLayout.renderPair.digestRight !== undefined) {
    drawTextRight(back, identitySnapshotDigest.slice(-16), backLayout.renderPair.digestRight, backLayout.renderPair.digestY, backLayout.renderPair.digestScale ?? 2, backLayout.drawLabels === false ? CARD_PALETTE.inkSoft : CARD_PALETTE.lightMuted);
  }
  if (backLayout.footerLine) rect(back, backLayout.footerLine.x, backLayout.footerLine.y, backLayout.footerLine.width, backLayout.footerLine.height, backLayout.drawLabels === false ? CARD_PALETTE.inkSoft : CARD_PALETTE.lightMuted);

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
