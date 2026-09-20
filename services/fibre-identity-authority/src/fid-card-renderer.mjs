import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { assertFidPhotoAdmissionReceipt } from "./fid-photo-admission.mjs";
import { drawFidText, measureFidText } from "./fid-card-typography.mjs";

export const FID_CARD_SIZE = Object.freeze({ width:856, height:540 });

const CARD_PALETTE = Object.freeze({
  ink:[24, 29, 29, 255],
  inkSoft:[75, 81, 78, 255],
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
    credentialId:workflow.proposedCredentialId,
    revision:workflow.proposedRevision,
    threadId:workflow.threadId,
    fibreIdentityNumber:workflow.fibreIdentityNumber,
    registrationId:workflow.registrationId,
    civilRegistrationDigest:workflow.civilRegistrationDigest,
    requestedAt:workflow.requestedAt,
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
    dateField:birthDate === null ? null : Object.freeze({ kind:"birth_date", value:birthDate }),
  });
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
      for (let channel = 0; channel < 3; channel += 1) {
        dst.rgba[di + channel] = Math.round(src.rgba[si + channel] * alpha + dst.rgba[di + channel] * (1 - alpha));
      }
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
      const di = ((y + py) * dst.width + (x + px)) * 4;
      const alpha = (src.rgba[si + 3] / 255) * opacity;
      for (let channel = 0; channel < 3; channel += 1) {
        dst.rgba[di + channel] = Math.round(src.rgba[si + channel] * alpha + dst.rgba[di + channel] * (1 - alpha));
      }
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
    chunk("IDAT", deflateSync(scanlines, { level:9 })),
    chunk("IEND"),
  ]);
}

function clone(surface) {
  return { width:surface.width, height:surface.height, rgba:new Uint8Array(surface.rgba) };
}

function grayscale(surface) {
  const result = clone(surface);
  for (let index = 0; index < result.rgba.length; index += 4) {
    const value = Math.round(
      result.rgba[index] * 0.2126
      + result.rgba[index + 1] * 0.7152
      + result.rgba[index + 2] * 0.0722,
    );
    result.rgba[index] = value;
    result.rgba[index + 1] = value;
    result.rgba[index + 2] = value;
  }
  return result;
}

function fingerprint(surface, digest, x, y, width, height, color) {
  const bits = digest.replace("sha256:", "");
  const columns = Math.min(bits.length * 4, width);
  for (let column = 0; column < columns; column += 1) {
    const nibble = Number.parseInt(bits[Math.floor(column / 4)], 16);
    if ((nibble >> (3 - (column % 4))) & 1) rect(surface, x + column, y, 1, height, color);
  }
}

function fingerprintGrid(surface, digest, box, color) {
  const bits = [...digest.replace("sha256:", "")]
    .flatMap((value) => Number.parseInt(value, 16).toString(2).padStart(4, "0").split(""));
  const cell = Math.max(1, Math.floor(Math.min(box.width, box.height) / 16));
  const originX = box.x + Math.floor((box.width - cell * 16) / 2);
  const originY = box.y + Math.floor((box.height - cell * 16) / 2);
  for (let index = 0; index < Math.min(bits.length, 256); index += 1) {
    if (bits[index] === "1") {
      rect(surface, originX + (index % 16) * cell, originY + Math.floor(index / 16) * cell, cell, cell, color);
    }
  }
}

function layoutFor(template) {
  const layout = template?.layout;
  if (!layout || layout.canvas?.width !== FID_CARD_SIZE.width || layout.canvas?.height !== FID_CARD_SIZE.height
    || !layout.typography?.styles || !layout.front?.portrait || !layout.front?.fin
    || !layout.front?.issueDate || !layout.front?.verification || !layout.front?.watermark
    || !layout.back?.credentialId || !layout.back?.revision || !layout.back?.templateVersion
    || !layout.back?.issuer || !layout.back?.renderPair) {
    throw new TypeError("FID template layout is invalid");
  }
  return layout;
}

