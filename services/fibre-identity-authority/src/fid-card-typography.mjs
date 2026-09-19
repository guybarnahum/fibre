function dataView(value) {
  if (value instanceof ArrayBuffer) return new DataView(value);
  if (ArrayBuffer.isView(value)) return new DataView(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError("FID TrueType bytes are required");
}

function midpoint(a, b) {
  return { x:(a.x + b.x) / 2, y:(a.y + b.y) / 2, on:true };
}

export function createFidTrueTypeFont(bytes) {
  const view = dataView(bytes);
  const u8 = (offset) => view.getUint8(offset);
  const i8 = (offset) => view.getInt8(offset);
  const u16 = (offset) => view.getUint16(offset, false);
  const i16 = (offset) => view.getInt16(offset, false);
  const u32 = (offset) => view.getUint32(offset, false);

  try {
    const tables = {};
    for (let index = 0; index < u16(4); index += 1) {
      const offset = 12 + index * 16;
      const tag = String.fromCharCode(u8(offset), u8(offset + 1), u8(offset + 2), u8(offset + 3));
      tables[tag] = { offset:u32(offset + 8), length:u32(offset + 12) };
    }
    const table = (tag) => {
      if (!tables[tag]) throw new TypeError(`missing ${tag} table`);
      return tables[tag].offset;
    };

    const head = table("head");
    const hhea = table("hhea");
    const maxp = table("maxp");
    const hmtx = table("hmtx");
    const loca = table("loca");
    const glyf = table("glyf");
    const cmapRoot = table("cmap");
    const unitsPerEm = u16(head + 18);
    const locaFormat = i16(head + 50);
    const numGlyphs = u16(maxp + 4);
    const numMetrics = u16(hhea + 34);
    const ascender = i16(hhea + 4);
    const descender = i16(hhea + 6);

    let cmap = null;
    for (let index = 0; index < u16(cmapRoot + 2); index += 1) {
      const candidate = cmapRoot + u32(cmapRoot + 4 + index * 8 + 4);
      if (u16(candidate) === 4) { cmap = candidate; break; }
    }
    if (cmap === null) throw new TypeError("format 4 cmap is required");

    const glyphIndex = (character) => {
      const codePoint = typeof character === "number" ? character : String(character).codePointAt(0);
      if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0xffff) return 0;
      const segmentCount = u16(cmap + 6) / 2;
      const endCodes = cmap + 14;
      const startCodes = endCodes + segmentCount * 2 + 2;
      const deltas = startCodes + segmentCount * 2;
      const ranges = deltas + segmentCount * 2;
      for (let index = 0; index < segmentCount; index += 1) {
        const end = u16(endCodes + index * 2);
        if (codePoint > end) continue;
        const start = u16(startCodes + index * 2);
        if (codePoint < start) return 0;
        const delta = i16(deltas + index * 2);
        const range = u16(ranges + index * 2);
        if (range === 0) return (codePoint + delta) & 0xffff;
        const address = ranges + index * 2 + range + (codePoint - start) * 2;
        const glyph = u16(address);
        return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
      }
      return 0;
    };

    const glyphOffset = (index) => locaFormat === 0
      ? u16(loca + index * 2) * 2
      : u32(loca + index * 4);

    const contourCache = new Map();
    const glyphContours = (glyph, depth = 0) => {
      if (contourCache.has(glyph)) return contourCache.get(glyph);
      if (depth > 8 || glyph < 0 || glyph >= numGlyphs) throw new TypeError("invalid glyph");
      const start = glyf + glyphOffset(glyph);
      const end = glyf + glyphOffset(glyph + 1);
      if (start === end) return [];
      const contourCount = i16(start);

      if (contourCount < 0) {
        let offset = start + 10;
        let flags = 0;
        const contours = [];
        do {
          flags = u16(offset);
          const componentGlyph = u16(offset + 2);
          offset += 4;
          let dx;
          let dy;
          if (flags & 0x0001) {
            dx = i16(offset);
            dy = i16(offset + 2);
            offset += 4;
          } else {
            dx = i8(offset);
            dy = i8(offset + 1);
            offset += 2;
          }
          if (!(flags & 0x0002) || (flags & (0x0008 | 0x0040 | 0x0080))) {
            throw new TypeError("unsupported composite glyph");
          }
          for (const contour of glyphContours(componentGlyph, depth + 1)) {
            contours.push(contour.map((point) => ({ ...point, x:point.x + dx, y:point.y + dy })));
          }
        } while (flags & 0x0020);
        contourCache.set(glyph, contours);
        return contours;
      }

      let offset = start + 10;
      const ends = [];
      for (let index = 0; index < contourCount; index += 1) {
        ends.push(u16(offset));
        offset += 2;
      }
      const pointCount = contourCount === 0 ? 0 : ends.at(-1) + 1;
      const instructionLength = u16(offset);
      offset += 2 + instructionLength;

      const flags = [];
      while (flags.length < pointCount) {
        const flag = u8(offset++);
        flags.push(flag);
        if (flag & 0x08) {
          const repeat = u8(offset++);
          for (let count = 0; count < repeat; count += 1) flags.push(flag);
        }
      }

      const xs = [];
      let x = 0;
      for (const flag of flags) {
        let delta = 0;
        if (flag & 0x02) {
          const value = u8(offset++);
          delta = flag & 0x10 ? value : -value;
        } else if (!(flag & 0x10)) {
          delta = i16(offset);
          offset += 2;
        }
        x += delta;
        xs.push(x);
      }

      const ys = [];
      let y = 0;
      for (const flag of flags) {
        let delta = 0;
        if (flag & 0x04) {
          const value = u8(offset++);
          delta = flag & 0x20 ? value : -value;
        } else if (!(flag & 0x20)) {
          delta = i16(offset);
          offset += 2;
        }
        y += delta;
        ys.push(y);
      }

      const contours = [];
      let first = 0;
      for (const last of ends) {
        contours.push(Array.from({ length:last - first + 1 }, (_, index) => ({
          x:xs[first + index],
          y:ys[first + index],
          on:Boolean(flags[first + index] & 0x01),
        })));
        first = last + 1;
      }
      contourCache.set(glyph, contours);
      return contours;
    };

    const advanceWidth = (glyph) => u16(hmtx + Math.min(glyph, numMetrics - 1) * 4);

    return Object.freeze({ unitsPerEm, ascender, descender, glyphIndex, advanceWidth, glyphContours });
  } catch (cause) {
    throw new TypeError("FID TrueType font is invalid", { cause });
  }
}

function textValue(value, style) {
  const text = String(value);
  return style.textTransform === "uppercase" ? text.toUpperCase() : text;
}

export function measureFidText(font, value, style) {
  const text = [...textValue(value, style)];
  if (text.length === 0) return 0;
  const scale = style.sizePx / font.unitsPerEm;
  const spacing = style.letterSpacingPx ?? 0;
  return text.reduce((width, character) => width + font.advanceWidth(font.glyphIndex(character)) * scale, 0)
    + spacing * (text.length - 1);
}

function segmentsFor(contour, scale, originX, baselineY) {
  if (contour.length === 0) return [];
  const expanded = [];
  for (let index = 0; index < contour.length; index += 1) {
    const point = contour[index];
    const next = contour[(index + 1) % contour.length];
    expanded.push(point);
    if (!point.on && !next.on) expanded.push(midpoint(point, next));
  }
  const startIndex = expanded.findIndex((point) => point.on);
  if (startIndex < 0) return [];
  const ordered = [...expanded.slice(startIndex), ...expanded.slice(0, startIndex)];
  const point = (candidate) => ({
    x:originX + candidate.x * scale,
    y:baselineY - candidate.y * scale,
  });
  const lines = [];
  let current = point(ordered[0]);
  for (let index = 1; index <= ordered.length;) {
    const candidate = ordered[index % ordered.length];
    if (candidate.on) {
      const end = point(candidate);
      lines.push([current, end]);
      current = end;
      index += 1;
      continue;
    }
    const endCandidate = ordered[(index + 1) % ordered.length];
    const control = point(candidate);
    const end = point(endCandidate);
    const bend = Math.hypot(current.x - 2 * control.x + end.x, current.y - 2 * control.y + end.y);
    const steps = Math.max(2, Math.min(12, Math.ceil(Math.sqrt(bend) * 1.5)));
    let from = current;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const inverse = 1 - t;
      const to = {
        x:inverse * inverse * current.x + 2 * inverse * t * control.x + t * t * end.x,
        y:inverse * inverse * current.y + 2 * inverse * t * control.y + t * t * end.y,
      };
      lines.push([from, to]);
      from = to;
    }
    current = end;
    index += 2;
  }
  return lines;
}

function inside(lines, x, y) {
  let winding = 0;
  for (const [a, b] of lines) {
    const cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
    if (a.y <= y) {
      if (b.y > y && cross > 0) winding += 1;
    } else if (b.y <= y && cross < 0) {
      winding -= 1;
    }
  }
  return winding !== 0;
}

function blendPixel(surface, x, y, color, coverage) {
  if (coverage <= 0 || x < 0 || y < 0 || x >= surface.width || y >= surface.height) return;
  const offset = (y * surface.width + x) * 4;
  const sourceAlpha = (color[3] / 255) * coverage;
  const destinationAlpha = surface.rgba[offset + 3] / 255;
  const alpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    surface.rgba[offset + channel] = alpha === 0 ? 0 : Math.round(
      (color[channel] * sourceAlpha + surface.rgba[offset + channel] * destinationAlpha * (1 - sourceAlpha)) / alpha,
    );
  }
  surface.rgba[offset + 3] = Math.round(alpha * 255);
}

function drawGlyph(surface, font, glyph, x, baselineY, scale, color) {
  const lines = font.glyphContours(glyph).flatMap((contour) => segmentsFor(contour, scale, x, baselineY));
  if (lines.length === 0) return;
  const points = lines.flat();
  const left = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))));
  const right = Math.min(surface.width - 1, Math.ceil(Math.max(...points.map((point) => point.x))));
  const top = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
  const bottom = Math.min(surface.height - 1, Math.ceil(Math.max(...points.map((point) => point.y))));
  const samples = [0.125, 0.375, 0.625, 0.875];

  for (let py = top; py <= bottom; py += 1) {
    for (let px = left; px <= right; px += 1) {
      let hits = 0;
      for (const sy of samples) for (const sx of samples) if (inside(lines, px + sx, py + sy)) hits += 1;
      blendPixel(surface, px, py, color, hits / 16);
    }
  }
}

export function drawFidText(surface, value, x, y, style, fonts, color) {
  const entry = fonts?.[style.font];
  if (!entry?.font) throw new TypeError(`FID font role ${String(style.font)} is unavailable`);
  if (!(style.sizePx > 0)) throw new TypeError("FID text size is invalid");
  const font = entry.font;
  const text = [...textValue(value, style)];
  const width = measureFidText(font, text.join(""), style);
  const align = style.align ?? "left";
  let cursor = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  const scale = style.sizePx / font.unitsPerEm;
  const baseline = y + font.ascender * scale;
  const spacing = style.letterSpacingPx ?? 0;

  for (const character of text) {
    const glyph = font.glyphIndex(character);
    drawGlyph(surface, font, glyph, cursor, baseline, scale, color);
    cursor += font.advanceWidth(glyph) * scale + spacing;
  }
  return width;
}