function drawStyled(surface, template, value, x, y, styleName, color, maxWidth, fieldName) {
  const style = template.layout.typography.styles[styleName];
  if (!style) throw new TypeError(`FID typography style ${String(styleName)} is unavailable`);
  const font = template.fonts?.[style.font]?.font;
  if (!font) throw new TypeError(`FID font role ${String(style.font)} is unavailable`);
  if (maxWidth !== undefined && measureFidText(font, value, style) > maxWidth) {
    throw new TypeError(`FID ${fieldName} does not fit`);
  }
  drawFidText(surface, value, x, y, style, template.fonts, color);
}

function centeredValueY(template, field) {
  const style = template.layout.typography.styles[field.typography?.value];
  const font = template.fonts?.[style?.font]?.font;
  if (!style || !font || !(field.height > 0)) throw new TypeError("FID back field layout is invalid");
  const lineHeight = (font.ascender - font.descender) * style.sizePx / font.unitsPerEm;
  return field.y + (field.height - lineHeight) / 2;
}

function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

export function fidRenderPhotoDigest(photo) {
  const value = requireSurface("FID render photo", photo);
  const dimensions = Buffer.alloc(8);
  dimensions.writeUInt32BE(value.width, 0);
  dimensions.writeUInt32BE(value.height, 4);
  return sha256(Buffer.concat([dimensions, Buffer.from(value.rgba)]));
}

export function renderFidCard({
  workflow:candidateWorkflow,
  photoAdmission:candidateAdmission,
  photo,
  authorizedIdentity = null,
  issuedAt:candidateIssuedAt,
  template,
}) {
  const workflow = normalizeFidIssuanceWorkflowRecord(candidateWorkflow);
  const issuedAt = iso("FID render issuedAt", candidateIssuedAt);
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
  for (const [name, layer] of [
    ["front-base-layer", template.frontBaseLayer],
    ["front-upper-layer", template.frontUpperLayer],
    ["back", template.back],
  ]) {
    requireSurface(`FID template ${name}`, layer);
    if (layer.width !== FID_CARD_SIZE.width || layer.height !== FID_CARD_SIZE.height) {
      throw new TypeError(`FID template ${name} has unsupported dimensions`);
    }
  }
  const layout = layoutFor(template);
  const identitySnapshot = identitySnapshotFor(workflow, authorizedIdentity);
  const identitySnapshotDigest = sha256(Buffer.from(JSON.stringify(canonical(identitySnapshot))));
  const materialDigest = sha256(Buffer.from(JSON.stringify(canonical({
    templateVersion:template.version,
    identitySnapshotDigest,
    photoAdmissionId:admission.admissionId,
    photoDigest:admission.candidatePhotoDigest,
    issuedAt,
  }))));

  const frontLayout = layout.front;
  const front = clone(template.frontBaseLayer);
  placeCover(
    front,
    grayscale(admittedPhoto),
    frontLayout.portrait.x,
    frontLayout.portrait.y,
    frontLayout.portrait.width,
    frontLayout.portrait.height,
  );

  drawStyled(
    front,
    template,
    "FIBRE IDENTITY NUMBER",
    frontLayout.fin.labelX,
    frontLayout.fin.labelY,
    frontLayout.fin.typography?.label,
    CARD_PALETTE.inkSoft,
    frontLayout.fin.width,
    "FIN label",
  );
  drawStyled(
    front,
    template,
    workflow.fibreIdentityNumber,
    frontLayout.fin.valueX,
    frontLayout.fin.valueY,
    frontLayout.fin.typography?.value,
    CARD_PALETTE.ink,
    frontLayout.fin.width,
    "FIN",
  );
  if (identitySnapshot.displayName !== undefined && identitySnapshot.displayName !== null && frontLayout.name) {
    drawStyled(front, template, "NAME", frontLayout.name.labelX, frontLayout.name.labelY, frontLayout.name.typography?.label, CARD_PALETTE.inkSoft, frontLayout.name.width, "name label");
    drawStyled(front, template, identitySnapshot.displayName, frontLayout.name.valueX, frontLayout.name.valueY, frontLayout.name.typography?.value, CARD_PALETTE.ink, frontLayout.name.width, "name");
  }
  if (identitySnapshot.dateField !== undefined && identitySnapshot.dateField !== null && frontLayout.date) {
    const label = identitySnapshot.dateField.kind === "birth_date" ? "BIRTH DATE" : "ENTRY DATE";
    drawStyled(front, template, label, frontLayout.date.labelX, frontLayout.date.labelY, frontLayout.date.typography?.label, CARD_PALETTE.inkSoft, frontLayout.date.width, "date label");
    drawStyled(front, template, identitySnapshot.dateField.value, frontLayout.date.valueX, frontLayout.date.valueY, frontLayout.date.typography?.value, CARD_PALETTE.ink, frontLayout.date.width, "date");
  }
  drawStyled(front, template, "ISSUE DATE", frontLayout.issueDate.labelX, frontLayout.issueDate.labelY, frontLayout.issueDate.typography?.label, CARD_PALETTE.inkSoft, frontLayout.issueDate.width, "issue date label");
  drawStyled(front, template, issuedAt.slice(0, 10), frontLayout.issueDate.valueX, frontLayout.issueDate.valueY, frontLayout.issueDate.typography?.value, CARD_PALETTE.ink, frontLayout.issueDate.width, "issue date");
  drawStyled(
    front,
    template,
    "VERIFY IDENTITY SNAPSHOT",
    frontLayout.verification.labelX ?? frontLayout.verification.x,
    frontLayout.verification.labelY ?? frontLayout.verification.y - 28,
    frontLayout.verification.typography?.label,
    CARD_PALETTE.inkSoft,
    frontLayout.verification.width,
    "verification label",
  );
  fingerprint(
    front,
    identitySnapshotDigest,
    frontLayout.verification.x,
    frontLayout.verification.y,
    frontLayout.verification.width,
    frontLayout.verification.height,
    CARD_PALETTE.inkSoft,
  );
  placeCover(
    front,
    grayscale(admittedPhoto),
    frontLayout.watermark.x,
    frontLayout.watermark.y,
    frontLayout.watermark.width,
    frontLayout.watermark.height,
    frontLayout.watermark.opacity,
  );
  blend(front, template.frontUpperLayer);

  const backLayout = layout.back;
  const back = clone(template.back);
  if (backLayout.verification) fingerprintGrid(back, identitySnapshotDigest, backLayout.verification, CARD_PALETTE.inkSoft);
  const drawBackValue = (field, value, fieldName) => drawStyled(
    back,
    template,
    value,
    field.x,
    centeredValueY(template, field),
    field.typography?.value,
    CARD_PALETTE.ink,
    field.width,
    fieldName,
  );
  drawBackValue(backLayout.credentialId, workflow.proposedCredentialId.slice(-20), "credential id");
  drawBackValue(backLayout.revision, String(workflow.proposedRevision).padStart(2, "0"), "revision");
  drawBackValue(backLayout.templateVersion, template.version, "template version");
  if (backLayout.issuer) drawBackValue(backLayout.issuer, "FIBRE IDENTITY AUTHORITY", "issuer");

  fingerprint(
    back,
    materialDigest,
    backLayout.renderPair.x,
    backLayout.renderPair.y,
    backLayout.renderPair.width,
    backLayout.renderPair.height,
    CARD_PALETTE.inkSoft,
  );

  const frontPng = encodePng(front);
  const backPng = encodePng(back);
  return Object.freeze({
    templateVersion:template.version,
    issuedAt,
    credentialId:workflow.proposedCredentialId,
    revision:workflow.proposedRevision,
    identitySnapshot,
    identitySnapshotDigest,
    photoAdmissionId:admission.admissionId,
    frontRenderDigest:sha256(frontPng),
    backRenderDigest:sha256(backPng),
    files:Object.freeze({ "front.png":frontPng, "back.png":backPng }),
  });
}
